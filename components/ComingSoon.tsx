import type { ReactNode } from "react";
import { Page } from "./Page";

/** Placeholder body for screens that arrive in later phases: shell + empty state. */
export function ComingSoon({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Page>
      <main className="flex flex-col gap-5 px-5 pt-6 pb-6 lg:gap-7 lg:p-0">
        <h1 className="text-[28px] leading-tight font-bold tracking-[-0.3px]">{title}</h1>
        <section className="flex flex-col gap-2 rounded-card border border-border bg-surface p-5 lg:max-w-2xl lg:p-6">
          <h2 className="text-xs font-semibold tracking-[0.8px] text-muted uppercase">Скоро</h2>
          <p className="text-[15px] leading-normal">{children}</p>
        </section>
      </main>
    </Page>
  );
}
