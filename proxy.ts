import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "@/lib/env";
import { OFFLINE_PATH, SW_PATH } from "@/lib/offline/sw";
import { LOGIN_PATH, NOT_CONFIGURED_PATH, isPublicPath, safeNextPath } from "@/lib/routes";

/**
 * Optimistic auth check (Next.js 16 Proxy, formerly Middleware):
 * refreshes the Supabase session cookie and redirects anonymous visitors to
 * /login. The allowlist itself is enforced by RLS and re-checked server-side
 * in app/(app)/layout.tsx and /auth/callback.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  // The service worker and the offline shell carry no data and must load for anyone,
  // with or without a session or configuration (the worker rejects redirects).
  if (pathname === OFFLINE_PATH || pathname === SW_PATH) return NextResponse.next();

  const env = getSupabaseEnv();

  if (!env) {
    if (pathname === NOT_CONFIGURED_PATH) return NextResponse.next();
    return NextResponse.redirect(new URL(NOT_CONFIGURED_PATH, request.url));
  }

  let response = NextResponse.next({ request });
  const authHeaders: Record<string, string> = {};

  const supabase = createServerClient(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.assign(authHeaders, headers);
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Must run before any response is produced so refreshed tokens are written.
  const { data } = await supabase.auth.getClaims();
  const hasSession = Boolean(data?.claims);

  const redirectTo = (target: URL) => {
    const redirect = NextResponse.redirect(target);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    Object.entries(authHeaders).forEach(([key, value]) => redirect.headers.set(key, value));
    return redirect;
  };

  if (!hasSession && !isPublicPath(pathname)) {
    const loginUrl = new URL(LOGIN_PATH, request.url);
    if (pathname !== "/") loginUrl.searchParams.set("next", pathname + search);
    return redirectTo(loginUrl);
  }

  if (hasSession && pathname === LOGIN_PATH) {
    // Already signed in (e.g. in another tab): go where the login was for.
    return redirectTo(new URL(safeNextPath(request.nextUrl.searchParams.get("next")), request.url));
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except static assets, PWA files and the cron endpoint
    // (cron is authorized by CRON_SECRET, not by a user session).
    "/((?!_next/static|_next/image|favicon.ico|icons/|manifest.webmanifest|api/cron/).*)",
  ],
};
