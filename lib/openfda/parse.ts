// openFDA drug label API (api.fda.gov/drug/label.json) → clean rows. Pure.
//
// The response is untrusted input: every field is checked for type, cleaned
// (control characters, whitespace, length) and anything unexpected is dropped.
// The label endpoint has no structured dosage form or strength, so they are
// read best effort from openfda.generic_name ("IBUPROFEN TABLET, FILM COATED")
// and from the "Active ingredient" / "Dosage forms and strengths" texts.

import { LIMITS } from "../storage/validation.ts";

export type OpenFdaItem = {
  /** Stable key for lists (set_id or id from the label). */
  key: string;
  name: string;
  inn: string | null;
  form: string | null;
  strength: string | null;
  manufacturer: string | null;
};

export type OpenFdaParse = { ok: true; items: OpenFdaItem[] } | { ok: false };

export const OPENFDA_MAX_ITEMS = 10;

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** First string of a string[] field (openFDA wraps almost everything in arrays). */
function firstString(v: unknown): string | null {
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return null;
}

function stringList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

// Control, zero-width and line/paragraph separator characters.
const CONTROL_RE = new RegExp("[\\u0000-\\u001f\\u007f-\\u009f\\u200b-\\u200f\\u2028\\u2029\\ufeff]", "g");

/** No control characters, collapsed whitespace, cut to the form field limit. */
export function cleanField(value: string | null | undefined, max: number = LIMITS.medicationField): string | null {
  if (!value) return null;
  const s = value.replace(CONTROL_RE, " ").replace(/\s+/g, " ").trim();
  if (!s) return null;
  return s.length > max ? s.slice(0, max).trimEnd() : s;
}

