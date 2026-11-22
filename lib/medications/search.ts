// Pure search / filter / sort / summary logic for medications (no I/O).
// Matching is done here, not in SQL: `ilike` depends on the database locale and
// can miss Cyrillic case folding, and a home medicine cabinet is a few hundred
// rows, so filtering the already-loaded list is fast and fully testable.

import { expiryStatus, type ExpiryStatus, type IsoDate } from "../dates.ts";
import { isUuid } from "../storage/validation.ts";
import type { AttentionPack, CatalogMedication, CatalogPack, PackPlace } from "./types.ts";

export const MAX_QUERY_LENGTH = 100;

/** Lowercase (Russian rules), "ё" → "е", collapse whitespace. */
export function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .toLocaleLowerCase("ru")
    .replaceAll("ё", "е")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Every whitespace-separated word of the query must occur in the name, active
 * ingredient, category, indications, form or dosage (case-insensitive).
 * An empty query matches everything.
 */
export function matchesQuery(med: CatalogMedication, query: string): boolean {
  const words = normalizeText(query).split(" ").filter(Boolean);
  if (words.length === 0) return true;
  const haystack = normalizeText(
    [med.name, med.activeIngredient, med.categoryName, med.indications, med.form, med.dosage]
      .filter(Boolean)
      .join(" "),
  );
  return words.every((w) => haystack.includes(w));
}

// ---------- Search parameters from the URL ----------

export type AttentionFilter = "expiring" | "expired" | "low";
export const ATTENTION_FILTERS: readonly AttentionFilter[] = ["expiring", "expired", "low"];

export type SearchParams = {
  q: string;
  categoryId: string | null;
  attention: AttentionFilter | null;
};

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

/** Never trusts the URL: trims and caps the text, accepts only a uuid / known filter. */
export function parseSearchParams(raw: {
  q?: string | string[];
  cat?: string | string[];
  f?: string | string[];
}): SearchParams {
  const q = first(raw.q).replace(/\s+/g, " ").trim().slice(0, MAX_QUERY_LENGTH);
  const cat = first(raw.cat);
  const f = first(raw.f);
  return {
    q,
    categoryId: isUuid(cat) ? cat : null,
    attention: (ATTENTION_FILTERS as readonly string[]).includes(f) ? (f as AttentionFilter) : null,
  };
}

/** Builds "/search?..." keeping only the non-empty parts. */
export function searchHref(params: Partial<SearchParams>): string {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.categoryId) sp.set("cat", params.categoryId);
  if (params.attention) sp.set("f", params.attention);
  const qs = sp.toString();
  return qs ? `/search?${qs}` : "/search";
}

// ---------- Per-medication summary ----------

const STATUS_RANK: Record<ExpiryStatus, number> = { expired: 3, soon: 2, ok: 1, none: 0 };

export type MedicationSummary = {
  packCount: number;
  totalQuantity: number;
  /** Most urgent status among all packs. */
  status: ExpiryStatus;
  /** Earliest expiry date among packs that have one. */
  nearestExpiry: IsoDate | null;
  lowStock: boolean;
  /** Place of the most urgent pack (earliest expiry, then largest stock). */
  place: PackPlace | null;
  /** How many other places (distinct compartments) hold this medication. */
  otherPlaces: number;
};

function packOrder(a: CatalogPack, b: CatalogPack): number {
  // Packs with an expiry come first, earliest first; undated packs go last.
  if (a.expiry_date && b.expiry_date && a.expiry_date !== b.expiry_date) {
    return a.expiry_date < b.expiry_date ? -1 : 1;
  }
  if (a.expiry_date && !b.expiry_date) return -1;
  if (!a.expiry_date && b.expiry_date) return 1;
  return b.quantity - a.quantity;
}

export function sortPacks(packs: readonly CatalogPack[]): CatalogPack[] {
  return [...packs].sort(packOrder);
}

