import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_TITLE_LENGTH,
  badgeText,
  buyerName,
  insertOutcome,
  parseAddFromPack,
  parseShoppingTitle,
  reasonLabel,
  shortDate,
} from "../lib/shopping/logic.ts";

const UUID = "3f2b8c1e-5a4d-4e6f-9a1b-0c2d3e4f5a6b";

test("reasonLabel: the quiet note for each reason, unknown → manual", () => {
  assert.equal(reasonLabel("expired"), "просрочено");
  assert.equal(reasonLabel("expiring"), "истекает");
  assert.equal(reasonLabel("running_low"), "заканчивается");
  assert.equal(reasonLabel("manual"), "вручную");
  assert.equal(reasonLabel("whatever"), "вручную");
});

test("parseShoppingTitle: trims, collapses spaces, rejects empty and too long", () => {
  assert.deepEqual(parseShoppingTitle("  Бинт   стерильный \n"), { ok: true, value: "Бинт стерильный" });
  assert.equal(parseShoppingTitle("").ok, false);
  assert.equal(parseShoppingTitle("   ").ok, false);
  assert.equal(parseShoppingTitle(null).ok, false);
  assert.equal(parseShoppingTitle("а".repeat(MAX_TITLE_LENGTH)).ok, true);
  assert.equal(parseShoppingTitle("а".repeat(MAX_TITLE_LENGTH + 1)).ok, false);
});

test("parseAddFromPack: uuid and a pack reason only", () => {
  assert.deepEqual(parseAddFromPack({ medicationId: UUID, reason: "running_low" }), {
    ok: true,
    value: { medicationId: UUID, reason: "running_low" },
  });
  assert.equal(parseAddFromPack({ medicationId: "nope", reason: "expired" }).ok, false);
  assert.equal(parseAddFromPack({ medicationId: UUID, reason: "manual" }).ok, false, "manual is not a pack reason");
  assert.equal(parseAddFromPack({ medicationId: UUID, reason: "" }).ok, false);
  assert.equal(parseAddFromPack({}).ok, false);
});

test("insertOutcome: a duplicate open item (23505) counts as 'already in the list'", () => {
  assert.equal(insertOutcome(null), "added");
  assert.equal(insertOutcome(undefined), "added");
  assert.equal(insertOutcome({ code: "23505" }), "already", "double tap / the other person added it");
  assert.equal(insertOutcome({ code: "42501" }), "error");
  assert.equal(insertOutcome({ code: null }), "error");
});

test("buyerName / shortDate", () => {
  assert.equal(buyerName("maria.k@example.com"), "maria.k");
  assert.equal(buyerName("plain"), "plain");
  assert.equal(buyerName(""), "кто-то из семьи");
  assert.equal(buyerName(null), "кто-то из семьи");
  assert.equal(buyerName("@x.com"), "@x.com");
  assert.equal(shortDate("2026-11-18T09:30:00.123+00:00"), "18.11");
  assert.equal(shortDate(null), "");
  assert.equal(shortDate("garbage"), "");
});

test("badgeText: hidden for 0 / null, capped at 99+", () => {
  assert.equal(badgeText(0), null);
  assert.equal(badgeText(null), null);
  assert.equal(badgeText(undefined), null);
  assert.equal(badgeText(-3), null);
  assert.equal(badgeText(7), "7");
  assert.equal(badgeText(99), "99");
  assert.equal(badgeText(100), "99+");
});
