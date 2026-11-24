// Builds the weekly e-mail (pure: rows in, strings out). Russian text.
// Expired / expiring split reuses expiryStatus() from lib/dates.ts.

import { expiryStatus, formatExpiry, type IsoDate } from "../dates.ts";
import { pcsLabel } from "../format.ts";
import { placeLabel } from "../medications/search.ts";

/** One pack, as returned by public.weekly_expiry_digest() (already renamed). */
export type DigestRow = {
  medicationName: string;
  boxNumber: string | null;
  boxName: string;
  compartmentCode: string;
  expiryDate: IsoDate;
  quantity: number;
};

export type Digest = {
  subject: string;
  text: string;
  html: string;
  expired: number;
  soon: number;
};

export const DIGEST_SUBJECT = "Local Pharm: сроки на неделе";

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** "Название — №2 Аптечка · A1 — до 12/2026 · 3 шт." */
export function digestLine(row: DigestRow): string {
  const place = placeLabel({
    boxName: row.boxName,
    boxNumber: row.boxNumber,
    code: row.compartmentCode,
  });
  return `${row.medicationName} — ${place} — до ${formatExpiry(row.expiryDate)} · ${pcsLabel(row.quantity)}`;
}

const byDateThenName = (a: DigestRow, b: DigestRow) =>
  a.expiryDate.localeCompare(b.expiryDate) || a.medicationName.localeCompare(b.medicationName, "ru");

// E-mail clients do not read CSS variables, so the BRAND token values are inlined
// (docs/BRAND.md: navy, muted, danger-fg, warn-fg, border).
const C = { navy: "#122056", muted: "#4F5778", danger: "#B42318", warn: "#9A4A00", border: "#DDDFF3" };

/**
 * Nothing expired and nothing expiring → null (no e-mail is sent).
 * `siteUrl` (no trailing slash) adds a link to /expiry; null leaves it out.
 */
export function buildDigest(
  rows: readonly DigestRow[],
  today: IsoDate,
  siteUrl: string | null,
): Digest | null {
  const expired = rows.filter((r) => expiryStatus(r.expiryDate, today) === "expired").sort(byDateThenName);
  const soon = rows.filter((r) => expiryStatus(r.expiryDate, today) === "soon").sort(byDateThenName);
  if (expired.length === 0 && soon.length === 0) return null;

  const link = siteUrl ? `${siteUrl}/expiry` : null;
  const sections = [
    { title: `Просрочено (${expired.length})`, rows: expired, color: C.danger },
    { title: `Истекает в 30 дней (${soon.length})`, rows: soon, color: C.warn },
  ].filter((s) => s.rows.length > 0);

  const text = [
    "Local Pharm: сроки годности",
    "",
    ...sections.flatMap((s) => [s.title, ...s.rows.map((r) => `- ${digestLine(r)}`), ""]),
    link ? `Открыть экран «Сроки годности»: ${link}` : "",
  ]
    .join("\n")
    .trimEnd();

  const htmlSections = sections
    .map(
      (s) =>
        `<h2 style="margin:20px 0 8px;font-size:15px;color:${s.color}">${escapeHtml(s.title)}</h2>` +
        `<ul style="margin:0;padding:0 0 0 18px">` +
        s.rows
          .map((r) => `<li style="margin:0 0 6px;line-height:1.4">${escapeHtml(digestLine(r))}</li>`)
          .join("") +
        `</ul>`,
    )
    .join("");
  const htmlLink = link
    ? `<p style="margin:24px 0 0"><a href="${escapeHtml(link)}" style="color:${C.navy};font-weight:600">Открыть экран «Сроки годности»</a></p>`
    : "";
  const html =
    `<!doctype html><html lang="ru"><body style="margin:0;padding:16px;background:#FAFAFD">` +
    `<div style="max-width:560px;margin:0 auto;padding:20px;background:#FFFFFF;border:1px solid ${C.border};border-radius:12px;` +
    `font-family:Inter,Helvetica,Arial,sans-serif;font-size:15px;color:${C.navy}">` +
    `<h1 style="margin:0;font-size:20px">Local Pharm: сроки годности</h1>` +
    `<p style="margin:6px 0 0;color:${C.muted};font-size:13px">Что просрочено и что истекает в ближайшие 30 дней.</p>` +
    htmlSections +
    htmlLink +
    `</div></body></html>`;

  return { subject: DIGEST_SUBJECT, text, html, expired: expired.length, soon: soon.length };
}
