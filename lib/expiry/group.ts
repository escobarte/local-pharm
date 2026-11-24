// Pure grouping for the "Сроки годности" screen (no I/O).
// The 30-day rule is NOT redefined here: "expired" / "soon" come from
// expiryStatus() in lib/dates.ts; this file only adds the 90-day horizon.

import { addDays, expiryStatus, SOON_DAYS, type IsoDate } from "../dates.ts";

/** Packs expiring later than SOON_DAYS but within this many days form the third group. */
export const LATER_DAYS = 90;

export type ExpiryGroupKey = "expired" | "soon" | "later";

export const EXPIRY_GROUP_ORDER: readonly ExpiryGroupKey[] = ["expired", "soon", "later"];

/** "2026-11-24" → last day shown on the screen ("2027-02-22"). */
export const expiryHorizon = (today: IsoDate): IsoDate => addDays(today, LATER_DAYS);

/** Last day counted by the menu badge / digest: expired + expiring within 30 days. */
export const attentionHorizon = (today: IsoDate): IsoDate => addDays(today, SOON_DAYS);

/**
 * Which group a pack belongs to; null when it has no expiry date or expires
 * later than the horizon (such packs are not shown).
 * expired: before today · soon: today..+30 days · later: +31..+90 days.
 */
export function expiryGroupOf(
  expiry: IsoDate | null | undefined,
  today: IsoDate,
): ExpiryGroupKey | null {
  const status = expiryStatus(expiry, today);
  if (status === "none") return null;
  if (status === "expired") return "expired";
  if (status === "soon") return "soon";
  return expiry! <= expiryHorizon(today) ? "later" : null;
}

export type ExpiryGroup<T> = { key: ExpiryGroupKey; items: T[] };

/**
 * Splits packs into the three groups, each sorted by expiry date (earliest first),
 * then by name. Empty groups are omitted; packs without a date or beyond the
 * horizon are dropped.
 */
export function groupByExpiry<T extends { expiryDate: IsoDate | null; title: string }>(
  items: readonly T[],
  today: IsoDate,
): ExpiryGroup<T>[] {
  const buckets: Record<ExpiryGroupKey, T[]> = { expired: [], soon: [], later: [] };
  for (const item of items) {
    const key = expiryGroupOf(item.expiryDate, today);
    if (key) buckets[key].push(item);
  }
  const byDateThenName = (a: T, b: T) =>
    (a.expiryDate ?? "").localeCompare(b.expiryDate ?? "") || a.title.localeCompare(b.title, "ru");
  return EXPIRY_GROUP_ORDER.filter((key) => buckets[key].length > 0).map((key) => ({
    key,
    items: buckets[key].sort(byDateThenName),
  }));
}

/** Shopping-list reason for a pack in the given group. */
export function reasonForGroup(key: ExpiryGroupKey): "expired" | "expiring" {
  return key === "expired" ? "expired" : "expiring";
}
