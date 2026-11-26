import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import {
  CACHE_PREFIX,
  NAVIGATION_TIMEOUT_MS,
  SKIP_WAITING_MESSAGE,
  classifyRequest,
  installServiceWorker,
  offlineHref,
  type WorkerScope,
} from "../lib/offline/sw.ts";
import { precacheList, renderServiceWorker } from "../scripts/pwa/render.ts";

const ORIGIN = "https://pharm.example";
const PRECACHE = precacheList(["chunks/app.js", "chunks/app.css", "media/font.woff2", "chunks/app.js.map"], ["icon-192.png"]);
const abs = (path: string) => new URL(path, ORIGIN).href;

test("precacheList: shell, manifest, icons and build files, no source maps", () => {
  assert.deepEqual(PRECACHE, [
    "/offline",
    "/manifest.webmanifest",
    "/icons/icon-192.png",
    "/_next/static/chunks/app.css",
    "/_next/static/chunks/app.js",
    "/_next/static/media/font.woff2",
  ]);
});

test("what is cached: only static files, icons, the manifest and the offline shell", () => {
  const set = new Set(PRECACHE);
  const strategy = (url: string, mode = "cors", method = "GET") =>
    classifyRequest({ url: abs(url), mode, method }, ORIGIN, set);

  assert.equal(strategy("/_next/static/chunks/app.js"), "static");
  assert.equal(strategy("/_next/static/chunks/new-build.js"), "static");
  assert.equal(strategy("/icons/icon-192.png"), "static");
  assert.equal(strategy("/manifest.webmanifest"), "static");
  assert.equal(strategy("/offline", "navigate"), "shell");
  assert.equal(strategy("/offline?from=%2Fstorage", "navigate"), "shell");

  // Pages with data: the network, with a fallback only when it fails.
  for (const page of ["/", "/search?q=a", "/storage", "/medications/1", "/q/token", "/login"]) {
    assert.equal(strategy(page, "navigate"), "navigation", page);
  }
  // Never touched.
  for (const url of [
    "/storage?_rsc=abc",
    "/",
    "/offline",
    "/offline?_rsc=1",
    "/api/snapshot",
    "/api/cron/keepalive",
    "/auth/callback?code=1",
    "/sw.js",
    "/_next/static/service-worker/x.js",
    "/_next/image?url=%2Fa.png",
    "/icons/icon-192.png?v=2",
    "/icons/unknown.png",
    "https://abc.supabase.co/rest/v1/packs",
    "https://accounts.google.com/o/oauth2",
    "https://other.example/_next/static/chunks/app.js",
  ]) {
    assert.equal(strategy(url), "network", url);
  }
  // Google sign-in: navigations to /auth/* and /api/* are not intercepted either.
  assert.equal(strategy("/auth/callback?code=1", "navigate"), "network");
  assert.equal(strategy("/auth/denied", "navigate"), "network");
  assert.equal(strategy("/api/snapshot", "navigate"), "network");
  // Server Actions and other writes.
  assert.equal(strategy("/storage", "cors", "POST"), "network");
  assert.equal(strategy("/_next/static/chunks/app.js", "cors", "HEAD"), "network");
});

test("offlineHref remembers the asked address", () => {
  assert.equal(offlineHref(abs("/")), "/offline");
  assert.equal(offlineHref(abs("/storage/1?cell=2")), "/offline?from=%2Fstorage%2F1%3Fcell%3D2");
  assert.equal(offlineHref(abs(`/search?q=${"a".repeat(2000)}`)), "/offline");
});

// ---------- The worker's event handlers against a fake browser ----------

type Handler = (event: unknown) => void;
type Net = (url: string, init?: RequestInit) => Promise<Response>;

function fakeBrowser(network: Net) {
  const stores = new Map<string, Map<string, Response>>();
  const handlers = new Map<string, Handler>();
  const fetched: string[] = [];
  const timers: { fire: () => void; ms: number }[] = [];
  const state = { skipped: 0, claimed: 0, network };
  const key = (k: Request | string) => {
    const url = new URL(typeof k === "string" ? k : k.url, ORIGIN);
    return url.pathname;
  };
  const caches = {
    open: async (name: string) => {
      const store = stores.get(name) ?? new Map<string, Response>();
      stores.set(name, store);
      return {
        put: async (k: Request | string, r: Response) => void store.set(key(k), r),
        match: async (k: Request | string) => store.get(key(k))?.clone(),
      };
    },
    keys: async () => [...stores.keys()],
    delete: async (name: string) => stores.delete(name),
  } as unknown as CacheStorage;

  const scope: WorkerScope = {
    location: { origin: ORIGIN },
    caches,
    fetch: (input, init) => {
      const url = abs(typeof input === "string" ? input : input.url);
      fetched.push(url);
      return state.network(url, init);
    },
    setTimeout: (fire, ms) => timers.push({ fire, ms }),
    clearTimeout: () => undefined,
    skipWaiting: async () => void (state.skipped += 1),
    clients: { claim: async () => void (state.claimed += 1) },
    addEventListener: (type, listener) => void handlers.set(type, listener as Handler),
  };

  const lifecycle = (type: string) => {
    let promise: Promise<unknown> = Promise.resolve();
    handlers.get(type)!({ waitUntil: (p: Promise<unknown>) => (promise = p) });
    return promise;
  };
  /** Returns the response, or null when the worker does not intercept the request. */
  const request = (path: string, mode = "cors", method = "GET") => {
    let response: Promise<Response> | null = null;
    handlers.get("fetch")!({
      request: { url: abs(path), mode, method },
      respondWith: (p: Promise<Response>) => (response = p),
    });
    return response as Promise<Response> | null;
  };
  return { scope, stores, handlers, fetched, timers, state, lifecycle, request };
}

