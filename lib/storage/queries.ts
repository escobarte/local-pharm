import "server-only";
import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sortByCode } from "./sort";
import { buildBoxDetail, buildHomeBoxes, buildOverview, type RawHomeBox } from "./summary";
import { isUuid } from "./validation";
import type { BoxRow, CategoryRow, CompartmentRow, LocationRow, PackRow } from "./types";

// All reads go through the user's session, so RLS (is_allowed) filters rows.
// Errors are thrown on purpose: app/error.tsx shows a retry screen instead of
// silently rendering an empty list that looks like "no data".

async function client() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase;
}

type RawPack = {
  id: string;
  compartment_id: string;
  medication_id: string;
  quantity: number;
  expiry_date: string | null;
  medications: {
    name: string;
    active_ingredient: string | null;
    form: string | null;
    dosage: string | null;
    categories: { name: string } | null;
  } | null;
};

const PACK_SELECT =
  "id, compartment_id, medication_id, quantity, expiry_date, medications(name, active_ingredient, form, dosage, categories(name))";

function normalizePack(row: RawPack): PackRow {
  return {
    id: row.id,
    compartment_id: row.compartment_id,
    medicationId: row.medication_id,
    quantity: row.quantity,
    expiry_date: row.expiry_date,
    medicationName: row.medications?.name ?? "Без названия",
    activeIngredient: row.medications?.active_ingredient ?? null,
    form: row.medications?.form ?? null,
    dosage: row.medications?.dosage ?? null,
    categoryName: row.medications?.categories?.name ?? null,
  };
}

export const getLocations = cache(async (): Promise<LocationRow[]> => {
  const supabase = await client();
  const { data, error } = await supabase
    .from("locations")
    .select("id, name, sort_order")
    .order("sort_order")
    .order("name");
  if (error) throw new Error(`locations: ${error.message}`);
  return (data ?? []) as LocationRow[];
});

export const getCategories = cache(async (): Promise<CategoryRow[]> => {
  const supabase = await client();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name")
    .order("sort_order")
    .order("name");
  if (error) throw new Error(`categories: ${error.message}`);
  return (data ?? []) as CategoryRow[];
});

export async function getStorageOverview() {
  const supabase = await client();
  const [locations, boxes, compartments, packs] = await Promise.all([
    getLocations(),
    supabase.from("boxes").select("id, name, number, color, location_id").order("created_at"),
    supabase.from("compartments").select("id, box_id, code"),
    supabase.from("packs").select(PACK_SELECT),
  ]);
  for (const [label, res] of [
    ["boxes", boxes],
    ["compartments", compartments],
    ["packs", packs],
  ] as const) {
    if (res.error) throw new Error(`${label}: ${res.error.message}`);
  }
  return buildOverview(
    locations,
    (boxes.data ?? []) as BoxRow[],
    (compartments.data ?? []) as CompartmentRow[],
    ((packs.data ?? []) as unknown as RawPack[]).map(normalizePack),
  );
}

/**
 * Boxes for the home screen in ONE request: the zone and the pack count come
 * embedded (`locations`, `compartments → packs(count)`), so no packs are
 * downloaded. Sorted by zone, then number.
 */
export async function getHomeBoxes() {
  const supabase = await client();
  const { data, error } = await supabase
    .from("boxes")
    .select("id, name, number, color, locations(name, sort_order), compartments(packs(count))");
  if (error) throw new Error(`home boxes: ${error.message}`);
  return buildHomeBoxes((data ?? []) as unknown as RawHomeBox[]);
}

export const getBox = cache(
  async (boxId: string): Promise<(BoxRow & { locationName: string; qrToken: string }) | null> => {
    if (!isUuid(boxId)) return null;
    const supabase = await client();
    const { data, error } = await supabase
      .from("boxes")
      .select("id, name, number, color, location_id, qr_token, locations(name)")
      .eq("id", boxId)
      .maybeSingle();
    if (error) throw new Error(`box: ${error.message}`);
    if (!data) return null;
    const row = data as unknown as BoxRow & { qr_token: string; locations: { name: string } | null };
    const { locations, qr_token, ...box } = row;
    return { ...box, qrToken: qr_token, locationName: locations?.name ?? "" };
  },
);

/**
 * Box id of a QR sticker token, or null when the token is malformed, unknown
 * or not visible to this user (RLS). The three cases are not told apart.
 */
