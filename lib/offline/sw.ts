// The service worker of Local Pharm. This file IS the whole worker:
// scripts/pwa/build-sw.ts strips the types and writes public/sw.js after
// `next build`, so nothing may be imported here. It is also imported by the
// app (constants) and by unit tests (rules and event handlers).
//
// What may be cached: the build's static files, fonts, icons, the manifest and
// the data-free offline shell (/offline). Nothing else, ever: no pages with
// data, no RSC payloads, no Supabase, no /auth/*, no /api/*.

export const OFFLINE_PATH = "/offline";
export const SW_PATH = "/sw.js";
export const CACHE_PREFIX = "lp-static-";
/** A navigation with no answer for this long (weak signal) opens the offline copy. */
export const NAVIGATION_TIMEOUT_MS = 10_000;
export const SKIP_WAITING_MESSAGE = "SKIP_WAITING";

const STATIC_PREFIX = "/_next/static/";
const MAX_FROM_LENGTH = 1024;

/**
 * network — the worker does not touch the request;
 * navigation — network, and the offline copy only when the network fails;
 * shell — the offline page itself, from the cache;
 * static — immutable build files and icons, cache first.
 */
export type Strategy = "network" | "navigation" | "shell" | "static";

export type RequestFacts = { url: string; method: string; mode: string };

export function classifyRequest(
  request: RequestFacts,
  origin: string,
  precache: ReadonlySet<string>,
): Strategy {
  if (request.method !== "GET") return "network";
  const url = new URL(request.url);
  if (url.origin !== origin) return "network";
  const path = url.pathname;
  // Sign-in (OAuth redirects, cookies) and data endpoints go straight to the network.
  if (path === "/auth" || path.startsWith("/auth/")) return "network";
  if (path === "/api" || path.startsWith("/api/")) return "network";
  if (path === SW_PATH) return "network";
  if (request.mode === "navigate") return path === OFFLINE_PATH ? "shell" : "navigation";
  if (path.startsWith(STATIC_PREFIX)) {
    return path.startsWith(`${STATIC_PREFIX}service-worker/`) ? "network" : "static";
  }
  // Icons and the manifest. The offline page fetched as data (RSC) is not one of them.
  if (path !== OFFLINE_PATH && !url.search && precache.has(path)) return "static";
  return "network";
}

/** Where a failed navigation goes: the offline page, remembering what was asked for. */
export function offlineHref(requestUrl: string): string {
  const url = new URL(requestUrl);
  const from = url.pathname + url.search;
  if (from === "/" || from.length > MAX_FROM_LENGTH) return OFFLINE_PATH;
  return `${OFFLINE_PATH}?from=${encodeURIComponent(from)}`;
}

type Extendable = { waitUntil(promise: Promise<unknown>): void };
type FetchLike = Extendable & { request: Request; respondWith(response: Promise<Response>): void };
type MessageLike = { data?: { type?: string } | null };

export type WorkerScope = {
  location: { origin: string };
  caches: CacheStorage;
  fetch(input: Request | string, init?: RequestInit): Promise<Response>;
  setTimeout(handler: () => void, ms: number): unknown;
  clearTimeout(id: never): void;
  skipWaiting(): Promise<void>;
  clients: { claim(): Promise<void> };
  addEventListener(type: string, listener: (event: never) => void): void;
};

export type WorkerConfig = {
  /** Changes with every build: names the cache, so a new build never reads old files. */
  version: string;
  /** Same-origin paths stored at install time. */
  precache: string[];
};

export function installServiceWorker(scope: WorkerScope, config: WorkerConfig): void {
  const cacheName = CACHE_PREFIX + config.version;
  const precache = new Set(config.precache);
  const origin = scope.location.origin;

  const on = <E>(type: string, listener: (event: E) => void) =>
    scope.addEventListener(type, listener as (event: never) => void);

  async function precacheAll(): Promise<void> {
    const cache = await scope.caches.open(cacheName);
    await Promise.all(
      config.precache.map(async (path) => {
        // Build files carry a content hash; everything else is re-checked with the server.
        const init: RequestInit = path.startsWith(STATIC_PREFIX) ? {} : { cache: "no-cache" };
        const response = await scope.fetch(path, init);
        // A redirect (e.g. to the login page) must never be stored as this file.
        if (!response.ok || response.redirected) throw new Error(`precache ${path}: ${response.status}`);
        await cache.put(path, response);
      }),
    );
  }

  async function removeOldCaches(): Promise<void> {
    const names = await scope.caches.keys();
    await Promise.all(
      names
        .filter((name) => name.startsWith(CACHE_PREFIX) && name !== cacheName)
        .map((name) => scope.caches.delete(name)),
    );
    await scope.clients.claim();
  }

  async function fromCache(key: Request | string): Promise<Response | undefined> {
    const cache = await scope.caches.open(cacheName);
    return cache.match(key, { ignoreSearch: true, ignoreVary: true });
  }

  async function cacheFirst(request: Request): Promise<Response> {
    const cached = await fromCache(request);
    if (cached) return cached;
    const response = await scope.fetch(request);
    if (response.ok && !response.redirected && new URL(request.url).pathname.startsWith(STATIC_PREFIX)) {
      const cache = await scope.caches.open(cacheName);
      await cache.put(request, response.clone());
    }
    return response;
  }

  async function shell(request: Request): Promise<Response> {
    return (await fromCache(OFFLINE_PATH)) ?? scope.fetch(request);
  }

  async function navigate(request: Request): Promise<Response> {
    const network = scope.fetch(request);
    let timer: unknown;
    const timeout = new Promise<never>((_, reject) => {
      timer = scope.setTimeout(() => reject(new Error("timeout")), NAVIGATION_TIMEOUT_MS);
    });
    try {
      return await Promise.race([network, timeout]);
    } catch {
      if (await fromCache(OFFLINE_PATH)) {
        network.catch(() => undefined);
        return Response.redirect(new URL(offlineHref(request.url), origin).href, 302);
      }
      // No offline copy: let the browser see the real outcome.
      return network;
    } finally {
      scope.clearTimeout(timer as never);
    }
  }

  on<Extendable>("install", (event) => event.waitUntil(precacheAll()));
  on<Extendable>("activate", (event) => event.waitUntil(removeOldCaches()));
  // A new version waits until the person presses "Обновить" (never mid-form).
  on<MessageLike>("message", (event) => {
    if (event.data?.type === SKIP_WAITING_MESSAGE) void scope.skipWaiting();
  });
  on<FetchLike>("fetch", (event) => {
    const strategy = classifyRequest(event.request, origin, precache);
    if (strategy === "static") event.respondWith(cacheFirst(event.request));
    else if (strategy === "shell") event.respondWith(shell(event.request));
    else if (strategy === "navigation") event.respondWith(navigate(event.request));
  });
}
