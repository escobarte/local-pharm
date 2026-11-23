import { test } from "node:test";
import assert from "node:assert/strict";
import {
  attentionCounts,
  filterMedications,
  matchesQuery,
  normalizeText,
  parseSearchParams,
  placeLabel,
  runSearch,
  searchHref,
  sourceLabel,
  sourceName,
  searchHome,
  summarize,
  type SearchParams,
} from "../lib/medications/search.ts";
import type { CatalogMedication, CatalogPack, PackPlace } from "../lib/medications/types.ts";

const TODAY = "2026-11-22";
const CAT_COLD = "11111111-1111-4111-8111-111111111111";
const CAT_PAIN = "22222222-2222-4222-8222-222222222222";

const place = (code = "A1", boxName = "Аптечка", boxNumber: string | null = "1", boxId = "b1"): PackPlace => ({
  compartmentId: `c-${boxId}-${code}`,
  code,
  boxId,
  boxName,
  boxNumber,
});

const pack = (over: Partial<CatalogPack> = {}): CatalogPack => ({
  id: "p",
  quantity: 1,
  expiry_date: null,
  opened_at: null,
  running_low: false,
  place: place(),
  ...over,
});

const med = (over: Partial<CatalogMedication> = {}): CatalogMedication => ({
  id: "m",
  name: "Парацетамол",
  activeIngredient: "парацетамол",
  form: "таблетки",
  dosage: "500 мг",
  indications: "Головная боль, жар",
  source: "manual",
  barcode: null,
  registryCode: null,
  categoryId: CAT_PAIN,
  categoryName: "Боль и температура",
  packs: [pack()],
  ...over,
});

const none: SearchParams = { q: "", categoryId: null, attention: null };

test("normalizeText: case, ё, whitespace", () => {
  assert.equal(normalizeText("  ЁЛКА   Парацетамол "), "елка парацетамол");
  assert.equal(normalizeText(null), "");
  assert.equal(normalizeText(undefined), "");
});

test("matchesQuery: Cyrillic, any case", () => {
  const m = med();
  assert.equal(matchesQuery(m, "ПАРАЦЕТ"), true);
  assert.equal(matchesQuery(m, "парацет"), true);
  assert.equal(matchesQuery(m, "ПаРаЦеТаМоЛ"), true);
});

test("matchesQuery: name, active ingredient, category, indications", () => {
  const m = med({ name: "Панадол", activeIngredient: "парацетамол" });
  assert.equal(matchesQuery(m, "панад"), true, "name");
  assert.equal(matchesQuery(m, "парацет"), true, "active ingredient");
  assert.equal(matchesQuery(m, "температур"), true, "category");
  assert.equal(matchesQuery(m, "головная"), true, "indications");
  assert.equal(matchesQuery(m, "ибупрофен"), false);
});

test("matchesQuery: all words must match, in any order", () => {
  const m = med();
  assert.equal(matchesQuery(m, "боль таблетки"), true);
  assert.equal(matchesQuery(m, "таблетки боль"), true);
  assert.equal(matchesQuery(m, "боль сироп"), false);
});

test("matchesQuery: ё equals е, empty matches all, missing fields are fine", () => {
  assert.equal(matchesQuery(med({ indications: "Чёрный кашель" }), "черный"), true);
  assert.equal(matchesQuery(med({ indications: "Черный кашель" }), "чёрный"), true);
  assert.equal(matchesQuery(med(), ""), true);
  assert.equal(matchesQuery(med(), "   "), true);
  assert.equal(
    matchesQuery(med({ activeIngredient: null, indications: null, categoryName: null, form: null, dosage: null }), "x"),
    false,
  );
});

test("matchesQuery: regex characters are plain text", () => {
  assert.equal(matchesQuery(med(), ".*"), false);
  assert.equal(matchesQuery(med({ name: "Витамин C (500)" }), "(500)"), true);
  assert.equal(matchesQuery(med({ name: "100%" }), "%"), true);
});

