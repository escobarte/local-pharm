import type { Metadata } from "next";
import Link from "next/link";
import { BoxDetail } from "@/components/BoxDetail";
import { DesktopSelectLink } from "@/components/DesktopSelectLink";
import { IconPlus, IconPrint, IconQr } from "@/components/icons";
import { Page } from "@/components/Page";
import { dashedButtonClass, secondaryButtonClass, sectionTitleClass } from "@/components/ui";
import { packsShort, storageSummary } from "@/lib/format";
import { boxColorClasses } from "@/lib/storage/box-colors";
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
  const headerLinkClass =
    "flex min-h-11 items-center gap-2 rounded-field border border-border bg-surface px-4 text-sm font-semibold text-navy no-underline hover:bg-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy";

  return (
    <Page wide>
      <main className="flex flex-col gap-5 px-5 pt-6 pb-6 lg:gap-7 lg:p-0">
        <header className="flex items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-[28px] leading-tight font-bold tracking-[-0.3px]">Хранение</h1>
            <p className="text-sm text-muted">{storageSummary(totals)}</p>
          </div>
          {/* Mobile: one navy button "scan a box QR" (mockup Storage-v3). */}
          <Link
            href="/storage/scan"
            aria-label="Сканировать QR коробки"
            className="flex size-12 flex-none items-center justify-center rounded-button bg-navy text-white hover:bg-navy/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy lg:hidden"
          >
            <IconQr size={22} />
          </Link>
          <div className="hidden gap-2 lg:flex">
            <Link href="/storage/scan" className={headerLinkClass}>
              <IconQr size={20} />
              Сканировать QR
            </Link>
            {allBoxes.length > 0 ? (
              <Link href="/storage/labels" className={headerLinkClass}>
                <IconPrint size={20} />
                Печать наклеек
              </Link>
            ) : null}
            <Link href="/storage/new" className={headerLinkClass}>
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
                <h2 id={`zone-${zone.id}`} className={sectionTitleClass}>
                  {zone.name}
                </h2>
                {zone.boxes.length === 0 ? (
                  <p className="rounded-card border border-dashed border-border px-4 py-5 text-[13px] text-muted">
                    В этой зоне пока нет коробок.
                  </p>
                ) : (
                  <ul className="grid grid-cols-2 gap-2 lg:grid-cols-1 xl:grid-cols-2">
                    {zone.boxes.map((b) => (
                      <li key={b.id}>
                        <DesktopSelectLink
                          href={`/storage/${b.id}`}
                          desktopHref={`/storage?box=${b.id}`}
                          selected={b.id === box?.id}
                          className="flex h-full min-h-28 flex-col gap-2.5 rounded-card bg-surface p-3.5 text-navy no-underline hover:bg-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy lg:border lg:border-border lg:data-[selected=true]:border-navy lg:data-[selected=true]:ring-1 lg:data-[selected=true]:ring-navy"
                        >
                          <span className="flex items-center justify-between gap-2">
                            <span
                              className={`flex size-8 items-center justify-center rounded-field text-[13px] font-bold ${boxColorClasses(b.color)}`}
                            >
                              {b.number ?? "•"}
                            </span>
                            <span className="text-xs font-semibold text-muted">
                              {packsShort(b.packCount)}
                            </span>
                          </span>
                          <span className="flex flex-col gap-0.5">
                            <span className="text-[15px] font-semibold break-words">{b.name}</span>
                            <span className="text-xs leading-snug text-muted">{b.categories}</span>
                          </span>
                        </DesktopSelectLink>
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
          <Link href="/storage/new" className={dashedButtonClass}>
            {newBoxLink}
          </Link>
          {allBoxes.length > 0 ? (
            <Link href="/storage/labels" className={`${secondaryButtonClass} gap-2 text-sm no-underline`}>
              <IconPrint size={20} />
              Печать наклеек
            </Link>
          ) : null}
        </div>
      </main>
    </Page>
  );
}
