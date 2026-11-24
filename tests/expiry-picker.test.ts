import assert from "node:assert/strict";
import test from "node:test";
import { parseExpiryInput } from "../lib/dates.ts";
import {
  composeExpiryValue,
  EXPIRY_PICKER_ERROR,
  expiryYearOptions,
  isHalfExpiry,
  MONTH_OPTIONS,
  splitExpiryValue,
} from "../lib/expiry/picker.ts";

test("compose: empty means no expiry", () => {
  assert.equal(composeExpiryValue("", ""), "");
  assert.deepEqual(parseExpiryInput(composeExpiryValue("", "")), { ok: true, value: null });
});

test("compose: full expiry matches what the old text input sent", () => {
  assert.equal(composeExpiryValue("12", "2026"), "12/2026");
  assert.deepEqual(parseExpiryInput(composeExpiryValue("12", "2026")), { ok: true, value: "2026-12-31" });
  assert.deepEqual(parseExpiryInput(composeExpiryValue("02", "2028")), { ok: true, value: "2028-02-29" });
});

test("compose: only a month or only a year is rejected by the server parser", () => {
  assert.equal(composeExpiryValue("12", ""), "12/");
  assert.equal(composeExpiryValue("", "2026"), "/2026");
  assert.equal(parseExpiryInput(composeExpiryValue("12", "")).ok, false);
  assert.equal(parseExpiryInput(composeExpiryValue("", "2026")).ok, false);
});

test("half detection", () => {
  assert.equal(isHalfExpiry("", ""), false);
  assert.equal(isHalfExpiry("12", "2026"), false);
  assert.equal(isHalfExpiry("12", ""), true);
  assert.equal(isHalfExpiry("", "2026"), true);
  assert.match(EXPIRY_PICKER_ERROR, /месяц и год/);
});

test("split: empty and unknown values", () => {
  for (const raw of ["", "  ", null, undefined, "abc", "/", "12/26"]) {
    assert.deepEqual(splitExpiryValue(raw), { month: "", year: "" }, String(raw));
  }
});

test("split: an impossible month is dropped, the year is kept", () => {
  assert.deepEqual(splitExpiryValue("13/2026"), { month: "", year: "2026" });
});

test("split: full values in the formats the server accepts", () => {
  assert.deepEqual(splitExpiryValue("12/2026"), { month: "12", year: "2026" });
  assert.deepEqual(splitExpiryValue("1/2027"), { month: "01", year: "2027" });
  assert.deepEqual(splitExpiryValue("06.2025"), { month: "06", year: "2025" });
  assert.deepEqual(splitExpiryValue("2026-12"), { month: "12", year: "2026" });
  assert.deepEqual(splitExpiryValue("2026-12-31"), { month: "12", year: "2026" });
});

test("split: the halves the picker can send come back as the same halves", () => {
  assert.deepEqual(splitExpiryValue("12/"), { month: "12", year: "" });
  assert.deepEqual(splitExpiryValue("/2026"), { month: "", year: "2026" });
});

test("compose and split round-trip", () => {
  for (const [month, year] of [["", ""], ["03", "2027"], ["12", ""], ["", "2030"]]) {
    assert.deepEqual(splitExpiryValue(composeExpiryValue(month, year)), { month, year });
  }
});

test("month options: number and name, 12 of them", () => {
  assert.equal(MONTH_OPTIONS.length, 12);
  assert.deepEqual(MONTH_OPTIONS[0], { value: "01", label: "01 Январь" });
  assert.deepEqual(MONTH_OPTIONS[11], { value: "12", label: "12 Декабрь" });
});

test("year options: current − 3 … current + 10, ascending", () => {
  const years = expiryYearOptions(2026);
  assert.equal(years.length, 14);
  assert.equal(years[0], "2023");
  assert.equal(years[3], "2026");
  assert.equal(years[13], "2036");
  assert.deepEqual(years, [...years].sort());
});

test("year options: boundary — the year turns over", () => {
  const years = expiryYearOptions(2027);
  assert.equal(years[0], "2024");
  assert.equal(years[13], "2037");
});

test("year options: a selected year outside the range is kept, in order", () => {
  assert.deepEqual(expiryYearOptions(2026, "2020").slice(0, 2), ["2020", "2023"]);
  const far = expiryYearOptions(2026, "2050");
  assert.equal(far[far.length - 1], "2050");
  assert.equal(expiryYearOptions(2026, "2023").length, 14);
  assert.equal(expiryYearOptions(2026, "2030").length, 14);
  assert.equal(expiryYearOptions(2026, "garbage").length, 14);
});
