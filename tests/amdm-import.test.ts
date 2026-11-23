import { test } from "node:test";
import assert from "node:assert/strict";
import {
  REGISTRY_COLUMNS,
  cleanBarcode,
  cleanRegistryRow,
  cleanText,
  csvField,
  csvLine,
  parseRegistryDate,
  parseRx,
  parseShelfLife,
  sqlLiteral,
  upsertStatement,
} from "../scripts/amdm/clean.ts";

// Raw row as xls_to_json.py writes it (all strings; integers without ".0").
const RAW = [
  "2",
  "0908900192",
  "Nazoferon® ",
  "picături nazale, soluţie",
  "100000 UI/ml",
  "5 ml",
  " N1",
  "Farmak SА, Ucraina", // Cyrillic А
  "Ucraina",
  "Farmak SА,  Ucraina",
  "26127",
  "30.04.2020",
  "L03AB05",
  "Interferonum alfa-2b",
  "36",
  "0",
  "Repetată generală",
  "undefined",
  "OTC",
  "undefined",
];

test("cleanText: trims, collapses, undefined/empty → null, homoglyphs, private hyphen", () => {
  assert.equal(cleanText("  a   b\n c "), "a b c");
  assert.equal(cleanText("undefined"), null);
  assert.equal(cleanText(" UNDEFINED "), null);
  assert.equal(cleanText(""), null);
  assert.equal(cleanText(null), null);
  assert.equal(cleanText("Farmak SА"), "Farmak SA");
  assert.equal(cleanText("HoffmannLa Roche"), "Hoffmann-La Roche");
  assert.equal(cleanText("Нурофен"), "Нурофен"); // all-Cyrillic text stays
});

test("dates: dd.mm.yyyy and ISO → ISO; garbage and impossible dates → null", () => {
  assert.equal(parseRegistryDate("03.07.2018"), "2018-07-03");
  assert.equal(parseRegistryDate("2026-03-01"), "2026-03-01");
  assert.equal(parseRegistryDate("undefined"), null);
  assert.equal(parseRegistryDate("31.02.2020"), null);
  assert.equal(parseRegistryDate("3.7.2018"), null);
});

test("barcode cell: '0' and junk → null, 8–14 digits kept", () => {
  assert.equal(cleanBarcode("0"), null);
  assert.equal(cleanBarcode(""), null);
  assert.equal(cleanBarcode(" 4823012500766 "), "4823012500766");
  assert.equal(cleanBarcode("59411093"), "59411093");
  assert.equal(cleanBarcode("1234567"), null);
  assert.equal(cleanBarcode("48230125OO766"), null);
});

test("shelf life and RX", () => {
  assert.equal(parseShelfLife("36"), 36);
  assert.equal(parseShelfLife("0"), null);
  assert.equal(parseShelfLife("1.5"), null);
  assert.equal(parseRx("RX"), true);
  assert.equal(parseRx("OTC"), false);
  assert.equal(parseRx("?"), null);
});

test("cleanRegistryRow: full row", () => {
  const r = cleanRegistryRow(RAW);
  assert.ok(r.ok);
  assert.deepEqual(r.row, {
    code: "0908900192",
    name: "Nazoferon®",
    form: "picături nazale, soluţie",
    dose: "100000 UI/ml",
    volume: "5 ml",
    pack_size: "N1",
    holder: "Farmak SA, Ucraina",
    country: "Ucraina",
    manufacturer: "Farmak SA, Ucraina",
    reg_number: "26127",
    reg_date: "2020-04-30",
    atc: "L03AB05",
    inn: "Interferonum alfa-2b",
    shelf_life_months: 36,
    barcode: null,
    rx: false,
    med_type: null,
    search_text: "nazoferon interferonum alfa2b l03ab05",
  });
  assert.deepEqual(Object.keys(r.row), [...REGISTRY_COLUMNS]);
});

test("cleanRegistryRow: bad code or empty name is rejected", () => {
  assert.equal(cleanRegistryRow(RAW.map((v, i) => (i === 1 ? "12a" : v))).ok, false);
  assert.equal(cleanRegistryRow(RAW.map((v, i) => (i === 2 ? "undefined" : v))).ok, false);
});

test("CSV: leading zeros kept, quoting, null → empty", () => {
  assert.equal(csvField("0908900192"), "0908900192");
  assert.equal(csvField(null), "");
  assert.equal(csvField(false), "false");
  assert.equal(csvField('Uzina "X", SA'), '"Uzina ""X"", SA"');
  assert.equal(csvField(" lead"), '" lead"');
  const r = cleanRegistryRow(RAW);
  assert.ok(r.ok);
  assert.ok(csvLine(r.row).startsWith('0908900192,Nazoferon®,"picături nazale, soluţie",'));
});

test("SQL: literals escaped, upsert by code", () => {
  assert.equal(sqlLiteral("O'Brien"), "'O''Brien'");
  assert.equal(sqlLiteral(null), "null");
  assert.equal(sqlLiteral(36), "36");
  assert.equal(sqlLiteral(true), "true");
  const r = cleanRegistryRow(RAW);
  assert.ok(r.ok);
  const sql = upsertStatement([r.row]);
  assert.match(sql, /^insert into public\.amdm_registry \(code, name, /);
  assert.match(sql, /'0908900192'/);
  assert.match(sql, /on conflict \(code\) do update set name = excluded\.name, /);
  assert.doesNotMatch(sql, /code = excluded\.code/);
});
