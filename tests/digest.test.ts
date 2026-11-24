import { test } from "node:test";
import assert from "node:assert/strict";
import { DIGEST_SUBJECT, buildDigest, digestLine, escapeHtml, type DigestRow } from "../lib/digest/build.ts";
import { runWeeklyDigest, type DigestDeps, type DigestStore } from "../lib/digest/run.ts";
import { decideDigest, isDigestDay } from "../lib/digest/schedule.ts";

const TODAY = "2026-12-07"; // Monday
const MONDAY = new Date("2026-12-07T06:00:00Z");
const TUESDAY = new Date("2026-12-08T06:00:00Z");

const row = (over: Partial<DigestRow> = {}): DigestRow => ({
  medicationName: "Нурофен 200 мг",
  boxNumber: "1",
  boxName: "Аптечка",
  compartmentCode: "B2",
  expiryDate: "2026-12-31",
  quantity: 3,
  ...over,
});

// ---------- buildDigest ----------

test("buildDigest: nothing to report → null (no e-mail)", () => {
  assert.equal(buildDigest([], TODAY, "https://x.example"), null);
  assert.equal(buildDigest([row({ expiryDate: "2027-06-30" })], TODAY, null), null, "later than 30 days is not news");
});

test("buildDigest: subject, group titles with counts, line format", () => {
  const d = buildDigest(
    [row({ medicationName: "Колдрекс", expiryDate: "2026-10-31", boxNumber: "2", boxName: "Склад", compartmentCode: "A1", quantity: 1 }), row()],
    TODAY,
    "https://pharm.example",
  )!;
  assert.equal(d.subject, DIGEST_SUBJECT);
  assert.equal(d.subject, "Local Pharm: сроки на неделе");
  assert.equal(d.expired, 1);
  assert.equal(d.soon, 1);
  assert.match(d.text, /Просрочено \(1\)/);
  assert.match(d.text, /Истекает в 30 дней \(1\)/);
  assert.match(d.text, /- Колдрекс — №2 Склад · A1 — до 10\/2026 · 1 шт\./);
  assert.match(d.text, /- Нурофен 200 мг — №1 Аптечка · B2 — до 12\/2026 · 3 шт\./);
  assert.match(d.text, /https:\/\/pharm\.example\/expiry$/);
  assert.match(d.html, /href="https:\/\/pharm\.example\/expiry"/);
  assert.match(d.html, /lang="ru"/);
});

test("buildDigest: a group with no rows is left out; expired first", () => {
  const onlySoon = buildDigest([row()], TODAY, null)!;
  assert.doesNotMatch(onlySoon.text, /Просрочено/);
  assert.doesNotMatch(onlySoon.text, /https?:/, "no site address → no link");
  assert.doesNotMatch(onlySoon.html, /<a /);
  const both = buildDigest([row(), row({ expiryDate: "2026-09-30", medicationName: "Старое" })], TODAY, null)!;
  assert.ok(both.text.indexOf("Просрочено") < both.text.indexOf("Истекает"));
});

test("buildDigest: sorted by date, then name; the 30-day edge is inclusive", () => {
  const d = buildDigest(
    [
      row({ medicationName: "Б", expiryDate: "2026-12-10" }),
      row({ medicationName: "А", expiryDate: "2026-12-10" }),
      row({ medicationName: "В", expiryDate: "2026-12-08" }),
      row({ medicationName: "Край", expiryDate: "2027-01-06" }),
      row({ medicationName: "Дальше", expiryDate: "2027-01-07" }),
    ],
    TODAY,
    null,
  )!;
  const order = ["В", "А", "Б", "Край"].map((n) => d.text.indexOf(`- ${n} —`));
  assert.ok(order.every((i) => i >= 0));
  assert.deepEqual([...order].sort((a, b) => a - b), order);
  assert.equal(d.text.includes("Дальше"), false, "31 days away is not included");
});

