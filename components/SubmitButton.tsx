"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

type Props = {
  children: ReactNode;
  pendingText?: string;
  className: string;
  disabled?: boolean;
  /** For toggle-style buttons (e.g. "Заканчивается"). */
  pressed?: boolean;
  /** Accessible name for icon-only buttons. */
  ariaLabel?: string;
};

/** Submit button that disables itself while the Server Action is running. */
export function SubmitButton({ children, pendingText = "Сохраняем…", className, disabled, pressed, ariaLabel }: Props) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending || disabled} aria-busy={pending} aria-pressed={pressed} aria-label={ariaLabel}>
      {pending ? pendingText : children}
    </button>
  );
}
