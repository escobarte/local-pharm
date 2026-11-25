import "server-only";
import { expiryHorizon } from "@/lib/expiry/group";
import type { IsoDate } from "@/lib/dates";
import type { PackPlace } from "@/lib/medications/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ExpiryItem = {
  packId: string;
  medicationId: string;
  /** "Нурофен 200 мг": the name as on the medication card. */
  title: string;
  /** Dosage form of the medication: picks the row icon. */
  form: string | null;
  expiryDate: IsoDate | null;
  quantity: number;
  place: PackPlace | null;
};

type RawRow = {
  id: string;
  quantity: number;
  expiry_date: string | null;
  medication_id: string;
  medications: { name: string; dosage: string | null; form: string | null } | null;
  compartments: {
    id: string;
    code: string;
    boxes: { id: string; name: string; number: string | null } | null;
  } | null;
};

/**
 * Packs that are expired or expire up to the horizon (today + 90 days). Packs without
 * a date are never fetched. Grouping into 30 / 90 days is done by groupByExpiry().
 */
export async function getExpiryItems(today: IsoDate): Promise<ExpiryItem[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error("Supabase is not configured");
  const { data, error } = await supabase
    .from("packs")
    .select(
      "id, quantity, expiry_date, medication_id, medications(name, dosage, form), compartments(id, code, boxes(id, name, number))",
    )
    .not("expiry_date", "is", null)
    .lte("expiry_date", expiryHorizon(today))
    .order("expiry_date", { ascending: true });
  if (error) throw new Error(`packs: ${error.message}`);

  return ((data ?? []) as unknown as RawRow[]).map((row) => {
    const c = row.compartments;
    const med = row.medications;
    return {
      packId: row.id,
      medicationId: row.medication_id,
      title: med ? (med.dosage ? `${med.name} ${med.dosage}` : med.name) : "Препарат",
      form: med?.form ?? null,
      expiryDate: row.expiry_date,
      quantity: row.quantity,
      place:
        c && c.boxes
          ? { compartmentId: c.id, code: c.code, boxId: c.boxes.id, boxName: c.boxes.name, boxNumber: c.boxes.number }
          : null,
    };
  });
}