test("buildDigest: user text is escaped in HTML (names, box names, link)", () => {
  const d = buildDigest(
    [row({ medicationName: '<script>alert("x")</script> & Co', boxName: "A'B" })],
    TODAY,
    'https://x.example"onmouseover="1',
  )!;
  assert.doesNotMatch(d.html, /<script>/);
  assert.match(d.html, /&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt; &amp; Co/);
  assert.match(d.html, /A&#39;B/);
  assert.equal(escapeHtml(`<>&"'`), "&lt;&gt;&amp;&quot;&#39;");
  assert.match(d.text, /<script>/, "plain text keeps the raw characters");
});

test("digestLine: a box without a number", () => {
  assert.equal(
    digestLine(row({ boxNumber: null, boxName: "Дорожная", compartmentCode: "C1", expiryDate: "2026-12-15", quantity: 2 })),
    "Нурофен 200 мг — Дорожная · C1 — до 15.12.2026 · 2 шт.",
  );
});

// ---------- schedule ----------

test("isDigestDay: Monday in UTC only", () => {
  assert.equal(isDigestDay(MONDAY), true);
  assert.equal(isDigestDay(new Date("2026-12-07T23:59:59Z")), true);
  assert.equal(isDigestDay(new Date("2026-12-06T23:59:59Z")), false, "Sunday 23:59 UTC");
  assert.equal(isDigestDay(TUESDAY), false);
});

test("decideDigest: not Monday → skip; Monday never sent → send", () => {
  assert.deepEqual(decideDigest({ now: TUESDAY, lastSentOn: null }), { send: false, reason: "not_monday" });
  assert.deepEqual(decideDigest({ now: MONDAY, lastSentOn: null }), { send: true });
});

test("decideDigest: a second run on the same day does not send again", () => {
  assert.deepEqual(decideDigest({ now: MONDAY, lastSentOn: "2026-12-07" }), { send: false, reason: "already_sent" });
});

test("decideDigest: last Monday is a week ago → send; 6 days ago → skip", () => {
  assert.deepEqual(decideDigest({ now: MONDAY, lastSentOn: "2026-11-30" }), { send: true });
  assert.deepEqual(decideDigest({ now: MONDAY, lastSentOn: "2026-12-01" }), { send: false, reason: "already_sent" });
});

test("decideDigest: a future 'last sent' date (clock skew) does not block forever", () => {
  assert.deepEqual(decideDigest({ now: MONDAY, lastSentOn: "2027-01-30" }), { send: true });
});

test("decideDigest: force skips both rules", () => {
  assert.deepEqual(decideDigest({ now: TUESDAY, lastSentOn: "2026-12-08", force: true }), { send: true });
});

// ---------- runWeeklyDigest ----------

type Calls = { last: number; rows: number; marked: number; sent: { subject: string; to: string[]; key: string }[] };

function setup(over: { now?: Date; force?: boolean; env?: boolean; last?: string | null; rows?: DigestRow[]; sendOk?: boolean; markThrows?: boolean; storeThrows?: boolean } = {}) {
  const calls: Calls = { last: 0, rows: 0, marked: 0, sent: [] };
  const store: DigestStore = {
    async lastSentOn() {
      calls.last++;
      if (over.storeThrows) throw new Error("db down");
      return over.last ?? null;
    },
    async rows() {
      calls.rows++;
      return over.rows ?? [row()];
    },
    async markSent() {
      calls.marked++;
      if (over.markThrows) throw new Error("mark failed");
    },
  };
  const deps: DigestDeps = {
    now: over.now ?? MONDAY,
    force: over.force ?? false,
    mail:
      over.env === false
        ? { env: null, missing: ["RESEND_API_KEY", "MAIL_FROM", "NOTIFY_EMAILS"] }
        : { env: { apiKey: "k", from: "Local Pharm <a@b.example>", to: ["x@y.example", "z@y.example"] }, missing: [] },
    siteUrl: "https://pharm.example",
    store,
    soonDays: 30,
    async send(message, key) {
      calls.sent.push({ subject: message.subject, to: message.to, key });
      return over.sendOk === false ? { ok: false, error: "HTTP 403: domain not verified" } : { ok: true };
    },
  };
  return { deps, calls };
}

test("run: variables missing → skipped, names listed, no database or network calls", async () => {
  const { deps, calls } = setup({ env: false });
  const out = await runWeeklyDigest(deps);
  assert.deepEqual(out, { status: "skipped", reason: "not_configured", missing: ["RESEND_API_KEY", "MAIL_FROM", "NOTIFY_EMAILS"] });
  assert.deepEqual([calls.last, calls.rows, calls.sent.length], [0, 0, 0]);
});

test("run: not a Monday → skipped without touching the database", async () => {
  const { deps, calls } = setup({ now: TUESDAY });
  assert.deepEqual(await runWeeklyDigest(deps), { status: "skipped", reason: "not_monday" });
  assert.deepEqual([calls.last, calls.rows, calls.sent.length], [0, 0, 0]);
});

test("run: Monday → one e-mail to all recipients, then marked", async () => {
  const { deps, calls } = setup();
  const out = await runWeeklyDigest(deps);
  assert.deepEqual(out, { status: "sent", recipients: 2, expired: 0, soon: 1, marked: true });
  assert.equal(calls.sent.length, 1);
  assert.deepEqual(calls.sent[0].to, ["x@y.example", "z@y.example"]);
  assert.equal(calls.sent[0].subject, "Local Pharm: сроки на неделе");
  assert.equal(calls.sent[0].key, "local-pharm-digest-2026-12-07");
  assert.equal(calls.marked, 1);
});

test("run: the second run on the same Monday sends nothing", async () => {
  const { deps, calls } = setup({ last: "2026-12-07" });
  assert.deepEqual(await runWeeklyDigest(deps), { status: "skipped", reason: "already_sent" });
  assert.deepEqual([calls.rows, calls.sent.length, calls.marked], [0, 0, 0]);
});

test("run: nothing expired or expiring → no e-mail, not marked", async () => {
  const { deps, calls } = setup({ rows: [] });
  assert.deepEqual(await runWeeklyDigest(deps), { status: "skipped", reason: "nothing_to_report" });
  assert.deepEqual([calls.sent.length, calls.marked], [0, 0]);
});

test("run: send fails → failed, not marked (next run retries)", async () => {
  const { deps, calls } = setup({ sendOk: false });
  assert.deepEqual(await runWeeklyDigest(deps), { status: "failed", reason: "HTTP 403: domain not verified" });
  assert.equal(calls.marked, 0);
});

test("run: database error → failed, nothing sent", async () => {
  const { deps, calls } = setup({ storeThrows: true });
  assert.deepEqual(await runWeeklyDigest(deps), { status: "failed", reason: "db down" });
  assert.equal(calls.sent.length, 0);
});

test("run: a failed mark does not turn a sent e-mail into a failure", async () => {
  const { deps } = setup({ markThrows: true });
  const out = await runWeeklyDigest(deps);
  assert.equal(out.status, "sent");
  assert.equal(out.status === "sent" && out.marked, false);
});

test("run: force on a Tuesday sends, ignores 'already sent', and does not mark", async () => {
  const { deps, calls } = setup({ now: TUESDAY, force: true, last: "2026-12-08" });
  const out = await runWeeklyDigest(deps);
  assert.equal(out.status, "sent");
  assert.equal(calls.sent.length, 1);
  assert.equal(calls.marked, 0);
  assert.equal(calls.last, 0, "force does not even ask when it was sent");
});

test("run: force with nothing to report still sends nothing", async () => {
  const { deps, calls } = setup({ now: TUESDAY, force: true, rows: [] });
  assert.deepEqual(await runWeeklyDigest(deps), { status: "skipped", reason: "nothing_to_report" });
  assert.equal(calls.sent.length, 0);
});
