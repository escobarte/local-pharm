// Pure route helpers shared by proxy and auth handlers.

export const LOGIN_PATH = "/login";
export const NO_ACCESS_PATH = "/no-access";
export const NOT_CONFIGURED_PATH = "/not-configured";

const PUBLIC_PATHS = new Set([LOGIN_PATH, NO_ACCESS_PATH, NOT_CONFIGURED_PATH]);

/** Pages reachable without a session. */
export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname) || pathname.startsWith("/auth/");
}

/**
 * Sanitizes a post-login redirect target to a same-origin path.
 * Rejects absolute URLs, protocol-relative (`//host`) and backslash tricks.
 */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/")) return "/";
  if (next.startsWith("//") || next.startsWith("/\\")) return "/";
  if (/[\u0000-\u001f]/.test(next)) return "/";
  const pathname = next.split(/[?#]/, 1)[0];
  if (isPublicPath(pathname)) return "/";
  return next;
}
