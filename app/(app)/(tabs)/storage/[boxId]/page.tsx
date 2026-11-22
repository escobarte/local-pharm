import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddCompartmentForm } from "@/components/AddCompartmentForm";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { IconCheck, IconEdit, IconPill } from "@/components/icons";
import { ScreenHeader } from "@/components/ScreenHeader";
import {
  iconButtonClass,
  primaryButtonClass,
  secondaryButtonClass,
  sectionTitleClass,
  successBoxClass,
} from "@/components/ui";
import { expiryStatus, formatExpiry, todayIso, type ExpiryStatus } from "@/lib/dates";
import { compartmentsLabel, packsLabel, packsShort } from "@/lib/format";
import { deleteCompartment } from "@/lib/storage/actions";
import { boxColorClasses } from "@/lib/storage/box-colors";
import { getBox, getBoxDetail } from "@/lib/storage/queries";
import { isUuid } from "@/lib/storage/validation";

type Props = {
  params: Promise<{ boxId: string }>;
  searchParams: Promise<{ cell?: string; added?: string }>;
};

export const metadata: Metadata = { title: "Коробка — Local Pharm" };

const BADGES: Record<Exclude<ExpiryStatus, "none" | "ok">, { label: string; classes: string }> = {
  expired: { label: "Просрочено", classes: "bg-danger-bg text-danger-fg" },
  soon: { label: "Истекает", classes: "bg-warn-bg text-warn-fg" },
};

export default async function BoxPage({ params, searchParams }: Props) {
  const { boxId } = await params;
  const { cell, added } = await searchParams;

  const box = await getBox(boxId);
  if (!box) notFound();

  const detail = await getBoxDetail(box.id, isUuid(cell) ? cell : null);
  const today = todayIso();
  const subtitle = [box.number ? `№${box.number}` : null, box.locationName, detail.categories]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <ScreenHeader
        title="Коробка"
        backHref="/storage"
        backLabel="Назад к хранению"
        right={
          <Link href={`/storage/${box.id}/edit`} aria-label="Изменить коробку" className={iconButtonClass}>
            <IconEdit size={22} />
          </Link>
        }
      />
      <main className="flex flex-col gap-5 px-5 pt-1 pb-6">
        {added && detail.selectedCode ? (
          <p role="status" className={successBoxClass}>
            <IconCheck size={18} strokeWidth={2.2} />
            Препарат добавлен в отсек {detail.selectedCode}.
          </p>
        ) : null}

        <div className="flex items-center gap-3.5">
          <span
            className={`flex size-14 flex-none items-center justify-center rounded-card text-[22px] font-bold ${boxColorClasses(box.color)}`}
          >
            {box.number ?? "•"}
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <h1 className="text-2xl leading-tight font-bold break-words">{box.name}</h1>
            <p className="text-sm text-muted">{subtitle}</p>
          </div>
        </div>

        <section aria-labelledby="cells-title" className="flex flex-col gap-2">
          <h2 id="cells-title" className={sectionTitleClass}>
            Отсеки{detail.cells.length > 0 ? ` · ${compartmentsLabel(detail.cells.length)}` : ""}
          </h2>
          {detail.cells.length === 0 ? (
            <p className="rounded-card border border-dashed border-border px-4 py-5 text-[13px] text-muted">
              В этой коробке пока нет отсеков. Добавьте первый ниже.
            </p>
          ) : (
            <ul className="grid grid-cols-3 gap-1.5 rounded-card border-2 border-navy bg-surface p-2">
              {detail.cells.map((c) => {
                const selected = c.id === detail.selectedId;
                return (
                  <li key={c.id}>
                    <Link
                      href={`/storage/${box.id}?cell=${c.id}`}
                      replace
                      scroll={false}
                      aria-current={selected ? "true" : undefined}
                      className={`flex min-h-16 flex-col items-start gap-1 rounded-field p-2.5 text-left no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy ${
                        selected ? "bg-navy text-white" : "bg-tint text-navy hover:bg-border"
                      }`}
                    >
                      <span className="text-[15px] font-bold">{c.code}</span>
                      <span className="text-xs">{packsShort(c.packCount)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {detail.selectedId ? (
          <section aria-labelledby="items-title" className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <h2 id="items-title" className={sectionTitleClass}>
                Отсек {detail.selectedCode}
                {detail.items.length > 0 ? ` · ${packsLabel(detail.items.length)}` : ""}
              </h2>
              <ConfirmDialog
                triggerLabel="Удалить отсек"
                triggerClassName="min-h-11 rounded-field px-3 text-[13px] font-semibold text-danger-fg hover:bg-danger-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
                title={`Удалить отсек ${detail.selectedCode}?`}
                description="Отсек исчезнет из схемы коробки. Удалить можно только пустой отсек."
                confirmLabel="Удалить отсек"
                action={deleteCompartment}
                fields={{ boxId: box.id, compartmentId: detail.selectedId }}
              />
            </div>

            {detail.items.length === 0 ? (
              <p className="rounded-card bg-surface px-4 py-5 text-[13px] text-muted">
                В этом отсеке пока ничего нет.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {detail.items.map((item) => {
                  const status = expiryStatus(item.expiry_date, today);
                  const badge = status === "expired" || status === "soon" ? BADGES[status] : null;
                  const meta = [
                    item.activeIngredient,
                    item.form,
                    item.dosage,
                    `${item.quantity} шт.`,
                    item.expiry_date ? `до ${formatExpiry(item.expiry_date)}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <li
                      key={item.id}
                      className="flex items-center gap-3 rounded-button bg-surface px-3.5 py-3"
                    >
                      <span className="flex size-10 flex-none items-center justify-center rounded-field bg-tint text-navy">
                        <IconPill size={20} />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="text-[15px] font-semibold break-words">
                          {item.medicationName}
                        </span>
                        <span className="text-xs leading-snug text-muted">{meta}</span>
                      </span>
                      {badge ? (
                        <span
                          className={`flex-none rounded-tag px-2 py-1 text-[11px] font-semibold ${badge.classes}`}
                        >
                          {badge.label}
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ) : null}

        <div className="flex gap-2">
          {detail.selectedId ? (
            <Link
              href={`/add?box=${box.id}&cell=${detail.selectedId}`}
              className={`${primaryButtonClass} flex-1 text-sm no-underline`}
            >
              Добавить сюда
            </Link>
          ) : null}
          <button
            type="button"
            disabled
            aria-describedby="qr-soon"
            className={`${secondaryButtonClass} flex-1 flex-col text-sm leading-tight`}
          >
            Печать QR
            <span id="qr-soon" className="text-[11px] font-medium">
              скоро
            </span>
          </button>
        </div>

        <section
          aria-labelledby="new-cell-title"
          className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4"
        >
          <h2 id="new-cell-title" className={sectionTitleClass}>
            Новый отсек
          </h2>
          <AddCompartmentForm boxId={box.id} />
        </section>
      </main>
    </>
  );
}
