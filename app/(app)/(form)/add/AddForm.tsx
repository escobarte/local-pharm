"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormField, fieldAria } from "@/components/FormField";
import { IconPlus } from "@/components/icons";
import { PlacePicker, usePlaceSelection, type PlaceBox } from "@/components/PlacePicker";
import { SubmitButton } from "@/components/SubmitButton";
import {
  errorBoxClass,
  formFooterClass,
  formSubmitClass,
  inputClass,
  addButtonClass,
  secondaryButtonClass,
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
  /** AMDM registry code when the medication was picked in the registry search. */
  registryCode?: string;
  /** Prefilled values: name, activeIngredient, form, dosage, categoryId, barcode. */
  initialValues?: Record<string, string>;
  /** "openfda" when prefilled from the openFDA block; otherwise manual (or AMDM via registryCode). */
  source?: "manual" | "openfda";
  /** The user already chose "Создать отдельную запись" (skip the duplicate check). */
  allowDuplicate?: boolean;
};

/** Desktop: "Препарат" and "Упаковка" are two cards side by side. */
const columnClass = "lg:gap-4 lg:rounded-card lg:border lg:border-border lg:bg-surface lg:p-6";

export function AddForm({
  action,
  categories,
  boxes,
  initialBoxId,
  initialCompartmentId,
  registryCode,
  initialValues = {},
  source = "manual",
  allowDuplicate = false,
}: Props) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, initialActionState);
  const errors = state.fieldErrors ?? {};
  const v = (key: string, fallback = "") => state.values?.[key] ?? initialValues[key] ?? fallback;
  const formMessage = state.message ?? errors.registryCode;

  const place = usePlaceSelection(
    boxes,
    v("boxId", initialBoxId),
    v("compartmentId", initialCompartmentId),
  );

  return (
    <form action={formAction} className="flex flex-1 flex-col" noValidate>
      {registryCode ? <input type="hidden" name="registryCode" value={registryCode} /> : null}
      {source === "openfda" ? <input type="hidden" name="source" value="openfda" /> : null}
      {allowDuplicate ? <input type="hidden" name="allowDuplicate" value="1" /> : null}
      <main className="flex flex-1 flex-col gap-4 px-5 pb-4 lg:grid lg:flex-none lg:grid-cols-2 lg:items-start lg:gap-5 lg:p-0">
        {formMessage ? (
          <p role="alert" className={`${errorBoxClass} lg:col-span-2`}>
            {formMessage}
          </p>
        ) : null}

        {state.duplicate ? (
          <section
            role="alert"
            aria-labelledby="duplicate-title"
            className="flex flex-col gap-3 rounded-card border border-navy bg-surface p-4 lg:col-span-2 lg:flex-row lg:items-center lg:justify-between"
          >
            <div className="flex flex-col gap-1">
              <h2 id="duplicate-title" className="text-[15px] font-semibold">
                Уже есть дома: {state.duplicate.name}
              </h2>
              <p className="text-[13px] leading-normal text-muted">
                {state.duplicate.reason === "registry"
                  ? "Этот препарат из реестра уже записан."
                  : "Препарат с этим штрихкодом уже записан."}{" "}
                Лучше добавить к нему ещё одну упаковку.
              </p>
            </div>
            <div className="flex flex-col gap-2 lg:flex-row">
              <Link
                href={`/medications/${state.duplicate.id}/pack/new${place.compartmentId ? `?cell=${place.compartmentId}` : ""}`}
                className={addButtonClass}
              >
                <IconPlus size={20} strokeWidth={2.2} />
                Добавить упаковку к существующему
              </Link>
              <button type="submit" name="allowDuplicate" value="1" className={secondaryButtonClass}>
                Создать отдельную запись
              </button>
            </div>
          </section>
        ) : null}

        <section aria-labelledby="medication-title" className={`${columnClass} flex flex-col gap-2.5`}>
          <h2 id="medication-title" className={`${sectionTitleClass} hidden lg:block`}>
            Препарат
          </h2>
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
          <FormField
            label="Штрихкод"
            htmlFor="barcode"
            error={errors.barcode}
            hint={errors.barcode ? undefined : "Цифры под полосками на упаковке, можно пусто"}
          >
            <input
              {...fieldAria("barcode", errors.barcode, "hint")}
              name="barcode"
              type="text"
              inputMode="numeric"
              maxLength={20}
              autoComplete="off"
              placeholder="4820000000000"
              defaultValue={v("barcode")}
              className={inputClass}
            />
          </FormField>
        </section>

        <section aria-labelledby="pack-title" className={`${columnClass} flex flex-col gap-2.5`}>
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

      <div className={formFooterClass}>
        <SubmitButton className={formSubmitClass} disabled={place.compartments.length === 0}>
          Сохранить
        </SubmitButton>
      </div>
    </form>
  );
}
