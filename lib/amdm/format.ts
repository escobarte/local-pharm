// Display and prefill helpers for registry rows. Pure.

import { LIMITS } from "../storage/validation.ts";
import type { RegistryItem } from "./types.ts";

/** "Firma, Țara" — the first manufacturer only (the field may list several sites). */
export function manufacturerLabel(manufacturer: string | null, country: string | null): string | null {
  const first = (manufacturer ?? "").split(";")[0].replace(/\s+/g, " ").trim().replace(/,$/, "");
  const c = (country ?? "").trim();
  if (!first) return c || null;
  if (!c || first.toLowerCase().includes(c.toLowerCase())) return first;
  return `${first}, ${c}`;
}

/** "comprimate filmate · 400 mg · N10x2" */
export function registrySubtitle(item: RegistryItem): string {
  const dose = [item.dose, item.volume].filter(Boolean).join(", ");
  return [item.form, dose, item.packSize].filter(Boolean).join(" · ");
}

function clip(value: string | null | undefined): string {
  const s = (value ?? "").replace(/[®™]/g, "").replace(/\s+/g, " ").trim();
  return s.length > LIMITS.medicationField ? s.slice(0, LIMITS.medicationField).trimEnd() : s;
}

export type RegistryPrefill = {
  name: string;
  activeIngredient: string;
  form: string;
  dosage: string;
};

/** Values for the "Препарат" fields; ® / ™ dropped, cut to the form's field limit. */
export function prefillFromRegistry(item: RegistryItem): RegistryPrefill {
  return {
    name: clip(item.name),
    activeIngredient: clip(item.inn),
    form: clip(item.form),
    dosage: clip(item.dose || item.volume),
  };
}
