// Server-side form validation. Pure: takes a plain object, returns a typed
// result with Russian messages. Used by Server Actions and unit tests.

import { parseExpiryInput } from "../dates.ts";
import { isBoxColor, type BoxColorKey } from "./box-colors.ts";

export type FieldErrors = Record<string, string>;
export type ParseResult<T> = { ok: true; value: T } | { ok: false; errors: FieldErrors };
export type RawInput = Record<string, unknown>;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const LIMITS = {
  boxName: 60,
  boxNumber: 6,
  compartmentCode: 8,
  medicationField: 120,
  maxQuantity: 9999,
} as const;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/** Trimmed string; anything that is not a string (File, null, undefined) → "". */
function text(raw: RawInput, key: string): string {
  const v = raw[key];
  return typeof v === "string" ? v.trim() : "";
}

function finish<T>(errors: FieldErrors, value: T): ParseResult<T> {
  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, value };
}

// ---------- Box ----------

export type BoxInput = {
  name: string;
  locationId: string;
  color: BoxColorKey;
  number: string | null;
};

export function parseBoxInput(raw: RawInput): ParseResult<BoxInput> {
  const errors: FieldErrors = {};

  const name = text(raw, "name");
  if (!name) errors.name = "Введите название коробки.";
  else if (name.length > LIMITS.boxName) {
    errors.name = `Название не длиннее ${LIMITS.boxName} символов.`;
  }

  const locationId = text(raw, "locationId");
  if (!isUuid(locationId)) errors.locationId = "Выберите зону.";

  const color = text(raw, "color");
  if (!isBoxColor(color)) errors.color = "Выберите цвет.";

  const number = text(raw, "number");
  if (number.length > LIMITS.boxNumber) {
    errors.number = `Номер не длиннее ${LIMITS.boxNumber} символов.`;
  }

  return finish(errors, {
    name,
    locationId,
    color: color as BoxColorKey,
    number: number === "" ? null : number,
  });
}

// ---------- Compartment ----------

export type CompartmentInput = { boxId: string; code: string };

export function parseCompartmentInput(raw: RawInput): ParseResult<CompartmentInput> {
  const errors: FieldErrors = {};

  const boxId = text(raw, "boxId");
  if (!isUuid(boxId)) errors.boxId = "Коробка не найдена. Обновите страницу.";

  const code = text(raw, "code").toUpperCase();
  if (!code) errors.code = "Введите код отсека, например A1.";
  else if (/\s/.test(code) || code.length > LIMITS.compartmentCode) {
    errors.code = `Код — до ${LIMITS.compartmentCode} символов без пробелов, например A1.`;
  }

  return finish(errors, { boxId, code });
}

// ---------- Pack fields shared by "add medication" and "add pack" ----------

const QUANTITY_ERROR = `Количество — целое число от 1 до ${LIMITS.maxQuantity}.`;

export function parseQuantity(
  raw: string,
): { ok: true; value: number } | { ok: false; error: string } {
  if (!/^\d{1,4}$/.test(raw)) return { ok: false, error: QUANTITY_ERROR };
  const value = Number(raw);
  if (value < 1 || value > LIMITS.maxQuantity) return { ok: false, error: QUANTITY_ERROR };
  return { ok: true, value };
}

// ---------- Medication + first pack (manual mode) ----------

export type MedicationPackInput = {
  name: string;
  activeIngredient: string | null;
  form: string | null;
  dosage: string | null;
  categoryId: string | null;
  quantity: number;
  expiryDate: string | null;
  compartmentId: string;
};

export function parseMedicationPackInput(raw: RawInput): ParseResult<MedicationPackInput> {
  const errors: FieldErrors = {};
  const max = LIMITS.medicationField;

  const name = text(raw, "name");
  if (!name) errors.name = "Введите название препарата.";
  else if (name.length > max) errors.name = `Название не длиннее ${max} символов.`;

  const optional = (key: string, label: string): string | null => {
    const v = text(raw, key);
    if (v.length > max) errors[key] = `${label}: не длиннее ${max} символов.`;
    return v === "" ? null : v;
  };
  const activeIngredient = optional("activeIngredient", "Вещество");
  const form = optional("form", "Форма");
  const dosage = optional("dosage", "Дозировка");

  const categoryRaw = text(raw, "categoryId");
  let categoryId: string | null = null;
  if (categoryRaw !== "") {
    if (isUuid(categoryRaw)) categoryId = categoryRaw;
    else errors.categoryId = "Выберите категорию из списка.";
  }

  const quantityParsed = parseQuantity(text(raw, "quantity"));
  if (!quantityParsed.ok) errors.quantity = quantityParsed.error;
  const quantity = quantityParsed.ok ? quantityParsed.value : 0;

  const expiry = parseExpiryInput(text(raw, "expiry"));
  if (!expiry.ok) errors.expiry = expiry.error;

  const compartmentId = text(raw, "compartmentId");
  if (!isUuid(compartmentId)) errors.compartmentId = "Выберите коробку и отсек.";

  return finish(errors, {
    name,
    activeIngredient,
    form,
    dosage,
    categoryId,
    quantity,
    expiryDate: expiry.ok ? expiry.value : null,
    compartmentId,
  });
}

/** Plain object from FormData (string values only are kept by the parsers). */
export { text as readText, finish as finishParse };

export function formDataToRaw(formData: FormData): RawInput {
  const raw: RawInput = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") raw[key] = value;
  }
  return raw;
}
