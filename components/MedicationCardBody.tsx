import { formatExpiry } from "@/lib/dates";
import { morePlacesLabel, packsShort, pcsLabel } from "@/lib/format";
import { placeLabel, sourceName, type SearchResult } from "@/lib/medications/search";
import { CountChip, ExpiryChip, LowStockBadge, QuantityChip } from "./Badge";
import { FormIcon, formPlateClass } from "./FormIcon";
import { IconStorage } from "./icons";
import { sourceTagClass } from "./ui";

// The look of one search result, shared by the search screen (a link) and the
// offline page (a button).

export const medicationCardClass =
  "flex min-h-11 flex-col gap-2.5 rounded-card border border-border bg-surface p-4 no-underline hover:bg-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy lg:data-[selected=true]:border-navy lg:data-[selected=true]:ring-1 lg:data-[selected=true]:ring-navy";

/** Bold name, substance, place, then quantity / expiry chips. */
export function MedicationCardBody({ med, summary }: SearchResult) {
  const sub = [med.activeIngredient, med.form, med.dosage].filter(Boolean).join(" · ");
  const hasPacks = summary.packCount > 0;

  return (
    <>
      <span className="flex items-start gap-3">
        <span className={`${formPlateClass} size-10 rounded-field`}>
          <FormIcon form={med.form} size={22} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-base leading-snug font-bold break-words">{med.name}</span>
          {sub ? <span className="text-[13px] leading-snug text-muted">{sub}</span> : null}
        </span>
        {summary.lowStock ? <LowStockBadge /> : null}
      </span>
      <span className="flex items-start gap-2 text-sm leading-snug">
        <IconStorage size={16} className="mt-0.5 flex-none text-box-icon" />
        {summary.place ? (
          <span className="font-semibold break-words">
            {placeLabel(summary.place)}
            {summary.otherPlaces > 0 ? (
              <span className="font-medium text-muted"> · {morePlacesLabel(summary.otherPlaces)}</span>
            ) : null}
          </span>
        ) : (
          <span className="text-muted">Нет упаковок</span>
        )}
      </span>
      <span className="flex items-center justify-between gap-2">
        <span className="flex flex-wrap items-center gap-1.5">
          {hasPacks ? (
            <>
              <QuantityChip text={pcsLabel(summary.totalQuantity)} />
              <ExpiryChip
                text={summary.nearestExpiry ? `до ${formatExpiry(summary.nearestExpiry)}` : ""}
                status={summary.status}
              />
              {summary.packCount > 1 ? <CountChip text={packsShort(summary.packCount)} /> : null}
            </>
          ) : null}
        </span>
        <span className={sourceTagClass}>{sourceName(med.source)}</span>
      </span>
    </>
  );
}
