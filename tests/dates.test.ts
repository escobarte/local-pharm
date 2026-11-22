import { test } from "node:test";
import assert from "node:assert/strict";
import { expiryStatus, formatExpiry, parseExpiryInput, todayIso } from "../lib/dates.ts";

const ok = (v: string | null) => ({ ok: true, value: v });

test("empty input means no expiry", () => {
  assert.deepEqual(parseExpiryInput(""), ok(null));
  assert.deepEqual(parseExpiryInput("   "), ok(null));
  assert.deepEqual(parseExpiryInput(undefined), ok(null));
  assert.deepEqual(parseExpiryInput(null), ok(null));
});

test("month/year formats resolve to the last day of the month", () => {
  assert.deepEqual(parseExpiryInput("12/2026"), ok("2026-12-31"));
  assert.deepEqual(parseExpiryInput("1/2027"), ok("2027-01-31"));
  assert.deepEqual(parseExpiryInput("06.2025"), ok("2025-06-30"));
  assert.deepEqual(parseExpiryInput("06-2025"), ok("2025-06-30"));
  assert.deepEqual(parseExpiryInput("12/26"), ok("2026-12-31"));
  assert.deepEqual(parseExpiryInput("2026-12"), ok("2026-12-31"));
  assert.deepEqual(parseExpiryInput(" 12/2026 "), ok("2026-12-31"));
});

test("February respects leap years", () => {
  assert.deepEqual(parseExpiryInput("02/2028"), ok("2028-02-29"));
  assert.deepEqual(parseExpiryInput("02/2027"), ok("2027-02-28"));
  assert.deepEqual(parseExpiryInput("02/2100"), ok("2100-02-28"));
});

test("full dates keep the exact day", () => {
  assert.deepEqual(parseExpiryInput("15.12.2026"), ok("2026-12-15"));
  assert.deepEqual(parseExpiryInput("5/3/2026"), ok("2026-03-05"));
  assert.deepEqual(parseExpiryInput("2026-12-15"), ok("2026-12-15"));
  assert.deepEqual(parseExpiryInput("29.02.2028"), ok("2028-02-29"));
});

test("invalid dates are rejected with a hint", () => {
  for (const bad of ["13/2026", "00/2026", "31.04.2026", "29.02.2027", "abc", "12/", "2026", "12/20266", "1/1", "99.99.9999"]) {
    const r = parseExpiryInput(bad);
    assert.equal(r.ok, false, bad);
    if (!r.ok) assert.match(r.error, /ММ\/ГГГГ|2000/);
  }
});

test("year range is limited to 2000–2100", () => {
  assert.equal(parseExpiryInput("12/1999").ok, false);
  assert.equal(parseExpiryInput("01/2101").ok, false);
  assert.equal(parseExpiryInput("01/2000").ok, true);
  assert.equal(parseExpiryInput("12/2100").ok, true);
});

test("formatExpiry: end of month → MM/YYYY, otherwise DD.MM.YYYY", () => {
  assert.equal(formatExpiry("2026-12-31"), "12/2026");
  assert.equal(formatExpiry("2028-02-29"), "02/2028");
  assert.equal(formatExpiry("2026-12-15"), "15.12.2026");
  assert.equal(formatExpiry(null), "");
  assert.equal(formatExpiry(undefined), "");
  assert.equal(formatExpiry("garbage"), "");
});

test("parse → format round trip", () => {
  for (const s of ["12/2026", "02/2028", "01/2030"]) {
    const r = parseExpiryInput(s);
    assert.ok(r.ok && r.value);
    if (r.ok) assert.equal(formatExpiry(r.value), s);
  }
});

test("expiryStatus", () => {
  const today = "2026-11-21";
  assert.equal(expiryStatus(null, today), "none");
  assert.equal(expiryStatus("2026-11-20", today), "expired");
  assert.equal(expiryStatus("2026-11-21", today), "soon");
  assert.equal(expiryStatus("2026-12-21", today), "soon"); // exactly +30
  assert.equal(expiryStatus("2026-12-22", today), "ok"); // +31
  assert.equal(expiryStatus("2027-01-01", today), "ok");
  assert.equal(expiryStatus("2025-12-31", today), "expired");
});

test("expiryStatus across month and year boundaries", () => {
  assert.equal(expiryStatus("2027-01-05", "2026-12-20"), "soon");
  assert.equal(expiryStatus("2028-03-01", "2028-02-01"), "soon"); // leap: 29 days
  assert.equal(expiryStatus("2027-03-01", "2027-01-30"), "soon"); // exactly 30 days
  assert.equal(expiryStatus("2027-03-02", "2027-01-30"), "ok"); // 31 days
});

test("todayIso uses the ISO date part", () => {
  assert.equal(todayIso(new Date("2026-11-21T23:59:59Z")), "2026-11-21");
});

import { formatDate } from "../lib/dates.ts";

test("formatDate", () => {
  assert.equal(formatDate("2026-03-05"), "05.03.2026");
  assert.equal(formatDate("2026-12-31"), "31.12.2026", "not shortened to MM/YYYY");
  assert.equal(formatDate(null), "");
  assert.equal(formatDate("garbage"), "");
});
