import { formatDate, formatExpiry, type ExpiryStatus } from "@/lib/dates";
import { pcsLabel } from "@/lib/format";
import { sourceLabel } from "@/lib/medications/search";
import type { CatalogMedication, CatalogPack } from "@/lib/medications/types";
import { ExpiryBadge, LowStockBadge } from "./Badge";
import { FormIcon, formPlateClass } from "./FormIcon";
import { sectionTitleClass, sourceTagClass } from "./ui";

// Read-only parts of a medication, with no Server Actions behind them: used by
// the medication card (MedicationParts) and by the offline page.

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
  const tags = [med.form, med.categoryName].filter(Boolean) as string[];
  const source = sourceLabel(med.source);
  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-start gap-3.5">
        <span className={`${formPlateClass} size-14 rounded-card ${iconClassName}`}>
          <FormIcon form={med.form} size={28} />
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
        {source ? (
          <li className={`${sourceTagClass} px-2.5 py-1.5 text-xs leading-normal`}>{source}</li>
        ) : null}
      </ul>
    </div>
  );
}

/** Quantity, expiry, "opened" and the badges of one pack. */
export function PackFacts({ pack, status }: { pack: CatalogPack; status: ExpiryStatus }) {
  return (
    <>
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
    </>
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
