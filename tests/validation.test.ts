import { test } from "node:test";
import assert from "node:assert/strict";
import {
  formDataToRaw,
  isUuid,
  parseBoxInput,
  parseCompartmentInput,
  parseMedicationPackInput,
} from "../lib/storage/validation.ts";

const U1 = "3f2b8c1e-5a4d-4b6f-9c7e-1a2b3c4d5e6f";
const U2 = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";

test("isUuid", () => {
  assert.equal(isUuid(U1), true);
  assert.equal(isUuid(U1.toUpperCase()), true);
  for (const bad of ["", "abc", "3f2b8c1e-5a4d-4b6f-9c7e-1a2b3c4d5e6", `${U1}x`, null, undefined, 5]) {
    assert.equal(isUuid(bad), false, String(bad));
  }
});

// ---------- box ----------

test("box: valid input is trimmed; empty number → null", () => {
  const r = parseBoxInput({ name: "  Коробка 2 ", locationId: U1, color: "accent", number: " " });
  assert.deepEqual(r, { ok: true, value: { name: "Коробка 2", locationId: U1, color: "accent", number: null } });
});

test("box: number is kept when given", () => {
  const r = parseBoxInput({ name: "A", locationId: U1, color: "navy", number: " 2B " });
  assert.ok(r.ok && r.value.number === "2B");
});

test("box: reports every invalid field", () => {
  const r = parseBoxInput({ name: "", locationId: "zone", color: "red", number: "1234567" });
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.deepEqual(Object.keys(r.errors).sort(), ["color", "locationId", "name", "number"]);
    assert.match(r.errors.name, /название/i);
    assert.match(r.errors.locationId, /зону/);
  }
});

test("box: name length limit", () => {
  assert.equal(parseBoxInput({ name: "x".repeat(60), locationId: U1, color: "navy" }).ok, true);
  assert.equal(parseBoxInput({ name: "x".repeat(61), locationId: U1, color: "navy" }).ok, false);
});

test("box: non-string values (files, missing) are treated as empty", () => {
  const r = parseBoxInput({ name: { size: 1 }, locationId: U1, color: "navy" });
  assert.equal(r.ok, false);
});

// ---------- compartment ----------

test("compartment: code is uppercased and trimmed", () => {
  const r = parseCompartmentInput({ boxId: U1, code: " b2 " });
  assert.deepEqual(r, { ok: true, value: { boxId: U1, code: "B2" } });
});

test("compartment: rejects empty, spaces inside, too long, bad box id", () => {
  assert.equal(parseCompartmentInput({ boxId: U1, code: "" }).ok, false);
  assert.equal(parseCompartmentInput({ boxId: U1, code: "A 1" }).ok, false);
  assert.equal(parseCompartmentInput({ boxId: U1, code: "A".repeat(9) }).ok, false);
  assert.equal(parseCompartmentInput({ boxId: U1, code: "A".repeat(8) }).ok, true);
  const r = parseCompartmentInput({ boxId: "nope", code: "A1" });
  assert.equal(r.ok, false);
  if (!r.ok) assert.ok(r.errors.boxId);
});

// ---------- medication + pack ----------

const validMed = {
  name: " Ибупрофен ",
  activeIngredient: "ибупрофен",
  form: "таблетки",
  dosage: "200 мг",
  categoryId: U2,
  quantity: "12",
  expiry: "12/2026",
  compartmentId: U1,
};

test("medication: valid full input", () => {
  const r = parseMedicationPackInput(validMed);
  assert.deepEqual(r, {
    ok: true,
    value: {
      name: "Ибупрофен",
      activeIngredient: "ибупрофен",
      form: "таблетки",
      dosage: "200 мг",
      categoryId: U2,
      quantity: 12,
      expiryDate: "2026-12-31",
      compartmentId: U1,
      registryCode: null,
      barcode: null,
      source: "manual",
      allowDuplicate: false,
    },
  });
});

test("medication: only required fields; optional ones become null", () => {
  const r = parseMedicationPackInput({ name: "Бинт", quantity: "1", compartmentId: U1 });
  assert.deepEqual(r, {
    ok: true,
    value: {
      name: "Бинт",
      activeIngredient: null,
      form: null,
      dosage: null,
      categoryId: null,
      quantity: 1,
      expiryDate: null,
      compartmentId: U1,
      registryCode: null,
      barcode: null,
      source: "manual",
      allowDuplicate: false,
    },
  });
});

test("medication: empty category and expiry are allowed", () => {
  const r = parseMedicationPackInput({ ...validMed, categoryId: "", expiry: "" });
  assert.ok(r.ok && r.value.categoryId === null && r.value.expiryDate === null);
});

test("medication: quantity must be a whole number 1–9999", () => {
  for (const bad of ["", "0", "-1", "1.5", "1e3", "10000", "abc", "12 шт."]) {
    const r = parseMedicationPackInput({ ...validMed, quantity: bad });
    assert.equal(r.ok, false, bad);
    if (!r.ok) assert.ok(r.errors.quantity, bad);
  }
  for (const good of ["1", "9999", "007"]) {
    assert.equal(parseMedicationPackInput({ ...validMed, quantity: good }).ok, true, good);
  }
});

