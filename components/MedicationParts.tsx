import Link from "next/link";
import { expiryStatus, formatDate, formatExpiry, todayIso } from "@/lib/dates";
import { pcsLabel } from "@/lib/format";
import { deleteMedication, deletePack } from "@/lib/medications/actions";
import { placeLabel, sortPacks, sourceLabel } from "@/lib/medications/search";
import type { CatalogMedication } from "@/lib/medications/types";
import { ExpiryBadge, LowStockBadge } from "./Badge";
import { ConfirmDialog } from "./ConfirmDialog";
import { DesktopSelectLink } from "./DesktopSelectLink";
import { IconArrowRight, IconPill, IconPlus } from "./icons";
import { PackActions } from "./PackActions";
import { addButtonClass, dangerTextButtonClass, navLinkClass, sectionTitleClass, textButtonClass } from "./ui";

// Building blocks of the medication card. They are shared by the full page
// (/medications/[id]) and by the desktop panel of the search results, so the
// packs, the quick actions and the dialogs exist in one place only.

const tagClass = "rounded-tag bg-tint px-2.5 py-1.5 text-xs font-semibold text-navy";

type Med = CatalogMedication;

/** Icon, name, active ingredient and tags. */
export function MedicationHead({
  med,
  as: Heading = "h1",
  iconClassName = "",
}: {
  med: Med;
  /** The panel sits under the page's own h1, so it uses h2. */
  as?: "h1" | "h2";
  iconClassName?: string;
}) {
  const tags = [med.form, med.categoryName, sourceLabel(med.source)].filter(Boolean) as string[];
  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-start gap-3.5">
        <span
          className={`flex size-14 flex-none items-center justify-center rounded-card bg-tint text-navy ${iconClassName}`}
        >
          <IconPill size={26} />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <Heading className="text-2xl leading-tight font-bold break-words lg:text-[28px]">
            {med.name}
            {med.dosage ? ` ${med.dosage}` : ""}
          </Heading>
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
    </div>
  );
}

/** Packs at home with place, quantity, expiry and every pack action. */
export function PackList({ med, titleId }: { med: Med; titleId: string }) {
  const today = todayIso();
  const packs = sortPacks(med.packs);

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-2.5">
      <h2 id={titleId} className={sectionTitleClass}>
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
                    <DesktopSelectLink
                      href={`/storage/${pack.place.boxId}?cell=${pack.place.compartmentId}`}
                      desktopHref={`/storage?box=${pack.place.boxId}&cell=${pack.place.compartmentId}`}
                      className={`${navLinkClass} -my-2.5 flex-none`}
                    >
                      Открыть
                      <IconArrowRight size={16} strokeWidth={2} />
                    </DesktopSelectLink>
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
                    className={`${textButtonClass} flex-1`}
                  >
                    Переложить
                  </Link>
                  <ConfirmDialog
                    triggerLabel="Удалить упаковку"
                    triggerClassName={`${dangerTextButtonClass} flex-1`}
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
  );
}

export function Indications({ med, titleId, className = "" }: { med: Med; titleId: string; className?: string }) {
  return (
    <section aria-labelledby={titleId} className={`flex flex-col gap-2 ${className}`}>
      <h2 id={titleId} className={sectionTitleClass}>
        Показания и дозировка
      </h2>
      <p className="rounded-card bg-surface px-4 py-3.5 text-[15px] leading-normal break-words whitespace-pre-line lg:border lg:border-border lg:p-[18px]">
        {med.indications ?? <span className="text-muted">Не указаны.</span>}
      </p>
    </section>
  );
}

/** "Добавить упаковку" plus deleting a medication that has no packs. */
export function MedicationActions({ med }: { med: Med }) {
  return (
    <div className="flex flex-col gap-2">
      <Link href={`/medications/${med.id}/pack/new`} className={addButtonClass}>
        <IconPlus size={20} strokeWidth={2.2} />
        Добавить упаковку
      </Link>
      {med.packs.length === 0 ? (
        <ConfirmDialog
          triggerLabel="Удалить препарат"
          triggerClassName={`${dangerTextButtonClass} w-full`}
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
  );
}
