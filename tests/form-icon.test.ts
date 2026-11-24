import assert from "node:assert/strict";
import test from "node:test";
import { formIconKind, normalizeForm, type FormIconKind } from "../lib/medications/form-icon.ts";

function check(cases: [string, FormIconKind][]) {
  for (const [form, kind] of cases) assert.equal(formIconKind(form), kind, form);
}

test("normalize: case, diacritics, spaces", () => {
  assert.equal(normalizeForm("  Soluție   ORALĂ "), "solutie orala");
  assert.equal(normalizeForm("Picături"), "picaturi");
  assert.equal(normalizeForm("Свечи"), "свечи");
  assert.equal(normalizeForm(null), "");
});

test("real AMDM registry forms (Romanian)", () => {
  check([
    ["comprimate", "tablet"],
    ["comprimate filmate", "tablet"],
    ["comprimate efervescente", "tablet"],
    ["comprimate pentru soluție orală", "tablet"],
    ["drajeuri", "tablet"],
    ["capsule", "capsule"],
    ["capsule moi", "capsule"],
    ["gelule", "capsule"],
    ["sirop", "syrup"],
    ["suspensie orală", "syrup"],
    ["soluție orală", "syrup"],
    ["granule pentru suspensie orală", "syrup"],
    ["picături orale, soluție", "drops"],
    ["picături oftalmice, soluție", "drops"],
    ["unguent", "ointment"],
    ["cremă", "ointment"],
    ["gel", "ointment"],
    ["soluție injectabilă", "injection"],
    ["soluție perfuzabilă", "injection"],
    ["pulbere pentru soluție injectabilă", "injection"],
    ["spray nazal, soluție", "spray"],
    ["soluție de inhalat prin nebulizator", "spray"],
    ["pulbere orală în plic", "powder"],
    ["pulbere pentru soluție orală", "powder"],
    ["supozitoare", "suppository"],
    ["plasture transdermic", "patch"],
  ]);
});

test("openFDA forms (English, upper case)", () => {
  check([
    ["TABLET", "tablet"],
    ["TABLET, FILM COATED", "tablet"],
    ["CAPSULE, LIQUID FILLED", "capsule"],
    ["SYRUP", "syrup"],
    ["SUSPENSION", "syrup"],
    ["INJECTION, SOLUTION", "injection"],
    ["SPRAY, METERED", "spray"],
    ["AEROSOL, METERED", "spray"],
    ["CREAM", "ointment"],
    ["GEL", "ointment"],
    ["OINTMENT", "ointment"],
    ["SUPPOSITORY", "suppository"],
    ["PATCH", "patch"],
    ["POWDER, FOR SOLUTION", "powder"],
    ["DROPS", "drops"],
  ]);
});

test("forms typed by hand (Russian)", () => {
  check([
    ["таблетки", "tablet"],
    ["Драже", "tablet"],
    ["капсулы", "capsule"],
    ["Сироп", "syrup"],
    ["суспензия", "syrup"],
    ["капли", "drops"],
    ["Мазь", "ointment"],
    ["крем", "ointment"],
    ["гель", "ointment"],
    ["раствор для инъекций", "injection"],
    ["ампулы", "injection"],
    ["спрей", "spray"],
    ["порошок", "powder"],
    ["саше", "powder"],
    ["свечи", "suppository"],
    ["пластырь", "patch"],
    ["бинт", "patch"],
  ]);
});

test("unknown or empty form → general tablet", () => {
  for (const f of [null, undefined, "", "  ", "лосьон-шампунь", "forma necunoscută", "LOZENGE"]) {
    assert.equal(formIconKind(f), "tablet", String(f));
  }
});

test("matches at the start of a word, not inside it", () => {
  assert.equal(formIconKind("soluție pentru aplicare cutanată"), "tablet"); // not "plic" → powder
  assert.equal(formIconKind("angel"), "tablet"); // not "gel" → ointment
  assert.equal(formIconKind("Gel oral"), "ointment");
});