test("medication: bad expiry, category and compartment are reported per field", () => {
  const r = parseMedicationPackInput({ ...validMed, expiry: "13/2026", categoryId: "x", compartmentId: "" });
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.deepEqual(Object.keys(r.errors).sort(), ["categoryId", "compartmentId", "expiry"]);
    assert.match(r.errors.expiry, /ММ\/ГГГГ/);
  }
});

test("medication: name required and length-limited", () => {
  assert.equal(parseMedicationPackInput({ ...validMed, name: "  " }).ok, false);
  assert.equal(parseMedicationPackInput({ ...validMed, name: "x".repeat(121) }).ok, false);
  assert.equal(parseMedicationPackInput({ ...validMed, dosage: "x".repeat(121) }).ok, false);
});

test("medication: registry code is optional, digits only, leading zeros kept", () => {
  const ok = parseMedicationPackInput({ ...validMed, registryCode: " 0908900192 " });
  assert.ok(ok.ok && ok.value.registryCode === "0908900192");
  const manual = parseMedicationPackInput({ ...validMed, registryCode: "" });
  assert.ok(manual.ok && manual.value.registryCode === null);
  for (const bad of ["abc", "12a", "1".repeat(17), "1 2", "' or 1=1"]) {
    const r = parseMedicationPackInput({ ...validMed, registryCode: bad });
    assert.equal(r.ok, false, bad);
    if (!r.ok) assert.match(r.errors.registryCode, /реестр/, bad);
  }
});

test("medication: barcode is optional, normalized, checked", () => {
  const ok = parseMedicationPackInput({ ...validMed, barcode: " 317094291185 " });
  assert.ok(ok.ok && ok.value.barcode === "0317094291185");
  const bad = parseMedicationPackInput({ ...validMed, barcode: "5995327132175" });
  assert.ok(!bad.ok && /последняя цифра/.test(bad.errors.barcode));
  assert.ok(!parseMedicationPackInput({ ...validMed, barcode: "12ab" }).ok);
});

test("medication: source — amdm only with a registry code, openfda by flag, anything else manual", () => {
  const src = (extra: Record<string, string>) => {
    const r = parseMedicationPackInput({ ...validMed, ...extra });
    return r.ok ? r.value.source : "invalid";
  };
  assert.equal(src({}), "manual");
  assert.equal(src({ source: "openfda" }), "openfda");
  assert.equal(src({ source: "amdm" }), "manual"); // no registry code → not amdm
  assert.equal(src({ source: "local" }), "manual");
  assert.equal(src({ source: "openfda", registryCode: "0908900192" }), "amdm");
});

test("medication: allowDuplicate only for exactly '1'", () => {
  const flag = (v: string) => {
    const r = parseMedicationPackInput({ ...validMed, allowDuplicate: v });
    return r.ok && r.value.allowDuplicate;
  };
  assert.equal(flag("1"), true);
  assert.equal(flag("true"), false);
  assert.equal(flag(""), false);
});

test("formDataToRaw keeps string fields only", () => {
  const fd = new FormData();
  fd.set("name", "A");
  fd.set("file", new Blob(["x"]), "x.txt");
  assert.deepEqual(formDataToRaw(fd), { name: "A" });
});

import { parseMovePackInput, parseNewPackInput } from "../lib/medications/validation.ts";

test("parseNewPackInput: valid", () => {
  const r = parseNewPackInput({ medicationId: U1, compartmentId: U2, quantity: " 3 ", expiry: "12/2026" });
  assert.deepEqual(r, {
    ok: true,
    value: { medicationId: U1, compartmentId: U2, quantity: 3, expiryDate: "2026-12-31" },
  });
});

test("parseNewPackInput: expiry optional, errors in Russian", () => {
  const ok = parseNewPackInput({ medicationId: U1, compartmentId: U2, quantity: "1", expiry: "" });
  assert.equal(ok.ok && ok.value.expiryDate, null);

  const bad = parseNewPackInput({ medicationId: "x", compartmentId: "", quantity: "0", expiry: "13/2026" });
  assert.equal(bad.ok, false);
  if (!bad.ok) {
    assert.match(bad.errors.medicationId, /Препарат не найден/);
    assert.match(bad.errors.compartmentId, /Выберите/);
    assert.match(bad.errors.quantity, /от 1 до 9999/);
    assert.match(bad.errors.expiry, /ММ\/ГГГГ/);
  }
  for (const q of ["-1", "1.5", "10000", "abc", ""]) {
    assert.equal(parseNewPackInput({ medicationId: U1, compartmentId: U2, quantity: q }).ok, false, q);
  }
});

test("parseMovePackInput", () => {
  assert.deepEqual(parseMovePackInput({ packId: U1, medicationId: U2, compartmentId: U2 }), {
    ok: true,
    value: { packId: U1, medicationId: U2, compartmentId: U2 },
  });
  const bad = parseMovePackInput({ packId: "x", medicationId: U2, compartmentId: "" });
  assert.equal(bad.ok, false);
  if (!bad.ok) {
    assert.match(bad.errors.packId, /Упаковка не найдена/);
    assert.match(bad.errors.compartmentId, /Выберите/);
  }
});
