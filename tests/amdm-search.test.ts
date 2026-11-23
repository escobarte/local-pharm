import { test } from "node:test";
import assert from "node:assert/strict";
import { categoryForAtc } from "../lib/amdm/atc-category.ts";
import { manufacturerLabel, prefillFromRegistry, registrySubtitle } from "../lib/amdm/format.ts";
import { buildSearchText, normalizeSearchText } from "../lib/amdm/normalize.ts";
import {
  addPageHref,
  isRegistryCode,
  parseBarcodeQuery,
  planRegistryQuery,
  rankRegistryItems,
  wordFilters,
} from "../lib/amdm/search.ts";
import type { RegistryItem } from "../lib/amdm/types.ts";

// ---------- normalization (shared with scripts/amdm) ----------

test("normalize: lowercase, no diacritics, no ®™", () => {
  assert.equal(normalizeSearchText("Nurofen® Junior cu aromă de portocale"), "nurofen junior cu aroma de portocale");
  assert.equal(normalizeSearchText("Citomix™"), "citomix");
  assert.equal(normalizeSearchText("Clorhexidină  ŞŢÎÂ șțîâ"), "clorhexidina stia stia");
  assert.equal(normalizeSearchText("World Medicine İlaç San."), "world medicine ilac san");
  assert.equal(normalizeSearchText("Kırklareli Öz Üç Ğ"), "kirklareli oz uc g");
});

test("normalize: hyphens and apostrophes join, other punctuation splits, spaces collapse", () => {
  assert.equal(normalizeSearchText("No-spa® forte"), "nospa forte");
  assert.equal(normalizeSearchText("HoffmannLa Roche"), "hoffmannla roche");
  assert.equal(normalizeSearchText("  2 mg/ml,(N10)  "), "2 mg ml n10");
  assert.equal(normalizeSearchText("Ethyl aether, α - bromoisovalericum"), "ethyl aether bromoisovalericum");
  assert.equal(normalizeSearchText(""), "");
  assert.equal(normalizeSearchText(null), "");
});

test("normalize: output is always [a-z0-9 ] (safe inside a PostgREST filter)", () => {
  for (const s of ['a,b.c(d)e*f%g"h\'i\\j:k', "Нурофен®", "x y\tz\nw", "µg ×2 – ok"]) {
    assert.match(normalizeSearchText(s), /^[a-z0-9 ]*$/, s);
  }
});

test("normalize: stray Cyrillic in data is transliterated", () => {
  assert.equal(normalizeSearchText("Farmak SА"), "farmak sa"); // Cyrillic А
});

test("buildSearchText: name + inn + atc + barcode", () => {
  assert.equal(
    buildSearchText({ name: "Nurofen® Forte", inn: "Ibuprofenum", atc: "M01AE01", barcode: "5000158100121" }),
    "nurofen forte ibuprofenum m01ae01 5000158100121",
  );
  assert.equal(buildSearchText({ name: "Analgin", inn: null, atc: null, barcode: null }), "analgin");
});

// ---------- barcode ----------

test("barcode: 8–13 digits, spaces and hyphens ignored", () => {
  assert.deepEqual(parseBarcodeQuery("4823012500766"), ["4823012500766"]);
  assert.deepEqual(parseBarcodeQuery("59411093"), ["59411093"]);
  assert.deepEqual(parseBarcodeQuery(" 4 823012 500766 "), ["4823012500766"]);
  assert.deepEqual(parseBarcodeQuery("482-3012-500766"), ["4823012500766"]);
});

test("barcode: UPC-A (12) and EAN-13 with a leading 0 try each other", () => {
  assert.deepEqual(parseBarcodeQuery("317094291185"), ["317094291185", "0317094291185"]);
  assert.deepEqual(parseBarcodeQuery("0317094291185"), ["0317094291185", "317094291185"]);
});

test("barcode: anything else is not a barcode", () => {
  for (const q of ["1234567", "12345678901234", "4823012500766a", "nurofen", "", "500 mg", "12.345.678"]) {
    assert.equal(parseBarcodeQuery(q), null, q);
  }
});

// ---------- query plan ----------

test("plan: empty, too short, barcode, text", () => {
  assert.deepEqual(planRegistryQuery("   "), { kind: "empty" });
  assert.deepEqual(planRegistryQuery("a"), { kind: "too-short" });
  assert.deepEqual(planRegistryQuery("®"), { kind: "too-short" });
  assert.deepEqual(planRegistryQuery("4823012500766"), { kind: "barcode", candidates: ["4823012500766"] });
  assert.deepEqual(planRegistryQuery("Nurofen Forte"), { kind: "text", words: [["nurofen"], ["forte"]] });
  const ru = planRegistryQuery("Цитрамон");
  assert.ok(ru.kind === "text" && ru.words[0][0] === "citramon");
});

