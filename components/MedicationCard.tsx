import Link from "next/link";
import { formatExpiry } from "@/lib/dates";
import { morePlacesLabel, packsShort, pcsLabel } from "@/lib/format";
import { placeLabel, type SearchResult } from "@/lib/medications/search";
import { ExpiryBadge, LowStockBadge } from "./Badge";
import { IconPill, IconStorage } from "./icons";

/** One search result: name, substance, badges, place, expiry and quantity. */
export function MedicationCard({ med, summary }: SearchResult) {
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
      <Link
        href={`/medications/${med.id}`}
        className="flex min-h-11 flex-col gap-2.5 rounded-card border border-border bg-surface p-4 no-underline hover:bg-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
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
        {meta ? <span className="text-[13px] text-muted">{meta}</span> : null}
      </Link>
    </li>
  );
}
