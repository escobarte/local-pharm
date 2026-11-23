import type { ReactNode } from "react";

/** Full-screen form flows without the bottom menu (Add, New/Edit box). */
export default function FormLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-bg text-navy lg:max-w-none print:min-h-0 print:max-w-none print:bg-surface">
      {children}
    </div>
  );
}
