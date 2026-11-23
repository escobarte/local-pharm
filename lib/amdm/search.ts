// AMDM registry search: query parsing, PostgREST filters and ranking. Pure, no I/O.
// The query itself runs on the server (lib/amdm/queries.ts): the registry has
// ~6 300 rows, PostgREST returns at most 1 000, so it is never loaded whole.

import { normalizeSearchText } from "./normalize.ts";
import { MAX_VARIANTS, hasCyrillic, transliterateVariants } from "./translit.ts";
import type { RegistryItem } from "./types.ts";

export const REGISTRY_MAX_QUERY_LENGTH = 100;
export const REGISTRY_RESULT_LIMIT = 30;
/** Rows fetched before ranking; ranking then keeps REGISTRY_RESULT_LIMIT. */
export const REGISTRY_FETCH_LIMIT = 300;
const MAX_WORDS = 6;
const MIN_QUERY_CHARS = 2;

// ---------- Barcode ----------

/**
 * A query of 8–13 digits (spaces and hyphens allowed) is a barcode. Returns the
 * exact-match candidates or null. EAN-13 "0…" and UPC-A (12 digits) are the
 * same code, so each also tries the other form.
 */
export function parseBarcodeQuery(query: string): string[] | null {
  const digits = query.replace(/[\s-]/g, "");
  if (!/^\d{8,13}$/.test(digits)) return null;
  const candidates = [digits];
  if (digits.length === 13 && digits.startsWith("0")) candidates.push(digits.slice(1));
  if (digits.length === 12) candidates.push(`0${digits}`);
  return candidates;
}

// ---------- Text ----------

/**
 * Query → words → Latin variants of each word, normalized like search_text.
 * Every word must match (AND); a word matches if any of its variants does (OR).
 * Hyphens and apostrophes join parts ("но-шпа" is one word), other punctuation splits.
 */
export function queryWordVariants(query: string): string[][] {
  const words = query
    .slice(0, REGISTRY_MAX_QUERY_LENGTH)
    .replace(/[-‐-―−'’ʼ`´]/g, "")
    .split(/[^\p{L}\p{N}®™©]+/u)
    .filter(Boolean)
    .slice(0, MAX_WORDS);

  const result: string[][] = [];
  for (const word of words) {
    const spellings = hasCyrillic(word) ? transliterateVariants(word, MAX_VARIANTS) : [word];
    const variants: string[] = [];
    for (const spelling of spellings) {
      // A spelling may normalize to several parts ("b12" stays, "®" vanishes).
      for (const part of normalizeSearchText(spelling).split(" ")) {
        if (part && !variants.includes(part)) variants.push(part);
      }
    }
    if (variants.length > 0) result.push(variants);
  }
  return result;
}

export type RegistryQueryPlan =
  | { kind: "empty" }
  | { kind: "too-short" }
  | { kind: "barcode"; candidates: string[] }
  | { kind: "text"; words: string[][] };

export function planRegistryQuery(rawQuery: string): RegistryQueryPlan {
  const query = rawQuery.replace(/\s+/g, " ").trim().slice(0, REGISTRY_MAX_QUERY_LENGTH);
  if (!query) return { kind: "empty" };
  const barcode = parseBarcodeQuery(query);
  if (barcode) return { kind: "barcode", candidates: barcode };
  const words = queryWordVariants(query);
  const chars = words.reduce((sum, w) => sum + (w[0]?.length ?? 0), 0);
  if (words.length === 0 || chars < MIN_QUERY_CHARS) return { kind: "too-short" };
  return { kind: "text", words };
}

/**
 * One PostgREST `or=(…)` filter per word: search_text LIKE '%variant%'.
 * Safe to interpolate: variants contain only [a-z0-9] (normalizeSearchText).
 */
export function wordFilters(words: readonly string[][]): string[] {
  return words.map((variants) => variants.map((v) => `search_text.like.*${v}*`).join(","));
}

// ---------- Ranking ----------

/**
 * Best first: name starts with the first word → every word is in the name →
 * the match is elsewhere (INN, ATC). Then by name, dose and pack size.
 */
export function rankRegistryItems(
  items: readonly RegistryItem[],
  words: readonly string[][],
  limit: number = REGISTRY_RESULT_LIMIT,
): RegistryItem[] {
  const score = (item: RegistryItem): number => {
    const name = normalizeSearchText(item.name);
    const first = words[0] ?? [];
    if (first.some((v) => name.startsWith(v))) return 0;
    if (words.every((variants) => variants.some((v) => name.includes(v)))) return 1;
    return 2;
  };
  const collator = new Intl.Collator("ro", { sensitivity: "base", numeric: true });
  return items
    .map((item) => ({ item, s: score(item) }))
    .sort(
      (a, b) =>
        a.s - b.s ||
        collator.compare(a.item.name, b.item.name) ||
        collator.compare(a.item.dose ?? "", b.item.dose ?? "") ||
        collator.compare(a.item.packSize ?? "", b.item.packSize ?? ""),
    )
    .slice(0, limit)
    .map((x) => x.item);
}

// ---------- URL ----------

const CODE_RE = /^\d{1,16}$/;

export function isRegistryCode(value: unknown): value is string {
  return typeof value === "string" && CODE_RE.test(value);
}
