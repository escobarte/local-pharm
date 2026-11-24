import { test } from "node:test";
import assert from "node:assert/strict";
import { packsShort, plural, storageSummary, storageSummaryParts } from "../lib/format.ts";

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

import {
  expiredText,
  expiringText,
  foundLabel,
  lowStockText,
  medicationsLabel,
  morePlacesLabel,
  pcsLabel,
} from "../lib/format.ts";

test("pcsLabel never declines the abbreviation", () => {
  for (const n of [0, 1, 2, 5, 11, 21]) assert.equal(pcsLabel(n), `${n} шт.`);
});

test("foundLabel agrees in number", () => {
  assert.equal(foundLabel(1), "Найден: 1 препарат");
  assert.equal(foundLabel(3), "Найдено: 3 препарата");
  assert.equal(foundLabel(5), "Найдено: 5 препаратов");
  assert.equal(foundLabel(11), "Найдено: 11 препаратов");
  assert.equal(foundLabel(21), "Найден: 21 препарат");
  assert.equal(medicationsLabel(22), "22 препарата");
});

test("attention rows: упаковка agrees with the verb", () => {
  assert.equal(expiringText(1), "1 упаковка истекает");
  assert.equal(expiringText(2), "2 упаковки истекают");
  assert.equal(expiringText(5), "5 упаковок истекают");
  assert.equal(expiringText(11), "11 упаковок истекают");
  assert.equal(expiredText(1), "1 упаковка просрочена");
  assert.equal(expiredText(3), "3 упаковки просрочены");
  assert.equal(expiredText(7), "7 упаковок просрочено");
  assert.equal(lowStockText(1), "1 упаковка заканчивается");
  assert.equal(lowStockText(4), "4 упаковки заканчиваются");
  assert.equal(lowStockText(12), "12 упаковок заканчиваются");
});

test("morePlacesLabel", () => {
  assert.equal(morePlacesLabel(1), "ещё 1 место");
  assert.equal(morePlacesLabel(3), "ещё 3 места");
  assert.equal(morePlacesLabel(5), "ещё 5 мест");
});

test("storageSummaryParts keeps the numbers apart from the words", () => {
  assert.deepEqual(storageSummaryParts({ zones: 3, boxes: 2, packs: 3 }), [
    { n: 3, word: "зоны" },
    { n: 2, word: "коробки" },
    { n: 3, word: "упаковки" },
  ]);
  assert.deepEqual(storageSummaryParts({ zones: 1, boxes: 5, packs: 21 }).map((p) => `${p.n} ${p.word}`), [
    "1 зона",
    "5 коробок",
    "21 упаковка",
  ]);
});
