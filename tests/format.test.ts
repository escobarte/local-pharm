import { test } from "node:test";
import assert from "node:assert/strict";
import { packsShort, plural, storageSummary } from "../lib/format.ts";

const p = (n: number) => plural(n, "упаковка", "упаковки", "упаковок");

test("Russian plural forms", () => {
  assert.equal(p(0), "упаковок");
  assert.equal(p(1), "упаковка");
  assert.equal(p(2), "упаковки");
  assert.equal(p(4), "упаковки");
  assert.equal(p(5), "упаковок");
  assert.equal(p(11), "упаковок");
  assert.equal(p(12), "упаковок");
  assert.equal(p(14), "упаковок");
  assert.equal(p(21), "упаковка");
  assert.equal(p(22), "упаковки");
  assert.equal(p(25), "упаковок");
  assert.equal(p(101), "упаковка");
  assert.equal(p(111), "упаковок");
  assert.equal(p(112), "упаковок");
});

test("storageSummary", () => {
  assert.equal(storageSummary({ zones: 3, boxes: 6, packs: 54 }), "3 зоны · 6 коробок · 54 упаковки");
  assert.equal(storageSummary({ zones: 3, boxes: 1, packs: 0 }), "3 зоны · 1 коробка · 0 упаковок");
  assert.equal(storageSummary({ zones: 1, boxes: 22, packs: 21 }), "1 зона · 22 коробки · 21 упаковка");
});

test("packsShort", () => {
  assert.equal(packsShort(0), "пусто");
  assert.equal(packsShort(3), "3 упак.");
});
