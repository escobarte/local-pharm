// Box colors are stored as a key in boxes.color and mapped to design tokens
// (docs/BRAND.md). Only token pairs with text contrast ≥ 4.5:1 are offered.
// Class names are written out in full so Tailwind can see them.

export const BOX_COLORS = [
  { key: "navy", label: "Тёмно-синий", classes: "bg-navy text-white" },
  { key: "accent", label: "Бирюзовый", classes: "bg-accent text-navy" },
  { key: "muted", label: "Серо-синий", classes: "bg-muted text-white" },
  { key: "tint", label: "Светлый", classes: "bg-tint text-navy border border-border" },
] as const;

export type BoxColorKey = (typeof BOX_COLORS)[number]["key"];

export const DEFAULT_BOX_COLOR: BoxColorKey = "navy";

export function isBoxColor(value: unknown): value is BoxColorKey {
  return BOX_COLORS.some((c) => c.key === value);
}

/** Unknown / null values (e.g. typed by hand in SQL) fall back to the default. */
export function boxColorClasses(value: string | null | undefined): string {
  const found = BOX_COLORS.find((c) => c.key === value);
  return (found ?? BOX_COLORS[0]).classes;
}
