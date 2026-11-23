import { test } from "node:test";
import assert from "node:assert/strict";
import { duplicateFilter, findDuplicate, resolveScan, type ExistingMedication } from "../lib/medications/duplicates.ts";

const med = (id: string, over: Partial<ExistingMedication> = {}): ExistingMedication => ({
  id,
  name: `Med ${id}`,
  dosage: null,
  registryCode: null,
  barcode: null,
  ...over,
});

test("duplicateFilter: registry code and both barcode spellings", () => {
  assert.equal(duplicateFilter({}), null);
  assert.equal(duplicateFilter({ registryCode: "0908900192" }), "registry_code.eq.0908900192");
  assert.equal(duplicateFilter({ barcode: "5995327132174" }), "barcode.in.(5995327132174)");
  assert.equal(
    duplicateFilter({ registryCode: "1", barcode: "0317094291185" }),
    "registry_code.eq.1,barcode.in.(0317094291185,317094291185)",
  );
  // anything that is not digits never reaches the filter
  assert.equal(duplicateFilter({ registryCode: "1),id.eq.(x", barcode: "abc" }), null);
});

test("findDuplicate: registry code wins over barcode", () => {
  const existing = [med("a", { barcode: "5995327132174" }), med("b", { registryCode: "0409070046" })];
  assert.deepEqual(findDuplicate(existing, { registryCode: "0409070046", barcode: "5995327132174" }), {
    medication: existing[1],
    reason: "registry",
  });
  assert.deepEqual(findDuplicate(existing, { barcode: "5995327132174" }), { medication: existing[0], reason: "barcode" });
  assert.equal(findDuplicate(existing, { registryCode: "1", barcode: "4750258202263" }), null);
  assert.equal(findDuplicate(existing, {}), null);
});

test("findDuplicate: a legacy 12-digit stored barcode matches the EAN-13 form", () => {
  const legacy = med("c", { barcode: "317094291185" });
  assert.equal(findDuplicate([legacy], { barcode: "0317094291185" })?.medication.id, "c");
});

test("scan order: own base → registry (one / many) → nothing", () => {
  const code = "5995327132174";
  const home = [med("h", { barcode: code })];
  const one = [{ code: "0409070046" }];
  const two = [{ code: "0409070046" }, { code: "0409070035" }];

  const atHome = resolveScan(code, home, two);
  assert.equal(atHome.kind, "home");
  if (atHome.kind === "home") {
    assert.deepEqual(atHome.medications.map((m) => m.id), ["h"]);
    assert.equal(atHome.registry.length, 2); // kept for "Создать отдельную запись"
  }
  assert.deepEqual(resolveScan(code, [], one), { kind: "registry-one", item: one[0] });
  assert.deepEqual(resolveScan(code, [], two), { kind: "registry-many", items: two });
  assert.deepEqual(resolveScan(code, [], []), { kind: "none" });
  // a medication returned by the query but with another barcode is not "at home"
  assert.deepEqual(resolveScan(code, [med("x", { registryCode: "1", barcode: "4750258202263" })], []), { kind: "none" });
});
