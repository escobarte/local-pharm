"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

type Props = {
  children: ReactNode;
  pendingText?: string;
  className: string;
  disabled?: boolean;
};

/** Submit button that disables itself while the Server Action is running. */
export function SubmitButton({ children, pendingText = "Сохраняем…", className, disabled }: Props) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending || disabled} aria-busy={pending}>
      {pending ? pendingText : children}
    </button>
  );
}