/** "IBUPROFEN AND FAMOTIDINE" → "Ibuprofen And Famotidine"; mixed case is kept as is. */
export function tidyCase(value: string): string {
  if (/[a-z]/.test(value) || !/[A-Z]/.test(value)) return value;
  return value.toLowerCase().replace(/(^|[\s,(/-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}

// Dosage forms as they appear in US labels, most specific first.
const FORMS: [RegExp, string][] = [
  // openfda.generic_name style: "TABLET, FILM COATED"
  [/\bfilm[- ]coated tablets?\b|\btablets?, film[- ]coated\b/i, "film-coated tablet"],
  [/\bextended[- ]release tablets?\b|\btablets?, extended[- ]release\b/i, "extended-release tablet"],
  [/\bcapsules?, liquid filled\b/i, "softgel"],
  [/\bchewable tablets?\b|\bchewables\b/i, "chewable tablet"],
  [/\beffervescent tablets?\b/i, "effervescent tablet"],
  [/\borally disintegrating tablets?\b/i, "orally disintegrating tablet"],
  [/\bcaplets?\b/i, "caplet"],
  [/\bgelcaps?\b/i, "gelcap"],
  [/\bsoftgels?\b|\bliquid[- ]filled capsules?\b/i, "softgel"],
  [/\btablets?\b/i, "tablet"],
  [/\bcapsules?\b/i, "capsule"],
  [/\blozenges?\b/i, "lozenge"],
  [/\bsuspension\b/i, "suspension"],
  [/\bsyrup\b/i, "syrup"],
  [/\bsolution\b/i, "solution"],
  [/\bliquid\b/i, "liquid"],
  [/\bcream\b/i, "cream"],
  [/\bointment\b/i, "ointment"],
  [/\bgel\b(?!\s*(?:caplets?|caps?|tablets?|tabs?)\b)/i, "gel"],
  [/\blotion\b/i, "lotion"],
  [/\bnasal spray\b/i, "nasal spray"],
  [/\bspray\b/i, "spray"],
  [/\bdrops\b/i, "drops"],
  [/\bpatch(es)?\b/i, "patch"],
  [/\bsuppositor(y|ies)\b/i, "suppository"],
  [/\bpowder\b/i, "powder"],
  [/\binjection\b/i, "injection"],
  [/\binhal(er|ation)\b/i, "inhaler"],
];

/** Earliest dosage form mentioned in the text (by position, then by specificity). */
export function detectForm(text: string | null): string | null {
  if (!text) return null;
  let best: { at: number; form: string } | null = null;
  for (const [re, form] of FORMS) {
    const m = re.exec(text);
    if (m && (best === null || m.index < best.at)) best = { at: m.index, form };
  }
  return best?.form ?? null;
}

// "200 mg", "0.025%", "26.6 mg", "100 mg/5 mL", "800 mg/26.6 mg"
const STRENGTH_RE =
  /\b\d+(?:[.,]\d+)?\s?(?:mg|mcg|µg|g|mL|ml|%|IU|units?)(?:\s?\/\s?\d*(?:[.,]\d+)?\s?(?:mg|mcg|g|mL|ml))?(?![a-z])/gi;

/** Strengths from a label text, at most 3, "250 mg / 125 mg". "(in each 30 mL)" is skipped. */
export function extractStrength(text: string | null): string | null {
  if (!text) return null;
  const withoutPer = text.replace(/\((?:in )?each[^)]*\)/gi, " ");
  const found: string[] = [];
  for (const m of withoutPer.matchAll(STRENGTH_RE)) {
    const s = m[0].replace(/\s+/g, " ").replace(/\s?\/\s?/g, "/").replace(/(\d)(mg|mcg|g|ml|iu)/i, "$1 $2").replace(/\s%/, "%");
    // "800 mg/26.6 mg" already covers a later "800 mg".
    if (!found.some((f) => f.includes(s))) found.push(s);
    if (found.length === 3) break;
  }
  return found.length ? found.join(" / ") : null;
}

/** "IBUPROFEN, ACETAMINOPHEN TABLET, FILM COATED" → substance part and form part. */
export function splitGenericName(generic: string): { inn: string; form: string | null } {
  const m = /\s(TABLET|CAPSULE|CAPLET|SUSPENSION|SOLUTION|SYRUP|CREAM|OINTMENT|GEL|LOTION|SPRAY|POWDER|INJECTION|LIQUID|PATCH|LOZENGE|SUPPOSITORY)\b/i.exec(
    generic,
  );
  if (!m) return { inn: generic, form: null };
  return { inn: generic.slice(0, m.index).replace(/[,\s]+$/, ""), form: detectForm(generic.slice(m.index)) };
}

function parseResult(r: unknown): OpenFdaItem | null {
  if (!isObject(r)) return null;
  const of = isObject(r.openfda) ? r.openfda : {};

  const brand = cleanField(firstString(of.brand_name));
  const genericRaw = cleanField(firstString(of.generic_name), 300);
  const generic = genericRaw ? splitGenericName(genericRaw) : null;
  const substances = stringList(of.substance_name).slice(0, 4).join(", ");
  const innRaw = generic?.inn || substances || null;
  const name = brand ?? (innRaw ? cleanField(innRaw) : null);
  if (!name) return null;

  const activeText = firstString(r.active_ingredient);
  const dfsText = firstString(r.dosage_forms_and_strengths);
  const panelText = firstString(r.package_label_principal_display_panel);

  const key = firstString(r.set_id) ?? firstString(r.id) ?? name;
  return {
    key: /^[0-9a-z-]{1,64}$/i.test(key) ? key : name,
    name: tidyCase(name),
    inn: innRaw ? cleanField(tidyCase(innRaw)) : null,
    // "Active ingredient (in each tablet)" names the form most reliably.
    form: generic?.form ?? detectForm(activeText) ?? detectForm(dfsText) ?? detectForm(panelText),
    strength: cleanField(extractStrength(activeText) ?? extractStrength(dfsText) ?? extractStrength(panelText)),
    manufacturer: cleanField(firstString(of.manufacturer_name)),
  };
}

const dedupeKey = (i: OpenFdaItem) =>
  [i.name, i.inn, i.form, i.strength].map((x) => (x ?? "").toLowerCase()).join("|");

/**
 * Whole response → up to OPENFDA_MAX_ITEMS distinct rows. "No matches" (the
 * API answers 404 NOT_FOUND) is a normal empty result, anything else
 * malformed is { ok: false }.
 */
export function parseOpenFdaResponse(json: unknown): OpenFdaParse {
  if (!isObject(json)) return { ok: false };
  if (isObject(json.error)) {
    return json.error.code === "NOT_FOUND" ? { ok: true, items: [] } : { ok: false };
  }
  if (!Array.isArray(json.results)) return { ok: false };

  const seen = new Set<string>();
  const items: OpenFdaItem[] = [];
  for (const r of json.results) {
    const item = parseResult(r);
    if (!item) continue;
    const k = dedupeKey(item);
    if (seen.has(k)) continue;
    seen.add(k);
    items.push(item);
    if (items.length === OPENFDA_MAX_ITEMS) break;
  }
  return { ok: true, items };
}
