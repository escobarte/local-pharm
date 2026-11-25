// Duplicate protection and the barcode lookup order. Pure, no I/O.
//
// Lookup order for a scanned / typed barcode (README: own base → AMDM →
// international → manual):
//   1. own medications by barcode → offer "Добавить упаковку" to them;
//   2. AMDM registry by barcode   → prefill the form (one row) or let the user pick;
//   3. nothing                    → "Не нашли по штрихкоду", go to Search with the
//                                    barcode remembered (saved with the medication).

import { barcodeLookupVariants, sameBarcode } from "../barcode.ts";

/** A medication at home as the duplicate check needs it. */
export type ExistingMedication = {
  id: string;
  name: string;
  dosage: string | null;
  /** Dosage form, only for the row icon; duplicate matching ignores it. */
  form?: string | null;
  registryCode: string | null;
  barcode: string | null;
};

export type DuplicateReason = "registry" | "barcode";
export type Duplicate = { medication: ExistingMedication; reason: DuplicateReason };

/**
 * PostgREST `or` filter for candidate rows: same registry code or same barcode
 * (both stored spellings of it). Values are digits only, safe to interpolate.
 * Null when there is nothing to compare by.
 */
export function duplicateFilter(params: { registryCode?: string | null; barcode?: string | null }): string | null {
  const parts: string[] = [];
  if (params.registryCode && /^\d{1,16}$/.test(params.registryCode)) {
    parts.push(`registry_code.eq.${params.registryCode}`);
  }
  if (params.barcode && /^\d{8,13}$/.test(params.barcode)) {
    parts.push(`barcode.in.(${barcodeLookupVariants(params.barcode).join(",")})`);
  }
  return parts.length ? parts.join(",") : null;
}

/**
 * The medication a new entry would duplicate, or null. A registry-code match
 * wins over a barcode match (it names exactly the same registered product).
 */
export function findDuplicate(
  existing: readonly ExistingMedication[],
  params: { registryCode?: string | null; barcode?: string | null },
): Duplicate | null {
  if (params.registryCode) {
    const byCode = existing.find((m) => m.registryCode === params.registryCode);
    if (byCode) return { medication: byCode, reason: "registry" };
  }
  if (params.barcode) {
    const byBarcode = existing.find((m) => sameBarcode(m.barcode, params.barcode));
    if (byBarcode) return { medication: byBarcode, reason: "barcode" };
  }
  return null;
}

export type ScanOutcome<R> =
  | { kind: "home"; medications: ExistingMedication[]; registry: R[] }
  | { kind: "registry-one"; item: R }
  | { kind: "registry-many"; items: R[] }
  | { kind: "none" };

/** Next step after a barcode lookup in the own base and the registry. */
export function resolveScan<R>(
  barcode: string,
  home: readonly ExistingMedication[],
  registry: readonly R[],
): ScanOutcome<R> {
  const own = home.filter((m) => sameBarcode(m.barcode, barcode));
  if (own.length > 0) return { kind: "home", medications: own, registry: [...registry] };
  if (registry.length === 1) return { kind: "registry-one", item: registry[0] };
  if (registry.length > 1) return { kind: "registry-many", items: [...registry] };
  return { kind: "none" };
}
