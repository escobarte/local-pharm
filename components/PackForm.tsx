"use client";

import { useActionState } from "react";
import type { ActionState, FormAction } from "@/lib/storage/action-state";
import { initialActionState } from "@/lib/storage/action-state";
import { ExpiryPicker } from "./ExpiryPicker";
import { FormField, fieldAria } from "./FormField";
import { PlacePicker, usePlaceSelection, type PlaceBox } from "./PlacePicker";
import { SubmitButton } from "./SubmitButton";
import { errorBoxClass, formFooterClass, formPrimarySubmitClass, formSubmitClass, inputClass } from "./ui";

type Props = {
  action: FormAction;
  /** "create": new pack (quantity + expiry + place). "move": only the place. */
  mode: "create" | "move";
  boxes: PlaceBox[];
  /** Hidden ids sent with the action. */
  fields: Record<string, string>;
  initialBoxId: string;
  initialCompartmentId: string;
  submitLabel: string;
};

/** Form for "Добавить упаковку" and "Переложить": same layout as the Add screen. */
export function PackForm({
  action,
  mode,
  boxes,
  fields,
  initialBoxId,
  initialCompartmentId,
  submitLabel,
}: Props) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, initialActionState);
  const errors = state.fieldErrors ?? {};
  const v = (key: string, fallback = "") => state.values?.[key] ?? fallback;
  const place = usePlaceSelection(
    boxes,
    v("boxId", initialBoxId),
    v("compartmentId", initialCompartmentId),
  );
  const idError = errors.medicationId ?? errors.packId;

  return (
    <form action={formAction} className="flex flex-1 flex-col" noValidate>
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <main className="flex flex-1 flex-col gap-4 px-5 pb-4 lg:max-w-xl lg:flex-none lg:p-0">
        {state.message || idError ? (
          <p role="alert" className={errorBoxClass}>
            {state.message ?? idError}
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-2.5">
          {mode === "create" ? (
            <>
              <div className="col-span-2">
                <FormField label="Количество, шт." htmlFor="quantity" error={errors.quantity}>
                  <input
                    {...fieldAria("quantity", errors.quantity)}
                    name="quantity"
                    type="text"
                    inputMode="numeric"
                    required
                    maxLength={4}
                    autoComplete="off"
                    defaultValue={v("quantity", "1")}
                    className={inputClass}
                  />
                </FormField>
              </div>
              <ExpiryPicker className="col-span-2" defaultValue={v("expiry")} error={errors.expiry} />
            </>
          ) : null}
          <PlacePicker boxes={boxes} selection={place} error={errors.compartmentId} />
        </div>
      </main>

      <div className={`${formFooterClass} lg:max-w-xl`}>
        <SubmitButton
          className={mode === "move" ? formPrimarySubmitClass : formSubmitClass}
          disabled={place.compartments.length === 0}
        >
          {submitLabel}
        </SubmitButton>
      </div>
    </form>
  );
}
