import { test } from "node:test";
import assert from "node:assert/strict";
import { buildBoxDetail, buildOverview, categoryLabel } from "../lib/storage/summary.ts";
import type { BoxRow, CompartmentRow, LocationRow, PackRow } from "../lib/storage/types.ts";

const pack = (id: string, compartment_id: string, categoryName: string | null, name = "X"): PackRow => ({
  id,
  compartment_id,
  quantity: 1,
  expiry_date: null,
  medicationName: name,
  activeIngredient: null,
  form: null,
  dosage: null,
  categoryName,
});

test("categoryLabel", () => {
  assert.equal(categoryLabel([], 0), "Пока пусто");
  assert.equal(categoryLabel([null, null], 2), "Без категории");
  assert.equal(categoryLabel(["Аллергия", "Аллергия", "Детское"], 3), "Аллергия, Детское");
  assert.equal(categoryLabel(["B", "A", "C", "A"], 4), "A, B +1");
  assert.equal(categoryLabel(["A", null], 2), "A");
});

const locations: LocationRow[] = [
  { id: "l2", name: "Основной склад", sort_order: 2 },
  { id: "l1", name: "Быстрый доступ", sort_order: 1 },
  { id: "l3", name: "В дорогу", sort_order: 3 },
];
const boxes: BoxRow[] = [
  { id: "b10", name: "Десятая", number: "10", color: "navy", location_id: "l2" },
  { id: "b2", name: "Вторая", number: "2", color: "accent", location_id: "l2" },
  { id: "b1", name: "Первая", number: "1", color: null, location_id: "l1" },
];
const compartments: CompartmentRow[] = [
  { id: "c1", box_id: "b1", code: "A1" },
  { id: "c2", box_id: "b2", code: "A1" },
  { id: "c3", box_id: "b2", code: "A2" },
];
const packs: PackRow[] = [
  pack("p1", "c1", "Боль"),
  pack("p2", "c2", "Боль"),
  pack("p3", "c3", "Аллергия"),
  pack("p4", "c3", null),
];

test("overview: zones ordered by sort_order, boxes naturally by number", () => {
  const o = buildOverview(locations, boxes, compartments, packs);
  assert.deepEqual(o.zones.map((z) => z.name), ["Быстрый доступ", "Основной склад", "В дорогу"]);
  assert.deepEqual(o.zones[1].boxes.map((b) => b.id), ["b2", "b10"]);
});

test("overview: counts packs per box and in total", () => {
  const o = buildOverview(locations, boxes, compartments, packs);
  assert.deepEqual(o.totals, { zones: 3, boxes: 3, packs: 4 });
  assert.equal(o.zones[0].boxes[0].packCount, 1);
  assert.equal(o.zones[1].boxes[0].packCount, 3);
  assert.equal(o.zones[1].boxes[1].packCount, 0);
  assert.equal(o.zones[1].boxes[1].categories, "Пока пусто");
  assert.equal(o.zones[2].boxes.length, 0);
});

test("overview: orphan packs (unknown compartment) are ignored", () => {
  const o = buildOverview(locations, boxes, compartments, [...packs, pack("px", "ghost", "Боль")]);
  assert.equal(o.totals.packs, 4);
});

test("box detail: natural compartment order, counts, default selection", () => {
  const cs: CompartmentRow[] = [
    { id: "a10", box_id: "b", code: "A10" },
    { id: "a2", box_id: "b", code: "A2" },
    { id: "a1", box_id: "b", code: "A1" },
  ];
  const d = buildBoxDetail(cs, [pack("p", "a2", "Боль", "Нурофен"), pack("q", "a2", "Боль", "Аспирин")], undefined);
  assert.deepEqual(d.cells.map((c) => c.code), ["A1", "A2", "A10"]);
  assert.equal(d.selectedId, "a1");
  assert.equal(d.items.length, 0);
  assert.equal(d.totalPacks, 2);

  const d2 = buildBoxDetail(cs, [pack("p", "a2", "Боль", "Нурофен"), pack("q", "a2", "Боль", "Аспирин")], "a2");
  assert.equal(d2.selectedCode, "A2");
  assert.deepEqual(d2.items.map((i) => i.medicationName), ["Аспирин", "Нурофен"]);
});

test("box detail: foreign or unknown selection falls back to the first compartment", () => {
  const d = buildBoxDetail([{ id: "a1", box_id: "b", code: "A1" }], [], "someone-elses-id");
  assert.equal(d.selectedId, "a1");
});

test("box detail: empty box", () => {
  const d = buildBoxDetail([], [], null);
  assert.deepEqual(d.cells, []);
  assert.equal(d.selectedId, null);
  assert.equal(d.selectedCode, null);
  assert.equal(d.categories, "Пока пусто");
});
