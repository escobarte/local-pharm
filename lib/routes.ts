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
 * Sanitizes a post-login redirect target (`?next=`) to a same-origin path:
 * only "/…" (e.g. "/q/<token>" from a QR sticker). Rejects absolute URLs
 * (`https://evil`, `javascript:`), protocol-relative `//evil`, backslashes
 * anywhere (browsers read `\` as `/`), control characters and long junk.
 */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.length > 1024) return "/";
  if (next.startsWith("//") || next.includes("\\")) return "/";
  if (/[\u0000-\u001f\u007f]/.test(next)) return "/";
  const pathname = next.split(/[?#]/, 1)[0];
  if (isPublicPath(pathname)) return "/";
  return next;
}
