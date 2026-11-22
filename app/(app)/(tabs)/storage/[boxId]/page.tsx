import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BoxDetail } from "@/components/BoxDetail";
import { IconEdit } from "@/components/icons";
import { Page } from "@/components/Page";
import { ScreenHeader } from "@/components/ScreenHeader";
import { iconButtonClass } from "@/components/ui";
import { getBox, getBoxDetail } from "@/lib/storage/queries";
import { isUuid } from "@/lib/storage/validation";

type Props = {
  params: Promise<{ boxId: string }>;
  searchParams: Promise<{ cell?: string; added?: string }>;
};

export const metadata: Metadata = { title: "Коробка — Local Pharm" };

/** Full box screen: mobile layout and the target of QR stickers (desktop uses /storage?box=). */
export default async function BoxPage({ params, searchParams }: Props) {
  const { boxId } = await params;
  const { cell, added } = await searchParams;

  const box = await getBox(boxId);
  if (!box) notFound();

  const detail = await getBoxDetail(box.id, isUuid(cell) ? cell : null);

  return (
    <Page wide>
      <ScreenHeader
        title="Коробка"
        backHref="/storage"
        backLabel="Назад к хранению"
        right={
          <Link href={`/storage/${box.id}/edit`} aria-label="Изменить коробку" className={iconButtonClass}>
            <IconEdit size={22} />
          </Link>
        }
      />
      <main className="flex flex-col gap-5 px-5 pt-1 pb-6 lg:max-w-2xl lg:p-0">
        <BoxDetail
          box={box}
          detail={detail}
          added={Boolean(added)}
          cellHref={(id) => `/storage/${box.id}?cell=${id}`}
        />
      </main>
    </Page>
  );
}
