import type { ReactNode } from "react";

// Category chips with counts, shared by the search screen (links) and the
// offline page (buttons).

const chipBase =
  "flex min-h-11 flex-none items-center gap-2 rounded-full px-4 text-sm font-semibold whitespace-nowrap no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy";

/** Chip look: selected = navy; a category with no medications at home is quieter but still works. */
export function chipClass(active: boolean, count: number): string {
  if (active) return `${chipBase} bg-navy text-white`;
  return count === 0
    ? `${chipBase} border border-border bg-surface text-muted hover:bg-tint`
    : `${chipBase} bg-tint text-navy hover:bg-border`;
}

/** The number inside a chip: a small badge, contrasting on the selected chip. */
export function CountBadge({ count, active }: { count: number; active: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs leading-none font-bold ${
        active ? "bg-accent text-navy" : count === 0 ? "bg-tint text-muted" : "bg-surface text-navy"
      }`}
    >
      {count}
    </span>
  );
}

/** Mobile: one swipeable row with no scrollbar and a soft fade on the right edge. */
export function ChipRow({ children }: { children: ReactNode }) {
  return (
    <nav aria-label="Категории" className="relative -mx-5 lg:mx-0">
      <ul className="no-scrollbar flex gap-2 overflow-x-auto px-5 lg:flex-wrap lg:overflow-visible lg:px-0">
        {children}
      </ul>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-linear-to-l from-bg to-transparent lg:hidden"
      />
    </nav>
  );
}
