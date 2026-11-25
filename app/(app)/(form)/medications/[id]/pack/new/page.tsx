import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FormPlate } from "@/components/FormIcon";
import { PackForm } from "@/components/PackForm";
import { Page } from "@/components/Page";
import { ScreenHeader } from "@/components/ScreenHeader";
import { IconPlus } from "@/components/icons";
import { addButtonClass } from "@/components/ui";
import { createPack } from "@/lib/medications/actions";
import { getMedication } from "@/lib/medications/queries";
import { sortPacks } from "@/lib/medications/search";
import { getBoxOptions } from "@/lib/storage/queries";
import { isUuid } from "@/lib/storage/validation";

export const metadata: Metadata = { title: "Добавить упаковку — Local Pharm" };

type Props = {
  params: Promise<{ id: string }>;
  /** ?cell=<compartment id>: place chosen on the Add screen ("Добавить упаковку к существующему"). */
  searchParams: Promise<{ cell?: string | string[] }>;
};

export default async function NewPackPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { cell } = await searchParams;
  const cellId = typeof cell === "string" && isUuid(cell) ? cell : "";
  const med = await getMedication(id);
  if (!med) notFound();
  const boxes = await getBoxOptions();

  // A place passed from the Add screen wins; otherwise suggest the place of the
  // most urgent existing pack.
  const boxOfCell = boxes.find((b) => b.compartments.some((c) => c.id === cellId));
  const lastPlace = sortPacks(med.packs).find((p) => p.place)?.place;
  const initialBoxId = boxOfCell?.id ?? lastPlace?.boxId ?? boxes[0]?.id ?? "";
  const initialCompartmentId = boxOfCell ? cellId : (lastPlace?.compartmentId ?? "");

  return (
    <Page>
      <ScreenHeader
        title="Добавить упаковку"
        backHref={`/medications/${med.id}`}
        backIcon="close"
        heading
      />
      <div className="flex items-center gap-2.5 px-5 pb-3 lg:px-0">
        <FormPlate form={med.form} />
        <p className="min-w-0 text-[15px] font-semibold break-words">
          {med.name}
          {med.dosage ? ` ${med.dosage}` : ""}
        </p>
      </div>
      {boxes.length === 0 ? (
        <main className="flex flex-col gap-4 px-5 pb-6 lg:max-w-xl lg:p-0">
          <p className="rounded-card border border-border bg-surface p-5 text-[15px] leading-normal">
            Сначала создайте коробку и отсек, куда положить упаковку.
          </p>
          <Link href="/storage/new" className={addButtonClass}>
            <IconPlus size={20} strokeWidth={2.2} />
            Создать коробку
          </Link>
        </main>
      ) : (
        <PackForm
          action={createPack}
          mode="create"
          boxes={boxes}
          fields={{ medicationId: med.id }}
          initialBoxId={initialBoxId}
          initialCompartmentId={initialCompartmentId}
          submitLabel="Сохранить"
        />
      )}
    </Page>
  );
}
