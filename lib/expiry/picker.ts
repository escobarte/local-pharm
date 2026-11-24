// Pure helpers for the "Месяц" + "Год" expiry picker (components/ExpiryPicker.tsx).
// The picker sends the SAME text the old input did ("MM/YYYY"), so the server
// parser (parseExpiryInput in lib/dates.ts) and the Server Actions are unchanged.

export const EXPIRY_PICKER_ERROR = "Выберите месяц и год или оставьте оба пустыми";

/** Years offered before the current one (already expired packs found at the first inventory). */
export const EXPIRY_YEARS_BACK = 3;

/** Years offered after the current one. */
export const EXPIRY_YEARS_AHEAD = 10;

export const MONTH_NAMES = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
] as const;

export type MonthOption = { value: string; label: string };

/** "01 Январь" … "12 Декабрь"; value is the zero-padded number. */
export const MONTH_OPTIONS: readonly MonthOption[] = MONTH_NAMES.map((name, i) => {
  const value = String(i + 1).padStart(2, "0");
  return { value, label: `${value} ${name}` };
});

export type ExpiryParts = { month: string; year: string };

/**
 * Splits a stored/submitted value into picker state. Accepts "MM/YYYY" (also
 * "M/YYYY", "MM.YYYY", "YYYY-MM", a full "YYYY-MM-DD") and the partial values the
 * picker itself can send ("MM/" or "/YYYY"). Anything else → both empty.
 */
export function splitExpiryValue(raw: string | null | undefined): ExpiryParts {
  const text = (raw ?? "").trim();
  const empty: ExpiryParts = { month: "", year: "" };
  if (text === "") return empty;

  const month = (s: string): string => {
    const n = Number(s);
    return Number.isInteger(n) && n >= 1 && n <= 12 ? String(n).padStart(2, "0") : "";
  };

  let m = /^(\d{1,2})?[./-](\d{4})?$/.exec(text);
  if (m) return { month: month(m[1] ?? ""), year: m[2] ?? "" };

  m = /^(\d{4})-(\d{1,2})(?:-\d{1,2})?$/.exec(text);
  if (m) return { month: month(m[2]), year: m[1] };

  return empty;
}

/**
 * Builds the value for the hidden "expiry" field:
 *   both empty → ""        (no expiry)
 *   both set   → "MM/YYYY" (server turns it into the last day of the month)
 *   only one   → "MM/" or "/YYYY" — deliberately invalid, so the server rejects it
 *                and a half-filled date can never be saved as "no expiry".
 */
export function composeExpiryValue(month: string, year: string): string {
  if (month === "" && year === "") return "";
  return `${month}/${year}`;
}

/** True when exactly one of the two lists is chosen. */
export function isHalfExpiry(month: string, year: string): boolean {
  return (month === "") !== (year === "");
}

/**
 * Year list, ascending: current − 3 … current + 10. A year outside it (an old value being edited
 * or refilled) is kept so the select can still show what was chosen.
 */
export function expiryYearOptions(currentYear: number, selectedYear = ""): string[] {
  const years = Array.from({ length: EXPIRY_YEARS_BACK + EXPIRY_YEARS_AHEAD + 1 }, (_, i) =>
    String(currentYear - EXPIRY_YEARS_BACK + i),
  );
  if (/^\d{4}$/.test(selectedYear) && !years.includes(selectedYear)) {
    years.push(selectedYear);
    years.sort();
  }
  return years;
}
