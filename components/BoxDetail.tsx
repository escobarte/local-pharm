import Link from "next/link";
import { AddCompartmentForm } from "@/components/AddCompartmentForm";
import { BoxHeader, BoxItemBody, CellBody, boxItemClass, cellClass } from "@/components/BoxParts";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { IconCheck, IconEdit, IconPlus, IconPrint } from "@/components/icons";
import {
  addButtonClass,
  dangerLinkClass,
  iconButtonClass,
  secondaryButtonClass,
  sectionTitleClass,
  successBoxClass,
} from "@/components/ui";
import { todayIso } from "@/lib/dates";
import { compartmentsLabel, packsLabel } from "@/lib/format";
import { deleteCompartment } from "@/lib/storage/actions";
import type { getBox, getBoxDetail } from "@/lib/storage/queries";
import { compartmentColumns } from "@/lib/storage/summary";

type Box = NonNullable<Awaited<ReturnType<typeof getBox>>>;
type Detail = Awaited<ReturnType<typeof getBoxDetail>>;

type Props = {
  box: Box;
  detail: Detail;
  /** Show the "Препарат добавлен" notice (redirect from the Add screen). */
  added?: boolean;
  /** Link that selects a compartment (differs between the page and the desktop panel). */
  cellHref: (compartmentId: string) => string;
  /** Edit button next to the title (the page has it in its header instead). */
  showEdit?: boolean;
  /** The desktop panel sits under the page's own h1, so it uses h2. */
  as?: "h1" | "h2";
};

const section = "flex flex-col gap-3 border-t border-border pt-5";

/**
 * A box, in three blocks with dividers: header (plate, name, edit), the
 * compartment scheme, and the contents of the selected compartment with its
 * actions. Shared by /storage/[boxId] (mobile, QR) and the desktop
 * master-detail panel on /storage. "Печать QR" opens /storage/labels with
 * only this box selected.
 */
export function BoxDetail({ box, detail, added, cellHref, showEdit, as: Heading = "h1" }: Props) {
  const today = todayIso();
  const subtitle = [box.number ? `№${box.number}` : null, box.locationName, detail.categories]
    .filter(Boolean)
    .join(" · ");
  const hasItems = detail.items.length > 0;
  const addHref = detail.selectedId ? `/add?box=${box.id}&cell=${detail.selectedId}` : null;

  return (
    <div className="flex flex-col gap-5">
      {added && detail.selectedCode ? (
        <p role="status" className={successBoxClass}>
          <IconCheck size={18} strokeWidth={2.2} />
          Препарат добавлен в отсек {detail.selectedCode}.
        </p>
      ) : null}

      <BoxHeader box={box} subtitle={subtitle} as={Heading}>
        {showEdit ? (
          <Link href={`/storage/${box.id}/edit`} aria-label="Изменить коробку" className={iconButtonClass}>
            <IconEdit size={22} />
          </Link>
        ) : null}
      </BoxHeader>

      <section aria-labelledby="cells-title" className={section}>
        <h2 id="cells-title" className={sectionTitleClass}>
          Отсеки{detail.cells.length > 0 ? ` · ${compartmentsLabel(detail.cells.length)}` : ""}
        </h2>
        {detail.cells.length === 0 ? (
          <p className="rounded-card border border-dashed border-border px-4 py-5 text-[13px] text-muted">
            В этой коробке пока нет отсеков. Добавьте первый.
          </p>
        ) : (
          // One row, equal widths: 1 compartment = full width, 2 = halves, … up to 4 columns;
          // more wrap to the next row with the same cell width.
          <ul
            className="grid gap-2 rounded-card border border-border bg-surface p-2"
            style={{ gridTemplateColumns: `repeat(${compartmentColumns(detail.cells.length)}, minmax(0, 1fr))` }}
          >
            {detail.cells.map((c) => {
              const selected = c.id === detail.selectedId;
              return (
                <li key={c.id} className="min-w-0">
                  <Link
                    href={cellHref(c.id)}
                    replace
                    scroll={false}
                    aria-current={selected ? "true" : undefined}
                    className={cellClass(selected)}
                  >
                    <CellBody cell={c} selected={selected} />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        {/* Remounts when a compartment is added, so the form folds back to "+ Отсек". */}
        <AddCompartmentForm key={detail.cells.length} boxId={box.id} />
      </section>

      <section aria-labelledby="items-title" className={section}>
        <h2 id="items-title" className={sectionTitleClass}>
          {detail.selectedId
            ? `В отсеке ${detail.selectedCode}${hasItems ? ` · ${packsLabel(detail.items.length)}` : ""}`
            : "В коробке"}
        </h2>

        {!detail.selectedId ? (
          <p className="rounded-card border border-dashed border-border px-4 py-5 text-[13px] text-muted">
            Сначала добавьте отсек, потом в него можно класть упаковки.
          </p>
        ) : hasItems ? (
          <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
            {detail.items.map((item) => (
              <li key={item.id}>
                <Link href={`/medications/${item.medicationId}`} className={boxItemClass}>
                  <BoxItemBody item={item} today={today} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-border bg-surface px-4 py-6 text-center">
            <div className="flex flex-col gap-1">
              <p className="text-[15px] font-semibold">В этом отсеке пока ничего нет</p>
              <p className="text-[13px] text-muted">Положите сюда первую упаковку.</p>
            </div>
            {addHref ? (
              <Link href={addHref} className={`${addButtonClass} w-full lg:w-auto lg:px-8`}>
                <IconPlus size={20} strokeWidth={2.2} />
                Добавить сюда
              </Link>
            ) : null}
          </div>
        )}

        <div className="flex gap-2">
          {addHref && hasItems ? (
            <Link href={addHref} className={`${addButtonClass} flex-1`}>
              <IconPlus size={20} strokeWidth={2.2} />
              Добавить сюда
            </Link>
          ) : null}
          <Link
            href={`/storage/labels?box=${box.id}`}
            className={`${secondaryButtonClass} ${addHref && hasItems ? "" : "flex-1"}`}
          >
            <IconPrint size={20} />
            Печать QR
          </Link>
        </div>

        {detail.selectedId ? (
          <ConfirmDialog
            triggerLabel="Удалить отсек"
            triggerClassName={dangerLinkClass}
            title={`Удалить отсек ${detail.selectedCode}?`}
            description="Отсек исчезнет из схемы коробки. Удалить можно только пустой отсек."
            confirmLabel="Удалить отсек"
            action={deleteCompartment}
            fields={{ boxId: box.id, compartmentId: detail.selectedId }}
          />
        ) : null}
      </section>
    </div>
  );
}
