import "server-only";
import { readOpenFdaUrl } from "@/lib/env";
import { parseOpenFdaResponse, type OpenFdaItem } from "./parse";
import { OPENFDA_DEFAULT_URL, buildOpenFdaSearch, openFdaUrl } from "./query";

// openFDA is queried from the server only (no API key, no browser CORS, the
// user's IP is not exposed). Any failure — timeout, network, 429 rate limit,
// 5xx, malformed JSON — becomes "unavailable" and never breaks the page.

export const OPENFDA_TIMEOUT_MS = 5000;

export type OpenFdaSearch =
  | { status: "skipped" }
  | { status: "ok"; items: OpenFdaItem[] }
  | { status: "unavailable" };

export async function searchOpenFda(query: string): Promise<OpenFdaSearch> {
  const search = buildOpenFdaSearch(query);
  if (!search) return { status: "skipped" };
  const url = openFdaUrl(search, readOpenFdaUrl(process.env.OPENFDA_API_URL, OPENFDA_DEFAULT_URL));
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(OPENFDA_TIMEOUT_MS),
      headers: { accept: "application/json" },
      // Errors must not be cached for a day, so no Data Cache at all.
      cache: "no-store",
    });
    // 404 = "No matches found" (JSON body says so); other non-2xx = unavailable.
    if (!res.ok && res.status !== 404) return { status: "unavailable" };
    const parsed = parseOpenFdaResponse(await res.json());
    return parsed.ok ? { status: "ok", items: parsed.items } : { status: "unavailable" };
  } catch {
    return { status: "unavailable" };
  }
}