test("plan: short digit strings are text (dose), not barcode", () => {
  assert.deepEqual(planRegistryQuery("paracetamol 500"), { kind: "text", words: [["paracetamol"], ["500"]] });
});

test("plan: query length and word count are capped", () => {
  const plan = planRegistryQuery("a1 b2 c3 d4 e5 f6 g7 h8");
  assert.ok(plan.kind === "text" && plan.words.length === 6);
  const long = planRegistryQuery("x".repeat(500));
  assert.ok(long.kind === "text" && long.words[0][0].length === 100);
});

test("wordFilters: one OR group per word", () => {
  assert.deepEqual(wordFilters([["nurofen"], ["noshpa", "nospa"]]), [
    "search_text.like.*nurofen*",
    "search_text.like.*noshpa*,search_text.like.*nospa*",
  ]);
});

// ---------- ranking ----------

const item = (code: string, name: string, extra: Partial<RegistryItem> = {}): RegistryItem => ({
  code,
  name,
  form: null,
  dose: null,
  volume: null,
  packSize: null,
  inn: null,
  atc: null,
  manufacturer: null,
  country: null,
  barcode: null,
  rx: null,
  ...extra,
});

test("ranking: name prefix → name contains → elsewhere, then by name and dose", () => {
  const rows = [
    item("1", "Gripocitron", { inn: "Paracetamolum" }),
    item("2", "Paracetamol", { dose: "500 mg" }),
    item("3", "Antinevralgic® P", { inn: "Paracetamolum" }),
    item("4", "Paracetamol", { dose: "200 mg" }),
    item("5", "Efferalgan Paracetamol"),
  ];
  const ranked = rankRegistryItems(rows, [["paracetamol"]]).map((r) => r.code);
  assert.deepEqual(ranked, ["4", "2", "5", "3", "1"]);
});

test("ranking: Cyrillic variants count, limit applies", () => {
  const rows = [item("1", "Zitramon"), item("2", "Citramon-BP"), item("3", "Aspirin")];
  const ranked = rankRegistryItems(rows, [["citramon", "zitramon"]], 2).map((r) => r.code);
  assert.deepEqual(ranked, ["2", "1"]);
});

// ---------- ATC → category ----------

test("ATC → category only where the first letter is unambiguous", () => {
  assert.equal(categoryForAtc("C09AA05"), "Давление и сердце");
  assert.equal(categoryForAtc(" c01 "), "Давление и сердце");
  for (const atc of ["N02BE01", "M01AE01", "R06AX13", "A07BA01", "J01CA04", "D08AC02", "A11", "", null, undefined]) {
    assert.equal(categoryForAtc(atc), null, String(atc));
  }
});

// ---------- display / prefill ----------

test("manufacturerLabel: first site only, country added when missing", () => {
  assert.equal(manufacturerLabel("Geropharm SRL, Rusia; Geropharm SRL, Rusia", "Rusia"), "Geropharm SRL, Rusia");
  assert.equal(manufacturerLabel("Farmak SA", "Ucraina"), "Farmak SA, Ucraina");
  assert.equal(manufacturerLabel(null, "Germania"), "Germania");
  assert.equal(manufacturerLabel(null, null), null);
});

test("registrySubtitle: form · dose, volume · pack", () => {
  assert.equal(
    registrySubtitle(item("1", "X", { form: "soluție injectabilă", dose: "2 mg/ml", volume: "2 ml", packSize: "N5" })),
    "soluție injectabilă · 2 mg/ml, 2 ml · N5",
  );
  assert.equal(registrySubtitle(item("1", "X")), "");
});

test("prefill: ® / ™ dropped, dose falls back to volume, cut to 120", () => {
  const p = prefillFromRegistry(
    item("1", "Nurofen®  Forte", { inn: "Ibuprofenum", form: "x".repeat(132), volume: "5 ml" }),
  );
  assert.equal(p.name, "Nurofen Forte");
  assert.equal(p.activeIngredient, "Ibuprofenum");
  assert.equal(p.form.length, 120);
  assert.equal(p.dosage, "5 ml");
});

// ---------- URL ----------

test("registry code: digits only, leading zeros kept", () => {
  assert.equal(isRegistryCode("0908900192"), true);
  assert.equal(isRegistryCode("7671799"), true);
  for (const bad of ["", "abc", "12 3", "1".repeat(17), null, 123]) assert.equal(isRegistryCode(bad), false);
});

test("addPageHref keeps box / compartment and the query", () => {
  assert.equal(addPageHref({}), "/add");
  assert.equal(addPageHref({ mode: "manual", q: "x", reg: "1", box: "b" }), "/add?box=b");
  assert.equal(addPageHref({ mode: "search" }), "/add?mode=search");
  assert.equal(
    addPageHref({ mode: "search", q: "но-шпа", reg: "0908900192", cell: "c" }),
    "/add?mode=search&q=%D0%BD%D0%BE-%D1%88%D0%BF%D0%B0&reg=0908900192&cell=c",
  );
});
