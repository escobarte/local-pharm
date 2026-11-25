import "server-only";
import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/storage/validation";
import type { CategoryRow } from "./category-counts";
import { duplicateFilter, type ExistingMedication } from "./duplicates";
import type { AttentionPack, CatalogMedication, CatalogPack } from "./types";

// Reads go through the user's session, so RLS (is_allowed) filters rows.
// Errors are thrown: app/error.tsx shows a retry screen instead of an empty list.

async function client() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase;
}

type RawPack = {
  id: string;
  quantity: number;
  expiry_date: string | null;
  opened_at: string | null;
  running_low: boolean;
  compartments: {
    id: string;
    code: string;
    boxes: { id: string; name: string; number: string | null } | null;
  } | null;
};

type RawMedication = {
  id: string;
  name: string;
  active_ingredient: string | null;
  form: string | null;
  dosage: string | null;
  indications: string | null;
  source: string;
  barcode: string | null;
  registry_code: string | null;
  category_id: string | null;
  categories: { name: string } | null;
  packs: RawPack[] | null;
};

const MEDICATION_SELECT =
  "id, name, active_ingredient, form, dosage, indications, source, barcode, registry_code, category_id, categories(name), " +
  "packs(id, quantity, expiry_date, opened_at, running_low, compartments(id, code, boxes(id, name, number)))";

function normalizePack(row: RawPack): CatalogPack {
  const c = row.compartments;
  return {
    id: row.id,
    quantity: row.quantity,
    expiry_date: row.expiry_date,
    opened_at: row.opened_at,
    running_low: row.running_low,
    place:
      c && c.boxes
        ? {
            compartmentId: c.id,
            code: c.code,
            boxId: c.boxes.id,
            boxName: c.boxes.name,
            boxNumber: c.boxes.number,
          }
        : null,
  };
}

function normalizeMedication(row: RawMedication): CatalogMedication {
  return {
    id: row.id,
    name: row.name,
    activeIngredient: row.active_ingredient,
    form: row.form,
    dosage: row.dosage,
    indications: row.indications,
    source: row.source,
    barcode: row.barcode,
    registryCode: row.registry_code,
    categoryId: row.category_id,
    categoryName: row.categories?.name ?? null,
    packs: (row.packs ?? []).map(normalizePack),
  };
}

/** Every medication with its packs and their places (including medications with no packs). */
export async function getCatalog(): Promise<CatalogMedication[]> {
  const supabase = await client();
  const { data, error } = await supabase.from("medications").select(MEDICATION_SELECT);
  if (error) throw new Error(`medications: ${error.message}`);
  return ((data ?? []) as unknown as RawMedication[]).map(normalizeMedication);
}

/**
 * One light query for the home category tiles: only the category and the pack ids of
 * medications that have at least one pack (`!inner`), no catalog. Like the catalog,
 * it is limited by PostgREST to 1000 rows (see GOTCHAS).
 */
export async function getCategoryRows(): Promise<CategoryRow[]> {
  const supabase = await client();
  const { data, error } = await supabase.from("medications").select("category_id, packs!inner(id)");
  if (error) throw new Error(`category counts: ${error.message}`);
  return ((data ?? []) as unknown as { category_id: string | null; packs: { id: string }[] }[]).map((r) => ({
    categoryId: r.category_id,
    packCount: r.packs.length,
  }));
}

export const getMedication = cache(async (id: string): Promise<CatalogMedication | null> => {
  if (!isUuid(id)) return null;
  const supabase = await client();
  const { data, error } = await supabase
    .from("medications")
    .select(MEDICATION_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`medication: ${error.message}`);
  return data ? normalizeMedication(data as unknown as RawMedication) : null;
});

export async function getAttentionPacks(): Promise<AttentionPack[]> {
  const supabase = await client();
  const { data, error } = await supabase.from("packs").select("expiry_date, running_low");
  if (error) throw new Error(`packs: ${error.message}`);
  return (data ?? []) as AttentionPack[];
}

/**
 * Medications at home with the same AMDM code or barcode (any stored spelling).
 * Used by the scanner and by the duplicate check before saving.
 */
export async function findExistingMedications(params: {
  registryCode?: string | null;
  barcode?: string | null;
}): Promise<ExistingMedication[]> {
  const filter = duplicateFilter(params);
  if (!filter) return [];
  const supabase = await client();
  const { data, error } = await supabase
    .from("medications")
    .select("id, name, dosage, form, registry_code, barcode")
    .or(filter)
    .order("created_at")
    .limit(20);
  if (error) throw new Error(`medications by barcode: ${error.message}`);
  return ((data ?? []) as { id: string; name: string; dosage: string | null; form: string | null; registry_code: string | null; barcode: string | null }[]).map(
    (r) => ({ id: r.id, name: r.name, dosage: r.dosage, form: r.form, registryCode: r.registry_code, barcode: r.barcode }),
  );
}
