import type { ComponentType } from "react";
import { formIconKind, type FormIconKind } from "@/lib/medications/form-icon";
import {
  IconDrops,
  IconInjection,
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
