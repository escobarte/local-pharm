// Shared Tailwind class strings. Colors and radii come only from the design
// tokens in app/globals.css (docs/BRAND.md). Touch targets are ≥ 44 px.

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy";

export const inputClass =
  `min-h-12 w-full rounded-field border border-border bg-surface px-3.5 text-[15px] font-medium text-navy placeholder:text-muted disabled:bg-tint disabled:text-muted ${focusRing}`;

// ---- Buttons (docs/BRAND.md, section "Кнопки") ----
// Roles: add (accent) · primary (navy, one per block) · secondary (border) ·
// warn (toggled "Заканчивается") · text (tertiary) · danger (red text, no fill) ·
// nav link (text + arrow). Sizes: default min-h-13 (52 px), `Sm` min-h-11 (44 px).
// Width is never part of these strings (see GOTCHAS: w-full vs w-auto).

const buttonBase = `flex items-center justify-center gap-2 rounded-button px-4 text-[15px] font-semibold no-underline disabled:cursor-not-allowed ${focusRing}`;
// Text buttons (tertiary, danger) are quieter: smaller type, tighter padding, field radius.
const textBase = `flex min-h-11 items-center justify-center gap-2 rounded-field px-2 text-[13px] font-semibold no-underline disabled:cursor-not-allowed ${focusRing}`;
const sizeMd = "min-h-13";
const sizeSm = "min-h-11 text-sm";

const addTone = "bg-accent text-navy hover:bg-accent/85 disabled:opacity-60";
const primaryTone = "bg-navy text-white hover:bg-navy/90 disabled:opacity-60";
const secondaryTone =
  "border border-border bg-surface text-navy hover:bg-tint disabled:text-muted";
const lowTone =
  "border border-low-fg bg-low-bg text-low-fg hover:bg-low-bg/70 disabled:opacity-60";
const textTone = "text-navy hover:bg-tint disabled:text-muted";
const dangerTextTone = "text-danger-fg hover:bg-danger-bg disabled:opacity-60";

/** Adding and creating: "Добавить…", "Новая коробка", "+ Отсек", "Сохранить" in add forms. */
export const addButtonClass = `${buttonBase} ${sizeMd} ${addTone}`;
export const addButtonSmClass = `${buttonBase} ${sizeSm} ${addTone}`;

/** The main action over a pack ("Взял 1 шт."). At most one per block. */
export const primaryButtonClass = `${buttonBase} ${sizeMd} ${primaryTone}`;
export const primaryButtonSmClass = `${buttonBase} ${sizeSm} ${primaryTone}`;

/** Secondary: white with a border ("Печать QR", "Сканировать QR", "Отмена"). */
export const secondaryButtonClass = `${buttonBase} ${sizeMd} ${secondaryTone}`;
export const secondaryButtonSmClass = `${buttonBase} ${sizeSm} ${secondaryTone}`;

/** "Заканчивается ✓": the toggle in its switched-on state (mustard, like the "Мало" badge). */
export const lowStockButtonSmClass = `${buttonBase} ${sizeSm} ${lowTone}`;

/** Tertiary text button ("Переложить"). */
export const textButtonClass = `${textBase} ${textTone}`;

/** Dangerous action that opens a confirmation: red text, no fill. */
export const dangerTextButtonClass = `${textBase} ${dangerTextTone}`;

/** Filled red: only the final "yes, delete" inside a confirmation dialog. */
export const dangerButtonClass = `${buttonBase} ${sizeMd} bg-danger-fg text-white hover:bg-danger-fg/90 disabled:opacity-60`;

/** Navigation ("Открыть", "Открыть карточку"): a text link with an arrow icon, not a button. */
export const navLinkClass = `-mx-2 inline-flex min-h-11 items-center gap-1.5 rounded-field px-2 text-[13px] font-semibold text-navy no-underline hover:bg-tint ${focusRing}`;

export const sectionTitleClass =
  "text-xs font-semibold tracking-[0.8px] text-muted uppercase";

export const iconButtonClass =
  `flex size-11 items-center justify-center rounded-field text-navy hover:bg-tint ${focusRing}`;

/** Small source tag ("Реестр AMDM", "Вручную", "Международные базы"): soft beige, black text. Same for every source. */
export const sourceTagClass =
  "flex-none rounded-tag bg-tag-bg px-2 py-1 text-[11px] leading-none font-semibold text-ink";

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

/** Submit button inside `formFooterClass`: accent, natural width on desktop. */
export const formSubmitClass = `${addButtonClass} w-full lg:w-auto lg:min-w-56 lg:px-10`;

/** Same footer button for a form whose main action is not "adding" (e.g. "Переложить"). */
export const formPrimarySubmitClass = `${primaryButtonClass} w-full lg:w-auto lg:min-w-56 lg:px-10`;

/** Quiet "Удалить …" link at the bottom of a block: red text, no fill, opens a confirmation. */
export const dangerLinkClass = `-mx-2 inline-flex min-h-11 items-center self-start rounded-field px-2 text-[13px] font-semibold text-danger-fg underline hover:bg-danger-bg ${focusRing}`;

/** Icon-only "remove from the list" button (shopping list rows): quiet, turns red on hover. */
export const removeIconButtonClass = `flex size-11 flex-none items-center justify-center rounded-field text-muted hover:bg-danger-bg hover:text-danger-fg disabled:opacity-60 ${focusRing}`;
