// Pure date helpers. Dates are plain "YYYY-MM-DD" strings (Postgres `date`),
// never JS Date objects, so there is no timezone drift.

export type IsoDate = string;

export type ParsedExpiry =
  | { ok: true; value: IsoDate | null }
  | { ok: false; error: string };

export const EXPIRY_FORMAT_HINT = "Укажите срок в формате ММ/ГГГГ, например 12/2026";
const EXPIRY_YEAR_ERROR = "Год должен быть от 2000 до 2100";

const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function toIso(year: number, month: number, day: number): IsoDate {
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
}

function validate(year: number, month: number, day: number | "last"): ParsedExpiry {
  if (year < MIN_YEAR || year > MAX_YEAR) return { ok: false, error: EXPIRY_YEAR_ERROR };
  if (month < 1 || month > 12) return { ok: false, error: EXPIRY_FORMAT_HINT };
  const last = daysInMonth(year, month);
  const d = day === "last" ? last : day;
  if (d < 1 || d > last) return { ok: false, error: EXPIRY_FORMAT_HINT };
  return { ok: true, value: toIso(year, month, d) };
}

/**
 * Parses an expiry typed by a person. Accepted:
 *   "12/2026", "12.2026", "12-2026", "12/26"  → last day of that month
 *   "2026-12"                                 → last day of that month
 *   "15.12.2026", "15/12/2026", "2026-12-15"  → that exact day
 * Empty input means "no expiry" (value: null).
 * Packaging says "use by end of month", hence month-only → last day.
 */
export function parseExpiryInput(raw: string | null | undefined): ParsedExpiry {
  const text = (raw ?? "").trim();
  if (text === "") return { ok: true, value: null };

  let m = /^(\d{1,2})[./-](\d{4})$/.exec(text);
  if (m) return validate(Number(m[2]), Number(m[1]), "last");

  m = /^(\d{1,2})[./-](\d{2})$/.exec(text);
  if (m) return validate(2000 + Number(m[2]), Number(m[1]), "last");

  m = /^(\d{4})-(\d{1,2})$/.exec(text);
  if (m) return validate(Number(m[1]), Number(m[2]), "last");

  m = /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/.exec(text);
  if (m) return validate(Number(m[3]), Number(m[2]), Number(m[1]));

  m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  if (m) return validate(Number(m[1]), Number(m[2]), Number(m[3]));

  return { ok: false, error: EXPIRY_FORMAT_HINT };
}

/** "2026-12-31" → "12/2026" (end of month); any other day → "15.12.2026". */
export function formatExpiry(iso: IsoDate | null | undefined): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return "";
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (day === daysInMonth(year, month)) return `${m[2]}/${m[1]}`;
  return `${m[3]}.${m[2]}.${m[1]}`;
}

/** "2026-03-05" → "05.03.2026" (a plain calendar date, e.g. when a pack was opened). */
export function formatDate(iso: IsoDate | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
  return m ? `${m[3]}.${m[2]}.${m[1]}` : "";
}

export type ExpiryStatus = "none" | "expired" | "soon" | "ok";

export const SOON_DAYS = 30;

function dayNumber(iso: IsoDate): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

/** "soon" = expires within 30 days (inclusive), matching the BRAND "warn" state. */
export function expiryStatus(expiry: IsoDate | null | undefined, today: IsoDate): ExpiryStatus {
  if (!expiry) return "none";
  const diff = dayNumber(expiry) - dayNumber(today);
  if (diff < 0) return "expired";
  if (diff <= SOON_DAYS) return "soon";
  return "ok";
}

export function todayIso(now: Date = new Date()): IsoDate {
  return now.toISOString().slice(0, 10);
}
