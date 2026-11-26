import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchAllRows } from "../lib/offline/paginate.ts";
import {
  SNAPSHOT_TABLES,
  buildSnapshot,
  findBoxIdByToken,
  isSnapshot,
  searchSnapshot,
  snapshotBox,
  snapshotCounts,
  snapshotOverview,
  snapshotTimeLabel,
  toCatalog,
} from "../lib/offline/snapshot.ts";
import { IDS, rows } from "./fixtures/offline-rows.ts";

const snapshot = () => buildSnapshot(rows(), "user-1", "2026-11-24T14:40:00.000Z");
const TODAY = "2026-11-25";
const names = (q: string, categoryId: string | null = null) =>
  searchSnapshot(toCatalog(snapshot()), { q, categoryId }, TODAY).map((r) => r.med.name);

test("buildSnapshot keeps only the listed fields", () => {
  const input = rows();
  Object.assign(input.medications[0]!, { created_by: "someone@example.test", photo_path: "x" });
  Object.assign(input.packs[0]!, { note: "secret" });
  const s = buildSnapshot(input, "user-1", "2026-11-24T14:40:00.000Z");
  assert.equal(s.ownerId, "user-1");
  assert.equal("created_by" in s.medications[0]!, false);
  assert.equal("photo_path" in s.medications[0]!, false);
  assert.equal("note" in s.packs[0]!, false);
  assert.equal(JSON.stringify(s).includes("example.test"), false);
  for (const table of SNAPSHOT_TABLES) assert.equal(s[table].length, input[table].length, table);
});

test("isSnapshot rejects junk, old schemas and a missing owner", () => {
  assert.equal(isSnapshot(snapshot()), true);
  assert.equal(isSnapshot(JSON.parse(JSON.stringify(snapshot()))), true);
  for (const bad of [null, undefined, "x", {}, { ...snapshot(), schema: 0 }, { ...snapshot(), ownerId: "" }, { ...snapshot(), packs: null }, { error: "denied" }]) {
    assert.equal(isSnapshot(bad), false);
  }
});

test("toCatalog joins packs with their box and compartment", () => {
  const med = toCatalog(snapshot()).find((m) => m.id === IDS.paracetamol)!;
  assert.equal(med.categoryName, "Боль и температура");
  assert.equal(med.packs.length, 2);
  assert.deepEqual(med.packs[0]!.place, {
    compartmentId: IDS.cellA1,
    code: "A1",
    boxId: IDS.boxA,
    boxName: "Аптечка",
    boxNumber: "1",
  });
});

test("a pack whose compartment is missing keeps no place", () => {
  const s = snapshot();
  s.compartments = [];
  assert.equal(toCatalog(s)[0]!.packs[0]!.place, null);
});

test("offline search: the same rules as online", () => {
  assert.deepEqual(names("ПАРАЦЕТ"), ["Парацетамол"]);
  assert.deepEqual(names("ежовый"), ["Ёжовый настой"]);
  assert.deepEqual(names("головная боль"), ["Парацетамол"]);
  assert.deepEqual(names("нет такого"), []);
  assert.equal(names("").length, 3);
  // The summary points at the most urgent pack.
  const [result] = searchSnapshot(toCatalog(snapshot()), { q: "paracetamol", categoryId: null }, TODAY);
  assert.equal(result!.summary.place!.code, "B1");
  assert.equal(result!.summary.status, "soon");
  assert.equal(result!.summary.totalQuantity, 7);
  assert.equal(result!.summary.otherPlaces, 1);
});

test("offline search: category and barcode", () => {
  assert.deepEqual(names("", IDS.category).sort(), ["Аспирин", "Парацетамол"]);
  assert.deepEqual(names("4006381333931"), ["Парацетамол"]);
  assert.deepEqual(names("4006381333931", IDS.boxA), []);
  assert.deepEqual(names("4820000000000"), []);
  assert.equal(snapshotCounts(toCatalog(snapshot())).total, 2);
});

test("boxes: overview, one box and the QR token", () => {
  const s = snapshot();
  const overview = snapshotOverview(s);
  assert.deepEqual(overview.totals, { zones: 1, boxes: 2, packs: 3 });
  assert.deepEqual(overview.zones[0]!.boxes.map((b) => [b.name, b.packCount]), [["Аптечка", 2], ["Дорожная", 1]]);

  const view = snapshotBox(s, IDS.boxA, IDS.cellA2)!;
  assert.deepEqual(view.detail.cells.map((c) => c.code), ["A1", "A2"]);
  assert.equal(view.detail.selectedCode, "A2");
  assert.deepEqual(view.detail.items.map((i) => i.medicationName), ["Ёжовый настой"]);
  assert.equal(view.locationName, "Быстрый доступ");
  // A foreign compartment falls back to the first one; an unknown box is null.
  assert.equal(snapshotBox(s, IDS.boxA, IDS.cellB1)!.detail.selectedCode, "A1");
  assert.equal(snapshotBox(s, IDS.zone, null), null);

  assert.equal(findBoxIdByToken(s, IDS.tokenB.toUpperCase()), IDS.boxB);
  assert.equal(findBoxIdByToken(s, IDS.boxB), null);
});

test("snapshotTimeLabel: day, month and time of the device", () => {
  assert.equal(snapshotTimeLabel("2026-11-24T14:40:00.000Z", "UTC"), "24.11 14:40");
  assert.equal(snapshotTimeLabel("2026-11-24T14:40:00.000Z", "Europe/Chisinau"), "24.11 16:40");
  assert.equal(snapshotTimeLabel("2026-01-05T00:05:00.000Z", "UTC"), "05.01 00:05");
  assert.equal(snapshotTimeLabel("nonsense"), "");
});

test("fetchAllRows reads past the 1000-row limit", async () => {
  const table = Array.from({ length: 2300 }, (_, i) => i);
  const asked: [number, number][] = [];
  const all = await fetchAllRows(async (from, to) => {
    asked.push([from, to]);
    return { rows: table.slice(from, to + 1), total: table.length };
  });
  assert.deepEqual(all, table);
  assert.deepEqual(asked, [[0, 999], [1000, 1999], [2000, 2999]]);
});

test("fetchAllRows: a lower server limit, an empty table, a table that shrank", async () => {
  const table = Array.from({ length: 25 }, (_, i) => i);
  const limited = await fetchAllRows(async (from) => ({ rows: table.slice(from, from + 10), total: 25 }), 1000);
  assert.deepEqual(limited, table);
  assert.deepEqual(await fetchAllRows(async () => ({ rows: [], total: 0 })), []);
  // Rows deleted while paging: stop on an empty page instead of looping.
  const shrunk = await fetchAllRows(async (from) => ({ rows: from === 0 ? [1, 2] : [], total: 5 }), 2);
  assert.deepEqual(shrunk, [1, 2]);
});

test("fetchAllRows passes errors on", async () => {
  await assert.rejects(fetchAllRows(async () => Promise.reject(new Error("boom"))), /boom/);
});
