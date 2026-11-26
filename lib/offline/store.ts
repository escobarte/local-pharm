// Where the snapshot lives on the device: one record in IndexedDB.
//
// `epoch` counts wipes. A download remembers the epoch it started in and the
// write is refused if a wipe happened meanwhile (sign-out while syncing, also
// from another tab): the check and the write are one transaction.

import { isSnapshot, type Snapshot } from "./snapshot.ts";

export type StoredState = { epoch: number; snapshot: Snapshot | null };

export interface SnapshotStore {
  read(): Promise<StoredState>;
  /** Saves unless the data was wiped since `epoch` was read. */
  write(snapshot: Snapshot, epoch: number): Promise<boolean>;
  clear(): Promise<void>;
}

/** In-memory store with the same rules (unit tests). */
export function createMemoryStore(): SnapshotStore {
  let epoch = 0;
  let snapshot: Snapshot | null = null;
  return {
    read: async () => ({ epoch, snapshot }),
    write: async (next, expected) => {
      if (expected !== epoch) return false;
      snapshot = next;
      return true;
    },
    clear: async () => {
      epoch += 1;
      snapshot = null;
    },
  };
}

const DB_NAME = "local-pharm";
const DB_VERSION = 1;
const STORE = "offline";
const SNAPSHOT_KEY = "snapshot";
const EPOCH_KEY = "epoch";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("IndexedDB is blocked"));
  });
}

/** Runs `work` in one transaction and resolves with its result after commit. */
async function transaction<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore, done: (value: T) => void) => void): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      let result: T;
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
      work(tx.objectStore(STORE), (value) => {
        result = value;
      });
    });
  } finally {
    db.close();
  }
}

/** Reads the epoch inside the current transaction, then continues in it. */
function withEpoch(store: IDBObjectStore, next: (epoch: number) => void): void {
  const request = store.get(EPOCH_KEY);
  request.onsuccess = () => next(typeof request.result === "number" ? request.result : 0);
}

export function createIndexedDbStore(): SnapshotStore {
  return {
    read: () =>
      transaction<StoredState>("readonly", (store, done) => {
        withEpoch(store, (epoch) => {
          const request = store.get(SNAPSHOT_KEY);
          request.onsuccess = () =>
            done({ epoch, snapshot: isSnapshot(request.result) ? request.result : null });
        });
      }),
    write: (snapshot, expected) =>
      transaction<boolean>("readwrite", (store, done) => {
        withEpoch(store, (epoch) => {
          if (epoch !== expected) return done(false);
          store.put(snapshot, SNAPSHOT_KEY);
          done(true);
        });
      }),
    clear: () =>
      transaction<void>("readwrite", (store, done) => {
        withEpoch(store, (epoch) => {
          store.put(epoch + 1, EPOCH_KEY);
          store.delete(SNAPSHOT_KEY);
          done();
        });
      }),
  };
}
