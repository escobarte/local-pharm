// Browser glue of the offline snapshot: IndexedDB, the request, sign-out.

import { createIndexedDbStore } from "./store";
import { ensureOwner, syncSnapshot, wipeOfflineData, type FetchOutcome } from "./sync";

export const deviceStore = createIndexedDbStore();

/** Set at sign-out, removed once the wipe is confirmed on the login screen. */
const WIPE_FLAG = "lp:wipe";

async function fetchSnapshot(): Promise<FetchOutcome> {
  try {
    // "manual": an expired session is redirected to /login by the proxy.
    const res = await fetch("/api/snapshot", { cache: "no-store", redirect: "manual" });
    if (res.type === "opaqueredirect" || res.status === 401) return { status: "no-session" };
    if (res.status === 403) return { status: "denied" };
    if (!res.ok) return { status: "failed" };
    return { status: "ok", body: await res.json() };
  } catch {
    return { status: "failed" };
  }
}

// ---------- Sync ----------

let signingOut = false;
let running = false;
let queued: { userId: string; force: boolean } | null = null;
/** A download after a change failed: the next occasion downloads regardless of age. */
let dirty = false;

/**
 * Brings the snapshot up to date for the signed-in account. One download at a
 * time; a request that arrives meanwhile runs afterwards. Failures are silent:
 * the previous snapshot stays.
 */
export async function requestSync(userId: string, force = false): Promise<void> {
  if (signingOut) return;
  if (running) {
    queued = { userId, force: force || queued?.force === true };
    return;
  }
  running = true;
  try {
    await ensureOwner(deviceStore, userId);
    if (navigator.onLine) {
      const wanted = force || dirty;
      const result = await syncSnapshot({
        store: deviceStore,
        userId,
        fetchSnapshot,
        now: Date.now(),
        force: wanted,
      });
      dirty = wanted && result === "kept";
      // Ask the browser not to evict the data when the device runs low on space.
      if (result === "saved") void navigator.storage?.persist?.().catch(() => false);
    } else if (force) {
      dirty = true;
    }
  } catch (error) {
    console.warn("offline snapshot:", error);
  } finally {
    running = false;
    const next = queued;
    queued = null;
    if (next) void requestSync(next.userId, next.force);
  }
}

// ---------- Wipe ----------

function flag(value?: boolean): boolean {
  try {
    if (value === true) localStorage.setItem(WIPE_FLAG, "1");
    if (value === false) localStorage.removeItem(WIPE_FLAG);
    return localStorage.getItem(WIPE_FLAG) === "1";
  } catch {
    return false;
  }
}

export function wipeDevice(): Promise<void> {
  return wipeOfflineData(deviceStore, "caches" in window ? window.caches : null).catch((error) => {
    console.warn("offline wipe:", error);
    throw error;
  });
}

/** The "Выйти" button: erase now, and again on the login screen if this was cut short. */
export function wipeForSignOut(): void {
  signingOut = true;
  flag(true);
  void wipeDevice().catch(() => undefined);
}

/** Login screen: finishes a sign-out wipe. "No access": nothing may stay at all. */
export async function wipeOnAuthScreen(pathname: "/login" | "/no-access"): Promise<void> {
  if (pathname === "/login" && !flag()) return;
  try {
    await wipeDevice();
    flag(false);
  } catch {
    flag(true);
  }
}
