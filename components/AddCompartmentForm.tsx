"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createCompartment } from "@/lib/storage/actions";
import type { ActionState } from "@/lib/storage/action-state";
import { initialActionState } from "@/lib/storage/action-state";
import { FormField, fieldAria } from "./FormField";
import { IconPlus } from "./icons";
import { SubmitButton } from "./SubmitButton";
import { addButtonClass, addButtonSmClass, errorBoxClass, inputClass } from "./ui";

/**
 * "+ Отсек": a button that unfolds the code field with "Добавить". The parent
 * remounts it (key) when the number of compartments changes, so after a
 * successful add it is folded again.
 */
export function AddCompartmentForm({ boxId }: { boxId: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    createCompartment,
    initialActionState,
  );
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const error = state.fieldErrors?.code;

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  return (
    <div className="flex flex-col items-start gap-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={open ? "new-cell-form" : undefined}
        aria-label="Добавить отсек"
        className={addButtonSmClass}
      >
        <IconPlus size={18} strokeWidth={2.2} />
        Отсек
      </button>
      {open ? (
        <form
          id="new-cell-form"
          action={formAction}
          className="flex w-full flex-col gap-2 rounded-card border border-border bg-surface p-4"
          noValidate
        >
          <input type="hidden" name="boxId" value={boxId} />
          {state.message ? (
            <p role="alert" className={errorBoxClass}>
              {state.message}
            </p>
          ) : null}
          <FormField label="Код нового отсека" htmlFor="code" error={error} hint="Например, A1 или B2">
            <div className="flex gap-2">
              <input
                {...fieldAria("code", error, "hint")}
                ref={input}
                name="code"
                type="text"
                maxLength={8}
                autoComplete="off"
                autoCapitalize="characters"
                placeholder="A1"
                defaultValue={state.values?.code ?? ""}
                className={`${inputClass} min-w-0 flex-1`}
              />
              <SubmitButton className={`${addButtonClass} shrink-0`} pendingText="…">
                Добавить
              </SubmitButton>
            </div>
          </FormField>
        </form>
      ) : null}
    </div>
  );
}
