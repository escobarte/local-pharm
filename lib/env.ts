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
