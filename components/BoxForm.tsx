"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { ActionState, FormAction } from "@/lib/storage/action-state";
import { initialActionState } from "@/lib/storage/action-state";
import { BOX_COLORS, DEFAULT_BOX_COLOR } from "@/lib/storage/box-colors";
import { FormField, fieldAria } from "./FormField";
import { IconCheck } from "./icons";
import { SubmitButton } from "./SubmitButton";
import { errorBoxClass, inputClass, primaryButtonClass, secondaryButtonClass } from "./ui";

export type BoxFormInitial = {
  boxId?: string;
  name: string;
  locationId: string;
  color: string;
  number: string;
};

type Props = {
  action: FormAction;
  zones: { id: string; name: string }[];
  initial: BoxFormInitial;
  submitLabel: string;
  cancelHref: string;
};

export function BoxForm({ action, zones, initial, submitLabel, cancelHref }: Props) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, initialActionState);
  const errors = state.fieldErrors ?? {};
  // After a failed submit React resets the form, so refill from what was sent.
  const v = (key: keyof BoxFormInitial) => state.values?.[key] ?? initial[key] ?? "";
  const color = v("color") || DEFAULT_BOX_COLOR;

  return (
    <form action={formAction} className="flex flex-1 flex-col gap-4 px-5 pb-6" noValidate>
      {initial.boxId ? <input type="hidden" name="boxId" value={initial.boxId} /> : null}

      {state.message ? (
        <p role="alert" className={errorBoxClass}>
          {state.message}
        </p>
      ) : null}

      <FormField label="Название" htmlFor="name" error={errors.name}>
        <input
          {...fieldAria("name", errors.name)}
          name="name"
          type="text"
          required
          maxLength={60}
          autoComplete="off"
          placeholder="Например, Простуда"
          defaultValue={v("name")}
          className={inputClass}
        />
      </FormField>

      <FormField label="Зона" htmlFor="locationId" error={errors.locationId}>
        <select
          {...fieldAria("locationId", errors.locationId)}
          name="locationId"
          required
          defaultValue={v("locationId")}
          className={inputClass}
        >
          {zones.map((z) => (
            <option key={z.id} value={z.id}>
              {z.name}
            </option>
          ))}
        </select>
      </FormField>

      <FormField
        label="Номер на наклейке"
        htmlFor="number"
        error={errors.number}
        hint="Необязательно, до 6 символов: 1, 2, 3Б"
      >
        <input
          {...fieldAria("number", errors.number, "hint")}
          name="number"
          type="text"
          maxLength={6}
          autoComplete="off"
          defaultValue={v("number")}
          className={inputClass}
        />
      </FormField>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-[13px] font-semibold">Цвет</legend>
        <div className="grid grid-cols-2 gap-2">
          {BOX_COLORS.map((c) => (
            <label key={c.key} className="group block">
              <input
                type="radio"
                name="color"
                value={c.key}
                defaultChecked={color === c.key}
                className="peer sr-only"
              />
              <span
                className={`flex min-h-12 items-center justify-center gap-2 rounded-field px-3 text-sm font-semibold peer-checked:ring-2 peer-checked:ring-navy peer-checked:ring-offset-2 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-navy ${c.classes}`}
              >
                <IconCheck size={16} strokeWidth={2.4} className="hidden group-has-checked:block" />
                {c.label}
              </span>
            </label>
          ))}
        </div>
        {errors.color ? (
          <p className="text-xs font-semibold text-danger-fg">{errors.color}</p>
        ) : null}
      </fieldset>

      <div className="mt-2 flex flex-col gap-2">
        <SubmitButton className={primaryButtonClass}>{submitLabel}</SubmitButton>
        <Link href={cancelHref} className={secondaryButtonClass}>
          Отмена
        </Link>
      </div>
    </form>
  );
}
