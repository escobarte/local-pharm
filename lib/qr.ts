// Box QR stickers: what goes into the QR and how a scanned QR is read back.
// Pure (no Next.js / DOM imports): used by the print page and the scanner in
// the browser, by the server pages, and by unit tests.
//
// A sticker holds a full URL: <origin>/q/<qr_token>. Opening it in any camera
// app goes to /q/<token> → the box page (after sign-in if needed).

import { isUuid } from "./storage/validation.ts";

export const QR_ROUTE = "/q/";

const QR_PATH_RE = /^\/q\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/?$/i;

/** "/q/<token>" — the in-app route of a sticker (token lowercased). */
export function boxQrPath(token: string): string {
  return `${QR_ROUTE}${token.toLowerCase()}`;
}

/**
 * Origin ("https://host[:port]") of an http(s) URL, or null. Used for the
 * optional NEXT_PUBLIC_SITE_URL override: a path or a trailing slash is
 * dropped, anything that is not http(s) is ignored.
 */
export function readSiteOrigin(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password) return null;
    return url.origin;
  } catch {
    return null;
  }
}

/** Origin for the QR: NEXT_PUBLIC_SITE_URL if set and valid, else where the page is open. */
export function qrOrigin(siteUrl: string | null | undefined, currentOrigin: string): string {
  return readSiteOrigin(siteUrl) ?? readSiteOrigin(currentOrigin) ?? currentOrigin;
}

/** Full URL printed into the QR: "<origin>/q/<token>". */
export function boxQrUrl(origin: string, token: string): string {
  return `${origin.replace(/\/+$/, "")}${boxQrPath(token)}`;
}

/** Origins a scanned QR may point to: this site and the configured site URL. */
export function allowedQrOrigins(currentOrigin: string, siteUrl?: string | null): string[] {
  const list = [readSiteOrigin(currentOrigin), readSiteOrigin(siteUrl)].filter(
    (o): o is string => Boolean(o),
  );
  return [...new Set(list)];
}

export type ParsedBoxQr =
  | { ok: true; token: string }
  | { ok: false; error: "empty" | "foreign" };

/**
 * Reads a scanned QR or a typed link. Accepted:
 *  - "<allowed origin>/q/<uuid>" (query and hash ignored);
 *  - the same without "https://" (typed by hand);
 *  - "/q/<uuid>" or the bare token (manual input).
 * Anything else — another site, another route, plain text — is "foreign":
 * the app never navigates to an address from someone else's QR.
 */
export function parseBoxQr(input: string | null | undefined, allowedOrigins: readonly string[]): ParsedBoxQr {
  const text = (input ?? "").trim();
  if (!text) return { ok: false, error: "empty" };
  if (/[\s\u0000-\u001f\u007f]/.test(text)) return { ok: false, error: "foreign" };

  if (isUuid(text)) return { ok: true, token: text.toLowerCase() };

  const pathMatch = QR_PATH_RE.exec(text);
  if (pathMatch) return { ok: true, token: pathMatch[1].toLowerCase() };

  // "host[:port]/q/<uuid>" typed without a scheme → try https:// and http://.
  // Other "scheme:" values (javascript:, data:, mailto:) are never URLs of ours.
  const candidates = /^https?:\/\//i.test(text)
    ? [text]
    : /^[a-z0-9-]+(?:\.[a-z0-9-]+)*(?::\d{1,5})?\//i.test(text)
      ? [`https://${text}`, `http://${text}`]
      : [];

  const allowed = new Set(allowedOrigins.map((o) => readSiteOrigin(o)).filter(Boolean));
  for (const candidate of candidates) {
    let url: URL;
    try {
      url = new URL(candidate);
    } catch {
      continue;
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") continue;
    if (url.username || url.password) continue;
    if (!allowed.has(url.origin)) continue;
    const m = QR_PATH_RE.exec(url.pathname);
    if (m) return { ok: true, token: m[1].toLowerCase() };
  }
  return { ok: false, error: "foreign" };
}

/** Message for a failed parse (shown under the manual field and on the camera). */
export const QR_ERRORS: Record<"empty" | "foreign", string> = {
  empty: "Вставьте ссылку с наклейки или код из неё.",
  foreign: "Это не наклейка Local Pharm.",
};

/**
 * Origin of the current request from its headers (server side), or null.
 * Only for building our own links and checking a typed link against "this
 * site" — never for security decisions.
 */
export function originFromHeaders(h: {
  host?: string | null;
  forwardedHost?: string | null;
  forwardedProto?: string | null;
}): string | null {
  const host = (h.forwardedHost ?? h.host ?? "").split(",")[0].trim().toLowerCase();
  if (!/^(?:[a-z0-9-]+(?:\.[a-z0-9-]+)*|\[[0-9a-f:.]+\])(?::\d{1,5})?$/.test(host)) return null;
  const rawProto = (h.forwardedProto ?? "").split(",")[0].trim().toLowerCase();
  const local = /^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host);
  const proto = rawProto === "http" || rawProto === "https" ? rawProto : local ? "http" : "https";
  return readSiteOrigin(`${proto}://${host}`);
}
