"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { getSiteUrlOverride } from "@/lib/env";
import { numberFontMm, LABEL_SIZES, labelBox, mmToCqw, pageCount, paginate, sheetLayout, type LabelSize, type SheetLayout } from "@/lib/labels";
import { boxQrUrl, qrOrigin } from "@/lib/qr";
import type { LabelBoxRow } from "@/lib/storage/queries";
import { IconPrint } from "./icons";
import { QrCode } from "./QrCode";
import { primaryButtonClass, secondaryButtonClass, sectionTitleClass } from "./ui";

// Sticker sheet: settings on the left (screen only), A4 sheets on the right.
// The sheets are one markup for both the on-screen preview and the paper:
// every size is in `cqw` of the sheet (lib/labels.ts → mmToCqw), and in print
// the sheet is exactly 210 × 297 mm. The QR code is built here, in the
// browser, for window.location.origin (or NEXT_PUBLIC_SITE_URL).

const SIZE_TEXT: Record<LabelSize, { title: string; count: string; dims: string }> = {
  large: { title: "Крупные", count: "6 на листе A4", dims: "99 × 93 мм" },
  small: { title: "Мелкие", count: "21 на листе A4", dims: "63,5 × 38 мм" },
};

const noop = () => () => {};
const browserOrigin = () => window.location.origin;
const serverOrigin = () => null;

function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

type Props = {
  boxes: LabelBoxRow[];
  initialSelected: string[];
  initialSize: LabelSize;
};

