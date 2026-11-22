import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PackForm } from "@/components/PackForm";
import { ScreenHeader } from "@/components/ScreenHeader";
import { pcsLabel } from "@/lib/format";
import { movePack } from "@/lib/medications/actions";
import { getMedication } from "@/lib/medications/queries";
import { placeLabel } from "@/lib/medications/search";
import { getBoxOptions } from "@/lib/storage/queries";
import { isUuid } from "@/lib/storage/validation";

export const metadata: Metadata = { title: "Переложить упаковку — Local Pharm" };

type Props = { params: Promise<{ id: string; packId: string }> };

export default async function MovePackPage({ params }: Props) {
  const { id, packId } = await params;
  if (!isUuid(packId)) notFound();
  const med = await getMedication(id);
  const pack = med?.packs.find((p) => p.id === packId);
  if (!med || !pack) notFound();
  const boxes = await getBoxOptions();

  return (
    <>
      <ScreenHeader title="Переложить" backHref={`/medications/${med.id}`} backIcon="close" />
      <div className="flex flex-col gap-1 px-5 pb-3">
        <p className="text-[15px] font-semibold break-words">
          {med.name}
          {med.dosage ? ` ${med.dosage}` : ""}
        </p>
        <p className="text-[13px] text-muted">
          Сейчас: {pack.place ? placeLabel(pack.place) : "место не найдено"} · {pcsLabel(pack.quantity)}
        </p>
      </div>
      <PackForm
        action={movePack}
        mode="move"
        boxes={boxes}
        fields={{ packId: pack.id, medicationId: med.id }}
        initialBoxId={pack.place?.boxId ?? boxes[0]?.id ?? ""}
        initialCompartmentId={pack.place?.compartmentId ?? ""}
        submitLabel="Переложить"
      />
    </>
  );
}
