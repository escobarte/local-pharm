import type { Metadata } from "next";
import Link from "next/link";
import { LabelSheet } from "@/components/LabelSheet";
import { Page } from "@/components/Page";
import { ScreenHeader } from "@/components/ScreenHeader";
import { IconPlus } from "@/components/icons";
import { addButtonClass } from "@/components/ui";
import { parseLabelSize } from "@/lib/labels";
import { getLabelBoxes } from "@/lib/storage/queries";
import { isUuid } from "@/lib/storage/validation";

export const metadata: Metadata = { title: "Печать наклеек — Local Pharm" };

type Props = { searchParams: Promise<{ box?: string | string[]; size?: string | string[] }> };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/**
 * QR sticker sheet. `?box=<id>` ("Печать QR" of one box) preselects only that
 * box, otherwise all boxes are selected. `?size=small` starts with 21 per sheet.
 */
export default async function LabelsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const boxes = await getLabelBoxes();
  const wanted = one(sp.box);
  const only = isUuid(wanted) ? boxes.find((b) => b.id === wanted.toLowerCase())?.id : undefined;

  return (
    <Page wide>
      <div className="print:hidden">
        <ScreenHeader
          title="Печать наклеек"
          backHref={only ? `/storage/${only}` : "/storage"}
          backLabel={only ? "Назад к коробке" : "Назад к хранению"}
          heading
        />
      </div>
      {boxes.length === 0 ? (
        <main className="flex flex-col gap-4 px-5 pb-6 lg:max-w-md lg:p-0">
          <p className="rounded-card border border-dashed border-border px-4 py-5 text-[13px] text-muted">
            Пока нет коробок — печатать нечего.
          </p>
          <Link href="/storage/new" className={addButtonClass}>
            <IconPlus size={20} strokeWidth={2.2} />
            Новая коробка
          </Link>
        </main>
      ) : (
        <main className="flex flex-1 flex-col">
          <LabelSheet
            boxes={boxes}
            initialSelected={only ? [only] : boxes.map((b) => b.id)}
            initialSize={parseLabelSize(one(sp.size))}
          />
        </main>
      )}
    </Page>
  );
}
