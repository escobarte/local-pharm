// The data snapshot kept on the device for offline use: its shape, how it is
// built from database rows and how the offline screens read it. Pure.
//
// Only the fields needed to find a medication and show where it lies. Search,
// summaries and box aggregation are the same functions the online screens use.

import { countByCategory, type CategoryCounts } from "../medications/category-counts.ts";
import { runSearch, searchHome, type SearchResult } from "../medications/search.ts";
import type { CatalogMedication, CatalogPack } from "../medications/types.ts";
import { parseBarcode } from "../barcode.ts";
import type { IsoDate } from "../dates.ts";
import { buildBoxDetail, buildOverview, type BoxDetail, type StorageOverview } from "../storage/summary.ts";
import type { BoxRow, CompartmentRow, LocationRow, PackRow } from "../storage/types.ts";

/** Bump when the shape changes: an older stored snapshot is then ignored. */
export const SNAPSHOT_SCHEMA = 1;

export type SnapshotCategory = { id: string; name: string; sort_order: number };
export type SnapshotBox = BoxRow & { qr_token: string };
export type SnapshotMedication = {
  id: string;
  name: string;
  active_ingredient: string | null;
  form: string | null;
  dosage: string | null;
  indications: string | null;
  source: string;
  barcode: string | null;
  category_id: string | null;
};
export type SnapshotPack = {
  id: string;
  medication_id: string;
  compartment_id: string;
  quantity: number;
  expiry_date: string | null;
  opened_at: string | null;
  running_low: boolean;
};

export type SnapshotRows = {
  locations: LocationRow[];
  categories: SnapshotCategory[];
  boxes: SnapshotBox[];
  compartments: CompartmentRow[];
  medications: SnapshotMedication[];
  packs: SnapshotPack[];
};

export type Snapshot = SnapshotRows & {
  schema: typeof SNAPSHOT_SCHEMA;
  /** Supabase user id the data was read as: another account never sees it. */
  ownerId: string;
  /** ISO time the server read the data. */
  savedAt: string;
};

/** The columns read per table — the single list of what leaves the database. */
export const SNAPSHOT_COLUMNS: Record<keyof SnapshotRows, readonly string[]> = {
  locations: ["id", "name", "sort_order"],
  categories: ["id", "name", "sort_order"],
  boxes: ["id", "name", "number", "color", "location_id", "qr_token"],
  compartments: ["id", "box_id", "code"],
  medications: [
    "id",
    "name",
    "active_ingredient",
    "form",
    "dosage",
    "indications",
    "source",
    "barcode",
    "category_id",
  ],
  packs: ["id", "medication_id", "compartment_id", "quantity", "expiry_date", "opened_at", "running_low"],
};

export const SNAPSHOT_TABLES = Object.keys(SNAPSHOT_COLUMNS) as (keyof SnapshotRows)[];

function pick<T>(rows: readonly T[], columns: readonly string[]): T[] {
  return rows.map((row) => {
    const source = row as Record<string, unknown>;
    return Object.fromEntries(columns.map((c) => [c, source[c] ?? null])) as T;
  });
}

/** Database rows → snapshot. Anything outside SNAPSHOT_COLUMNS is dropped. */
export function buildSnapshot(rows: SnapshotRows, ownerId: string, savedAt: string): Snapshot {
  const out = Object.fromEntries(
    SNAPSHOT_TABLES.map((t) => [t, pick(rows[t] as unknown[], SNAPSHOT_COLUMNS[t])]),
  ) as unknown as SnapshotRows;
  return { schema: SNAPSHOT_SCHEMA, ownerId, savedAt, ...out };
}

/** Guards what comes from storage or the network. */
export function isSnapshot(value: unknown): value is Snapshot {
  if (!value || typeof value !== "object") return false;
  const s = value as Record<string, unknown>;
  return (
    s.schema === SNAPSHOT_SCHEMA &&
    typeof s.ownerId === "string" &&
    s.ownerId !== "" &&
    typeof s.savedAt === "string" &&
    SNAPSHOT_TABLES.every((t) => Array.isArray(s[t]))
  );
}

// ---------- Reading ----------

const byOrder = (a: { sort_order: number; name: string }, b: { sort_order: number; name: string }) =>
  a.sort_order - b.sort_order || a.name.localeCompare(b.name, "ru");

export function snapshotCategories(s: Snapshot): SnapshotCategory[] {
  return [...s.categories].sort(byOrder);
}

