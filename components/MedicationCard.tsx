import { formatExpiry } from "@/lib/dates";
import { morePlacesLabel, packsShort, pcsLabel } from "@/lib/format";
import { placeLabel, sourceName, type SearchResult } from "@/lib/medications/search";
import { ExpiryBadge, LowStockBadge } from "./Badge";
import { DesktopSelectLink } from "./DesktopSelectLink";
import { IconPill, IconStorage } from "./icons";
import { sourceTagClass } from "./ui";

type Props = SearchResult & {
  /** Desktop: the card selects the medication in the side panel of the results. */
  selectHref: string;
  selected: boolean;
};

/**
 * One search result: name, substance, badges, place, expiry and quantity.
 * Mobile: opens the medication page. Desktop (lg): selects it in the panel.
 */
export function MedicationCard({ med, summary, selectHref, selected }: Props) {
  const sub = [med.activeIngredient, med.form, med.dosage].filter(Boolean).join(" · ");
  const meta = [
    summary.packCount === 0
      ? null
      : summary.nearestExpiry
        ? `до ${formatExpiry(summary.nearestExpiry)}`
        : "срок не указан",
    summary.packCount === 0 ? null : pcsLabel(summary.totalQuantity),
    summary.packCount > 1 ? packsShort(summary.packCount) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li>
      <DesktopSelectLink
        href={`/medications/${med.id}`}
        desktopHref={selectHref}
        selected={selected}
        className="flex min-h-11 flex-col gap-2.5 rounded-card border border-border bg-surface p-4 no-underline hover:bg-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy lg:data-[selected=true]:border-navy lg:data-[selected=true]:ring-1 lg:data-[selected=true]:ring-navy"
      >
        <span className="flex items-start gap-3">
          <span className="flex size-10 flex-none items-center justify-center rounded-field bg-tint text-navy">
            <IconPill size={20} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-base leading-snug font-semibold break-words">{med.name}</span>
            {sub ? <span className="text-[13px] leading-snug text-muted">{sub}</span> : null}
          </span>
          <span className="flex flex-none flex-col items-end gap-1">
            <ExpiryBadge status={summary.status} />
            {summary.lowStock ? <LowStockBadge /> : null}
          </span>
        </span>
        <span className="flex items-start gap-2 text-[13px] leading-snug">
          <IconStorage size={16} className="mt-0.5 flex-none text-muted" />
          {summary.place ? (
            <span className="font-semibold break-words">
              {placeLabel(summary.place)}
              {summary.otherPlaces > 0 ? (
                <span className="font-normal text-muted"> · {morePlacesLabel(summary.otherPlaces)}</span>
              ) : null}
            </span>
          ) : (
            <span className="text-muted">Нет упаковок</span>
          )}
        </span>
        <span className="flex items-center justify-between gap-2">
          <span className="text-[13px] text-muted">{meta}</span>
          <span className={sourceTagClass}>{sourceName(med.source)}</span>
        </span>
      </DesktopSelectLink>
    </li>
  );
}
