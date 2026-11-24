// Server-side validation for pack actions. Pure, Russian messages.

import { parseExpiryInput } from "../dates.ts";
import {
  finishParse,
  isUuid,
  parseQuantity,
  readText,
  type ParseResult,
  type RawInput,
} from "../storage/validation.ts";

export type NewPackInput = {
  medicationId: string;
  compartmentId: string;
  quantity: number;
  expiryDate: string | null;
};

export function parseNewPackInput(raw: RawInput): ParseResult<NewPackInput> {
  const errors: Record<string, string> = {};

  const medicationId = readText(raw, "medicationId");
  if (!isUuid(medicationId)) errors.medicationId = "Препарат не найден. Обновите страницу.";

  const compartmentId = readText(raw, "compartmentId");
  if (!isUuid(compartmentId)) errors.compartmentId = "Выберите коробку и отсек.";

  const quantity = parseQuantity(readText(raw, "quantity"));
  if (!quantity.ok) errors.quantity = quantity.error;

  const expiry = parseExpiryInput(readText(raw, "expiry"));
  if (!expiry.ok) errors.expiry = expiry.error;

  return finishParse(errors, {
    medicationId,
    compartmentId,
    quantity: quantity.ok ? quantity.value : 0,
    expiryDate: expiry.ok ? expiry.value : null,
  });
}

export type MovePackInput = { packId: string; medicationId: string; compartmentId: string };

export function parseMovePackInput(raw: RawInput): ParseResult<MovePackInput> {
  const errors: Record<string, string> = {};

  const packId = readText(raw, "packId");
  const medicationId = readText(raw, "medicationId");
  if (!isUuid(packId) || !isUuid(medicationId)) errors.packId = "Упаковка не найдена. Обновите страницу.";

  const compartmentId = readText(raw, "compartmentId");
  if (!isUuid(compartmentId)) errors.compartmentId = "Выберите коробку и отсек.";

  return finishParse(errors, { packId, medicationId, compartmentId });
}

/** Screens that may ask to be shown again after a pack is deleted (never a free-form URL). */
const DELETE_PACK_RETURN_PATHS = ["/expiry"] as const;

/**
 * Where to go after "Удалить упаковку": back to the screen it was started from when
 * that screen is on the short allowlist (the "Сроки" screen), otherwise the medication card.
 */
export function deletePackDestination(returnTo: string | null | undefined, medicationId: string): string {
  const back = (DELETE_PACK_RETURN_PATHS as readonly string[]).find((p) => p === returnTo);
  return back ?? `/medications/${medicationId}`;
}
