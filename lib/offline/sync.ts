// When the snapshot is downloaded, replaced and erased. No browser globals:
// the store, the request and the clock are passed in.

import { isSnapshot } from "./snapshot.ts";
import type { SnapshotStore } from "./store.ts";
import { CACHE_PREFIX } from "./sw.ts";

/** Opening home / search / storage does not download again within this time. */
export const MIN_SYNC_INTERVAL_MS = 5 * 60 * 1000;

export type FetchOutcome =
  | { status: "ok"; body: unknown }
  /** The session is gone (401 or a redirect to the login page): keep what we have. */
  | { status: "no-session" }
  /** The account is not on the allowlist: nothing may stay on the device. */
  | { status: "denied" }
  | { status: "failed" };

export type SyncResult = "saved" | "fresh" | "kept" | "wiped";

/** Another account's snapshot is erased at once, before anything is downloaded. */
export async function ensureOwner(store: SnapshotStore, userId: string): Promise<void> {
  const { snapshot } = await store.read();
  if (snapshot && snapshot.ownerId !== userId) await store.clear();
}

export function isStale(savedAt: string, now: number, interval = MIN_SYNC_INTERVAL_MS): boolean {
  const saved = Date.parse(savedAt);
  // An unreadable or future time (clock moved back) counts as stale.
  return Number.isNaN(saved) || saved > now || now - saved >= interval;
}

export async function syncSnapshot(options: {
  store: SnapshotStore;
  userId: string;
  fetchSnapshot: () => Promise<FetchOutcome>;
  now: number;
  /** After a change: download even if the snapshot is recent. */
  force?: boolean;
}): Promise<SyncResult> {
  const { store, userId, fetchSnapshot, now, force = false } = options;
  await ensureOwner(store, userId);
  const { snapshot, epoch } = await store.read();
  if (!force && snapshot && !isStale(snapshot.savedAt, now)) return "fresh";

  const outcome = await fetchSnapshot();
  if (outcome.status === "denied") {
    await store.clear();
    return "wiped";
  }
  if (outcome.status !== "ok" || !isSnapshot(outcome.body)) return "kept";
  // The session changed under our feet (another account signed in in another tab).
  if (outcome.body.ownerId !== userId) {
    await store.clear();
    return "wiped";
  }
  // Stamped with the device clock: it is compared with it and shown to the person.
  const saved = { ...outcome.body, savedAt: new Date(now).toISOString() };
  return (await store.write(saved, epoch)) ? "saved" : "kept";
}

type CacheNames = { keys(): Promise<string[]>; delete(name: string): Promise<boolean> };

/**
 * Sign-out and "no access": the snapshot and every cache that is not the static
 * build cache. (The worker caches no data today; this keeps it that way even if
 * a data cache is ever added.)
 */
export async function wipeOfflineData(store: SnapshotStore, caches?: CacheNames | null): Promise<void> {
  await store.clear();
  if (!caches) return;
  const names = await caches.keys();
  await Promise.all(names.filter((n) => !n.startsWith(CACHE_PREFIX)).map((n) => caches.delete(n)));
}
