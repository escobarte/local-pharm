import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { cache } from "react";
import { getSupabaseEnv } from "@/lib/env";

/**
 * Supabase client for Server Components, Server Functions and Route Handlers.
 * Returns null when Supabase env vars are missing. Create one per request.
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient | null> {
  // Read cookies first: this marks every caller as request-time (dynamic), so
  // pages are never prerendered at build time, even when env vars are missing.
  const cookieStore = await cookies();
  const env = getSupabaseEnv();
  if (!env) return null;

  return createServerClient(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component: cookies are read-only there.
          // Session refresh is handled by proxy.ts, so this is safe to ignore.
        }
      },
    },
  });
}

export type AccessResult =
  | { status: "allowed"; email: string }
  | { status: "no-session" }
  | { status: "denied" };

/**
 * Verifies the session (JWT claims) and checks the allowlist via
 * public.is_allowed(). Throws on database errors so they surface as an error
 * page instead of being mistaken for "no access".
 */
export async function checkAccess(supabase: SupabaseClient): Promise<AccessResult> {
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (claimsError || !claims) return { status: "no-session" };

  const { data: allowed, error } = await supabase.rpc("is_allowed");
  if (error) {
    throw new Error(`is_allowed() failed: ${error.message}`);
  }
  if (allowed !== true) return { status: "denied" };

  const email = typeof claims.email === "string" ? claims.email : "";
  return { status: "allowed", email };
}

/**
 * Per-request memoized access check for Server Components (layout and page
 * share one DB round-trip). Returns null when Supabase is not configured.
 */
export const getAccess = cache(async (): Promise<AccessResult | null> => {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  return checkAccess(supabase);
});