/** The same catalog shape as getCatalog(), so search and cards work unchanged. */
export function toCatalog(s: Snapshot): CatalogMedication[] {
  const categories = new Map(s.categories.map((c) => [c.id, c.name]));
  const boxes = new Map(s.boxes.map((b) => [b.id, b]));
  const cells = new Map(s.compartments.map((c) => [c.id, c]));
  const packs = new Map<string, CatalogPack[]>();

  for (const pack of s.packs) {
    const cell = cells.get(pack.compartment_id);
    const box = cell ? boxes.get(cell.box_id) : undefined;
    const list = packs.get(pack.medication_id) ?? [];
    list.push({
      id: pack.id,
      quantity: pack.quantity,
      expiry_date: pack.expiry_date,
      opened_at: pack.opened_at,
      running_low: pack.running_low,
      place:
        cell && box
          ? { compartmentId: cell.id, code: cell.code, boxId: box.id, boxName: box.name, boxNumber: box.number }
          : null,
    });
    packs.set(pack.medication_id, list);
  }

  return s.medications.map((m) => ({
    id: m.id,
    name: m.name,
    activeIngredient: m.active_ingredient,
    form: m.form,
    dosage: m.dosage,
    indications: m.indications,
    source: m.source,
    barcode: m.barcode,
    registryCode: null,
    categoryId: m.category_id,
    categoryName: m.category_id ? (categories.get(m.category_id) ?? null) : null,
    packs: packs.get(m.id) ?? [],
  }));
}

/**
 * Offline search: a valid barcode finds the medications with that barcode, any
 * other text is the regular search; the category chip narrows either.
 */
export function searchSnapshot(
  catalog: readonly CatalogMedication[],
  params: { q: string; categoryId: string | null },
  today: IsoDate,
): SearchResult[] {
  if (parseBarcode(params.q).ok) {
    const scoped = params.categoryId ? catalog.filter((m) => m.categoryId === params.categoryId) : catalog;
    return searchHome(scoped, params.q, today, scoped.length);
  }
  return runSearch(catalog, { q: params.q, categoryId: params.categoryId, attention: null }, today);
}

export function snapshotCounts(catalog: readonly CatalogMedication[]): CategoryCounts {
  return countByCategory(catalog.map((m) => ({ categoryId: m.categoryId, packCount: m.packs.length })));
}

function packRows(s: Snapshot): PackRow[] {
  const medications = new Map(s.medications.map((m) => [m.id, m]));
  const categories = new Map(s.categories.map((c) => [c.id, c.name]));
  return s.packs.map((p) => {
    const m = medications.get(p.medication_id);
    return {
      id: p.id,
      compartment_id: p.compartment_id,
      medicationId: p.medication_id,
      quantity: p.quantity,
      expiry_date: p.expiry_date,
      medicationName: m?.name ?? "Без названия",
      activeIngredient: m?.active_ingredient ?? null,
      form: m?.form ?? null,
      dosage: m?.dosage ?? null,
      categoryName: m?.category_id ? (categories.get(m.category_id) ?? null) : null,
    };
  });
}

/** Zones with box tiles, as on "Хранение". */
export function snapshotOverview(s: Snapshot): StorageOverview {
  return buildOverview(s.locations, s.boxes, s.compartments, packRows(s));
}

export type SnapshotBoxView = { box: SnapshotBox; locationName: string; detail: BoxDetail };

/** One box with the contents of the selected compartment; null when it is not in the snapshot. */
export function snapshotBox(s: Snapshot, boxId: string, cellId: string | null): SnapshotBoxView | null {
  const box = s.boxes.find((b) => b.id === boxId);
  if (!box) return null;
  const compartments = s.compartments.filter((c) => c.box_id === box.id);
  const ids = new Set(compartments.map((c) => c.id));
  const packs = packRows(s).filter((p) => ids.has(p.compartment_id));
  return {
    box,
    locationName: s.locations.find((l) => l.id === box.location_id)?.name ?? "",
    detail: buildBoxDetail(compartments, packs, cellId),
  };
}

/** The box of a QR sticker token (lowercase uuid), as /q/[token] finds it online. */
export function findBoxIdByToken(s: Snapshot, token: string): string | null {
  const wanted = token.toLowerCase();
  return s.boxes.find((b) => b.qr_token.toLowerCase() === wanted)?.id ?? null;
}

/** "24.11 16:40" in the device's time zone (or `timeZone`, for tests). */
export function snapshotTimeLabel(savedAt: string, timeZone?: string): string {
  const date = new Date(savedAt);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("day")}.${get("month")} ${get("hour")}:${get("minute")}`;
}
