import assert from "node:assert/strict";
import test from "node:test";
import { categoryAria, categoryCount, countByCategory } from "../lib/medications/category-counts.ts";

test("counts only medications with at least one pack", () => {
  const c = countByCategory([
    { categoryId: "a", packCount: 2 },
    { categoryId: "a", packCount: 1 },
    { categoryId: "a", packCount: 0 },
    { categoryId: "b", packCount: 5 },
    { categoryId: "c", packCount: 0 },
  ]);
  assert.equal(categoryCount(c, "a"), 2);
  assert.equal(categoryCount(c, "b"), 1);
  assert.equal(categoryCount(c, "c"), 0);
  assert.equal(categoryCount(c, "unknown"), 0);
  assert.equal(c.total, 3);
});

test("total includes medications without a category", () => {
  const c = countByCategory([
    { categoryId: null, packCount: 1 },
    { categoryId: "a", packCount: 1 },
  ]);
  assert.equal(c.total, 2);
  assert.deepEqual(c.byCategory, { a: 1 });
});

test("empty input", () => {
  assert.deepEqual(countByCategory([]), { total: 0, byCategory: {} });
});

test("aria text declines the word", () => {
  assert.equal(categoryAria("Пищеварение", 1), "Пищеварение, 1 препарат");
  assert.equal(categoryAria("Пищеварение", 3), "Пищеварение, 3 препарата");
  assert.equal(categoryAria("Аллергия", 0), "Аллергия, 0 препаратов");
  assert.equal(categoryAria("Аллергия", 11), "Аллергия, 11 препаратов");
  assert.equal(categoryAria("Аллергия", 21), "Аллергия, 21 препарат");
  assert.equal(categoryAria("Аллергия", 12), "Аллергия, 12 препаратов");
});
