"use client";

import { useActionState } from "react";
import { FormField, fieldAria } from "@/components/FormField";
import { PlacePicker, usePlaceSelection, type PlaceBox } from "@/components/PlacePicker";
import { SubmitButton } from "@/components/SubmitButton";
import {
  errorBoxClass,
  inputClass,
  primaryButtonClass,
  sectionTitleClass,
} from "@/components/ui";
import type { ActionState, FormAction } from "@/lib/storage/action-state";
import { initialActionState } from "@/lib/storage/action-state";

type Props = {
  action: FormAction;
  categories: { id: string; name: string }[];
  boxes: PlaceBox[];
  initialBoxId: string;
  initialCompartmentId: string;
};

export function AddForm({ action, categories, boxes, initialBoxId, initialCompartmentId }: Props) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, initialActionState);
  const errors = state.fieldErrors ?? {};
  const v = (key: string, fallback = "") => state.values?.[key] ?? fallback;

  const place = usePlaceSelection(
    boxes,
    v("boxId", initialBoxId),
    v("compartmentId", initialCompartmentId),
  );

  return (
    <form action={formAction} className="flex flex-1 flex-col" noValidate>
      <main className="flex flex-1 flex-col gap-4 px-5 pb-4">
        {state.message ? (
          <p role="alert" className={errorBoxClass}>
            {state.message}
          </p>
        ) : null}

        <div className="flex flex-col gap-2.5">
          <FormField label="Название" htmlFor="name" error={errors.name}>
            <input
              {...fieldAria("name", errors.name)}
              name="name"
              type="text"
              required
              maxLength={120}
              autoComplete="off"
              placeholder="Например, Нурофен"
              defaultValue={v("name")}
              className={inputClass}
            />
          </FormField>
          <FormField label="Действующее вещество" htmlFor="activeIngredient" error={errors.activeIngredient}>
            <input
              {...fieldAria("activeIngredient", errors.activeIngredient)}
              name="activeIngredient"
              type="text"
              maxLength={120}
              autoComplete="off"
              placeholder="Например, ибупрофен"
              defaultValue={v("activeIngredient")}
              className={inputClass}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-2.5">
            <FormField label="Форма" htmlFor="form" error={errors.form}>
              <input
                {...fieldAria("form", errors.form)}
                name="form"
                type="text"
                maxLength={120}
                autoComplete="off"
                placeholder="таблетки"
                defaultValue={v("form")}
                className={inputClass}
              />
            </FormField>
            <FormField label="Дозировка" htmlFor="dosage" error={errors.dosage}>
              <input
                {...fieldAria("dosage", errors.dosage)}
                name="dosage"
                type="text"
                maxLength={120}
                autoComplete="off"
                placeholder="200 мг"
                defaultValue={v("dosage")}
                className={inputClass}
              />
            </FormField>
          </div>
          <FormField label="Категория" htmlFor="categoryId" error={errors.categoryId}>
            <select
              {...fieldAria("categoryId", errors.categoryId)}
              name="categoryId"
              defaultValue={v("categoryId")}
              className={inputClass}
            >
              <option value="">Не выбрана</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <section aria-labelledby="pack-title" className="flex flex-col gap-2.5">
          <h2 id="pack-title" className={sectionTitleClass}>
            Упаковка
          </h2>
          <div className="grid grid-cols-2 gap-2.5">
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
            <FormField
              label="Годен до"
              htmlFor="expiry"
              error={errors.expiry}
              hint={errors.expiry ? undefined : "ММ/ГГГГ, можно пусто"}
            >
              <input
                {...fieldAria("expiry", errors.expiry, "hint")}
                name="expiry"
                type="text"
                inputMode="numeric"
                maxLength={10}
                autoComplete="off"
                placeholder="12/2026"
                defaultValue={v("expiry")}
                className={inputClass}
              />
            </FormField>
            <PlacePicker boxes={boxes} selection={place} error={errors.compartmentId} />
          </div>
        </section>
      </main>

      <div className="sticky bottom-0 border-t border-tint bg-surface px-5 pt-3 pb-6">
        <SubmitButton className={primaryButtonClass} disabled={place.compartments.length === 0}>
          Сохранить
        </SubmitButton>
      </div>
    </form>
  );
}
