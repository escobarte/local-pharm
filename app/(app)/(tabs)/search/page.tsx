import type { Metadata } from "next";
import Link from "next/link";
import { MedicationCard } from "@/components/MedicationCard";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SearchBox } from "@/components/SearchBox";
import { primaryButtonClass, secondaryButtonClass } from "@/components/ui";
import { todayIso } from "@/lib/dates";
import { foundLabel } from "@/lib/format";
import { getCatalog } from "@/lib/medications/queries";
import { parseSearchParams, runSearch, searchHref, type AttentionFilter } from "@/lib/medications/search";
import { getCategories } from "@/lib/storage/queries";

export const metadata: Metadata = { title: "Поиск — Local Pharm" };

type Props = {
  searchParams: Promise<{ q?: string | string[]; cat?: string | string[]; f?: string | string[] }>;
};

const FILTER_LABELS: Record<AttentionFilter, string> = {
  expiring: "Истекают в ближайшие 30 дней",
  expired: "Просроченные",
  low: "Заканчиваются",
};

const chipBase =
  "flex min-h-11 flex-none items-center rounded-full px-4 text-sm font-semibold whitespace-nowrap no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy";

export default async function SearchPage({ searchParams }: Props) {
  const params = parseSearchParams(await searchParams);
  const [catalog, categories] = await Promise.all([getCatalog(), getCategories()]);
  const results = runSearch(catalog, params, todayIso());

  const hidden: Record<string, string> = {};
  if (params.categoryId) hidden.cat = params.categoryId;
  if (params.attention) hidden.f = params.attention;
  const isFiltered = Boolean(params.q || params.categoryId || params.attention);

  return (
    <>
      <ScreenHeader title="Поиск" backHref="/" backLabel="На главную" />
      <main className="flex flex-col gap-4 px-5 pt-1 pb-6">
        <SearchBox defaultValue={params.q} hidden={hidden} />

        <nav aria-label="Категории" className="-mx-5">
          <ul className="flex gap-2 overflow-x-auto px-5 pb-1">
            <li className="flex-none">
              <Link
                href={searchHref({ q: params.q, attention: params.attention })}
                aria-current={params.categoryId ? undefined : "true"}
                className={`${chipBase} ${params.categoryId ? "bg-tint text-navy hover:bg-border" : "bg-navy text-white"}`}
              >
                Все
              </Link>
            </li>
            {categories.map((c) => {
              const active = c.id === params.categoryId;
              return (
                <li key={c.id} className="flex-none">
                  <Link
                    href={searchHref({ q: params.q, categoryId: c.id, attention: params.attention })}
                    aria-current={active ? "true" : undefined}
                    className={`${chipBase} ${active ? "bg-navy text-white" : "bg-tint text-navy hover:bg-border"}`}
                  >
                    {c.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {params.attention ? (
          <p className="flex items-center justify-between gap-2 rounded-field bg-warn-bg px-4 py-1 text-[13px] font-semibold text-warn-fg">
            <span>Фильтр: {FILTER_LABELS[params.attention].toLowerCase()}</span>
            <Link
              href={searchHref({ q: params.q, categoryId: params.categoryId })}
              className="flex min-h-11 items-center underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
            >
              Сбросить
            </Link>
          </p>
        ) : null}

        {catalog.length === 0 ? (
          <section className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5">
            <p className="text-[15px] leading-normal">
              В базе пока нет препаратов. Добавьте первый, и он появится в поиске.
            </p>
            <Link href="/add" className={`${primaryButtonClass} no-underline`}>
              Добавить препарат
            </Link>
          </section>
        ) : results.length === 0 ? (
          <section role="status" className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5">
            <p className="text-[15px] leading-normal">
              Ничего не найдено{params.q ? ` по запросу «${params.q}»` : ""}. Попробуйте другое слово
              или уберите фильтры.
            </p>
            {isFiltered ? (
              <Link href="/search" className={`${secondaryButtonClass} no-underline`}>
                Сбросить поиск
              </Link>
            ) : null}
          </section>
        ) : (
          <section aria-label="Результаты" className="flex flex-col gap-2.5">
            <p role="status" className="text-[13px] font-semibold text-muted">
              {foundLabel(results.length)}
            </p>
            <ul className="flex flex-col gap-2.5">
              {results.map((r) => (
                <MedicationCard key={r.med.id} {...r} />
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}
