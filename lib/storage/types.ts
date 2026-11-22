// Row shapes returned by the storage queries (already normalized).

export type LocationRow = { id: string; name: string; sort_order: number };

export type BoxRow = {
  id: string;
  name: string;
  number: string | null;
  color: string | null;
  location_id: string;
};

export type CompartmentRow = { id: string; box_id: string; code: string };

export type PackRow = {
  id: string;
  compartment_id: string;
  medicationId: string;
  quantity: number;
  expiry_date: string | null;
  medicationName: string;
  activeIngredient: string | null;
  form: string | null;
  dosage: string | null;
  categoryName: string | null;
};

export type CategoryRow = { id: string; name: string };
