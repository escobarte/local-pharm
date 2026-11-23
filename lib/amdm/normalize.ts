// Text normalization for the AMDM registry search. Pure, no I/O.
//
// ONE function for both sides:
//   * scripts/amdm/build-csv.ts builds amdm_registry.search_text with it;
//   * the app normalizes every query word with it before `LIKE '%word%'`.
// If this changes, the registry CSV must be rebuilt and re-imported
// (docs/SETUP-SUPABASE.md, section 7), otherwise queries and data drift apart.
//
// Output alphabet is only [a-z0-9 ]: no quotes, commas, dots, parentheses or
// wildcards, so the result is safe to put into a PostgREST filter string.

import { hasCyrillic, transliteratePrimary } from "./translit.ts";

/**
 * Lowercase ASCII: diacritics removed (ă→a, ş→s, ţ→t, î→i, ç→c), ®/™/© dropped,
 * hyphens and apostrophes joined ("No-Spa" → "nospa"), any other punctuation
 * becomes a space, whitespace collapsed. Stray Cyrillic is transliterated.
 */
export function normalizeSearchText(value: string | null | undefined): string {
  let s = (value ?? "").replace(/[®™©℗℠]/g, " ");
  if (hasCyrillic(s)) s = s.replace(/[а-яё]+/gi, (m) => transliteratePrimary(m));
  return s
    .normalize("NFKD")
    .replace(/\p{M}/gu, "") // combining marks left by NFKD (diacritics)
    .toLowerCase()
    .replace(/ı/g, "i") // Turkish dotless i has no decomposition
    .replace(/ß/g, "ss")
    .replace(/[-‐-―−'’ʼ`´]/g, "") // hyphens, apostrophes: join the parts
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** registry search_text: name + INN + ATC + barcode, normalized. */
export function buildSearchText(parts: {
  name: string | null;
  inn: string | null;
  atc: string | null;
  barcode: string | null;
}): string {
  return normalizeSearchText([parts.name, parts.inn, parts.atc, parts.barcode].filter(Boolean).join(" "));
}
