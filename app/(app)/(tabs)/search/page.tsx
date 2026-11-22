import type { Metadata } from "next";
import Link from "next/link";
import { MedicationCard } from "@/components/MedicationCard";
import { MedicationHead, PackList } from "@/components/MedicationParts";
import { Page } from "@/components/Page";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SearchBox } from "@/components/SearchBox";
import { primaryButtonClass, secondaryButtonClass } from "@/components/ui";
import { todayIso } from "@/lib/dates";
import { foundLabel } from "@/lib/format";
import { getCatalog } from "@/lib/medications/queries";
import { parseSearchParams, runSearch, searchHref, type AttentionFilter } from "@/lib/medications/search";
import { getCategories } from "@/lib/storage/queries";
import { isUuid } from "@/lib/storage/validation";

export const metadata: Metadata = { title: "Поиск — Local Pharm" };

type Props = {
  searchParams: Promise<{
    q?: string | string[];
    cat?: string | string[];
    f?: string | string[];
    selected?: string | string[];
  }>;
};

const FILTER_LABELS: Record<AttentionFilter, string> = {
  expiring: "Истекают в ближайшие 30 дней",
  expired: "Просроченные",
  low: "Заканчиваются",
};

const chipBase =
  "flex min-h-11 flex-none items-center rounded-full px-4 text-sm font-semibold whitespace-nowrap no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy";

export default async function SearchPage({ searchParams }: Props) {
  const rawParams = await searchParams;
  const params = parseSearchParams(rawParams);
  const [catalog, categories] = await Promise.all([getCatalog(), getCategories()]);
  const results = runSearch(catalog, params, todayIso());

  const hidden: Record<string, string> = {};
  if (params.categoryId) hidden.cat = params.categoryId;
  if (params.attention) hidden.f = params.attention;
  const isFiltered = Boolean(params.q || params.categoryId || params.attention);

  // Desktop (lg): the panel on the right shows `?selected=<id>`, by default the first result.
  // The selection lives in the URL; on mobile it is ignored and a card opens the full page.
  const wanted = Array.isArray(rawParams.selected) ? rawParams.selected[0] : rawParams.selected;
  const selected = (isUuid(wanted) ? results.find((r) => r.med.id === wanted) : undefined) ?? results[0];
  const baseHref = searchHref(params);
  const selectHref = (id: string) => `${baseHref}${baseHref.includes("?") ? "&" : "?"}selected=${id}`;

  return (
    <Page>
      <ScreenHeader title="Поиск" backHref="/" backLabel="На главную" heading />
      <main className="flex flex-col gap-4 px-5 pt-1 pb-6 lg:gap-5 lg:p-0">
        <div className="lg:max-w-190">
          <SearchBox defaultValue={params.q} hidden={hidden} />
        </div>

        <nav aria-label="Категории" className="-mx-5 lg:mx-0">
          <ul className="flex gap-2 overflow-x-auto px-5 pb-1 lg:flex-wrap lg:overflow-visible lg:px-0 lg:pb-0">
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
          <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
            <section aria-label="Результаты" className="flex flex-col gap-2.5">
              <p role="status" className="text-[13px] font-semibold text-muted">
                {foundLabel(results.length)}
              </p>
              <ul className="flex flex-col gap-2.5">
                {results.map((r) => (
                  <MedicationCard
                    key={r.med.id}
                    {...r}
                    selectHref={selectHref(r.med.id)}
                    selected={r.med.id === selected?.med.id}
                  />
                ))}
              </ul>
            </section>

            {selected ? (
              <aside
                aria-label="Выбранный препарат"
                className="hidden flex-col gap-5 rounded-card border border-border bg-surface p-5 xl:p-6 lg:sticky lg:top-8 lg:flex lg:max-h-[calc(100dvh-4rem)] lg:overflow-y-auto"
              >
                <MedicationHead med={selected.med} as="h2" />
                <PackList med={selected.med} titleId="panel-packs-title" />
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href={`/medications/${selected.med.id}`}
                    className={`${primaryButtonClass} text-sm no-underline`}
                  >
                    Открыть карточку
                  </Link>
                  <Link
                    href={`/medications/${selected.med.id}/pack/new`}
                    className={`${secondaryButtonClass} text-sm no-underline`}
                  >
                    Добавить упаковку
                  </Link>
                </div>
              </aside>
            ) : null}
          </div>
        )}
      </main>
    </Page>
  );
}
