import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BoxForm } from "@/components/BoxForm";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Page } from "@/components/Page";
import { ScreenHeader } from "@/components/ScreenHeader";
import { dangerTextButtonClass, sectionTitleClass } from "@/components/ui";
import { deleteBox, updateBox } from "@/lib/storage/actions";
import { DEFAULT_BOX_COLOR, isBoxColor } from "@/lib/storage/box-colors";
import { getBox, getLocations } from "@/lib/storage/queries";

export const metadata: Metadata = { title: "Изменить коробку — Local Pharm" };

export default async function EditBoxPage({ params }: { params: Promise<{ boxId: string }> }) {
  const { boxId } = await params;
  const box = await getBox(boxId);
  if (!box) notFound();
  const zones = await getLocations();

  return (
    <Page>
      <ScreenHeader title="Изменить коробку" backHref={`/storage/${box.id}`} backIcon="close" heading />
      <BoxForm
        action={updateBox}
        zones={zones}
        submitLabel="Сохранить"
        submitTone="save"
        cancelHref={`/storage/${box.id}`}
        initial={{
          boxId: box.id,
          name: box.name,
          locationId: box.location_id,
          color: isBoxColor(box.color) ? box.color : DEFAULT_BOX_COLOR,
          number: box.number ?? "",
        }}
      />
      <section className="mt-auto flex flex-col gap-3 border-t border-tint px-5 py-6 lg:mt-8 lg:max-w-xl lg:px-0">
        <h2 className={sectionTitleClass}>Опасная зона</h2>
        <ConfirmDialog
          triggerLabel="Удалить коробку"
          triggerClassName={`${dangerTextButtonClass} self-start`}
          title={`Удалить «${box.name}»?`}
          description="Коробка и все её отсеки будут удалены. Если в коробке есть упаковки, удалить её нельзя: сначала переложите или удалите их."
          confirmLabel="Удалить коробку"
          action={deleteBox}
          fields={{ boxId: box.id }}
        />
      </section>
    </Page>
  );
}
