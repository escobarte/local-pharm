"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAccess, createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionState } from "./action-state";
import { describeDbError, type DbErrorContext } from "./db-errors";
import {
  formDataToRaw,
  isUuid,
  parseBoxInput,
  parseCompartmentInput,
  parseMedicationPackInput,
} from "./validation";

// Every action: (1) re-checks session + allowlist (Proxy is only an optimistic
// check), (2) validates input on the server, (3) writes through the user's own
// session so RLS is the last line of defense. Raw DB messages never reach the UI.

const NETWORK_ERROR = "Не удалось связаться с сервером. Проверьте интернет и попробуйте ещё раз.";

async function requireClient() {
  const access = await getAccess();
  if (!access) redirect("/not-configured");
  if (access.status === "no-session") redirect("/login");
  if (access.status === "denied") redirect("/auth/denied");
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/not-configured");
  return supabase;
}

function valuesOf(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") values[key] = value;
  }
  return values;
}

type DbResult = { error: { code?: string | null; message?: string | null } | null };

/** Runs a DB call; a thrown error (network) becomes a user message. */
async function run<T extends DbResult>(
  fn: () => PromiseLike<T>,
  context: DbErrorContext,
): Promise<{ ok: true; result: T } | { ok: false; message: string }> {
  try {
    const result = await fn();
    if (result.error) return { ok: false, message: describeDbError(result.error, context) };
    return { ok: true, result };
  } catch {
    return { ok: false, message: NETWORK_ERROR };
  }
}

// ---------- Boxes ----------

export async function createBox(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = valuesOf(formData);
  const parsed = parseBoxInput(formDataToRaw(formData));
  if (!parsed.ok) return { fieldErrors: parsed.errors, values };

  const supabase = await requireClient();
  const { name, locationId, color, number } = parsed.value;
  const res = await run(
    () =>
      supabase
        .from("boxes")
        .insert({ name, location_id: locationId, color, number })
        .select("id")
        .single(),
    "save",
  );
  if (!res.ok) return { message: res.message, values };

  revalidatePath("/storage");
  redirect(`/storage/${(res.result.data as { id: string }).id}`);
}

export async function updateBox(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = valuesOf(formData);
  const boxId = values.boxId ?? "";
  if (!isUuid(boxId)) return { message: "Коробка не найдена. Обновите страницу.", values };

  const parsed = parseBoxInput(formDataToRaw(formData));
  if (!parsed.ok) return { fieldErrors: parsed.errors, values };

  const supabase = await requireClient();
  const { name, locationId, color, number } = parsed.value;
  const res = await run(
    () =>
      supabase
        .from("boxes")
        .update({ name, location_id: locationId, color, number })
        .eq("id", boxId)
        .select("id")
        .maybeSingle(),
    "save",
  );
  if (!res.ok) return { message: res.message, values };
  if (!res.result.data) return { message: "Коробка не найдена: возможно, её уже удалили.", values };

  revalidatePath("/storage", "layout");
  redirect(`/storage/${boxId}`);
}

export async function deleteBox(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const boxId = String(formData.get("boxId") ?? "");
  if (!isUuid(boxId)) return { message: "Коробка не найдена. Обновите страницу." };

  const supabase = await requireClient();
  // Compartments cascade; packs are ON DELETE RESTRICT, so a box with packs
  // fails atomically with 23503 → "В коробке есть упаковки".
  const res = await run(() => supabase.from("boxes").delete().eq("id", boxId), "delete-box");
  if (!res.ok) return { message: res.message };

  revalidatePath("/storage", "layout");
  redirect("/storage");
}

// ---------- Compartments ----------

export async function createCompartment(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const values = valuesOf(formData);
  const parsed = parseCompartmentInput(formDataToRaw(formData));
  if (!parsed.ok) return { fieldErrors: parsed.errors, values };

  const supabase = await requireClient();
  const { boxId, code } = parsed.value;
  const res = await run(
    () => supabase.from("compartments").insert({ box_id: boxId, code }).select("id").single(),
    "create-compartment",
  );
  if (!res.ok) {
    const duplicate = res.message.startsWith("Отсек с таким кодом");
    return duplicate ? { fieldErrors: { code: res.message }, values } : { message: res.message, values };
  }

  const newId = (res.result.data as { id: string }).id;
  revalidatePath(`/storage/${boxId}`);
  redirect(`/storage/${boxId}?cell=${newId}`);
}

export async function deleteCompartment(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const boxId = String(formData.get("boxId") ?? "");
  const compartmentId = String(formData.get("compartmentId") ?? "");
  if (!isUuid(boxId) || !isUuid(compartmentId)) {
    return { message: "Отсек не найден. Обновите страницу." };
  }

  const supabase = await requireClient();
  const res = await run(
    () => supabase.from("compartments").delete().eq("id", compartmentId).eq("box_id", boxId),
    "delete-compartment",
  );
  if (!res.ok) return { message: res.message };

  revalidatePath(`/storage/${boxId}`);
  redirect(`/storage/${boxId}`);
}

// ---------- Add medication + first pack (manual mode) ----------

export async function createMedicationWithPack(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const values = valuesOf(formData);
  const parsed = parseMedicationPackInput(formDataToRaw(formData));
  if (!parsed.ok) return { fieldErrors: parsed.errors, values };
  const input = parsed.value;

  const supabase = await requireClient();

  // The compartment decides the box; also proves it exists and is visible to us.
  const found = await run(
    () => supabase.from("compartments").select("id, box_id").eq("id", input.compartmentId).maybeSingle(),
    "save-pack",
  );
  if (!found.ok) return { message: found.message, values };
  const compartment = found.result.data as { id: string; box_id: string } | null;
  if (!compartment) {
    return { fieldErrors: { compartmentId: "Отсек не найден. Выберите другой." }, values };
  }

  // One transactional RPC (migration 0002): no orphan medication if the pack fails.
  const saved = await run(
    () =>
      supabase.rpc("add_medication_with_pack", {
        p_name: input.name,
        p_active_ingredient: input.activeIngredient,
        p_form: input.form,
        p_dosage: input.dosage,
        p_category_id: input.categoryId,
        p_compartment_id: input.compartmentId,
        p_quantity: input.quantity,
        p_expiry_date: input.expiryDate,
      }),
    "save-pack",
  );
  if (!saved.ok) return { message: saved.message, values };

  revalidatePath("/storage", "layout");
  redirect(`/storage/${compartment.box_id}?cell=${compartment.id}&added=1`);
}
