import type { Metadata } from "next";
import Link from "next/link";
import { ScreenHeader } from "@/components/ScreenHeader";
import { primaryButtonClass } from "@/components/ui";
import { createMedicationWithPack } from "@/lib/storage/actions";
import { getAddFormData } from "@/lib/storage/queries";
import { isUuid } from "@/lib/storage/validation";
import { AddForm } from "./AddForm";

export const metadata: Metadata = { title: "Добавить препарат — Local Pharm" };

type Props = { searchParams: Promise<{ box?: string; cell?: string }> };

const MODES = [
  { label: "Скан", active: false },
  { label: "Поиск", active: false },
  { label: "Вручную", active: true },
] as const;

export default async function AddPage({ searchParams }: Props) {
  const { box, cell } = await searchParams;
  const { categories, boxes } = await getAddFormData();

  // Preselect from "Добавить сюда": a compartment id wins, then a box id.
  const cellId = isUuid(cell) ? cell : "";
  const boxFromCell = boxes.find((b) => b.compartments.some((c) => c.id === cellId));
  const boxFromParam = isUuid(box) ? boxes.find((b) => b.id === box) : undefined;
  const preselected = boxFromCell ?? boxFromParam;
  const closeHref = preselected ? `/storage/${preselected.id}` : "/";

  return (
    <>
      <ScreenHeader title="Добавить препарат" backHref={closeHref} backIcon="close" />

      <div
        role="tablist"
        aria-label="Способ добавления"
        className="mx-5 mt-1 mb-3 grid grid-cols-3 gap-1 rounded-button bg-tint p-1"
      >
        {MODES.map((m) => (
          <button
            key={m.label}
            type="button"
            role="tab"
            aria-selected={m.active}
            disabled={!m.active}
            className={`flex min-h-11 flex-col items-center justify-center rounded-field px-1 text-sm leading-tight font-semibold ${
              m.active ? "bg-surface text-navy" : "cursor-not-allowed text-muted"
            }`}
          >
            {m.label}
            {m.active ? null : <span className="text-[10px] font-medium">скоро</span>}
          </button>
        ))}
      </div>

      {boxes.length === 0 ? (
        <main className="flex flex-col gap-4 px-5 pb-6">
          <p className="rounded-card border border-border bg-surface p-5 text-[15px] leading-normal">
            Сначала создайте коробку и отсек, куда положить упаковку.
          </p>
          <Link href="/storage/new" className={`${primaryButtonClass} no-underline`}>
            Создать коробку
          </Link>
        </main>
      ) : (
        <AddForm
          action={createMedicationWithPack}
          categories={categories}
          boxes={boxes}
          initialBoxId={preselected?.id ?? boxes[0].id}
          initialCompartmentId={cellId}
        />
      )}
    </>
  );
}
