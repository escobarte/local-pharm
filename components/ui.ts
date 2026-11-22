// Shared Tailwind class strings. Colors and radii come only from the design
// tokens in app/globals.css (docs/BRAND.md). Touch targets are ≥ 44 px.

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy";

export const inputClass =
  `min-h-12 w-full rounded-field border border-border bg-surface px-3.5 text-[15px] font-normal text-navy placeholder:text-muted disabled:bg-tint disabled:text-muted ${focusRing}`;

export const primaryButtonClass =
  `flex min-h-13 items-center justify-center rounded-button bg-navy px-4 text-[15px] font-semibold text-white hover:bg-navy/90 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`;

export const secondaryButtonClass =
  `flex min-h-13 items-center justify-center rounded-button border border-border bg-surface px-4 text-[15px] font-semibold text-navy hover:bg-tint disabled:cursor-not-allowed disabled:text-muted ${focusRing}`;

export const dangerButtonClass =
  `flex min-h-13 items-center justify-center rounded-button bg-danger-fg px-4 text-[15px] font-semibold text-white hover:bg-danger-fg/90 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`;

export const dangerOutlineButtonClass =
  `flex min-h-13 items-center justify-center rounded-button border border-danger-fg bg-surface px-4 text-[15px] font-semibold text-danger-fg hover:bg-danger-bg ${focusRing}`;

export const warnButtonClass =
  `flex min-h-13 items-center justify-center rounded-button border border-warn-fg bg-warn-bg px-4 text-[15px] font-semibold text-warn-fg hover:bg-warn-bg/70 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`;

export const dashedButtonClass =
  `flex min-h-13 items-center justify-center gap-2 rounded-button border border-dashed border-muted bg-transparent px-4 text-sm font-semibold text-navy hover:bg-tint ${focusRing}`;

export const sectionTitleClass =
  "text-xs font-semibold tracking-[0.8px] text-muted uppercase";

export const iconButtonClass =
  `flex size-11 items-center justify-center rounded-field text-navy hover:bg-tint ${focusRing}`;

export const errorBoxClass =
  "rounded-field bg-danger-bg px-4 py-3 text-[13px] leading-normal text-danger-fg";

export const successBoxClass =
  "flex items-center gap-2 rounded-field bg-tint px-4 py-3 text-[13px] leading-normal font-semibold text-navy";

/**
 * Bottom bar with the submit button of long forms. Sticky on mobile; on
 * desktop it is a plain row under the form, button on the right.
 */
export const formFooterClass =
  "sticky bottom-0 border-t border-tint bg-surface px-5 pt-3 pb-6 lg:static lg:flex lg:justify-end lg:border-0 lg:bg-transparent lg:px-0 lg:pt-5 lg:pb-0";

/** Submit button inside `formFooterClass`: natural width on desktop. */
export const formSubmitClass = `${primaryButtonClass} lg:min-w-56 lg:px-10`;
