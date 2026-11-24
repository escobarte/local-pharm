"use server";

import { revalidatePath } from "next/cache";
import { NETWORK_ERROR, requireClient, run, valuesOf } from "@/lib/action-utils";
import type { ActionState } from "@/lib/storage/action-state";
import { describeDbError } from "@/lib/storage/db-errors";
import { isUuid } from "@/lib/storage/validation";
import { insertOutcome, parseAddFromPack, parseShoppingTitle } from "./logic";

const ITEM_GONE = "Пункт не найден: возможно, его уже удалили. Обновите страницу.";

function refreshAll() {
  // The list, the "Сроки" buttons and the menu badges all depend on the list.
  revalidatePath("/", "layout");
}

/** "В покупки" on a pack / expiry row / card. Idempotent: a second tap changes nothing. */
export async function addToShopping(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseAddFromPack({
    medicationId: String(formData.get("medicationId") ?? ""),
    reason: String(formData.get("reason") ?? ""),
  });
  if (!parsed.ok) return { message: parsed.error };
  const { medicationId, reason } = parsed.value;

  const supabase = await requireClient();

  // The title comes from the database, not from the form: nothing to forge.
  const found = await run(
    () => supabase.from("medications").select("name, dosage").eq("id", medicationId).maybeSingle(),
    "save",
  );
  if (!found.ok) return { message: found.message };
  const med = found.result.data as { name: string; dosage: string | null } | null;
  if (!med) return { message: "Препарат не найден. Обновите страницу." };
  const title = med.dosage ? `${med.name} ${med.dosage}` : med.name;

  let error: { code?: string | null; message?: string | null } | null = null;
  try {
    ({ error } = await supabase
      .from("shopping_items")
      .insert({ title: title.slice(0, 120), medication_id: medicationId, reason }));
  } catch {
    return { message: NETWORK_ERROR };
  }

  // 23505: an open item for this medication exists (double tap, or the other person
  // added it a moment ago) → the same result for the user: it is in the list.
  const outcome = insertOutcome(error);
  if (outcome === "error") return { message: describeDbError(error, "save") };

  refreshAll();
  return { notice: outcome === "added" ? "Добавлено в покупки." : "Уже в списке покупок." };
}

/** The "Что купить" field. */
export async function addManualItem(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = valuesOf(formData);
  const title = parseShoppingTitle(values.title);
  if (!title.ok) return { fieldErrors: { title: title.error }, values };

  const supabase = await requireClient();
  const res = await run(
    () => supabase.from("shopping_items").insert({ title: title.value, reason: "manual" }),
    "save",
  );
  if (!res.ok) return { message: res.message, values };

  refreshAll();
  return { notice: "Добавлено." };
}

/** The checkbox: bought = "true" marks it bought, "false" returns it to the list. */
export async function setBought(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const itemId = String(formData.get("itemId") ?? "");
  const bought = formData.get("bought");
  if (!isUuid(itemId) || (bought !== "true" && bought !== "false")) return { message: ITEM_GONE };

  const supabase = await requireClient();
  let result: Awaited<ReturnType<typeof runUpdate>>;
  try {
    result = await runUpdate(supabase, itemId, bought === "true");
  } catch {
    return { message: NETWORK_ERROR };
  }
  if (result.error) {
    // Returning an item while the same medication was added again meanwhile.
    if (result.error.code === "23505") {
      return { message: "Этот препарат уже снова в списке покупок." };
    }
    return { message: describeDbError(result.error, "save") };
  }
  if (!result.data) return { message: ITEM_GONE };

  refreshAll();
  return { notice: bought === "true" ? "Отмечено купленным." : "Возвращено в список." };
}

async function runUpdate(
  supabase: Awaited<ReturnType<typeof requireClient>>,
  itemId: string,
  bought: boolean,
) {
  // who / when are stamped by the database trigger (migration 0006), not sent from here.
  return supabase
    .from("shopping_items")
    .update({ bought_at: bought ? new Date().toISOString() : null })
    .eq("id", itemId)
    .select("id")
    .maybeSingle();
}

export async function deleteShoppingItem(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const itemId = String(formData.get("itemId") ?? "");
  if (!isUuid(itemId)) return { message: ITEM_GONE };

  const supabase = await requireClient();
  const res = await run(() => supabase.from("shopping_items").delete().eq("id", itemId), "save");
  if (!res.ok) return { message: res.message };

  refreshAll();
  return { notice: "Удалено." };
}
