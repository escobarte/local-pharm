import type { Metadata } from "next";
import Link from "next/link";
import { ExpiryList } from "@/components/ExpiryList";
import { Page } from "@/components/Page";
import { secondaryButtonClass } from "@/components/ui";
import { todayIso } from "@/lib/dates";
import { groupByExpiry } from "@/lib/expiry/group";
import { getExpiryItems } from "@/lib/expiry/queries";
import { getOpenMedicationIds } from "@/lib/shopping/queries";

export const metadata: Metadata = { title: "Сроки — Local Pharm" };

export default async function ExpiryPage() {
  // Server date (UTC), the same rule as the search badges and the home "Внимание".
  const today = todayIso();
  const [items, inList] = await Promise.all([
    getExpiryItems(today),
    // Before migration 0006 is applied the list does not exist: show the screen anyway.
    getOpenMedicationIds().catch(() => new Set<string>()),
  ]);
  const groups = groupByExpiry(items, today);

  return (
    <Page>
      <main className="flex flex-col gap-5 px-5 pt-6 pb-6 lg:gap-6 lg:p-0">
        <header className="flex flex-col gap-1">
          <h1 className="text-[28px] leading-tight font-bold tracking-[-0.3px]">Сроки годности</h1>
          <p className="text-[13px] text-muted">
            Просроченное и то, что истекает в ближайшие 90 дней. Упаковки без срока здесь не видны.
          </p>
        </header>

        {groups.length === 0 ? (
          <section className="flex flex-col items-start gap-3 rounded-card border border-border bg-surface p-5 lg:max-w-2xl lg:p-6">
            <h2 className="text-lg font-bold">Всё в порядке</h2>
            <p className="text-[15px] leading-normal">
              Ничего не просрочено и не истекает в ближайшие 90 дней.
            </p>
            <Link href="/search" className={`${secondaryButtonClass} w-full lg:w-auto lg:px-8`}>
              Открыть поиск
            </Link>
          </section>
        ) : (
          <ExpiryList groups={groups} inList={inList} />
        )}
      </main>
    </Page>
  );
}