export async function findBoxIdByQrToken(token: string): Promise<string | null> {
  if (!isUuid(token)) return null;
  const supabase = await client();
  const { data, error } = await supabase
    .from("boxes")
    .select("id")
    .eq("qr_token", token.toLowerCase())
    .maybeSingle();
  if (error) throw new Error(`box by qr: ${error.message}`);
  return (data as { id: string } | null)?.id ?? null;
}

export type LabelBoxRow = {
  id: string;
  name: string;
  number: string | null;
  qrToken: string;
  locationName: string;
};

/** All boxes for the sticker sheet, in the order of "Хранение" (zone, then number, then name). */
export async function getLabelBoxes(): Promise<LabelBoxRow[]> {
  const supabase = await client();
  const [locations, boxes] = await Promise.all([
    getLocations(),
    supabase.from("boxes").select("id, name, number, qr_token, location_id").order("created_at"),
  ]);
  if (boxes.error) throw new Error(`boxes: ${boxes.error.message}`);
  const zoneOrder = new Map(
    [...locations]
      .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "ru"))
      .map((l, i) => [l.id, { i, name: l.name }]),
  );
  type Raw = { id: string; name: string; number: string | null; qr_token: string; location_id: string };
  return ((boxes.data ?? []) as Raw[])
    .map((b) => ({ b, zone: zoneOrder.get(b.location_id) }))
    .sort(
      (x, y) =>
        (x.zone?.i ?? 1e9) - (y.zone?.i ?? 1e9) ||
        (x.b.number ?? "").localeCompare(y.b.number ?? "", "ru", { numeric: true }) ||
        x.b.name.localeCompare(y.b.name, "ru", { numeric: true }),
    )
    .map(({ b, zone }) => ({
      id: b.id,
      name: b.name,
      number: b.number,
      qrToken: b.qr_token,
      locationName: zone?.name ?? "",
    }));
}

export async function getBoxDetail(boxId: string, requestedCompartmentId?: string | null) {
  const supabase = await client();
  const { data: compartments, error } = await supabase
    .from("compartments")
    .select("id, box_id, code")
    .eq("box_id", boxId);
  if (error) throw new Error(`compartments: ${error.message}`);
  const rows = (compartments ?? []) as CompartmentRow[];

  let packs: PackRow[] = [];
  if (rows.length > 0) {
    const res = await supabase
      .from("packs")
      .select(PACK_SELECT)
      .in("compartment_id", rows.map((c) => c.id));
    if (res.error) throw new Error(`packs: ${res.error.message}`);
    packs = ((res.data ?? []) as unknown as RawPack[]).map(normalizePack);
  }

  return buildBoxDetail(rows, packs, requestedCompartmentId);
}

export type AddFormBox = {
  id: string;
  name: string;
  number: string | null;
  compartments: { id: string; code: string }[];
};

/** Boxes with their compartments: the options of every "where to put it" picker. */
export async function getBoxOptions(): Promise<AddFormBox[]> {
  const supabase = await client();
  const [boxes, compartments] = await Promise.all([
    supabase.from("boxes").select("id, name, number").order("created_at"),
    supabase.from("compartments").select("id, box_id, code"),
  ]);
  if (boxes.error) throw new Error(`boxes: ${boxes.error.message}`);
  if (compartments.error) throw new Error(`compartments: ${compartments.error.message}`);

  const byBox = new Map<string, { id: string; code: string }[]>();
  for (const c of (compartments.data ?? []) as CompartmentRow[]) {
    const list = byBox.get(c.box_id) ?? [];
    list.push({ id: c.id, code: c.code });
    byBox.set(c.box_id, list);
  }

  return ((boxes.data ?? []) as Pick<BoxRow, "id" | "name" | "number">[])
    .map((b) => ({ ...b, compartments: sortByCode(byBox.get(b.id) ?? []) }))
    .sort(
      (a, b) =>
        (a.number ?? "").localeCompare(b.number ?? "", "ru", { numeric: true }) ||
        a.name.localeCompare(b.name, "ru", { numeric: true }),
    );
}

export async function getAddFormData(): Promise<{ categories: CategoryRow[]; boxes: AddFormBox[] }> {
  const [categories, boxes] = await Promise.all([getCategories(), getBoxOptions()]);
  return { categories, boxes };
}

export async function countBoxes(): Promise<number> {
  const supabase = await client();
  const { count, error } = await supabase.from("boxes").select("id", { count: "exact", head: true });
  if (error) throw new Error(`boxes count: ${error.message}`);
  return count ?? 0;
}
