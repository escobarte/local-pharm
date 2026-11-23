"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { NETWORK_ERROR, requireClient, run, valuesOf } from "@/lib/action-utils";
import { findDuplicate } from "@/lib/medications/duplicates";
import { findExistingMedications } from "@/lib/medications/queries";
import type { ActionState } from "./action-state";
import {
  formDataToRaw,
  isUuid,
  parseBoxInput,
  parseCompartmentInput,
  parseMedicationPackInput,
} from "./validation";

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

  // Duplicate protection: the same AMDM row or barcode is already at home →
  // offer a pack to the existing medication (the form shows both choices).
  // "Создать отдельную запись" re-submits with allowDuplicate=1.
  if (!input.allowDuplicate && (input.registryCode || input.barcode)) {
    try {
      const existing = await findExistingMedications({ registryCode: input.registryCode, barcode: input.barcode });
      const duplicate = findDuplicate(existing, { registryCode: input.registryCode, barcode: input.barcode });
      if (duplicate) {
        return {
          duplicate: { id: duplicate.medication.id, name: duplicate.medication.name, reason: duplicate.reason },
          values,
        };
      }
    } catch {
      return { message: NETWORK_ERROR, values };
    }
  }

  // One transactional RPC: no orphan medication if the pack fails.
  // A plain manual entry without barcode keeps using add_medication_with_pack
  // (0002). Everything else — barcode, AMDM, openFDA — goes through
  // add_medication_entry_with_pack (0005): it checks the source, the barcode
  // format and, for AMDM, that the registry code exists (P0002 otherwise).
  const fields = {
    p_name: input.name,
    p_active_ingredient: input.activeIngredient,
    p_form: input.form,
    p_dosage: input.dosage,
    p_category_id: input.categoryId,
    p_compartment_id: input.compartmentId,
    p_quantity: input.quantity,
    p_expiry_date: input.expiryDate,
  };
  const plainManual = input.source === "manual" && !input.barcode;
  const saved = await run(
    () =>
      plainManual
        ? supabase.rpc("add_medication_with_pack", fields)
        : supabase.rpc("add_medication_entry_with_pack", {
            p_source: input.source,
            p_registry_code: input.registryCode,
            p_barcode: input.barcode,
            ...fields,
          }),
    "save-pack",
  );
  if (!saved.ok) return { message: saved.message, values };

  revalidatePath("/storage", "layout");
  redirect(`/storage/${compartment.box_id}?cell=${compartment.id}&added=1`);
}
