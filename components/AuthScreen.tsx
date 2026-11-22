import type { ReactNode } from "react";

function PillIcon() {
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="8" width="18" height="8" rx="4" transform="rotate(-45 12 12)" />
      <path d="M9.2 9.2l5.6 5.6" />
    </svg>
  );
}

type AuthScreenProps = {
  title: string;
  description: ReactNode;
  /** Bottom block: actions and hints. */
  children?: ReactNode;
};

/**
 * Full-height navy screen from docs/mockups/Main-v3.dc.html. From lg it splits
 * in two halves (docs/mockups/Main-desk.dc.html): brand on navy at the left,
 * actions in a card on the light background at the right.
 */
export function AuthScreen({ title, description, children }: AuthScreenProps) {
  return (
    <main className="flex min-h-dvh flex-col justify-between gap-12 bg-navy px-7 pt-24 pb-12 text-white lg:grid lg:grid-cols-2 lg:gap-0 lg:p-0">
      <div className="flex flex-col items-start gap-6 lg:justify-center lg:gap-7 lg:px-20 lg:py-24">
        <div className="flex size-18 items-center justify-center rounded-logo bg-accent text-navy lg:size-20">
          <PillIcon />
        </div>
        <h1 className="text-[40px] leading-[1.1] font-bold tracking-[-0.5px] lg:text-[56px] lg:tracking-[-1px]">
          {title}
        </h1>
        <div className="max-w-75 text-[17px] leading-normal lg:max-w-105 lg:text-xl">{description}</div>
      </div>
      {children ? (
        <div className="lg:flex lg:items-center lg:justify-center lg:bg-bg lg:px-10 lg:py-16">
          <div className="flex flex-col gap-4 lg:w-full lg:max-w-105 lg:gap-5 lg:rounded-card lg:border lg:border-border lg:bg-surface lg:p-9 lg:text-navy">
            {children}
          </div>
        </div>
      ) : null}
    </main>
  );
}

/** Primary action on navy: white surface, navy text (BRAND.md contrast rules). */
export const primaryOnNavyClass =
  "flex min-h-14 w-full items-center justify-center gap-3 rounded-button bg-surface px-4 text-base font-semibold text-navy no-underline hover:bg-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-80 lg:border lg:border-border lg:focus-visible:outline-navy";

/** Hint under the action: white on the navy mobile screen, muted in the light desktop card. */
export const hintOnNavyClass = "text-center text-[13px] leading-normal text-white lg:text-muted";
