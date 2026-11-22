import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PackForm } from "@/components/PackForm";
import { Page } from "@/components/Page";
import { ScreenHeader } from "@/components/ScreenHeader";
import { primaryButtonClass } from "@/components/ui";
import { createPack } from "@/lib/medications/actions";
import { getMedication } from "@/lib/medications/queries";
import { sortPacks } from "@/lib/medications/search";
import { getBoxOptions } from "@/lib/storage/queries";

export const metadata: Metadata = { title: "Добавить упаковку — Local Pharm" };

type Props = { params: Promise<{ id: string }> };

export default async function NewPackPage({ params }: Props) {
  const { id } = await params;
  const med = await getMedication(id);
  if (!med) notFound();
  const boxes = await getBoxOptions();

  // Suggest the place of the most urgent existing pack.
  const lastPlace = sortPacks(med.packs).find((p) => p.place)?.place;

  return (
    <Page>
      <ScreenHeader
        title="Добавить упаковку"
        backHref={`/medications/${med.id}`}
        backIcon="close"
        heading
      />
      <p className="px-5 pb-3 text-[15px] font-semibold break-words lg:px-0">
        {med.name}
        {med.dosage ? ` ${med.dosage}` : ""}
      </p>
      {boxes.length === 0 ? (
        <main className="flex flex-col gap-4 px-5 pb-6 lg:max-w-xl lg:p-0">
          <p className="rounded-card border border-border bg-surface p-5 text-[15px] leading-normal">
            Сначала создайте коробку и отсек, куда положить упаковку.
          </p>
          <Link href="/storage/new" className={`${primaryButtonClass} no-underline`}>
            Создать коробку
          </Link>
        </main>
      ) : (
        <PackForm
          action={createPack}
          mode="create"
          boxes={boxes}
          fields={{ medicationId: med.id }}
          initialBoxId={lastPlace?.boxId ?? boxes[0].id}
          initialCompartmentId={lastPlace?.compartmentId ?? ""}
          submitLabel="Сохранить"
        />
      )}
    </Page>
  );
}
