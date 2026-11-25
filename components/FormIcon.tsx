import type { ComponentType } from "react";
import { formIconKind, type FormIconKind } from "@/lib/medications/form-icon";
import {
  IconDrops,
  IconInjection,
  IconList,
  IconOintment,
  IconPatch,
  IconPill,
  IconPowder,
  IconSpray,
  IconSuppository,
  IconSyrup,
  IconTablet,
} from "./icons";

const ICONS: Record<FormIconKind, ComponentType<{ size?: number; strokeWidth?: number }>> = {
  tablet: IconTablet,
  capsule: IconPill,
  syrup: IconSyrup,
  drops: IconDrops,
  ointment: IconOintment,
  injection: IconInjection,
  spray: IconSpray,
  powder: IconPowder,
  suppository: IconSuppository,
  patch: IconPatch,
};

/** Medication icon chosen by the dosage form. Put it on a `bg-med-plate text-med-icon` plate. */
export function FormIcon({ form, size = 24 }: { form: string | null | undefined; size?: number }) {
  const Icon = ICONS[formIconKind(form)];
  return <Icon size={size} />;
}

/** The plate under a medication icon (BRAND: `med-plate` + `med-icon`). */
export const formPlateClass = "flex flex-none items-center justify-center bg-med-plate text-med-icon";

// Rows of lists outside the search and the card use one smaller plate: 36 px, 20 px icon.
const rowPlateClass = `${formPlateClass} size-9 rounded-field`;

/** Row plate with the icon of a medication's dosage form. */
export function FormPlate({ form }: { form: string | null | undefined }) {
  return (
    <span className={rowPlateClass}>
      <FormIcon form={form} size={20} />
    </span>
  );
}

/** Row plate of a list item that is not linked to a medication (a manual shopping item). */
export function ListPlate() {
  return (
    <span className={rowPlateClass}>
      <IconList size={20} />
    </span>
  );
}
