// Cleaning of one raw AMDM registry row → one amdm_registry row. Pure; used by
// scripts/amdm/build-csv.ts and covered by tests/amdm-import.test.ts.

import { buildSearchText } from "../../lib/amdm/normalize.ts";

/** Column order of public.amdm_registry (migration 0004) = CSV header. */
export const REGISTRY_COLUMNS = [
  "code",
  "name",
  "form",
  "dose",
  "volume",
  "pack_size",
  "holder",
  "country",
  "manufacturer",
  "reg_number",
  "reg_date",
  "atc",
  "inn",
  "shelf_life_months",
  "barcode",
  "rx",
  "med_type",
  "search_text",
] as const;

export type RegistryColumn = (typeof REGISTRY_COLUMNS)[number];
export type RegistryRow = Record<RegistryColumn, string | number | boolean | null>;

// Raw column indexes in the xls (see EXPECTED_HEADER in xls_to_json.py).
const COL = {
  code: 1,
  name: 2,
  form: 3,
  dose: 4,
  volume: 5,
  packSize: 6,
  holder: 7,
  country: 8,
  manufacturer: 9,
  regNumber: 10,
  regDate: 11,
  atc: 12,
  inn: 13,
  shelfLife: 14,
  barcode: 15,
  rx: 18,
  medType: 19,
} as const;

// Cyrillic letters that look like Latin ones (the export has "SА" with a Cyrillic А).
const HOMOGLYPHS: Record<string, string> = {
  А: "A", В: "B", Е: "E", К: "K", М: "M", Н: "H", О: "O", Р: "P", С: "C", Т: "T", Х: "X",
  а: "a", е: "e", о: "o", р: "p", с: "c", у: "y", х: "x",
};

/**
 * Trimmed text with collapsed whitespace (incl. NBSP and line breaks).
 * "", "undefined" → null. Private-use hyphen U+F02D → "-". Cyrillic
 * look-alikes inside Latin text are replaced with Latin letters.
 */
export function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  let s = value.replace(//g, "-").replace(/[\s ]+/g, " ").trim();
  if (s === "" || s.toLowerCase() === "undefined") return null;
  if (/[A-Za-z]/.test(s) && /[А-Яа-яЁё]/.test(s)) {
    s = s.replace(/[А-Яа-яЁё]/g, (ch) => HOMOGLYPHS[ch] ?? ch);
  }
  return s;
}

/** "dd.mm.yyyy" or "yyyy-mm-dd" → ISO date; anything else (or an impossible date) → null. */
export function parseRegistryDate(value: unknown): string | null {
  const s = cleanText(value);
  if (!s) return null;
  let m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(s);
  let y: number, mo: number, d: number;
  if (m) [y, mo, d] = [Number(m[3]), Number(m[2]), Number(m[1])];
  else if ((m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s))) [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  else return null;
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null;
  return `${String(y).padStart(4, "0")}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Barcode: digits only, 8–14 long; "0" and anything else → null. */
export function cleanBarcode(value: unknown): string | null {
  const s = (cleanText(value) ?? "").replace(/\s/g, "");
  return /^\d{8,14}$/.test(s) ? s : null;
}

/** Shelf life in months; 0 or not a whole number → null. */
export function parseShelfLife(value: unknown): number | null {
  const s = cleanText(value);
  if (!s || !/^\d{1,4}$/.test(s)) return null;
  const n = Number(s);
  return n > 0 ? n : null;
}

/** "RX" → true, "OTC" → false, anything else → null. */
export function parseRx(value: unknown): boolean | null {
  const s = (cleanText(value) ?? "").toUpperCase();
  if (s === "RX") return true;
  if (s === "OTC") return false;
  return null;
}

export type CleanResult = { ok: true; row: RegistryRow } | { ok: false; error: string };

export function cleanRegistryRow(raw: readonly unknown[]): CleanResult {
  const code = cleanText(raw[COL.code]);
  if (!code || !/^\d+$/.test(code)) return { ok: false, error: `bad code: ${String(raw[COL.code])}` };
  const name = cleanText(raw[COL.name]);
  if (!name) return { ok: false, error: `code ${code}: empty name` };

  const atc = cleanText(raw[COL.atc]);
  const inn = cleanText(raw[COL.inn]);
  const barcode = cleanBarcode(raw[COL.barcode]);

  return {
    ok: true,
    row: {
      code,
      name,
      form: cleanText(raw[COL.form]),
      dose: cleanText(raw[COL.dose]),
      volume: cleanText(raw[COL.volume]),
      pack_size: cleanText(raw[COL.packSize]),
      holder: cleanText(raw[COL.holder]),
      country: cleanText(raw[COL.country]),
      manufacturer: cleanText(raw[COL.manufacturer]),
      reg_number: cleanText(raw[COL.regNumber]),
      reg_date: parseRegistryDate(raw[COL.regDate]),
      atc,
      inn,
      shelf_life_months: parseShelfLife(raw[COL.shelfLife]),
      barcode,
      rx: parseRx(raw[COL.rx]),
      med_type: cleanText(raw[COL.medType]),
      search_text: buildSearchText({ name, inn, atc, barcode }),
    },
  };
}

// ---------- Output formats ----------

/** RFC 4180 field: null → empty (imported as NULL), quoted when needed. */
export function csvField(value: string | number | boolean | null): string {
  if (value === null) return "";
  const s = String(value);
  return /[",\r\n]|^\s|\s$/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function csvLine(row: RegistryRow): string {
  return REGISTRY_COLUMNS.map((c) => csvField(row[c])).join(",");
}

/** SQL literal for the upsert files. */
export function sqlLiteral(value: string | number | boolean | null): string {
  if (value === null) return "null";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return `'${value.replace(/'/g, "''")}'`;
}

/** One `insert … on conflict (code) do update` statement for a batch of rows. */
export function upsertStatement(rows: readonly RegistryRow[]): string {
  const cols = REGISTRY_COLUMNS.join(", ");
  const values = rows
    .map((r) => `  (${REGISTRY_COLUMNS.map((c) => sqlLiteral(r[c])).join(", ")})`)
    .join(",\n");
  const updates = REGISTRY_COLUMNS.filter((c) => c !== "code")
    .map((c) => `${c} = excluded.${c}`)
    .join(", ");
  return `insert into public.amdm_registry (${cols}) values\n${values}\non conflict (code) do update set ${updates};\n`;
}
