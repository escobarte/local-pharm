// Shapes used by the search, home and medication screens (already normalized).

export type MedicationSource = "local" | "amdm" | "openfda" | "manual";

export type PackPlace = {
  compartmentId: string;
  code: string;
  boxId: string;
  boxName: string;
  boxNumber: string | null;
};

export type CatalogPack = {
  id: string;
  quantity: number;
  expiry_date: string | null;
  opened_at: string | null;
  running_low: boolean;
  /** Null only if the compartment is not visible to the user (should not happen). */
  place: PackPlace | null;
};

export type CatalogMedication = {
  id: string;
  name: string;
  activeIngredient: string | null;
  form: string | null;
  dosage: string | null;
  indications: string | null;
  source: string;
  barcode: string | null;
  registryCode: string | null;
  categoryId: string | null;
  categoryName: string | null;
  packs: CatalogPack[];
};

/** Only what the home "Внимание" block needs from a pack. */
export type AttentionPack = { expiry_date: string | null; running_low: boolean };
