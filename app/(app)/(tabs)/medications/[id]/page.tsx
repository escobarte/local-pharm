import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExpiryBadge, LowStockBadge } from "@/components/Badge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { IconPill } from "@/components/icons";
import { PackActions } from "@/components/PackActions";
import { ScreenHeader } from "@/components/ScreenHeader";
import {
  dangerOutlineButtonClass,
  primaryButtonClass,
  sectionTitleClass,
} from "@/components/ui";
import { expiryStatus, formatDate, formatExpiry, todayIso } from "@/lib/dates";
import { pcsLabel } from "@/lib/format";
import { deleteMedication, deletePack } from "@/lib/medications/actions";
import { getMedication } from "@/lib/medications/queries";
import { placeLabel, sortPacks, sourceLabel } from "@/lib/medications/search";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Препарат — Local Pharm" };

const tagClass = "rounded-tag bg-tint px-2.5 py-1.5 text-xs font-semibold text-navy";
const linkButton =
  "flex min-h-11 flex-1 items-center justify-center rounded-field text-[13px] font-semibold no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy";

export default async function MedicationPage({ params }: Props) {
  const { id } = await params;
  const med = await getMedication(id);
  if (!med) notFound();

  const today = todayIso();
  const packs = sortPacks(med.packs);
  const tags = [med.form, med.categoryName, sourceLabel(med.source)].filter(Boolean) as string[];

  return (
    <>
      <ScreenHeader title="Препарат" backHref="/search" backLabel="К поиску" />
      <main className="flex flex-col gap-5 px-5 pt-1 pb-6">
        <header className="flex items-start gap-3.5">
          <span className="flex size-14 flex-none items-center justify-center rounded-card bg-tint text-navy">
            <IconPill size={26} />
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="text-2xl leading-tight font-bold break-words">
              {med.name}
              {med.dosage ? ` ${med.dosage}` : ""}
            </h1>
            {med.activeIngredient ? (
              <p className="text-sm text-muted">Действующее вещество: {med.activeIngredient}</p>
            ) : null}
          </div>
        </header>

        <ul aria-label="Теги" className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <li key={t} className={tagClass}>
              {t}
            </li>
          ))}
        </ul>

        <section aria-labelledby="packs-title" className="flex flex-col gap-2.5">
          <h2 id="packs-title" className={sectionTitleClass}>
            Упаковки дома{packs.length > 0 ? ` · ${packs.length}` : ""}
          </h2>

          {packs.length === 0 ? (
            <p className="rounded-card border border-dashed border-border px-4 py-5 text-[13px] leading-normal text-muted">
              Упаковок нет. Добавьте упаковку или удалите препарат.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {packs.map((pack, index) => {
                const status = expiryStatus(pack.expiry_date, today);
                const title = pack.place ? placeLabel(pack.place) : "Место не найдено";
                return (
                  <li
                    key={pack.id}
                    aria-label={`Упаковка ${index + 1}: ${title}`}
                    className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[15px] font-semibold break-words">{title}</p>
                      {pack.place ? (
                        <Link
                          href={`/storage/${pack.place.boxId}?cell=${pack.place.compartmentId}`}
                          className="-my-1 flex min-h-11 flex-none items-center px-1 text-[13px] font-semibold text-navy underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
                        >
                          Открыть
                        </Link>
                      ) : null}
                    </div>

                    <dl className="grid grid-cols-3 gap-2 text-[13px]">
                      <div className="flex flex-col gap-0.5">
                        <dt className="text-muted">Количество</dt>
                        <dd className="font-semibold">{pcsLabel(pack.quantity)}</dd>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <dt className="text-muted">Годен до</dt>
                        <dd className="font-semibold">
                          {pack.expiry_date ? formatExpiry(pack.expiry_date) : "не указан"}
                        </dd>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <dt className="text-muted">Вскрыта</dt>
                        <dd className="font-semibold">
                          {pack.opened_at ? formatDate(pack.opened_at) : "нет"}
                        </dd>
                      </div>
                    </dl>

                    {status === "expired" || status === "soon" || pack.running_low ? (
                      <div className="flex flex-wrap gap-1.5">
                        <ExpiryBadge status={status} />
                        {pack.running_low ? <LowStockBadge /> : null}
                      </div>
                    ) : null}

                    <PackActions
                      packId={pack.id}
                      quantity={pack.quantity}
                      lowStock={pack.running_low}
                    />

                    <div className="flex gap-2 border-t border-tint pt-2">
                      <Link
                        href={`/medications/${med.id}/pack/${pack.id}/move`}
                        className={`${linkButton} text-navy hover:bg-tint`}
                      >
                        Переложить
                      </Link>
                      <ConfirmDialog
                        triggerLabel="Удалить упаковку"
                        triggerClassName={`${linkButton} text-danger-fg hover:bg-danger-bg`}
                        title="Удалить упаковку?"
                        description={`${title}, ${pcsLabel(pack.quantity)} — будет удалена из базы, отменить нельзя. Препарат останется.`}
                        confirmLabel="Удалить упаковку"
                        action={deletePack}
                        fields={{ packId: pack.id, medicationId: med.id }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-labelledby="indications-title" className="flex flex-col gap-2">
          <h2 id="indications-title" className={sectionTitleClass}>
            Показания и дозировка
          </h2>
          <p className="rounded-card bg-surface px-4 py-3.5 text-[15px] leading-normal break-words whitespace-pre-line">
            {med.indications ?? <span className="text-muted">Не указаны.</span>}
          </p>
        </section>

        <div className="flex flex-col gap-2">
          <Link href={`/medications/${med.id}/pack/new`} className={`${primaryButtonClass} no-underline`}>
            Добавить упаковку
          </Link>
          {packs.length === 0 ? (
            <ConfirmDialog
              triggerLabel="Удалить препарат"
              triggerClassName={`${dangerOutlineButtonClass} w-full`}
              title={`Удалить «${med.name}»?`}
              description="Препарат исчезнет из базы и поиска. Это нельзя отменить."
              confirmLabel="Удалить препарат"
              action={deleteMedication}
              fields={{ medicationId: med.id }}
            />
          ) : (
            <p className="text-center text-xs text-muted">
              Чтобы удалить препарат, сначала удалите все его упаковки.
            </p>
          )}
        </div>
      </main>
    </>
  );
}
