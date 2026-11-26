import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSnapshot } from "../lib/offline/snapshot.ts";
import { createMemoryStore, type SnapshotStore } from "../lib/offline/store.ts";
import { CACHE_PREFIX } from "../lib/offline/sw.ts";
import {
  MIN_SYNC_INTERVAL_MS,
  ensureOwner,
  isStale,
  syncSnapshot,
  wipeOfflineData,
  type FetchOutcome,
} from "../lib/offline/sync.ts";
import { rows } from "./fixtures/offline-rows.ts";

const NOW = Date.parse("2026-11-25T10:00:00.000Z");
const body = (owner: string) => buildSnapshot(rows(), owner, "2026-11-25T09:00:00.000Z");
const ok = (owner: string) => async (): Promise<FetchOutcome> => ({ status: "ok", body: body(owner) });

async function stored(store: SnapshotStore) {
  return (await store.read()).snapshot;
}

function counting(outcome: () => Promise<FetchOutcome>) {
  const fetcher = Object.assign(
    async () => {
      fetcher.calls += 1;
      return outcome();
    },
    { calls: 0 },
  );
  return fetcher;
}

test("first sync saves, stamped with the device clock", async () => {
  const store = createMemoryStore();
  assert.equal(await syncSnapshot({ store, userId: "a", fetchSnapshot: ok("a"), now: NOW }), "saved");
  assert.equal((await stored(store))!.savedAt, "2026-11-25T10:00:00.000Z");
});

test("not more often than the interval, unless forced after a change", async () => {
  const store = createMemoryStore();
  const fetcher = counting(ok("a"));
  const run = (now: number, force = false) => syncSnapshot({ store, userId: "a", fetchSnapshot: fetcher, now, force });
  await run(NOW);
  assert.equal(await run(NOW + MIN_SYNC_INTERVAL_MS - 1), "fresh");
  assert.equal(fetcher.calls, 1);
  assert.equal(await run(NOW + 1000, true), "saved");
  assert.equal(fetcher.calls, 2);
  assert.equal(await run(NOW + 1000 + MIN_SYNC_INTERVAL_MS), "saved");
  assert.equal(fetcher.calls, 3);
});

test("isStale: age, a clock moved back, an unreadable time", () => {
  const saved = new Date(NOW).toISOString();
  assert.equal(isStale(saved, NOW + 1), false);
  assert.equal(isStale(saved, NOW + MIN_SYNC_INTERVAL_MS), true);
  assert.equal(isStale(saved, NOW - 1000), true);
  assert.equal(isStale("x", NOW), true);
});

test("another account: the old snapshot is erased even if the download fails", async () => {
  const store = createMemoryStore();
  await syncSnapshot({ store, userId: "a", fetchSnapshot: ok("a"), now: NOW });
  const result = await syncSnapshot({ store, userId: "b", fetchSnapshot: async () => ({ status: "failed" }), now: NOW });
  assert.equal(result, "kept");
  assert.equal(await stored(store), null);
});

test("ensureOwner keeps the own snapshot", async () => {
  const store = createMemoryStore();
  await syncSnapshot({ store, userId: "a", fetchSnapshot: ok("a"), now: NOW });
  await ensureOwner(store, "a");
  assert.notEqual(await stored(store), null);
  await ensureOwner(store, "b");
  assert.equal(await stored(store), null);
});

test("a reply for another account is not stored", async () => {
  const store = createMemoryStore();
  assert.equal(await syncSnapshot({ store, userId: "a", fetchSnapshot: ok("b"), now: NOW }), "wiped");
  assert.equal(await stored(store), null);
});

test("denied erases; an expired session, a failure or junk keep the data", async () => {
  const store = createMemoryStore();
  await syncSnapshot({ store, userId: "a", fetchSnapshot: ok("a"), now: NOW });
  const forced = (outcome: FetchOutcome) =>
    syncSnapshot({ store, userId: "a", fetchSnapshot: async () => outcome, now: NOW, force: true });
  for (const outcome of [{ status: "no-session" }, { status: "failed" }, { status: "ok", body: { error: "x" } }] as FetchOutcome[]) {
    assert.equal(await forced(outcome), "kept");
    assert.notEqual(await stored(store), null);
  }
  assert.equal(await forced({ status: "denied" }), "wiped");
  assert.equal(await stored(store), null);
});

test("sign-out during a download: nothing is written afterwards", async () => {
  const store = createMemoryStore();
  const result = await syncSnapshot({
    store,
    userId: "a",
    now: NOW,
    fetchSnapshot: async () => {
      await wipeOfflineData(store);
      return { status: "ok", body: body("a") };
    },
  });
  assert.equal(result, "kept");
  assert.equal(await stored(store), null);
});

test("wipe erases the snapshot and every cache except the static build cache", async () => {
  const store = createMemoryStore();
  await syncSnapshot({ store, userId: "a", fetchSnapshot: ok("a"), now: NOW });
  const names = new Set([`${CACHE_PREFIX}v1`, "lp-data", "other"]);
  await wipeOfflineData(store, {
    keys: async () => [...names],
    delete: async (n) => names.delete(n),
  });
  assert.equal(await stored(store), null);
  assert.deepEqual([...names], [`${CACHE_PREFIX}v1`]);
});