export function summarize(med: CatalogMedication, today: IsoDate): MedicationSummary {
  const ordered = sortPacks(med.packs);
  let status: ExpiryStatus = "none";
  for (const pack of ordered) {
    const s = expiryStatus(pack.expiry_date, today);
    if (STATUS_RANK[s] > STATUS_RANK[status]) status = s;
  }
  const placed = ordered.filter((p) => p.place);
  const primary = placed[0]?.place ?? null;
  const distinctPlaces = new Set(placed.map((p) => p.place!.compartmentId));
  return {
    packCount: med.packs.length,
    totalQuantity: med.packs.reduce((sum, p) => sum + p.quantity, 0),
    status,
    nearestExpiry: ordered.find((p) => p.expiry_date)?.expiry_date ?? null,
    lowStock: med.packs.some((p) => p.running_low),
    place: primary,
    otherPlaces: Math.max(distinctPlaces.size - 1, 0),
  };
}

/** "№1 Аптечка · B2" — the box (with its number when it has one) and the compartment. */
export function placeLabel(place: PackPlace): string {
  const box = place.boxNumber ? `№${place.boxNumber} ${place.boxName}` : place.boxName;
  return `${box} · ${place.code}`;
}

// ---------- Filtering and sorting ----------

function hasPackWithStatus(med: CatalogMedication, wanted: ExpiryStatus, today: IsoDate): boolean {
  return med.packs.some((p) => expiryStatus(p.expiry_date, today) === wanted);
}

export function filterMedications(
  meds: readonly CatalogMedication[],
  params: SearchParams,
  today: IsoDate,
): CatalogMedication[] {
  return meds.filter((m) => {
    if (params.categoryId && m.categoryId !== params.categoryId) return false;
    if (params.attention === "expiring" && !hasPackWithStatus(m, "soon", today)) return false;
    if (params.attention === "expired" && !hasPackWithStatus(m, "expired", today)) return false;
    if (params.attention === "low" && !m.packs.some((p) => p.running_low)) return false;
    return matchesQuery(m, params.q);
  });
}

const URGENCY: Record<ExpiryStatus, number> = { expired: 0, soon: 1, ok: 2, none: 2 };

/** Expired first, then expiring within 30 days, then everything else by name. */
export function sortMedications<T extends { med: CatalogMedication; summary: MedicationSummary }>(
  items: readonly T[],
): T[] {
  return [...items].sort(
    (a, b) =>
      URGENCY[a.summary.status] - URGENCY[b.summary.status] ||
      a.med.name.localeCompare(b.med.name, "ru", { sensitivity: "base" }),
  );
}

export type SearchResult = { med: CatalogMedication; summary: MedicationSummary };

export function runSearch(
  meds: readonly CatalogMedication[],
  params: SearchParams,
  today: IsoDate,
): SearchResult[] {
  return sortMedications(
    filterMedications(meds, params, today).map((med) => ({ med, summary: summarize(med, today) })),
  );
}

// ---------- Home "Внимание" ----------

export type AttentionCounts = { expiring: number; expired: number; lowStock: number };

/** Counts packs (not medications): expiring within 30 days, already expired, marked "running low". */
export function attentionCounts(packs: readonly AttentionPack[], today: IsoDate): AttentionCounts {
  const counts: AttentionCounts = { expiring: 0, expired: 0, lowStock: 0 };
  for (const p of packs) {
    const status = expiryStatus(p.expiry_date, today);
    if (status === "soon") counts.expiring += 1;
    if (status === "expired") counts.expired += 1;
    if (p.running_low) counts.lowStock += 1;
  }
  return counts;
}

// ---------- Labels ----------

const SOURCE_LABELS: Record<string, string> = {
  manual: "вручную",
  local: "своя база",
  amdm: "AMDM",
  openfda: "openFDA",
};

export function sourceLabel(source: string | null | undefined): string {
  return `Источник: ${SOURCE_LABELS[source ?? ""] ?? "не указан"}`;
}
