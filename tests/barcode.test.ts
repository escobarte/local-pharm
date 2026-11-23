import { test } from "node:test";
import assert from "node:assert/strict";
import {
  barcodeLookupVariants,
  gs1CheckDigit,
  hasValidCheckDigit,
  normalizeStoredBarcode,
  parseBarcode,
  parseOptionalBarcode,
  sameBarcode,
} from "../lib/barcode.ts";

// Real codes from the AMDM registry export (Phase 4a data).
const REGISTRY_VALID = [
  "5995327132174", // Alzepil®, Hungary
  "4750258202263", // EAN-13, Latvia
  "4820017710299", // Aclasta®, Ukraine
  "59411093", // Trombostop®, EAN-8, Romania
];
const REGISTRY_UPC = "317094291185"; // Guna®-Lympho, 12 digits = UPC-A
const REGISTRY_BROKEN = ["4823002202916", "401305401389"]; // Diazolin, Lerkamen® 10: wrong check digit

test("GS1 check digit", () => {
  assert.equal(gs1CheckDigit("599532713217"), 4);
  assert.equal(gs1CheckDigit("5941109"), 3);
  assert.equal(gs1CheckDigit("31709429118"), 5);
  assert.equal(gs1CheckDigit("000000000000"), 0);
});

test("real registry codes: EAN-13 and EAN-8 are valid and kept as is", () => {
  for (const code of REGISTRY_VALID) {
    assert.equal(hasValidCheckDigit(code), true, code);
    assert.deepEqual(parseBarcode(code), { ok: true, value: code });
  }
});

test("UPC-A (12) becomes EAN-13 with a leading 0 — one product, one stored form", () => {
  assert.deepEqual(parseBarcode(REGISTRY_UPC), { ok: true, value: `0${REGISTRY_UPC}` });
  assert.deepEqual(parseBarcode(`0${REGISTRY_UPC}`), { ok: true, value: `0${REGISTRY_UPC}` });
  assert.deepEqual(parseBarcode("036000291452"), { ok: true, value: "0036000291452" }); // textbook UPC-A
});

test("wrong check digit is rejected (also the broken registry codes)", () => {
  for (const code of [...REGISTRY_BROKEN, "5995327132175", "59411094"]) {
    const r = parseBarcode(code);
    assert.equal(r.ok, false, code);
    if (!r.ok) assert.match(r.error, /последняя цифра/);
  }
});

test("format errors: empty, letters, length", () => {
  assert.match((parseBarcode("") as { error: string }).error, /Введите/);
  assert.match((parseBarcode("59953271321a4") as { error: string }).error, /только цифры/);
  for (const len of [1, 7, 9, 10, 11, 14]) {
    const r = parseBarcode("1".repeat(len));
    assert.equal(r.ok, false, String(len));
    if (!r.ok) assert.match(r.error, /8 или 13/);
  }
});

test("spaces and hyphens are ignored", () => {
  assert.deepEqual(parseBarcode(" 5 995327 132174 "), { ok: true, value: "5995327132174" });
  assert.deepEqual(parseBarcode("5995-3271-32174"), { ok: true, value: "5995327132174" });
});

test("optional field: empty → null", () => {
  assert.deepEqual(parseOptionalBarcode(""), { ok: true, value: null });
  assert.deepEqual(parseOptionalBarcode("  "), { ok: true, value: null });
  assert.deepEqual(parseOptionalBarcode(undefined), { ok: true, value: null });
  assert.equal(parseOptionalBarcode("123").ok, false);
});

test("lookup variants and comparison across stored spellings", () => {
  assert.deepEqual(barcodeLookupVariants("0317094291185"), ["0317094291185", "317094291185"]);
  assert.deepEqual(barcodeLookupVariants("5995327132174"), ["5995327132174"]);
  assert.deepEqual(barcodeLookupVariants("59411093"), ["59411093"]);
  assert.equal(normalizeStoredBarcode("317094291185"), "0317094291185");
  assert.equal(normalizeStoredBarcode("4823002202916"), null);
  assert.equal(normalizeStoredBarcode(null), null);
  assert.equal(sameBarcode("317094291185", "0317094291185"), true);
  assert.equal(sameBarcode("5995327132174", "4750258202263"), false);
  assert.equal(sameBarcode(null, null), false);
});
