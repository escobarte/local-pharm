"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { FormField, fieldAria } from "@/components/FormField";
import { SubmitButton } from "@/components/SubmitButton";
import {
  errorBoxClass,
  inputClass,
  primaryButtonClass,
  sectionTitleClass,
} from "@/components/ui";
import type { ActionState, FormAction } from "@/lib/storage/action-state";
import { initialActionState } from "@/lib/storage/action-state";
import { boxLabel } from "@/lib/storage/sort";

type Props = {
  action: FormAction;
  categories: { id: string; name: string }[];
  boxes: {
    id: string;
    name: string;
    number: string | null;
    compartments: { id: string; code: string }[];
  }[];
  initialBoxId: string;
  initialCompartmentId: string;
};

export function AddForm({ action, categories, boxes, initialBoxId, initialCompartmentId }: Props) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, initialActionState);
  const errors = state.fieldErrors ?? {};
  const v = (key: string, fallback = "") => state.values?.[key] ?? fallback;

  const [boxId, setBoxId] = useState(v("boxId", initialBoxId) || boxes[0]?.id || "");
  const box = boxes.find((b) => b.id === boxId) ?? boxes[0];
  const compartments = box?.compartments ?? [];
  const wantedCompartment = v("compartmentId", initialCompartmentId);
  const selectedCompartment = compartments.some((c) => c.id === wantedCompartment)
    ? wantedCompartment
    : (compartments[0]?.id ?? "");

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
            <FormField label="Коробка" htmlFor="boxId">
              <select
                id="boxId"
                name="boxId"
                defaultValue={boxId}
                onChange={(e) => setBoxId(e.target.value)}
                className={inputClass}
              >
                {boxes.map((b) => (
                  <option key={b.id} value={b.id}>
                    {boxLabel(b)}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Отсек" htmlFor="compartmentId" error={errors.compartmentId}>
              <select
                {...fieldAria("compartmentId", errors.compartmentId)}
                key={boxId}
                name="compartmentId"
                defaultValue={selectedCompartment}
                disabled={compartments.length === 0}
                className={inputClass}
              >
                {compartments.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          {compartments.length === 0 && box ? (
            <p className="text-[13px] leading-normal text-muted">
              В этой коробке нет отсеков.{" "}
              <Link href={`/storage/${box.id}`} className="font-semibold text-navy underline">
                Добавить отсек
              </Link>
            </p>
          ) : null}
        </section>
      </main>

      <div className="sticky bottom-0 border-t border-tint bg-surface px-5 pt-3 pb-6">
        <SubmitButton className={primaryButtonClass} disabled={compartments.length === 0}>
          Сохранить
        </SubmitButton>
      </div>
    </form>
  );
}
