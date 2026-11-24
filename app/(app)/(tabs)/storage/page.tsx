import type { Metadata } from "next";
import Link from "next/link";
import { BoxDetail } from "@/components/BoxDetail";
import { BoxTile } from "@/components/BoxTile";
import { IconPlus, IconPrint, IconQr } from "@/components/icons";
import { Page } from "@/components/Page";
import {
  addButtonClass,
  addButtonSmClass,
  secondaryButtonClass,
  secondaryButtonSmClass,
  sectionTitleClass,
} from "@/components/ui";
import { plural, storageSummaryParts } from "@/lib/format";
import { getBox, getBoxDetail, getStorageOverview } from "@/lib/storage/queries";
import { isUuid } from "@/lib/storage/validation";

export const metadata: Metadata = { title: "Хранение — Local Pharm" };

type Props = { searchParams: Promise<{ box?: string | string[]; cell?: string | string[] }> };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function StoragePage({ searchParams }: Props) {
  const raw = await searchParams;
  const { zones, totals } = await getStorageOverview();

  // Desktop (lg): the panel on the right shows `?box=<id>` (`&cell=<id>` selects a
  // compartment), by default the first box. On mobile a tile opens /storage/[boxId].
  const allBoxes = zones.flatMap((z) => z.boxes);
  const wantedBox = one(raw.box);
  const selectedId =
    (isUuid(wantedBox) ? allBoxes.find((b) => b.id === wantedBox)?.id : undefined) ?? allBoxes[0]?.id;
  const box = selectedId ? await getBox(selectedId) : null;
  const wantedCell = one(raw.cell);
  const detail = box ? await getBoxDetail(box.id, isUuid(wantedCell) ? wantedCell : null) : null;

  const newBoxLink = (
    <>
      <IconPlus size={20} strokeWidth={2} />
      Новая коробка
    </>
  );

  return (
    <Page wide>
      <main className="flex flex-col gap-5 px-5 pt-6 pb-6 lg:gap-7 lg:p-0">
        <header className="flex items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-[28px] leading-tight font-bold tracking-[-0.3px]">Хранение</h1>
            <p className="text-sm text-muted">
              {storageSummaryParts(totals).map((part, i) => (
                <span key={part.word}>
                  {i > 0 ? " · " : null}
                  <strong className="font-bold text-navy">{part.n}</strong> {part.word}
                </span>
              ))}
            </p>
          </div>
          {/* Mobile: icon button "scan a box QR" (secondary, docs/BRAND.md "Кнопки"). */}
          <Link
            href="/storage/scan"
            aria-label="Сканировать QR коробки"
            className="flex size-12 flex-none items-center justify-center rounded-button border border-border bg-surface text-navy hover:bg-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy lg:hidden"
          >
            <IconQr size={22} />
          </Link>
          <div className="hidden gap-2 lg:flex">
            <Link href="/storage/scan" className={secondaryButtonSmClass}>
              <IconQr size={20} />
              Сканировать QR
            </Link>
            {allBoxes.length > 0 ? (
              <Link href="/storage/labels" className={secondaryButtonSmClass}>
                <IconPrint size={20} />
                Печать наклеек
              </Link>
            ) : null}
            <Link href="/storage/new" className={addButtonSmClass}>
              {newBoxLink}
            </Link>
          </div>
        </header>

        <div
          className={`flex flex-col gap-5 lg:items-start lg:gap-6 ${
            box ? "lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]" : ""
          }`}
        >
          <div className="flex flex-col gap-5">
            {zones.map((zone) => (
              <section key={zone.id} aria-labelledby={`zone-${zone.id}`} className="flex flex-col gap-2">
                <div className="flex items-baseline gap-2.5">
                  <h2 id={`zone-${zone.id}`} className={sectionTitleClass}>
                    {zone.name}
                  </h2>
                  <p className="text-xs text-muted">
                    <strong className="font-bold text-navy">{zone.boxes.length}</strong>{" "}
                    {plural(zone.boxes.length, "коробка", "коробки", "коробок")}
                  </p>
                </div>
                {zone.boxes.length === 0 ? (
                  <p className="rounded-card border border-dashed border-border px-4 py-5 text-[13px] text-muted">
                    В этой зоне пока нет коробок.
                  </p>
                ) : (
                  <ul className="grid grid-cols-2 gap-2 lg:grid-cols-1 xl:grid-cols-2">
                    {zone.boxes.map((b) => (
                      <li key={b.id}>
                        <BoxTile box={b} subtitle={b.categories} selected={b.id === box?.id} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>

          {box && detail ? (
            <aside
              aria-label="Выбранная коробка"
              className="hidden rounded-card border border-border bg-surface p-6 lg:sticky lg:top-8 lg:block"
            >
              <div className="flex flex-col gap-5">
                <BoxDetail
                  box={box}
                  detail={detail}
                  as="h2"
                  showEdit
                  cellHref={(id) => `/storage?box=${box.id}&cell=${id}`}
                />
              </div>
            </aside>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 lg:hidden">
          <Link href="/storage/new" className={addButtonClass}>
            {newBoxLink}
          </Link>
          {allBoxes.length > 0 ? (
            <Link href="/storage/labels" className={secondaryButtonClass}>
              <IconPrint size={20} />
              Печать наклеек
            </Link>
          ) : null}
        </div>
      </main>
    </Page>
  );
}
