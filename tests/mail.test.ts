import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRecipientList, readMailEnv, readResendUrl, resolveSiteUrl } from "../lib/env.ts";
import { sendMail } from "../lib/mail/resend.ts";

const MESSAGE = { from: "Local Pharm <a@b.example>", to: ["x@y.example"], subject: "s", html: "<p>h</p>", text: "t" };

test("parseRecipientList: trims, lowercases, drops duplicates and invalid entries", () => {
  assert.deepEqual(parseRecipientList(" A@X.com , b@y.org,A@x.com,not-an-email,,c@d "), ["a@x.com", "b@y.org"]);
  assert.deepEqual(parseRecipientList(undefined), []);
  assert.deepEqual(parseRecipientList(""), []);
  assert.deepEqual(parseRecipientList("a@x.com; b@y.org"), [], "semicolons are not separators");
});

test("parseRecipientList: capped", () => {
  const many = Array.from({ length: 30 }, (_, i) => `u${i}@x.com`).join(",");
  assert.equal(parseRecipientList(many).length, 10);
});

test("readMailEnv: all three variables present", () => {
  const { env, missing } = readMailEnv({
    RESEND_API_KEY: " re_key ",
    MAIL_FROM: "Local Pharm <onboarding@resend.dev>",
    NOTIFY_EMAILS: "a@x.com, b@y.org",
  });
  assert.deepEqual(env, { apiKey: "re_key", from: "Local Pharm <onboarding@resend.dev>", to: ["a@x.com", "b@y.org"] });
  assert.deepEqual(missing, []);
  assert.deepEqual(readMailEnv({ RESEND_API_KEY: "k", MAIL_FROM: "bare@x.com", NOTIFY_EMAILS: "a@x.com" }).missing, []);
});

test("readMailEnv: lists the NAMES of missing or invalid variables, never values", () => {
  assert.deepEqual(readMailEnv({}), { env: null, missing: ["RESEND_API_KEY", "MAIL_FROM", "NOTIFY_EMAILS"] });
  assert.deepEqual(readMailEnv({ RESEND_API_KEY: "k", MAIL_FROM: "x@y.com" }).missing, ["NOTIFY_EMAILS"]);
  assert.deepEqual(readMailEnv({ RESEND_API_KEY: "k", MAIL_FROM: "not an address", NOTIFY_EMAILS: "a@x.com" }).missing, ["MAIL_FROM"]);
  assert.deepEqual(readMailEnv({ RESEND_API_KEY: "  ", MAIL_FROM: "x@y.com", NOTIFY_EMAILS: "bad" }).missing, ["RESEND_API_KEY", "NOTIFY_EMAILS"]);
});

test("readResendUrl: default, test override, invalid override ignored", () => {
  assert.equal(readResendUrl(undefined), "https://api.resend.com/emails");
  assert.equal(readResendUrl("http://127.0.0.1:54370/emails"), "http://127.0.0.1:54370/emails");
  assert.equal(readResendUrl("javascript:alert(1)"), "https://api.resend.com/emails");
});

test("resolveSiteUrl: override wins, then the request origin; only http(s); no path or slash", () => {
  assert.equal(resolveSiteUrl("https://pharm.example/", "https://other.vercel.app"), "https://pharm.example");
  assert.equal(resolveSiteUrl(undefined, "https://other.vercel.app"), "https://other.vercel.app");
  assert.equal(resolveSiteUrl("  ", "https://other.vercel.app"), "https://other.vercel.app");
  assert.equal(resolveSiteUrl("javascript:alert(1)", "https://other.vercel.app"), "https://other.vercel.app");
  assert.equal(resolveSiteUrl("https://pharm.example/some/path?x=1", undefined), "https://pharm.example");
  assert.equal(resolveSiteUrl(undefined, undefined), null);
  assert.equal(resolveSiteUrl("nonsense", "nonsense"), null);
});

test("sendMail: posts JSON with the bearer key and idempotency key", async () => {
  let seen: { url: string; init: RequestInit } | null = null;
  const fetchImpl = (async (url: string, init: RequestInit) => {
    seen = { url, init };
    return new Response(JSON.stringify({ id: "1" }), { status: 200 });
  }) as unknown as typeof fetch;
  const res = await sendMail({ apiKey: "re_secret", url: "https://api.resend.com/emails", message: MESSAGE, idempotencyKey: "k-1", fetchImpl });
  assert.deepEqual(res, { ok: true });
  assert.equal(seen!.url, "https://api.resend.com/emails");
  const headers = seen!.init.headers as Record<string, string>;
  assert.equal(headers.authorization, "Bearer re_secret");
  assert.equal(headers["idempotency-key"], "k-1");
  assert.equal(seen!.init.method, "POST");
  assert.deepEqual(JSON.parse(seen!.init.body as string), MESSAGE);
});

test("sendMail: an error answer returns status and Resend's message, never the key", async () => {
  const fetchImpl = (async () =>
    new Response(JSON.stringify({ message: "You can only send testing emails to your own email address" }), { status: 403 })) as unknown as typeof fetch;
  const res = await sendMail({ apiKey: "re_secret", url: "u", message: MESSAGE, fetchImpl });
  assert.equal(res.ok, false);
  assert.match(!res.ok ? res.error : "", /^HTTP 403: You can only send testing emails/);
  assert.doesNotMatch(JSON.stringify(res), /re_secret/);
});

test("sendMail: network failure and non-JSON error body do not throw", async () => {
  const boom = (async () => {
    throw new TypeError("fetch failed");
  }) as unknown as typeof fetch;
  assert.deepEqual(await sendMail({ apiKey: "k", url: "u", message: MESSAGE, fetchImpl: boom }), { ok: false, error: "network (TypeError)" });
  const html = (async () => new Response("<html>bad gateway</html>", { status: 502 })) as unknown as typeof fetch;
  assert.deepEqual(await sendMail({ apiKey: "k", url: "u", message: MESSAGE, fetchImpl: html }), { ok: false, error: "HTTP 502" });
});
