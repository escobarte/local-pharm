// Pure helpers for reading configuration. No Next.js imports here so the
// module can be unit-tested with `node --test`.

export type SupabaseEnv = {
  url: string;
  publishableKey: string;
};

type RawSupabaseEnv = {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
};

/** Returns null when Supabase is not configured (missing, blank or invalid URL). */
export function readSupabaseEnv(raw: RawSupabaseEnv): SupabaseEnv | null {
  const url = raw.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = raw.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !publishableKey) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  } catch {
    return null;
  }
  return { url, publishableKey };
}

/**
 * NEXT_PUBLIC_* values are inlined at build time, so they must be referenced
 * literally (not via dynamic keys). Changing them requires a Redeploy.
 */
export function getSupabaseEnv(): SupabaseEnv | null {
  return readSupabaseEnv({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}

/**
 * openFDA label endpoint. OPENFDA_API_URL (server-only, optional) overrides
 * the public API — used by local tests with a stub. Invalid values are ignored.
 */
export function readOpenFdaUrl(raw: string | undefined, fallback: string): string {
  const value = raw?.trim();
  if (!value) return fallback;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? value : fallback;
  } catch {
    return fallback;
  }
}

/**
 * NEXT_PUBLIC_SITE_URL (optional): the address printed into box QR stickers.
 * Not set → stickers use the address the page is opened at. Read literally so
 * Next.js inlines it into the browser bundle (changing it needs a Redeploy).
 */
export function getSiteUrlOverride(): string | undefined {
  return process.env.NEXT_PUBLIC_SITE_URL;
}

// ---------- Weekly e-mail (Phase 6) ----------

export type MailEnv = {
  apiKey: string;
  /** "Local Pharm <onboarding@resend.dev>" or a bare address. */
  from: string;
  to: string[];
};

const EMAIL_RE = /^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/;
const FROM_RE = /^(?:[^<>]+<[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+>|[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+)$/;
export const MAX_RECIPIENTS = 10;

/** "a@x.com, b@y.com" → ["a@x.com", "b@y.com"]: trimmed, lowercase, unique, valid only. */
export function parseRecipientList(raw: string | undefined): string[] {
  const seen = new Set<string>();
  for (const part of (raw ?? "").split(",")) {
    const email = part.trim().toLowerCase();
    if (EMAIL_RE.test(email)) seen.add(email);
  }
  return [...seen].slice(0, MAX_RECIPIENTS);
}

type RawMailEnv = { RESEND_API_KEY?: string; MAIL_FROM?: string; NOTIFY_EMAILS?: string };

/**
 * The weekly e-mail needs all three variables. Missing or invalid → env: null and
 * `missing` lists the VARIABLE NAMES (never values) for the log.
 */
export function readMailEnv(raw: RawMailEnv): { env: MailEnv | null; missing: string[] } {
  const apiKey = raw.RESEND_API_KEY?.trim() ?? "";
  const from = raw.MAIL_FROM?.trim() ?? "";
  const to = parseRecipientList(raw.NOTIFY_EMAILS);
  const missing: string[] = [];
  if (!apiKey) missing.push("RESEND_API_KEY");
  if (!from || !FROM_RE.test(from)) missing.push("MAIL_FROM");
  if (to.length === 0) missing.push("NOTIFY_EMAILS");
  if (missing.length > 0) return { env: null, missing };
  return { env: { apiKey, from, to }, missing };
}

/** Resend endpoint. RESEND_API_URL (server-only, optional) is for local tests with a stub. */
export function readResendUrl(raw: string | undefined): string {
  return readOpenFdaUrl(raw, "https://api.resend.com/emails");
}

/**
 * Public address of the app for links in the e-mail: NEXT_PUBLIC_SITE_URL, else the
 * origin the request came to. Only http(s); no trailing slash; null when neither is usable.
 */
export function resolveSiteUrl(override: string | undefined, requestOrigin: string | undefined): string | null {
  for (const candidate of [override, requestOrigin]) {
    const value = candidate?.trim();
    if (!value) continue;
    try {
      const parsed = new URL(value);
      if (parsed.protocol === "https:" || parsed.protocol === "http:") return parsed.origin;
    } catch {
      // try the next candidate
    }
  }
  return null;
}
