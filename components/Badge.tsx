import type { ExpiryStatus } from "@/lib/dates";

const STATUS: Record<"expired" | "soon", { label: string; classes: string }> = {
  expired: { label: "Просрочено", classes: "bg-danger-bg text-danger-fg" },
  soon: { label: "Истекает", classes: "bg-warn-bg text-warn-fg" },
};

const base = "flex-none rounded-tag px-2 py-1 text-[11px] leading-none font-semibold";

/** Expiry badge; renders nothing for packs that are fine or have no date. */
export function ExpiryBadge({ status }: { status: ExpiryStatus }) {
  if (status !== "expired" && status !== "soon") return null;
  const { label, classes } = STATUS[status];
  return <span className={`${base} ${classes}`}>{label}</span>;
}

export function LowStockBadge() {
  return <span className={`${base} bg-tint text-navy`}>Мало</span>;
}
