// Pure aggregation for the storage screens (no I/O).

import { sortByCode } from "./sort.ts";
import type { BoxRow, CompartmentRow, LocationRow, PackRow } from "./types.ts";

/** "Простуда, Аллергия +1" — the most common categories in a box. */
export function categoryLabel(names: readonly (string | null)[], packCount: number): string {
  if (packCount === 0) return "Пока пусто";
  const counts = new Map<string, number>();
  for (const n of names) {
    if (n) counts.set(n, (counts.get(n) ?? 0) + 1);
  }
  if (counts.size === 0) return "Без категории";
  const sorted = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ru"))
    .map(([name]) => name);
  const shown = sorted.slice(0, 2).join(", ");
  return sorted.length > 2 ? `${shown} +${sorted.length - 2}` : shown;
}

export type BoxTileData = {
  id: string;
  name: string;
  number: string | null;
  color: string | null;
  packCount: number;
  categories: string;
};

export type ZoneData = { id: string; name: string; boxes: BoxTileData[] };

export type StorageOverview = {
  zones: ZoneData[];
  totals: { zones: number; boxes: number; packs: number };
};

export function buildOverview(
  locations: readonly LocationRow[],
  boxes: readonly BoxRow[],
  compartments: readonly CompartmentRow[],
  packs: readonly PackRow[],
): StorageOverview {
  const boxByCompartment = new Map(compartments.map((c) => [c.id, c.box_id]));
  const packsByBox = new Map<string, PackRow[]>();
  for (const pack of packs) {
    const boxId = boxByCompartment.get(pack.compartment_id);
    if (!boxId) continue;
    const list = packsByBox.get(boxId) ?? [];
    list.push(pack);
    packsByBox.set(boxId, list);
  }

  const sortedLocations = [...locations].sort(
    (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "ru"),
  );

  const zones: ZoneData[] = sortedLocations.map((loc) => ({
    id: loc.id,
    name: loc.name,
    boxes: boxes
      .filter((b) => b.location_id === loc.id)
      .map((b) => {
        const inBox = packsByBox.get(b.id) ?? [];
        return {
          id: b.id,
          name: b.name,
          number: b.number,
          color: b.color,
          packCount: inBox.length,
          categories: categoryLabel(inBox.map((p) => p.categoryName), inBox.length),
        };
      })
      .sort((a, b) =>
        (a.number ?? "").localeCompare(b.number ?? "", "ru", { numeric: true }) ||
        a.name.localeCompare(b.name, "ru", { numeric: true }),
      ),
  }));

  const knownBoxIds = new Set(boxes.map((b) => b.id));
  const packCount = [...packsByBox.entries()]
    .filter(([boxId]) => knownBoxIds.has(boxId))
    .reduce((sum, [, list]) => sum + list.length, 0);

  return {
    zones,
    totals: { zones: zones.length, boxes: boxes.length, packs: packCount },
  };
}

export type CellData = { id: string; code: string; packCount: number };

export type BoxDetail = {
  cells: CellData[];
  /** Selected compartment id, or null when the box has no compartments. */
  selectedId: string | null;
  selectedCode: string | null;
  items: PackRow[];
  totalPacks: number;
  categories: string;
};

/** Falls back to the first compartment when `requestedId` is missing or foreign. */
export function buildBoxDetail(
  compartments: readonly CompartmentRow[],
  packs: readonly PackRow[],
  requestedId: string | null | undefined,
): BoxDetail {
  const sorted = sortByCode(compartments);
  const counts = new Map<string, number>();
  for (const p of packs) counts.set(p.compartment_id, (counts.get(p.compartment_id) ?? 0) + 1);

  const cells = sorted.map((c) => ({ id: c.id, code: c.code, packCount: counts.get(c.id) ?? 0 }));
  const selected = cells.find((c) => c.id === requestedId) ?? cells[0] ?? null;

  const items = packs
    .filter((p) => selected && p.compartment_id === selected.id)
    .sort((a, b) => a.medicationName.localeCompare(b.medicationName, "ru"));

  const validIds = new Set(sorted.map((c) => c.id));
  const inBox = packs.filter((p) => validIds.has(p.compartment_id));

  return {
    cells,
    selectedId: selected?.id ?? null,
    selectedCode: selected?.code ?? null,
    items,
    totalPacks: inBox.length,
    categories: categoryLabel(inBox.map((p) => p.categoryName), inBox.length),
  };
}

/** Most compartments in one row of the scheme; more wrap to the next row with the same cell width. */
export const MAX_CELL_COLUMNS = 4;

/** Columns of the compartment scheme: one per compartment, up to MAX_CELL_COLUMNS. */
export function compartmentColumns(count: number): number {
  return Math.min(Math.max(Math.trunc(count), 1), MAX_CELL_COLUMNS);
}

/** A box row of the home screen with the packs counted by the database in the same request. */
export type RawHomeBox = {
  id: string;
  name: string;
  number: string | null;
  color: string | null;
  locations: { name: string; sort_order: number } | null;
  /** Embedded `compartments(packs(count))`: one `{ count }` per compartment. */
  compartments: { packs: { count: number }[] | null }[] | null;
};

export type HomeBox = {
  id: string;
  name: string;
  number: string | null;
  color: string | null;
  zoneName: string;
  packCount: number;
};

/** Boxes for the home screen: by zone (its sort order), then by number, then by name. */
export function buildHomeBoxes(rows: readonly RawHomeBox[]): HomeBox[] {
  return rows
    .map((r) => ({
      order: r.locations?.sort_order ?? Number.MAX_SAFE_INTEGER,
      box: {
        id: r.id,
        name: r.name,
        number: r.number,
        color: r.color,
        zoneName: r.locations?.name ?? "",
        packCount: (r.compartments ?? []).reduce(
          (sum, c) => sum + (c.packs ?? []).reduce((s, p) => s + p.count, 0),
          0,
        ),
      },
    }))
    .sort(
      (a, b) =>
        a.order - b.order ||
        a.box.zoneName.localeCompare(b.box.zoneName, "ru") ||
        (a.box.number ?? "").localeCompare(b.box.number ?? "", "ru", { numeric: true }) ||
        a.box.name.localeCompare(b.box.name, "ru", { numeric: true }),
    )
    .map((x) => x.box);
}
