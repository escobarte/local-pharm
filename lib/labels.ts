// Sticker sheet layout for /storage/labels. Pure: the print page renders
// exactly these numbers, unit tests check that every sticker fits its page.
//
// Grids follow the common A4 sticker sheets, so the same layout works on
// plain paper (cut along the outlines) and on pre-cut sheets:
//   large — 6 per sheet, 2 × 3, 99.1 × 93.1 mm (Avery L7166 and clones);
//   small — 21 per sheet, 3 × 7, 63.5 × 38.1 mm (Avery L7160 and clones).
// All sizes are millimetres.

export const PAGE_MM = { width: 210, height: 297 } as const;

export type LabelSize = "large" | "small";

export type SheetLayout = {
  size: LabelSize;
  cols: number;
  rows: number;
  perPage: number;
  label: { width: number; height: number };
  margin: { top: number; left: number };
  gap: { x: number; y: number };
  /** Inner padding of a sticker and the side of its QR code. */
  padding: number;
  qr: number;
};

const SHEETS: Record<LabelSize, Omit<SheetLayout, "perPage">> = {
  large: {
    size: "large",
    cols: 2,
    rows: 3,
    label: { width: 99.1, height: 93.1 },
    margin: { top: 8.85, left: 4.65 },
    gap: { x: 2.5, y: 0 },
    padding: 5,
    qr: 58,
  },
  small: {
    size: "small",
    cols: 3,
    rows: 7,
    label: { width: 63.5, height: 38.1 },
    margin: { top: 15.15, left: 7.2 },
    gap: { x: 2.54, y: 0 },
    padding: 3,
    qr: 32,
  },
};

export const LABEL_SIZES: readonly LabelSize[] = ["large", "small"];

export function sheetLayout(size: LabelSize): SheetLayout {
  const s = SHEETS[size];
  return { ...s, perPage: s.cols * s.rows };
}

/** `?size=` → size; anything unknown is "large" (the default). */
export function parseLabelSize(raw: unknown): LabelSize {
  return raw === "small" ? "small" : "large";
}

/** Splits items into sheets of `perPage`. Empty input → no sheets. */
export function paginate<T>(items: readonly T[], perPage: number): T[][] {
  if (!Number.isInteger(perPage) || perPage < 1) throw new Error("perPage must be a positive integer");
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += perPage) pages.push(items.slice(i, i + perPage));
  return pages;
}

export function pageCount(itemCount: number, perPage: number): number {
  return itemCount <= 0 ? 0 : Math.ceil(itemCount / perPage);
}

export type LabelBox = { x: number; y: number; width: number; height: number };

/** Position of the n-th sticker on its sheet (row by row, left to right). */
export function labelBox(layout: SheetLayout, indexOnPage: number): LabelBox {
  if (!Number.isInteger(indexOnPage) || indexOnPage < 0 || indexOnPage >= layout.perPage) {
    throw new Error(`index ${indexOnPage} is outside the sheet`);
  }
  const col = indexOnPage % layout.cols;
  const row = Math.floor(indexOnPage / layout.cols);
  return {
    x: round(layout.margin.left + col * (layout.label.width + layout.gap.x)),
    y: round(layout.margin.top + row * (layout.label.height + layout.gap.y)),
    width: layout.label.width,
    height: layout.label.height,
  };
}

const round = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Millimetres → a CSS length relative to the sheet width (`cqw` of the
 * sheet container). On paper the sheet is 210 mm wide, so 1 mm is exactly
 * 1 mm; on screen the same markup is a scaled preview.
 */
export function mmToCqw(mm: number): string {
  return `${round((mm / PAGE_MM.width) * 100)}cqw`;
}

/** Font size of the box number: shorter numbers are bigger (number is up to 6 chars). */
export function numberFontMm(size: LabelSize, length: number): number {
  const steps = size === "large" ? [16, 12, 9] : [9, 7, 5];
  return length <= 2 ? steps[0] : length <= 4 ? steps[1] : steps[2];
}
