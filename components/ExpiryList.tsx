import { formatExpiry } from "@/lib/dates";
import { pcsLabel } from "@/lib/format";
import { reasonForGroup, type ExpiryGroup, type ExpiryGroupKey } from "@/lib/expiry/group";
import type { ExpiryItem } from "@/lib/expiry/queries";
import { deletePack } from "@/lib/medications/actions";
import { placeLabel } from "@/lib/medications/search";
import { AddToShoppingButton } from "./AddToShoppingButton";
import { ExpiryChip, QuantityChip } from "./Badge";
import { ConfirmDialog } from "./ConfirmDialog";
import { FormPlate } from "./FormIcon";
import { IconStorage } from "./icons";
import { dangerTextButtonClass } from "./ui";

type Props = {
  groups: ExpiryGroup<ExpiryItem>[];
  /** Medications that already have an open shopping item. */
  inList: ReadonlySet<string>;
};

const GROUPS: Record<ExpiryGroupKey, { title: string; dot: string; status: "expired" | "soon" | "ok" }> = {
  expired: { title: "Просрочено", dot: "bg-danger-fg", status: "expired" },
  soon: { title: "Истекает в 30 дней", dot: "bg-warn-dot", status: "soon" },
  later: { title: "В ближайшие 90 дней", dot: "bg-muted", status: "ok" },
};

// Desktop: the rows line up as a table (icon + Препарат / Место / Годен до / Действие).
// Below `xl` the chip and action columns are narrow (both stack), so names and places get the room.
const ROW_GRID =
  "lg:grid lg:grid-cols-[2.25rem_minmax(0,2fr)_minmax(0,1.6fr)_6.5rem_9rem] lg:items-center lg:gap-4 xl:grid-cols-[2.25rem_minmax(0,2fr)_minmax(0,1.6fr)_9.5rem_15.75rem]";

/**
 * Expired and expiring packs in three groups. Mobile: one card per pack. From lg:
 * a table. The same markup serves both (no duplicated forms or dialogs).
 */
export function ExpiryList({ groups, inList }: Props) {
  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      <div
        aria-hidden="true"
        className={`hidden px-5 text-xs font-semibold tracking-[0.8px] text-muted uppercase ${ROW_GRID}`}
      >
        <span className="col-span-2">Препарат</span>
        <span>Место</span>
        <span>Годен до</span>
        <span className="text-right">Действие</span>
      </div>

      {groups.map((group) => {
        const meta = GROUPS[group.key];
        const titleId = `expiry-${group.key}`;
        return (
          <section
            key={group.key}
            aria-labelledby={titleId}
            className="flex flex-col gap-2.5 lg:gap-0 lg:overflow-hidden lg:rounded-card lg:border lg:border-border lg:bg-surface"
          >
            <h2
              id={titleId}
              className="flex items-center gap-2 text-[15px] font-bold lg:bg-tint lg:px-5 lg:py-3"
            >
              <span aria-hidden="true" className={`size-2.5 flex-none rounded-full ${meta.dot}`} />
              {meta.title} · {group.items.length}
            </h2>
            <ul className="flex flex-col gap-2.5 lg:gap-0 lg:divide-y lg:divide-tint">
              {group.items.map((item) => (
                <ExpiryRow
                  key={item.packId}
                  item={item}
                  groupKey={group.key}
                  status={meta.status}
                  inList={inList.has(item.medicationId)}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function ExpiryRow({
  item,
  groupKey,
  status,
  inList,
}: {
  item: ExpiryItem;
  groupKey: ExpiryGroupKey;
  status: "expired" | "soon" | "ok";
  inList: boolean;
}) {
  const place = item.place ? placeLabel(item.place) : "Место не найдено";
  const expiry = item.expiryDate ? formatExpiry(item.expiryDate) : "";

  return (
    <li
      className={`flex flex-col gap-3 rounded-card border border-border bg-surface p-4 lg:rounded-none lg:border-0 lg:bg-transparent lg:px-5 lg:py-3.5 ${ROW_GRID}`}
    >
      {/* Mobile: the icon stands beside the name, the place keeps the full width below.
          Desktop: the wrapper dissolves, and icon, name and place become table cells. */}
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2.5 gap-y-3 lg:contents">
        <FormPlate form={item.form} />
        <p className="text-base leading-snug font-bold break-words">{item.title}</p>

        <p className="col-span-2 flex items-start gap-2 text-[13px] leading-snug text-muted lg:col-span-1">
          <IconStorage size={16} className="mt-px flex-none text-box-icon" />
          <span className="min-w-0 break-words">{place}</span>
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <ExpiryChip text={`до ${expiry}`} status={status} />
        <QuantityChip text={pcsLabel(item.quantity)} />
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-1 xl:flex xl:justify-end">
        <AddToShoppingButton
          medicationId={item.medicationId}
          reason={reasonForGroup(groupKey)}
          inList={inList}
          className="xl:w-36"
        />
        <ConfirmDialog
          triggerLabel="Выбросил"
          triggerClassName={`${dangerTextButtonClass} w-full xl:w-auto xl:px-4`}
          title="Выбросить упаковку?"
          description={`${item.title}, ${place}, ${pcsLabel(item.quantity)}: упаковка будет удалена из базы, отменить нельзя. Препарат останется.`}
          confirmLabel="Выбросил"
          action={deletePack}
          fields={{ packId: item.packId, medicationId: item.medicationId, returnTo: "/expiry" }}
        />
      </div>
    </li>
  );
}