test("parseSearchParams: trims, caps and validates", () => {
  assert.deepEqual(parseSearchParams({}), none);
  assert.deepEqual(parseSearchParams({ q: "  аспирин   кардио ", cat: CAT_COLD, f: "low" }), {
    q: "аспирин кардио",
    categoryId: CAT_COLD,
    attention: "low",
  });
  assert.equal(parseSearchParams({ q: "x".repeat(500) }).q.length, 100);
  assert.equal(parseSearchParams({ cat: "not-a-uuid" }).categoryId, null);
  assert.equal(parseSearchParams({ cat: "' or 1=1 --" }).categoryId, null);
  assert.equal(parseSearchParams({ f: "drop" }).attention, null);
  assert.equal(parseSearchParams({ q: ["first", "second"] }).q, "first");
});

test("searchHref keeps only non-empty parts", () => {
  assert.equal(searchHref({}), "/search");
  assert.equal(searchHref({ q: "" }), "/search");
  assert.equal(searchHref({ categoryId: CAT_COLD }), `/search?cat=${CAT_COLD}`);
  assert.equal(searchHref({ q: "боль", attention: "low" }), "/search?q=%D0%B1%D0%BE%D0%BB%D1%8C&f=low");
});

test("summarize: totals, nearest expiry, worst status, low stock", () => {
  const s = summarize(
    med({
      packs: [
        pack({ id: "1", quantity: 10, expiry_date: "2027-06-30" }),
        pack({ id: "2", quantity: 4, expiry_date: "2026-12-10", running_low: true }),
        pack({ id: "3", quantity: 2 }),
      ],
    }),
    TODAY,
  );
  assert.equal(s.packCount, 3);
  assert.equal(s.totalQuantity, 16);
  assert.equal(s.nearestExpiry, "2026-12-10");
  assert.equal(s.status, "soon");
  assert.equal(s.lowStock, true);
});

test("summarize: expired wins over soon; no packs", () => {
  const s = summarize(
    med({ packs: [pack({ expiry_date: "2026-11-01" }), pack({ expiry_date: "2026-12-01" })] }),
    TODAY,
  );
  assert.equal(s.status, "expired");
  const empty = summarize(med({ packs: [] }), TODAY);
  assert.equal(empty.packCount, 0);
  assert.equal(empty.totalQuantity, 0);
  assert.equal(empty.status, "none");
  assert.equal(empty.place, null);
  assert.equal(empty.nearestExpiry, null);
});

test("summarize: place of the most urgent pack, count of other places", () => {
  const s = summarize(
    med({
      packs: [
        pack({ id: "1", expiry_date: "2027-05-31", place: place("B2", "Склад", "2", "b2") }),
        pack({ id: "2", expiry_date: "2026-12-15", place: place("A1") }),
        pack({ id: "3", expiry_date: "2027-01-31", place: place("A1") }),
      ],
    }),
    TODAY,
  );
  assert.equal(s.place?.code, "A1");
  assert.equal(s.otherPlaces, 1, "two packs in A1 are one place");
});

test("summarize: undated packs do not hide the nearest date", () => {
  const s = summarize(med({ packs: [pack({ id: "1" }), pack({ id: "2", expiry_date: "2027-01-31" })] }), TODAY);
  assert.equal(s.nearestExpiry, "2027-01-31");
  assert.equal(s.status, "ok");
});

test("placeLabel: with and without box number", () => {
  assert.equal(placeLabel(place("B2", "Аптечка", "1")), "№1 Аптечка · B2");
  assert.equal(placeLabel(place("B2", "Аптечка", null)), "Аптечка · B2");
});

test("filterMedications: category", () => {
  const meds = [med({ id: "a" }), med({ id: "b", categoryId: CAT_COLD })];
  assert.deepEqual(filterMedications(meds, { ...none, categoryId: CAT_COLD }, TODAY).map((m) => m.id), ["b"]);
});

test("filterMedications: attention filters use packs", () => {
  const meds = [
    med({ id: "soon", packs: [pack({ expiry_date: "2026-12-05" })] }),
    med({ id: "expired", packs: [pack({ expiry_date: "2026-10-01" })] }),
    med({ id: "low", packs: [pack({ running_low: true, expiry_date: "2030-01-31" })] }),
    med({ id: "fine", packs: [pack({ expiry_date: "2030-01-31" })] }),
    med({ id: "empty", packs: [] }),
  ];
  const ids = (attention: SearchParams["attention"]) =>
    filterMedications(meds, { ...none, attention }, TODAY).map((m) => m.id);
  assert.deepEqual(ids("expiring"), ["soon"]);
  assert.deepEqual(ids("expired"), ["expired"]);
  assert.deepEqual(ids("low"), ["low"]);
  assert.equal(ids(null).length, 5);
});

