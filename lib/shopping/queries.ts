import "server-only";
import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/storage/validation";
import type { ShoppingReason } from "./logic";

// Reads go through the user's session, so RLS (is_allowed) filters rows.
// Errors are thrown: app/error.tsx shows a retry screen instead of an empty list.

async function client() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase;
}

export type ShoppingItem = {
  id: string;
  title: string;
  medicationId: string | null;
  /** Dosage form of the linked medication (row icon); null for manual items. */
  form: string | null;
  reason: ShoppingReason;
  createdBy: string;
  createdAt: string;
  boughtAt: string | null;
  boughtBy: string | null;
};

type RawItem = {
  id: string;
  title: string;
  medication_id: string | null;
  reason: ShoppingReason;
  created_by: string;
  created_at: string;
  bought_at: string | null;
  bought_by: string | null;
  medications: { form: string | null } | null;
};

const COLUMNS = "id, title, medication_id, reason, created_by, created_at, bought_at, bought_by, medications(form)";

function normalize(row: RawItem): ShoppingItem {
  return {
    id: row.id,
    title: row.title,
    medicationId: row.medication_id,
    form: row.medications?.form ?? null,
    reason: row.reason,
    createdBy: row.created_by,
    createdAt: row.created_at,
    boughtAt: row.bought_at,
    boughtBy: row.bought_by,
  };
}

/** Not yet bought, oldest first (the order they were added). */
export async function getOpenItems(): Promise<ShoppingItem[]> {
  const supabase = await client();
  const { data, error } = await supabase
    .from("shopping_items")
    .select(COLUMNS)
    .is("bought_at", null)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`shopping_items: ${error.message}`);
  return ((data ?? []) as unknown as RawItem[]).map(normalize);
}

export const BOUGHT_LIMIT = 20;

/** The last purchases, newest first. */
export async function getBoughtItems(limit = BOUGHT_LIMIT): Promise<ShoppingItem[]> {
  const supabase = await client();
  const { data, error } = await supabase
    .from("shopping_items")
    .select(COLUMNS)
    .not("bought_at", "is", null)
    .order("bought_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`shopping_items: ${error.message}`);
  return ((data ?? []) as unknown as RawItem[]).map(normalize);
}

/** Medications that already have an open item: the "В списке" state of the buttons. */
export async function getOpenMedicationIds(): Promise<Set<string>> {
  const supabase = await client();
  const { data, error } = await supabase
    .from("shopping_items")
    .select("medication_id")
    .is("bought_at", null)
    .not("medication_id", "is", null);
  if (error) throw new Error(`shopping_items: ${error.message}`);
  return new Set(((data ?? []) as { medication_id: string }[]).map((r) => r.medication_id));
}

/** One medication: is it on the open list? (card and search panel) */
export const isMedicationInShoppingList = cache(async (medicationId: string): Promise<boolean> => {
  if (!isUuid(medicationId)) return false;
  const supabase = await client();
  const { data, error } = await supabase
    .from("shopping_items")
    .select("id")
    .eq("medication_id", medicationId)
    .is("bought_at", null)
    .limit(1);
  if (error) throw new Error(`shopping_items: ${error.message}`);
  return (data ?? []).length > 0;
});
