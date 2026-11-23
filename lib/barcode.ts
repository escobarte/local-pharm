// Retail barcodes on medicine packs: EAN-13, EAN-8, UPC-A. Pure, no I/O.
//
// One product = one stored form: UPC-A (12 digits) is EAN-13 with a leading 0,
// so it is always stored as 13 digits. medications.barcode holds the result of
// parseBarcode(); lookups also try the legacy 12-digit spelling (Phase 4a saved
// registry barcodes as they were in the export).

/** GS1 check digit for the body (all digits except the last). */
export function gs1CheckDigit(body: string): number {
  let sum = 0;
  for (let i = 0; i < body.length; i++) {
    const digit = body.charCodeAt(body.length - 1 - i) - 48;
    sum += digit * (i % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10;
}

/** EAN-13 / EAN-8 / UPC-A (12) with a correct check digit. */
export function hasValidCheckDigit(digits: string): boolean {
  if (!/^(\d{8}|\d{12}|\d{13})$/.test(digits)) return false;
  return gs1CheckDigit(digits.slice(0, -1)) === Number(digits.at(-1));
}

export type BarcodeResult = { ok: true; value: string } | { ok: false; error: string };

/**
 * User or scanner input → normalized barcode: EAN-13 (13 digits; UPC-A gets a
 * leading 0) or EAN-8 (8 digits). Spaces and hyphens are ignored.
 */
export function parseBarcode(input: string | null | undefined): BarcodeResult {
  const digits = (input ?? "").replace(/[\s-]/g, "");
  if (digits === "") return { ok: false, error: "Введите штрихкод." };
  if (!/^\d+$/.test(digits)) return { ok: false, error: "Штрихкод — только цифры." };
  if (![8, 12, 13].includes(digits.length)) {
    return { ok: false, error: "Штрихкод — 8 или 13 цифр (12 для американских UPC)." };
  }
  if (!hasValidCheckDigit(digits)) {
    return { ok: false, error: "Штрихкод с ошибкой: не сходится последняя цифра. Проверьте цифры." };
  }
  return { ok: true, value: digits.length === 12 ? `0${digits}` : digits };
}

/** Optional form field: empty → null, otherwise parseBarcode(). */
export function parseOptionalBarcode(
  input: string | null | undefined,
): { ok: true; value: string | null } | { ok: false; error: string } {
  if ((input ?? "").replace(/[\s-]/g, "") === "") return { ok: true, value: null };
  return parseBarcode(input);
}

/** Spellings to look up for a normalized code: EAN-13 "0…" may be stored as 12-digit UPC-A. */
export function barcodeLookupVariants(normalized: string): string[] {
  return normalized.length === 13 && normalized.startsWith("0")
    ? [normalized, normalized.slice(1)]
    : [normalized];
}

/** Stored value (any legacy spelling) → normalized form, or null when it is not a valid code. */
export function normalizeStoredBarcode(stored: string | null | undefined): string | null {
  if (!stored) return null;
  const r = parseBarcode(stored);
  return r.ok ? r.value : null;
}

export function sameBarcode(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizeStoredBarcode(a);
  return na !== null && na === normalizeStoredBarcode(b);
}