test("runSearch: expired first, then expiring, then by name (Russian order, ё/е ignored)", () => {
  const meds = [
    med({ id: "z", name: "Ярутин", packs: [pack({ expiry_date: "2030-01-31" })] }),
    med({ id: "a", name: "Аспирин", packs: [pack({ expiry_date: "2030-01-31" })] }),
    med({ id: "soon", name: "Бромгексин", packs: [pack({ expiry_date: "2026-12-10" })] }),
    med({ id: "exp", name: "Эвкалипт", packs: [pack({ expiry_date: "2026-01-31" })] }),
    med({ id: "nodate", name: "Ацетон", packs: [pack()] }),
  ];
  assert.deepEqual(runSearch(meds, none, TODAY).map((r) => r.med.id), ["exp", "soon", "a", "nodate", "z"]);
});

test("runSearch: query + category combine", () => {
  const meds = [
    med({ id: "1", name: "Нурофен", categoryId: CAT_PAIN }),
    med({ id: "2", name: "Нурофен Экспресс", categoryId: CAT_COLD }),
  ];
  assert.deepEqual(
    runSearch(meds, { q: "нурофен", categoryId: CAT_COLD, attention: null }, TODAY).map((r) => r.med.id),
    ["2"],
  );
});

test("attentionCounts: soon / expired / running low are counted per pack", () => {
  const counts = attentionCounts(
    [
      { expiry_date: "2026-11-22", running_low: false }, // today → soon (0 days)
      { expiry_date: "2026-12-22", running_low: false }, // 30 days → soon
      { expiry_date: "2026-12-23", running_low: false }, // 31 days → ok
      { expiry_date: "2026-11-21", running_low: true }, // yesterday → expired + low
      { expiry_date: null, running_low: true },
      { expiry_date: null, running_low: false },
    ],
    TODAY,
  );
  assert.deepEqual(counts, { expiring: 2, expired: 1, lowStock: 2 });
  assert.deepEqual(attentionCounts([], TODAY), { expiring: 0, expired: 0, lowStock: 0 });
});

test("sourceLabel / sourceName", () => {
  assert.equal(sourceLabel("amdm"), "Источник: Реестр AMDM");
  assert.equal(sourceLabel("manual"), "Источник: Вручную");
  assert.equal(sourceLabel("weird"), "Источник: не указан");
  assert.equal(sourceLabel(null), "Источник: не указан");
  assert.equal(sourceName("amdm"), "Реестр AMDM");
  assert.equal(sourceName("manual"), "Вручную");
  assert.equal(sourceName(undefined), "Источник не указан");
  assert.equal(sourceName("openfda"), "Международные базы (openFDA)");
  assert.equal(sourceLabel("openfda"), "Источник: Международные базы (openFDA)");
});

test("searchHome: barcode query matches by barcode (any stored spelling), text query as usual", () => {
  const meds = [
    med({ id: "a", name: "Нурофен", activeIngredient: "ибупрофен", barcode: "317094291185" }),
    med({ id: "b", name: "Парацетамол", barcode: "5995327132174" }),
    med({ id: "c", name: "Нурофен форте", activeIngredient: "ибупрофен" }),
  ];
  assert.deepEqual(searchHome(meds, "0317094291185", TODAY).map((r) => r.med.id), ["a"]);
  assert.deepEqual(searchHome(meds, "5995 3271 32174", TODAY).map((r) => r.med.id), ["b"]);
  assert.deepEqual(searchHome(meds, "4750258202263", TODAY), []);
  assert.deepEqual(searchHome(meds, "ибупрофен", TODAY).map((r) => r.med.id).sort(), ["a", "c"]);
  assert.deepEqual(searchHome(meds, "   ", TODAY), []);
  assert.equal(searchHome(meds, "о", TODAY, 1).length, 1);
});
