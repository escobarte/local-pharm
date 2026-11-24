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

const chipBase =
  "inline-flex flex-none items-center rounded-tag px-2 py-1 text-xs leading-none font-semibold whitespace-nowrap";

/** Quantity chip: "5 шт.". */
export function QuantityChip({ text }: { text: string }) {
  return <span className={`${chipBase} bg-tint text-navy`}>{text}</span>;
}

/** Pack count chip: "2 упак.". */
export function CountChip({ text, className = "" }: { text: string; className?: string }) {
  return <span className={`${chipBase} bg-tint text-navy ${className}`}>{text}</span>;
}

const EXPIRY_CHIP: Record<ExpiryStatus, string> = {
  none: "",
  ok: "border border-border bg-surface text-navy",
  soon: "bg-warn-bg text-warn-fg",
  expired: "bg-danger-bg text-danger-fg",
};

const EXPIRY_HIDDEN_WORD: Partial<Record<ExpiryStatus, string>> = {
  soon: "Истекает, ",
  expired: "Просрочено, ",
};

/**
 * Expiry chip: "до 05/2027". Warn colors when it expires within 30 days, danger
 * colors when it is over; no date → nothing. The status is also spelled out for
 * screen readers (color alone is not enough).
 */
export function ExpiryChip({ text, status }: { text: string; status: ExpiryStatus }) {
  if (status === "none" || !text) return null;
  return (
    <span className={`${chipBase} ${EXPIRY_CHIP[status]}`}>
      {EXPIRY_HIDDEN_WORD[status] ? <span className="sr-only">{EXPIRY_HIDDEN_WORD[status]}</span> : null}
      {text}
    </span>
  );
}
