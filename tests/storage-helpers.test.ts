import { test } from "node:test";
import assert from "node:assert/strict";
import { boxColorClasses, BOX_COLORS, isBoxColor } from "../lib/storage/box-colors.ts";
import { describeDbError } from "../lib/storage/db-errors.ts";
import { boxLabel, compareCodes, sortByCode } from "../lib/storage/sort.ts";

test("compartment codes sort naturally", () => {
  const codes = ["B1", "A10", "A2", "A1", "b2", "C1"].map((code) => ({ code }));
  assert.deepEqual(sortByCode(codes).map((c) => c.code), ["A1", "A2", "A10", "B1", "b2", "C1"]);
  assert.ok(compareCodes("A2", "A10") < 0);
});

test("sortByCode does not mutate its input", () => {
  const input = [{ code: "B1" }, { code: "A1" }];
  sortByCode(input);
  assert.equal(input[0].code, "B1");
});

test("boxLabel", () => {
  assert.equal(boxLabel({ name: "Простуда", number: "2" }), "№2 · Простуда");
  assert.equal(boxLabel({ name: "Простуда", number: null }), "Простуда");
  assert.equal(boxLabel({ name: "Простуда", number: "  " }), "Простуда");
});

test("box colors: known keys map to token classes, unknown fall back to navy", () => {
  for (const c of BOX_COLORS) {
    assert.equal(isBoxColor(c.key), true);
    assert.equal(boxColorClasses(c.key), c.classes);
  }
  assert.equal(boxColorClasses("hotpink"), BOX_COLORS[0].classes);
  assert.equal(boxColorClasses(null), BOX_COLORS[0].classes);
  assert.equal(isBoxColor("hotpink"), false);
});

test("box colors use only design tokens (no raw hex, no default palette)", () => {
  for (const c of BOX_COLORS) {
    assert.doesNotMatch(c.classes, /#|\b(red|blue|green|gray|slate)-\d/);
  }
});

test("db errors map to Russian messages", () => {
  assert.match(describeDbError({ code: "23505" }, "create-compartment"), /уже есть/);
  assert.match(describeDbError({ code: "23503" }, "delete-compartment"), /отсеке есть упаковки/);
  assert.match(describeDbError({ code: "23503" }, "delete-box"), /коробке есть упаковки/);
  assert.match(describeDbError({ code: "23503" }, "save-pack"), /больше не существует/);
  assert.match(describeDbError({ code: "23503" }, "delete-medication"), /У препарата есть упаковки/);
  assert.match(describeDbError({ code: "42501" }), /Нет прав/);
  for (const code of ["PGRST202", "PGRST204", "42703", "42883"]) {
    assert.match(describeDbError({ code }, "save-pack"), /последнюю миграцию/, code);
  }
  assert.match(describeDbError({ code: "23514" }), /Проверьте/);
  assert.match(describeDbError({ code: "XX000", message: "boom" }), /Не удалось/);
  assert.match(describeDbError(null), /Не удалось/);
});

test("db errors never leak raw database messages", () => {
  const msg = describeDbError({ code: "23505", message: 'duplicate key value violates "compartments_box_code_key"' }, "save");
  assert.doesNotMatch(msg, /duplicate|compartments_box_code_key/);
});