const online: Net = async (url) => new Response(`net:${new URL(url).pathname}`);
const offline: Net = async () => {
  throw new TypeError("Failed to fetch");
};

async function installed(network: Net = online) {
  const browser = fakeBrowser(network);
  installServiceWorker(browser.scope, { version: "v2", precache: PRECACHE });
  await browser.lifecycle("install");
  await browser.lifecycle("activate");
  return browser;
}

test("install stores the precache; activate drops older builds only", async () => {
  const browser = fakeBrowser(online);
  browser.stores.set(`${CACHE_PREFIX}v1`, new Map());
  browser.stores.set("foreign-cache", new Map());
  installServiceWorker(browser.scope, { version: "v2", precache: PRECACHE });
  await browser.lifecycle("install");
  assert.equal(browser.stores.get(`${CACHE_PREFIX}v2`)!.size, PRECACHE.length);
  // A new version does not activate by itself.
  assert.equal(browser.state.skipped, 0);
  await browser.lifecycle("activate");
  assert.deepEqual([...browser.stores.keys()].sort(), ["foreign-cache", `${CACHE_PREFIX}v2`]);
  assert.equal(browser.state.claimed, 1);
});

test("install fails on an error or a redirect (a login page is never stored)", async () => {
  const redirected = (url: string) => {
    const response = new Response("login");
    if (url.endsWith("/offline")) Object.defineProperty(response, "redirected", { value: true });
    return Promise.resolve(response);
  };
  for (const network of [redirected, async () => new Response("", { status: 404 })] as Net[]) {
    const browser = fakeBrowser(network);
    installServiceWorker(browser.scope, { version: "v2", precache: PRECACHE });
    await assert.rejects(browser.lifecycle("install"), /precache/);
  }
});

test("skipWaiting only when the page asks for it", async () => {
  const browser = await installed();
  browser.handlers.get("message")!({ data: { type: "something" } });
  browser.handlers.get("message")!({ data: null });
  assert.equal(browser.state.skipped, 0);
  browser.handlers.get("message")!({ data: { type: SKIP_WAITING_MESSAGE } });
  assert.equal(browser.state.skipped, 1);
});

test("online navigation comes from the network and is not stored", async () => {
  const browser = await installed();
  const response = await browser.request("/storage", "navigate");
  assert.equal(await response!.text(), "net:/storage");
  assert.equal(browser.stores.get(`${CACHE_PREFIX}v2`)!.has("/storage"), false);
});

test("offline navigation goes to the offline page, which comes from the cache", async () => {
  const browser = await installed();
  browser.state.network = offline;
  const redirect = await browser.request("/q/abc", "navigate");
  assert.equal(redirect!.status, 302);
  assert.equal(redirect!.headers.get("location"), abs("/offline?from=%2Fq%2Fabc"));
  const shell = await browser.request("/offline?from=%2Fq%2Fabc", "navigate");
  assert.equal(await shell!.text(), "net:/offline");
});

test("a navigation that gets no answer times out into the offline page", async () => {
  const browser = await installed();
  browser.state.network = () => new Promise<Response>(() => undefined);
  const pending = browser.request("/search", "navigate")!;
  assert.equal(browser.timers.at(-1)!.ms, NAVIGATION_TIMEOUT_MS);
  browser.timers.at(-1)!.fire();
  assert.equal((await pending).headers.get("location"), abs("/offline?from=%2Fsearch"));
});

test("server errors are shown as they are", async () => {
  const browser = await installed();
  browser.state.network = async () => new Response("oops", { status: 500 });
  assert.equal((await browser.request("/storage", "navigate"))!.status, 500);
});

test("static files: cache first, new files are added, errors are not", async () => {
  const browser = await installed();
  const before = browser.fetched.length;
  assert.equal(await (await browser.request("/_next/static/chunks/app.js"))!.text(), "net:/_next/static/chunks/app.js");
  assert.equal(browser.fetched.length, before);
  await browser.request("/_next/static/chunks/lazy.js");
  assert.equal(browser.stores.get(`${CACHE_PREFIX}v2`)!.has("/_next/static/chunks/lazy.js"), true);
  browser.state.network = async () => new Response("", { status: 404 });
  await browser.request("/_next/static/chunks/gone.js");
  assert.equal(browser.stores.get(`${CACHE_PREFIX}v2`)!.has("/_next/static/chunks/gone.js"), false);
});

test("data requests are not intercepted at all", async () => {
  const browser = await installed();
  for (const [path, mode, method] of [
    ["/api/snapshot", "cors", "GET"],
    ["/auth/callback?code=1", "navigate", "GET"],
    ["/storage?_rsc=1", "cors", "GET"],
    ["/storage", "cors", "POST"],
    ["https://abc.supabase.co/auth/v1/token", "cors", "GET"],
  ] as const) {
    assert.equal(browser.request(path, mode, method), null, path);
  }
});

// ---------- The generated file ----------

test("the generated sw.js is a classic script that registers the same worker", async () => {
  const source = await readFile(new URL("../lib/offline/sw.ts", import.meta.url), "utf8");
  const script = renderServiceWorker(source, { version: "abc", precache: PRECACHE });
  assert.doesNotMatch(script, /^\s*(import|export)\b/m);
  const events: string[] = [];
  const self = { location: { origin: ORIGIN }, addEventListener: (type: string) => events.push(type) };
  vm.runInNewContext(script, { self, URL, Response });
  assert.deepEqual(events.sort(), ["activate", "fetch", "install", "message"]);
  assert.match(script, /"version":"abc"/);
});

test("the build refuses a worker source with imports", () => {
  assert.throws(
    () => renderServiceWorker('import { x } from "./y";\nexport const z = x;', { version: "1", precache: [] }),
    /single file/,
  );
});
