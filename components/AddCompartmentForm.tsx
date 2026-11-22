"use client";

import { useActionState } from "react";
import { createCompartment } from "@/lib/storage/actions";
import type { ActionState } from "@/lib/storage/action-state";
import { initialActionState } from "@/lib/storage/action-state";
import { FormField, fieldAria } from "./FormField";
import { SubmitButton } from "./SubmitButton";
import { errorBoxClass, inputClass, secondaryButtonClass } from "./ui";

export function AddCompartmentForm({ boxId }: { boxId: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    createCompartment,
    initialActionState,
  );
  const error = state.fieldErrors?.code;

  return (
    <form action={formAction} className="flex flex-col gap-2" noValidate>
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
            name="code"
            type="text"
            maxLength={8}
            autoComplete="off"
            autoCapitalize="characters"
            placeholder="A1"
            defaultValue={state.values?.code ?? ""}
            className={`${inputClass} min-w-0 flex-1`}
          />
          <SubmitButton className={`${secondaryButtonClass} shrink-0`} pendingText="…">
            Добавить
          </SubmitButton>
        </div>
      </FormField>
    </form>
  );
}
