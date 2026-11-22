import type { Metadata } from "next";
import Link from "next/link";
import { IconPlus } from "@/components/icons";
import { dashedButtonClass, sectionTitleClass } from "@/components/ui";
import { packsShort, storageSummary } from "@/lib/format";
import { boxColorClasses } from "@/lib/storage/box-colors";
import { getStorageOverview } from "@/lib/storage/queries";

export const metadata: Metadata = { title: "Хранение — Local Pharm" };

export default async function StoragePage() {
  const { zones, totals } = await getStorageOverview();

  return (
    <main className="flex flex-col gap-5 px-5 pt-6 pb-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-[28px] leading-tight font-bold tracking-[-0.3px]">Хранение</h1>
        <p className="text-sm text-muted">{storageSummary(totals)}</p>
      </header>

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
            <ul className="grid grid-cols-2 gap-2">
              {zone.boxes.map((box) => (
                <li key={box.id}>
                  <Link
                    href={`/storage/${box.id}`}
                    className="flex h-full min-h-28 flex-col gap-2.5 rounded-card bg-surface p-3.5 text-navy no-underline hover:bg-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span
                        className={`flex size-8 items-center justify-center rounded-field text-[13px] font-bold ${boxColorClasses(box.color)}`}
                      >
                        {box.number ?? "•"}
                      </span>
                      <span className="text-xs font-semibold text-muted">
                        {packsShort(box.packCount)}
                      </span>
                    </span>
                    <span className="flex flex-col gap-0.5">
                      <span className="text-[15px] font-semibold break-words">{box.name}</span>
                      <span className="text-xs leading-snug text-muted">{box.categories}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      <Link href="/storage/new" className={dashedButtonClass}>
        <IconPlus size={20} strokeWidth={2} />
        Новая коробка
      </Link>
    </main>
  );
}
