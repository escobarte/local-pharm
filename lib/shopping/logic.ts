// Pure helpers for the shopping list (no I/O).

import { isUuid } from "../storage/validation.ts";

export type ShoppingReason = "expired" | "expiring" | "running_low" | "manual";

export const SHOPPING_REASONS: readonly ShoppingReason[] = [
  "expired",
  "expiring",
  "running_low",
  "manual",
];

/** Reasons the "В покупки" buttons may send (manual items come from the text field). */
export const PACK_REASONS: readonly ShoppingReason[] = ["expired", "expiring", "running_low"];

export const MAX_TITLE_LENGTH = 120;

/** Quiet note under an item: why it is on the list. */
const REASON_LABELS: Record<ShoppingReason, string> = {
  expired: "просрочено",
  expiring: "истекает",
  running_low: "заканчивается",
  manual: "вручную",
};

export function reasonLabel(reason: string): string {
  return REASON_LABELS[reason as ShoppingReason] ?? REASON_LABELS.manual;
}

export type TitleResult = { ok: true; value: string } | { ok: false; error: string };

/** The "Что купить" field: trims, collapses spaces, 1..120 characters. */
export function parseShoppingTitle(raw: string | null | undefined): TitleResult {
  const value = (raw ?? "").replace(/\s+/g, " ").trim();
  if (value === "") return { ok: false, error: "Напишите, что нужно купить." };
  if (value.length > MAX_TITLE_LENGTH) {
    return { ok: false, error: `Не больше ${MAX_TITLE_LENGTH} символов.` };
  }
  return { ok: true, value };
}

export type AddFromPackInput = { medicationId: string; reason: ShoppingReason };

export type AddFromPackResult =
  | { ok: true; value: AddFromPackInput }
  | { ok: false; error: string };

/** Input of a "В покупки" button: a medication id and one of the pack reasons. */
export function parseAddFromPack(raw: {
  medicationId?: string | null;
  reason?: string | null;
}): AddFromPackResult {
  const medicationId = (raw.medicationId ?? "").trim();
  const reason = (raw.reason ?? "").trim();
  if (!isUuid(medicationId)) return { ok: false, error: "Препарат не найден. Обновите страницу." };
  if (!(PACK_REASONS as readonly string[]).includes(reason)) {
    return { ok: false, error: "Не удалось добавить в покупки. Обновите страницу." };
  }
  return { ok: true, value: { medicationId, reason: reason as ShoppingReason } };
}

export type InsertOutcome = "added" | "already" | "error";

/**
 * Result of inserting an item for a medication. The partial unique index
 * (one OPEN item per medication) raises 23505 on a double tap or when the other
 * person already added it: for the user that is the same "it is in the list".
 */
export function insertOutcome(error: { code?: string | null } | null | undefined): InsertOutcome {
  if (!error) return "added";
  return error.code === "23505" ? "already" : "error";
}

/** "maria.k@example.com" → "maria.k": who bought it, without the domain. */
export function buyerName(email: string | null | undefined): string {
  const text = (email ?? "").trim();
  const at = text.indexOf("@");
  const name = at > 0 ? text.slice(0, at) : text;
  return name || "кто-то из семьи";
}

/** "2026-11-18T09:30:00Z" → "18.11" (UTC, the same day rule as the rest of the app). */
export function shortDate(timestamp: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(timestamp ?? "");
  return m ? `${m[3]}.${m[2]}` : "";
}

/** Menu badge text: nothing for 0, "99+" above 99. */
export function badgeText(count: number | null | undefined): string | null {
  if (!count || count <= 0) return null;
  return count > 99 ? "99+" : String(count);
}
