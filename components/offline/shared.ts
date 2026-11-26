import type { OfflineView } from "@/lib/offline/view";

/** Moves between the views of the offline page. */
export type Go = (view: Partial<OfflineView>, options?: { replace?: boolean }) => void;

export const noteClass =
  "rounded-card border border-dashed border-border px-4 py-5 text-[13px] leading-normal text-muted";

export const tabClass =
  "flex min-h-11 items-center justify-center rounded-field px-1 text-sm leading-tight font-semibold text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy";

export const backClass =
  "-ml-2 flex min-h-11 items-center gap-1.5 self-start rounded-field px-2 text-sm font-semibold hover:bg-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy lg:hidden";

export const panelClass =
  "flex-col gap-5 lg:flex lg:rounded-card lg:border lg:border-border lg:bg-surface lg:p-6";
