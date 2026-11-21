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

/** Full-height navy screen from docs/mockups/Main-v3.dc.html. */
export function AuthScreen({ title, description, children }: AuthScreenProps) {
  return (
    <main className="flex min-h-dvh flex-col justify-between gap-12 bg-navy px-7 pt-24 pb-12 text-white">
      <div className="flex flex-col items-start gap-6">
        <div className="flex size-18 items-center justify-center rounded-logo bg-accent text-navy">
          <PillIcon />
        </div>
        <h1 className="text-[40px] leading-[1.1] font-bold tracking-[-0.5px]">{title}</h1>
        <div className="max-w-75 text-[17px] leading-normal">{description}</div>
      </div>
      {children ? <div className="flex flex-col gap-4">{children}</div> : null}
    </main>
  );
}

/** Primary action on navy: white surface, navy text (BRAND.md contrast rules). */
export const primaryOnNavyClass =
  "flex min-h-14 w-full items-center justify-center gap-3 rounded-button bg-surface px-4 text-base font-semibold text-navy no-underline hover:bg-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-80";

export const hintOnNavyClass = "text-center text-[13px] leading-normal text-white";
