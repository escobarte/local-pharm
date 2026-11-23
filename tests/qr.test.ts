import { test } from "node:test";
import assert from "node:assert/strict";
import {
  QR_ERRORS,
  allowedQrOrigins,
  boxQrPath,
  boxQrUrl,
  originFromHeaders,
  parseBoxQr,
  qrOrigin,
  readSiteOrigin,
} from "../lib/qr.ts";

const T = "0b5f3c1e-8a7d-4c2e-9f10-123456789abc";
const SITE = "https://local-pharm.vercel.app";
const OK = { ok: true, token: T } as const;
const FOREIGN = { ok: false, error: "foreign" } as const;

test("boxQrPath / boxQrUrl build <origin>/q/<token>", () => {
  assert.equal(boxQrPath(T), `/q/${T}`);
  assert.equal(boxQrPath(T.toUpperCase()), `/q/${T}`);
  assert.equal(boxQrUrl(SITE, T), `${SITE}/q/${T}`);
  assert.equal(boxQrUrl(`${SITE}/`, T), `${SITE}/q/${T}`);
  assert.equal(boxQrUrl("http://localhost:3000", T), `http://localhost:3000/q/${T}`);
});

test("readSiteOrigin keeps only an http(s) origin", () => {
  assert.equal(readSiteOrigin(SITE), SITE);
  assert.equal(readSiteOrigin(` ${SITE}/ `), SITE);
  assert.equal(readSiteOrigin(`${SITE}/some/path?x=1`), SITE);
  assert.equal(readSiteOrigin("HTTPS://Local-Pharm.Vercel.App"), SITE);
  for (const bad of [undefined, null, "", "  ", "local-pharm.vercel.app", "javascript:alert(1)", "ftp://x.y", "https://u:p@x.y"]) {
    assert.equal(readSiteOrigin(bad), null, String(bad));
  }
});

test("qrOrigin: NEXT_PUBLIC_SITE_URL wins when valid, else the current address", () => {
  assert.equal(qrOrigin(undefined, "http://localhost:3140"), "http://localhost:3140");
  assert.equal(qrOrigin("", "http://localhost:3140"), "http://localhost:3140");
  assert.equal(qrOrigin(`${SITE}/`, "http://localhost:3140"), SITE);
  assert.equal(qrOrigin("not a url", "http://localhost:3140"), "http://localhost:3140");
});

test("allowedQrOrigins: current + configured, deduplicated", () => {
  assert.deepEqual(allowedQrOrigins(SITE), [SITE]);
  assert.deepEqual(allowedQrOrigins(SITE, `${SITE}/`), [SITE]);
  assert.deepEqual(allowedQrOrigins("https://preview-1.vercel.app", SITE), ["https://preview-1.vercel.app", SITE]);
  assert.deepEqual(allowedQrOrigins("", undefined), []);
});

test("parseBoxQr accepts our sticker URL, path and bare token", () => {
  const allowed = [SITE];
  assert.deepEqual(parseBoxQr(`${SITE}/q/${T}`, allowed), OK);
  assert.deepEqual(parseBoxQr(`${SITE}/q/${T}/`, allowed), OK);
  assert.deepEqual(parseBoxQr(`  ${SITE}/q/${T.toUpperCase()}  `, allowed), OK);
  assert.deepEqual(parseBoxQr(`${SITE}/q/${T}?utm=1#x`, allowed), OK);
  assert.deepEqual(parseBoxQr(`HTTPS://LOCAL-PHARM.VERCEL.APP/q/${T}`, allowed), OK);
  assert.deepEqual(parseBoxQr(`local-pharm.vercel.app/q/${T}`, allowed), OK);
  assert.deepEqual(parseBoxQr(`/q/${T}`, allowed), OK);
  assert.deepEqual(parseBoxQr(T, allowed), OK);
  // Local development: http and a port.
  assert.deepEqual(parseBoxQr(`http://localhost:3140/q/${T}`, ["http://localhost:3140"]), OK);
  assert.deepEqual(parseBoxQr(`localhost:3140/q/${T}`, ["http://localhost:3140"]), OK);
});

test("parseBoxQr: other sites, routes and junk are 'not our sticker'", () => {
  const allowed = [SITE];
  for (const bad of [
    `https://evil.example/q/${T}`,
    `https://local-pharm.vercel.app.evil.example/q/${T}`,
    `https://evil.example/?u=${SITE}/q/${T}`,
    `http://local-pharm.vercel.app/q/${T}`, // other scheme = other origin
    `https://local-pharm.vercel.app:8443/q/${T}`,
    `https://user:pw@local-pharm.vercel.app/q/${T}`,
    `${SITE}/storage/${T}`,
    `${SITE}/q/${T}/extra`,
    `${SITE}/q/not-a-uuid`,
    `${SITE}/q/${T}x`,
    `//evil.example/q/${T}`,
    `\\\\evil.example/q/${T}`,
    `javascript:alert(1)//${SITE}/q/${T}`,
    `data:text/html,${SITE}/q/${T}`,
    "WIFI:S:home;T:WPA;P:secret;;",
    "4820000000017",
    "просто текст",
    `${SITE}/q/${T}\nhttps://evil.example`,
    `/storage/${T}`,
  ]) {
    assert.deepEqual(parseBoxQr(bad, allowed), FOREIGN, bad);
  }
});

test("parseBoxQr: empty input, no allowed origins", () => {
  assert.deepEqual(parseBoxQr("", [SITE]), { ok: false, error: "empty" });
  assert.deepEqual(parseBoxQr("   ", [SITE]), { ok: false, error: "empty" });
  assert.deepEqual(parseBoxQr(undefined, [SITE]), { ok: false, error: "empty" });
  // Unknown own origin: a full URL is never trusted, a bare token still works.
  assert.deepEqual(parseBoxQr(`${SITE}/q/${T}`, []), FOREIGN);
  assert.deepEqual(parseBoxQr(T, []), OK);
  assert.equal(QR_ERRORS.foreign, "Это не наклейка Local Pharm.");
});

test("built URL round-trips through the parser", () => {
  for (const origin of [SITE, "http://localhost:3140", "http://127.0.0.1:3140"]) {
    assert.deepEqual(parseBoxQr(boxQrUrl(qrOrigin(undefined, origin), T), allowedQrOrigins(origin)), OK);
  }
  // Printed with NEXT_PUBLIC_SITE_URL on a preview address: scanned on either.
  const printed = boxQrUrl(qrOrigin(SITE, "https://preview-1.vercel.app"), T);
  assert.deepEqual(parseBoxQr(printed, allowedQrOrigins("https://preview-1.vercel.app", SITE)), OK);
});

test("originFromHeaders", () => {
  assert.equal(originFromHeaders({ host: "local-pharm.vercel.app" }), SITE);
  assert.equal(originFromHeaders({ host: "x", forwardedHost: "local-pharm.vercel.app", forwardedProto: "https" }), SITE);
  assert.equal(originFromHeaders({ host: "127.0.0.1:3140" }), "http://127.0.0.1:3140");
  assert.equal(originFromHeaders({ host: "localhost:3000", forwardedProto: "http" }), "http://localhost:3000");
  assert.equal(originFromHeaders({ host: "a.b, c.d", forwardedProto: "https, http" }), "https://a.b");
  for (const bad of [{}, { host: "" }, { host: "evil.example/path" }, { host: "a b" }, { host: "x@y" }]) {
    assert.equal(originFromHeaders(bad), null, JSON.stringify(bad));
  }
});