export function LabelSheet({ boxes, initialSelected, initialSize }: Props) {
  const [size, setSize] = useState<LabelSize>(initialSize);
  const [selected, setSelected] = useState(() => new Set(initialSelected));
  // null during server rendering: the QR codes appear after hydration.
  const currentOrigin = useSyncExternalStore(noop, browserOrigin, serverOrigin);
  const origin = currentOrigin ? qrOrigin(getSiteUrlOverride(), currentOrigin) : null;

  const layout = sheetLayout(size);
  const chosen = useMemo(() => boxes.filter((b) => selected.has(b.id)), [boxes, selected]);
  const pages = paginate(chosen, layout.perPage);
  const sheets = pageCount(chosen.length, layout.perPage);

  const toggle = (id: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const summary =
    chosen.length === 0
      ? "Ничего не выбрано"
      : `${chosen.length} ${plural(chosen.length, "наклейка", "наклейки", "наклеек")} · ${sheets} ${plural(sheets, "лист", "листа", "листов")} A4`;

  const printButton = (extra: string) => (
    <button
      type="button"
      onClick={() => window.print()}
      disabled={chosen.length === 0 || !origin}
      className={`${primaryButtonClass} ${extra}`}
    >
      <IconPrint size={20} />
      Печать
    </button>
  );

  return (
    <div className="flex flex-1 flex-col lg:grid lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start lg:gap-8 print:block">
      {/* Paper: A4 without browser margins; the sheet itself holds the margins. */}
      <style>{"@page { size: A4 portrait; margin: 0; }"}</style>

      <div className="flex flex-col gap-5 px-5 pb-5 lg:sticky lg:top-8 lg:px-0 lg:pb-0 print:hidden">
        <fieldset className="flex flex-col gap-2">
          <legend className={`${sectionTitleClass} mb-2`}>Размер наклеек</legend>
          <div className="grid grid-cols-2 gap-2">
            {LABEL_SIZES.map((s) => (
              <label
                key={s}
                className="flex min-h-13 cursor-pointer items-start gap-2.5 rounded-field border border-border bg-surface p-3 has-checked:border-navy has-checked:ring-1 has-checked:ring-navy has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-navy"
              >
                <input
                  type="radio"
                  name="size"
                  value={s}
                  checked={size === s}
                  onChange={() => setSize(s)}
                  className="mt-0.5 size-5 flex-none accent-accent"
                />
                <span className="flex flex-col gap-0.5">
                  <span className="text-[15px] font-semibold">{SIZE_TEXT[s].title}</span>
                  <span className="text-xs leading-snug text-muted">
                    {SIZE_TEXT[s].count}
                    <br />
                    {SIZE_TEXT[s].dims}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className={`${sectionTitleClass} mb-2`}>
            Коробки · выбрано {chosen.length} из {boxes.length}
          </legend>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSelected(new Set(boxes.map((b) => b.id)))}
              className={`${secondaryButtonClass} min-h-11 text-sm`}
            >
              Выбрать все
            </button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className={`${secondaryButtonClass} min-h-11 text-sm`}
            >
              Снять все
            </button>
          </div>
          <ul className="flex flex-col gap-1.5">
            {boxes.map((b) => (
              <li key={b.id}>
                <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-field bg-surface px-3 py-2 hover:bg-tint has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-navy">
                  <input
                    type="checkbox"
                    checked={selected.has(b.id)}
                    onChange={(e) => toggle(b.id, e.target.checked)}
                    className="size-5 flex-none accent-accent"
                  />
                  <span className="flex min-w-0 flex-col">
                    <span className="text-[15px] font-semibold break-words">
                      {b.number ? `${b.number} · ` : ""}
                      {b.name}
                    </span>
                    <span className="text-xs text-muted">{b.locationName}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>

        <div className="hidden flex-col gap-3 lg:flex">
          <p role="status" className="text-sm font-semibold">
            {summary}
          </p>
          {printButton("")}
        </div>
        <p className="text-xs leading-normal text-muted">
          В окне печати: бумага A4, масштаб 100 % (не «по размеру страницы»), поля — по умолчанию или
          «нет». Подходит обычная бумага (вырезать по контуру) и листы наклеек такого же формата.
        </p>
      </div>

      <section
        aria-label="Предпросмотр листов"
        className="flex flex-col items-center gap-4 px-5 pb-6 lg:items-stretch lg:px-0 lg:pb-0 print:block print:p-0"
      >
        {pages.length === 0 ? (
          <p className="w-full rounded-card border border-dashed border-border px-4 py-8 text-center text-[13px] text-muted print:hidden">
            Отметьте коробки, для которых нужны наклейки.
          </p>
        ) : (
          pages.map((page, p) => (
            <div
              key={p}
              role="group"
              aria-label={`Лист ${p + 1} из ${pages.length}`}
              data-sheet=""
              className="@container relative aspect-[210/297] w-full max-w-[640px] overflow-hidden bg-surface shadow-sm ring-1 ring-border print:aspect-auto print:h-[297mm] print:w-[210mm] print:max-w-none print:break-after-page print:shadow-none print:ring-0 print:last:break-after-auto"
            >
              {page.map((b, i) => (
                <Label key={b.id} box={b} layout={layout} index={i} origin={origin} />
              ))}
            </div>
          ))
        )}
      </section>

      {/* Mobile: the button stays at the bottom of the screen. */}
      <div className="sticky bottom-0 mt-auto flex flex-col gap-2 border-t border-tint bg-surface px-5 pt-3 pb-6 lg:hidden print:hidden">
        <p role="status" className="text-[13px] font-semibold">
          {summary}
        </p>
        {printButton("")}
      </div>
    </div>
  );
}

function Label({
  box,
  layout,
  index,
  origin,
}: {
  box: LabelBoxRow;
  layout: SheetLayout;
  index: number;
  origin: string | null;
}) {
  const pos = labelBox(layout, index);
  const large = layout.size === "large";
  const qrStyle = { width: mmToCqw(layout.qr), height: mmToCqw(layout.qr) };
  const qr = origin ? (
    <QrCode value={boxQrUrl(origin, box.qrToken)} quietZone={2} className="flex-none text-navy" style={qrStyle} />
  ) : (
    <span aria-hidden="true" className="flex-none bg-tint" style={qrStyle} />
  );
  const number = box.number ? (
    <span
      className="leading-none font-bold tracking-tight"
      style={{ fontSize: mmToCqw(numberFontMm(layout.size, box.number.length)) }}
    >
      {box.number}
    </span>
  ) : null;

  return (
    <div
      data-label=""
      className="absolute overflow-hidden border border-dashed border-border text-navy [break-inside:avoid]"
      style={{
        left: mmToCqw(pos.x),
        top: mmToCqw(pos.y),
        width: mmToCqw(pos.width),
        height: mmToCqw(pos.height),
        borderRadius: mmToCqw(2),
        padding: mmToCqw(layout.padding),
      }}
    >
      {large ? (
        <div className="flex h-full flex-col items-center justify-between" style={{ gap: mmToCqw(3) }}>
          <div className="flex w-full items-center" style={{ gap: mmToCqw(4) }}>
            {number}
            <span className="flex min-w-0 flex-col" style={{ gap: mmToCqw(1) }}>
              <span className="line-clamp-2 leading-tight font-bold break-words" style={{ fontSize: mmToCqw(5) }}>
                {box.name}
              </span>
              <span className="line-clamp-1 text-muted" style={{ fontSize: mmToCqw(3.6) }}>
                {box.locationName}
              </span>
            </span>
          </div>
          {qr}
        </div>
      ) : (
        <div className="flex h-full items-center" style={{ gap: mmToCqw(2.5) }}>
          {qr}
          <span className="flex min-w-0 flex-1 flex-col" style={{ gap: mmToCqw(1) }}>
            {number}
            <span className="line-clamp-3 leading-tight font-bold break-words" style={{ fontSize: mmToCqw(3.2) }}>
              {box.name}
            </span>
            <span className="line-clamp-1 text-muted" style={{ fontSize: mmToCqw(2.6) }}>
              {box.locationName}
            </span>
          </span>
        </div>
      )}
    </div>
  );
}
