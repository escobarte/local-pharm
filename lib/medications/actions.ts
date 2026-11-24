"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireClient, run, valuesOf } from "@/lib/action-utils";
import type { ActionState } from "@/lib/storage/action-state";
import { formDataToRaw, isUuid } from "@/lib/storage/validation";
import { deletePackDestination, parseMovePackInput, parseNewPackInput } from "./validation";

const PACK_GONE = "Упаковка не найдена: возможно, её уже удалили. Обновите страницу.";

function refreshAll() {
  // Counters on Home, lists in Search and Storage, and the card all depend on packs.
  revalidatePath("/", "layout");
}

// ---------- Quick actions on a pack ----------

/** "Взял 1 шт." — atomic decrement in SQL (migration 0003). */
export async function takeOne(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const packId = String(formData.get("packId") ?? "");
  if (!isUuid(packId)) return { message: PACK_GONE };

  const supabase = await requireClient();
  const res = await run(() => supabase.rpc("take_one_from_pack", { p_pack_id: packId }), "take");
  if (!res.ok) return { message: res.message };

  const row = (res.result.data as { new_quantity: number; new_running_low: boolean }[] | null)?.[0];
  if (!row) return { message: "В упаковке уже ничего не осталось, или её удалили. Обновите страницу." };

  refreshAll();
  return {
    notice: row.new_quantity === 0 ? "Упаковка закончилась." : `Осталось ${row.new_quantity} шт.`,
  };
}

/** "Заканчивается" — sets the flag to an explicit value (idempotent, safe to double-tap). */
export async function setLowStock(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const packId = String(formData.get("packId") ?? "");
  const lowStock = formData.get("lowStock");
  if (!isUuid(packId) || (lowStock !== "true" && lowStock !== "false")) return { message: PACK_GONE };

  const supabase = await requireClient();
  const res = await run(
    () =>
      supabase
        .from("packs")
        .update({ running_low: lowStock === "true" })
        .eq("id", packId)
        .select("id")
        .maybeSingle(),
    "save",
  );
  if (!res.ok) return { message: res.message };
  if (!res.result.data) return { message: PACK_GONE };

  refreshAll();
  return { notice: lowStock === "true" ? "Отмечено: заканчивается." : "Отметка снята." };
}

// ---------- Pack management ----------

export async function deletePack(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const packId = String(formData.get("packId") ?? "");
  const medicationId = String(formData.get("medicationId") ?? "");
  if (!isUuid(packId) || !isUuid(medicationId)) return { message: PACK_GONE };

  const supabase = await requireClient();
  const res = await run(() => supabase.from("packs").delete().eq("id", packId), "delete-pack");
  if (!res.ok) return { message: res.message };

  refreshAll();
  // The "Сроки" screen asks to stay there (returnTo is checked against an allowlist).
  redirect(deletePackDestination(String(formData.get("returnTo") ?? ""), medicationId));
}

export async function movePack(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = valuesOf(formData);
  const parsed = parseMovePackInput(formDataToRaw(formData));
  if (!parsed.ok) return { fieldErrors: parsed.errors, values };
  const { packId, medicationId, compartmentId } = parsed.value;

  const supabase = await requireClient();

  const target = await run(
    () => supabase.from("compartments").select("id").eq("id", compartmentId).maybeSingle(),
    "save-pack",
  );
  if (!target.ok) return { message: target.message, values };
  if (!target.result.data) {
    return { fieldErrors: { compartmentId: "Отсек не найден. Выберите другой." }, values };
  }

  const res = await run(
    () =>
      supabase
        .from("packs")
        .update({ compartment_id: compartmentId })
        .eq("id", packId)
        .eq("medication_id", medicationId)
        .select("id")
        .maybeSingle(),
    "save-pack",
  );
  if (!res.ok) return { message: res.message, values };
  if (!res.result.data) return { message: PACK_GONE, values };

  refreshAll();
  redirect(`/medications/${medicationId}`);
}

/** "Добавить упаковку" to an existing medication. */
export async function createPack(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = valuesOf(formData);
  const parsed = parseNewPackInput(formDataToRaw(formData));
  if (!parsed.ok) return { fieldErrors: parsed.errors, values };
  const { medicationId, compartmentId, quantity, expiryDate } = parsed.value;

  const supabase = await requireClient();
  const res = await run(
    () =>
      supabase
        .from("packs")
        .insert({
          medication_id: medicationId,
          compartment_id: compartmentId,
          quantity,
          expiry_date: expiryDate,
        })
        .select("id")
        .single(),
    "save-pack",
  );
  if (!res.ok) return { message: res.message, values };

  refreshAll();
  redirect(`/medications/${medicationId}`);
}

// ---------- Medication ----------

/** Only a medication without packs can be deleted (packs.medication_id is ON DELETE RESTRICT). */
export async function deleteMedication(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const medicationId = String(formData.get("medicationId") ?? "");
  if (!isUuid(medicationId)) return { message: "Препарат не найден. Обновите страницу." };

  const supabase = await requireClient();
  const res = await run(
    () => supabase.from("medications").delete().eq("id", medicationId),
    "delete-medication",
  );
  if (!res.ok) return { message: res.message };

  refreshAll();
  redirect("/search");
}
