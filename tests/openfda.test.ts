import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  cleanField,
  detectForm,
  extractStrength,
  parseOpenFdaResponse,
  splitGenericName,
  tidyCase,
} from "../lib/openfda/parse.ts";
import { buildOpenFdaSearch, openFdaUrl } from "../lib/openfda/query.ts";

// Real api.fda.gov/drug/label.json responses, trimmed to the fields we read
// (tests/fixtures/openfda). No network in tests.
const fixture = (name: string): unknown =>
  JSON.parse(readFileSync(new URL(`./fixtures/openfda/${name}.json`, import.meta.url), "utf8"));

test("Advil: name, substance, form, strength, manufacturer", () => {
  const r = parseOpenFdaResponse(fixture("label-advil"));
  assert.ok(r.ok);
  assert.equal(r.items.length, 5);
  const advil = r.items.find((i) => i.name === "Advil");
  assert.deepEqual(advil && { ...advil, key: "" }, {
    key: "",
    name: "Advil",
    inn: "Ibuprofen",
    form: "tablet",
    strength: "200 mg",
    manufacturer: "Haleon US Holdings LLC",
  });
  const dual = r.items[0];
  assert.equal(dual.inn, "Ibuprofen, Acetaminophen"); // form cut off the generic name
  assert.equal(dual.form, "film-coated tablet"); // from generic_name "…TABLET, FILM COATED"
  assert.equal(dual.strength, "250 mg / 125 mg");
  const cream = r.items.find((i) => i.name === "Advil Targeted Relief");
  assert.equal(cream?.form, "cream");
  assert.equal(cream?.strength, "3.1% / 0.025% / 10%");
  assert.equal(r.items.find((i) => i.name === "Advil Cold And Sinus")?.form, "softgel");
});

test("acetaminophen: '(in each 30 mL)' is not a strength; ALL CAPS is tidied", () => {
  const r = parseOpenFdaResponse(fixture("label-acetaminophen"));
  assert.ok(r.ok);
  const flu = r.items.find((i) => i.name === "Daytime Cold and Flu");
  assert.equal(flu?.strength, "650 mg / 20 mg / 10 mg");
  assert.equal(flu?.inn, "Acetaminophen, Dextromethorphan Hbr, Phenylephrine Hcl");
  assert.equal(r.items.find((i) => i.manufacturer === "Amazon.com Services LLC")?.form, "caplet");
});

test("prescription label: form and strength from 'Dosage forms and strengths'", () => {
  const r = parseOpenFdaResponse(fixture("label-ibuprofen-famotidine"));
  assert.ok(r.ok);
  // three labels of the same product (repackagers) collapse into one row
  assert.equal(r.items.length, 1);
  assert.equal(r.items[0].form, "tablet");
  assert.equal(r.items[0].strength, "800 mg/26.6 mg");
});

test("'No matches found' (HTTP 404 body) is an empty result, not an error", () => {
  assert.deepEqual(parseOpenFdaResponse(fixture("not-found")), { ok: true, items: [] });
});

test("malformed or hostile responses", () => {
  for (const bad of [null, "x", 42, [], {}, { results: "x" }, { error: { code: "SERVER_ERROR" } }]) {
    assert.deepEqual(parseOpenFdaResponse(bad), { ok: false }, JSON.stringify(bad));
  }
  const r = parseOpenFdaResponse({
    results: [
      null,
      { openfda: { brand_name: [42] } }, // no usable name → skipped
      { openfda: { brand_name: ["<b>X\u0000 Y</b>  "], generic_name: "not an array" }, set_id: "../../etc" },
      { openfda: { brand_name: ["Z".repeat(500)] } },
    ],
  });
  assert.ok(r.ok);
  assert.equal(r.items.length, 2);
  assert.equal(r.items[0].name, "<b>X Y</b>"); // text only; React escapes it on render
  assert.equal(r.items[0].key, "<b>X Y</b>"); // unsafe set_id is not used as a key
  assert.equal(r.items[1].name.length, 120);
});

test("at most 10 rows", () => {
  const results = Array.from({ length: 30 }, (_, i) => ({ openfda: { brand_name: [`Drug ${i}`] } }));
  const r = parseOpenFdaResponse({ results });
  assert.ok(r.ok && r.items.length === 10);
});

test("helpers: tidyCase, cleanField, detectForm, extractStrength, splitGenericName", () => {
  assert.equal(tidyCase("IBUPROFEN AND FAMOTIDINE"), "Ibuprofen And Famotidine");
  assert.equal(tidyCase("basic care acetaminophen"), "basic care acetaminophen");
  assert.equal(cleanField("  a \n b  "), "a b");
  assert.equal(cleanField(""), null);
  assert.equal(detectForm("100 Coated Gel Caplets"), "caplet");
  assert.equal(detectForm("Pain relieving gel"), "gel");
  assert.equal(detectForm("Extended-release tablets"), "extended-release tablet");
  assert.equal(detectForm(null), null);
  assert.equal(extractStrength("Ibuprofen 200mg"), "200 mg");
  assert.equal(extractStrength("Amoxicillin 250 mg/5 mL"), "250 mg/5 mL");
  assert.equal(extractStrength("no numbers"), null);
  assert.deepEqual(splitGenericName("IBUPROFEN, ACETAMINOPHEN TABLET, FILM COATED"), {
    inn: "IBUPROFEN, ACETAMINOPHEN",
    form: "film-coated tablet",
  });
  assert.deepEqual(splitGenericName("IBUPROFEN"), { inn: "IBUPROFEN", form: null });
});

test("search expression: words AND, spellings OR, US names, barcode → upc", () => {
  assert.equal(
    buildOpenFdaSearch("Ibuprofen 200"),
    '(openfda.brand_name:"ibuprofen" openfda.generic_name:"ibuprofen") AND (openfda.brand_name:"200" openfda.generic_name:"200")',
  );
  const ru = buildOpenFdaSearch("парацетамол") ?? "";
  assert.match(ru, /openfda\.brand_name:"paracetamol"/);
  assert.match(ru, /openfda\.generic_name:"acetaminophen"/);
  assert.equal(buildOpenFdaSearch("ib"), null);
  assert.equal(buildOpenFdaSearch(""), null);
  assert.equal(buildOpenFdaSearch("305730150200"), 'openfda.upc:"0305730150200" openfda.upc:"305730150200"');
  assert.equal(buildOpenFdaSearch("5995327132174"), 'openfda.upc:"5995327132174"');
  assert.equal(buildOpenFdaSearch("5995327132175"), null); // broken barcode: do not ask
  // quotes and operators in the query cannot escape a term: every quoted term is [a-z0-9]+
  const hostile = buildOpenFdaSearch('advil" OR _exists_:x (') ?? "";
  assert.match(hostile, /^(?:[^"]*"[a-z0-9]+")*[^"]*$/);
  assert.doesNotMatch(hostile, /_exists_/);
});

test("request URL", () => {
  const url = openFdaUrl('openfda.brand_name:"advil"', "https://api.fda.gov/drug/label.json");
  assert.equal(url, "https://api.fda.gov/drug/label.json?search=openfda.brand_name%3A%22advil%22&limit=25");
});
