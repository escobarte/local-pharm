import type { ReactNode } from "react";
import { expiryStatus, formatExpiry, type IsoDate } from "@/lib/dates";
import { packsShort, pcsLabel } from "@/lib/format";
import { boxColorClasses } from "@/lib/storage/box-colors";
import type { CellData } from "@/lib/storage/summary";
import type { PackRow } from "@/lib/storage/types";
import { ExpiryChip, QuantityChip } from "./Badge";
import { FormPlate } from "./FormIcon";
import { IconStorage } from "./icons";

// Presentational parts of a box, shared by the online box screen (links) and
// the offline page (buttons).

/** Number plate, name and the muted "№ · zone · categories" line; actions on the right. */
export function BoxHeader({
  box,
  subtitle,
  as: Heading = "h2",
  children,
}: {
  box: { name: string; number: string | null; color: string | null };
  subtitle: string;
  as?: "h1" | "h2";
  children?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3.5">
      <span
        className={`flex size-14 flex-none items-center justify-center rounded-card text-[22px] font-bold ${boxColorClasses(box.color)}`}
      >
        {box.number ?? "•"}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Heading className="text-2xl leading-tight font-bold break-words">{box.name}</Heading>
        <p className="flex items-start gap-1.5 text-sm text-muted">
          <IconStorage size={16} className="mt-0.5 flex-none text-box-icon" fillClassName="fill-none" />
          <span className="min-w-0 break-words">{subtitle}</span>
        </p>
      </div>
      {children}
    </div>
  );
}

/** One compartment of the scheme. */
export const cellClass = (selected: boolean) =>
  `flex min-h-16 w-full flex-col items-center justify-center gap-1 rounded-field p-2 text-center no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy ${
    selected ? "bg-navy text-white" : "bg-tint text-navy hover:bg-border"
  }`;

export function CellBody({ cell, selected }: { cell: CellData; selected: boolean }) {
  return (
    <>
      <span className="max-w-full text-xl leading-none font-bold break-all">{cell.code}</span>
      <span className={`text-xs leading-none ${selected ? "text-white" : "text-muted"}`}>
        {packsShort(cell.packCount)}
      </span>
    </>
  );
}

/** One pack in the contents of a compartment. */
export const boxItemClass =
  "flex min-h-16 w-full items-start gap-2.5 px-4 py-3 text-left no-underline hover:bg-tint focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-navy";

export function BoxItemBody({ item, today }: { item: PackRow; today: IsoDate }) {
  const sub = [item.activeIngredient, item.form, item.dosage].filter(Boolean).join(" · ");
  return (
    <>
      <FormPlate form={item.form} />
      {/* Chips go under the text: the name keeps the full width beside the icon. */}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-base leading-snug font-bold break-words">{item.medicationName}</span>
        {sub ? <span className="text-[13px] leading-snug break-words text-muted">{sub}</span> : null}
        <span className="mt-1 flex flex-wrap items-center gap-1.5">
          <QuantityChip text={pcsLabel(item.quantity)} />
          <ExpiryChip
            text={item.expiry_date ? `до ${formatExpiry(item.expiry_date)}` : ""}
            status={expiryStatus(item.expiry_date, today)}
          />
        </span>
      </span>
    </>
  );
}
