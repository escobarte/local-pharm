import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, daysUntil } from "../lib/dates.ts";
import {
  LATER_DAYS,
  attentionHorizon,
  expiryGroupOf,
  expiryHorizon,
  groupByExpiry,
  reasonForGroup,
} from "../lib/expiry/group.ts";

const TODAY = "2026-11-24";

test("addDays / daysUntil: month and year borders, leap day", () => {
  assert.equal(addDays("2026-11-24", 30), "2026-12-24");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2028-02-28", 1), "2028-02-29");
  assert.equal(addDays("2027-02-28", 1), "2027-03-01");
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
  assert.equal(daysUntil("2026-12-24", TODAY), 30);
  assert.equal(daysUntil("2026-11-23", TODAY), -1);
  assert.equal(daysUntil(TODAY, TODAY), 0);
});

test("thresholds: 30 days for the badge/digest, 90 for the screen", () => {
  assert.equal(attentionHorizon(TODAY), "2026-12-24");
  assert.equal(LATER_DAYS, 90);
  assert.equal(expiryHorizon(TODAY), "2027-02-22");
});

test("expiryGroupOf: boundaries (-1, 0, 30, 31, 90, 91 days)", () => {
  assert.equal(expiryGroupOf("2026-11-23", TODAY), "expired");
  assert.equal(expiryGroupOf("2026-11-24", TODAY), "soon", "expires today is still usable → soon");
  assert.equal(expiryGroupOf("2026-12-24", TODAY), "soon", "day 30 inclusive");
  assert.equal(expiryGroupOf("2026-12-25", TODAY), "later", "day 31");
  assert.equal(expiryGroupOf("2027-02-22", TODAY), "later", "day 90 inclusive");
  assert.equal(expiryGroupOf("2027-02-23", TODAY), null, "day 91 is not shown");
});

test("expiryGroupOf: no date → not shown", () => {
  assert.equal(expiryGroupOf(null, TODAY), null);
  assert.equal(expiryGroupOf(undefined, TODAY), null);
  assert.equal(expiryGroupOf("", TODAY), null);
});

test('"12/2026" (stored as the last day of the month) lands in the right group', () => {
  assert.equal(expiryGroupOf("2026-12-31", TODAY), "later", "31.12 is 37 days away");
  assert.equal(expiryGroupOf("2026-11-30", TODAY), "soon");
  assert.equal(expiryGroupOf("2026-10-31", TODAY), "expired");
});

const item = (title: string, expiryDate: string | null) => ({ title, expiryDate });

test("groupByExpiry: order, sorting and hiding of empty groups", () => {
  const groups = groupByExpiry(
    [
      item("Б", "2027-01-31"),
      item("Без срока", null),
      item("Далеко", "2030-01-31"),
      item("Б", "2026-12-15"),
      item("А", "2026-12-15"),
      item("Старое", "2026-05-31"),
    ],
    TODAY,
  );
  assert.deepEqual(groups.map((g) => g.key), ["expired", "soon", "later"]);
  assert.deepEqual(groups[0].items.map((i) => i.title), ["Старое"]);
  assert.deepEqual(groups[1].items.map((i) => i.title), ["А", "Б"], "same date → by name");
  assert.deepEqual(groups[2].items.map((i) => i.title), ["Б"]);
});

test("groupByExpiry: empty groups are omitted, everything empty → []", () => {
  assert.deepEqual(groupByExpiry([item("x", "2026-12-01")], TODAY).map((g) => g.key), ["soon"]);
  assert.deepEqual(groupByExpiry([], TODAY), []);
  assert.deepEqual(groupByExpiry([item("x", null), item("y", "2035-01-31")], TODAY), []);
});

test("reasonForGroup: only expired is 'expired'", () => {
  assert.equal(reasonForGroup("expired"), "expired");
  assert.equal(reasonForGroup("soon"), "expiring");
  assert.equal(reasonForGroup("later"), "expiring");
});
