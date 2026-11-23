// Search expression for the openFDA label API. Pure.
//
// Every query word must match brand_name or generic_name (AND between words,
// OR between spellings). Words come from the same normalization as the AMDM
// search (lowercase ASCII, Cyrillic → Latin variants), so they contain only
// [a-z0-9] and are safe inside the quoted openFDA terms.

import { parseBarcodeQuery, queryWordVariants } from "../amdm/search.ts";
import { barcodeLookupVariants, parseBarcode } from "../barcode.ts";

export const OPENFDA_DEFAULT_URL = "https://api.fda.gov/drug/label.json";
export const OPENFDA_FETCH_LIMIT = 25;
const MAX_SPELLINGS = 3;
const MAX_WORDS = 4;

/** International name (EU / Moldova) → US name, where the US label uses another one. */
const US_NAMES: Record<string, string> = {
  paracetamol: "acetaminophen",
  salbutamol: "albuterol",
  adrenalin: "epinephrine",
  adrenaline: "epinephrine",
  noradrenaline: "norepinephrine",
  lignocaine: "lidocaine",
  frusemide: "furosemide",
  glibenclamide: "glyburide",
  metamizole: "dipyrone",
};

const term = (w: string) => `openfda.brand_name:"${w}" openfda.generic_name:"${w}"`;

/** `search` parameter for a text or barcode query, or null when there is nothing to ask. */
export function buildOpenFdaSearch(query: string): string | null {
  if (parseBarcodeQuery(query)) {
    // openFDA stores UPC as 13 digits with a leading 0; try the 12-digit one too.
    const parsed = parseBarcode(query);
    if (!parsed.ok) return null;
    const variants = barcodeLookupVariants(parsed.value);
    return variants.map((v) => `openfda.upc:"${v}"`).join(" ");
  }

  const words = queryWordVariants(query).slice(0, MAX_WORDS);
  if (words.length === 0 || words.every((w) => (w[0] ?? "").length < 3)) return null;
  return words
    .map((spellings) => {
      const list = spellings.slice(0, MAX_SPELLINGS);
      for (const s of [...list]) {
        const us = US_NAMES[s];
        if (us && !list.includes(us)) list.push(us);
      }
      return `(${list.map(term).join(" ")})`;
    })
    .join(" AND ");
}

/** Full request URL. `base` comes from OPENFDA_API_URL (tests) or the public API. */
export function openFdaUrl(search: string, base: string = OPENFDA_DEFAULT_URL): string {
  const params = new URLSearchParams({ search, limit: String(OPENFDA_FETCH_LIMIT) });
  return `${base}?${params.toString()}`;
}
