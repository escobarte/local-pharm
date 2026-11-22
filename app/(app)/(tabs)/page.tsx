import type { Metadata } from "next";
import Link from "next/link";
import { Page } from "@/components/Page";
import { SearchBox } from "@/components/SearchBox";
import { sectionTitleClass, secondaryButtonClass } from "@/components/ui";
import { todayIso } from "@/lib/dates";
import { expiredText, expiringText, lowStockText } from "@/lib/format";
import { getAttentionPacks } from "@/lib/medications/queries";
import { attentionCounts, searchHref } from "@/lib/medications/search";
import { getCategories } from "@/lib/storage/queries";
import { signOut } from "../actions";

export const metadata: Metadata = { title: "Local Pharm" };

type Row = { key: string; count: number; title: string; emptyTitle: string; sub: string; href: string; tone: "danger" | "warn" | "tint" };

const TONES = {
  danger: "bg-danger-bg text-danger-fg",
  warn: "bg-warn-bg text-warn-fg",
  tint: "bg-tint text-navy",
} as const;

export default async function HomePage() {
  const [packs, categories] = await Promise.all([getAttentionPacks(), getCategories()]);
  const counts = attentionCounts(packs, todayIso());

  const rows: Row[] = [];
  if (counts.expired > 0) {
    rows.push({
      key: "expired",
      count: counts.expired,
      title: expiredText(counts.expired),
      emptyTitle: "",
      sub: "срок годности уже прошёл",
      href: searchHref({ attention: "expired" }),
      tone: "danger",
    });
  }
  rows.push({
    key: "expiring",
    count: counts.expiring,
    title: expiringText(counts.expiring),
    emptyTitle: "Ничего не истекает",
    sub: "в ближайшие 30 дней",
    href: searchHref({ attention: "expiring" }),
    tone: "warn",
  });
  rows.push({
    key: "low",
    count: counts.lowStock,
    title: lowStockText(counts.lowStock),
    emptyTitle: "Ничего не заканчивается",
    sub: "отмечены как «заканчивается»",
    href: searchHref({ attention: "low" }),
    tone: "tint",
  });

  return (
    <Page>
      <main className="flex flex-col gap-6 px-5 pt-8 pb-8 lg:gap-7 lg:p-0">
        <header className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-muted lg:hidden">Local Pharm</p>
          <h1 className="text-[28px] leading-tight font-bold">Что ищем?</h1>
          <div className="lg:max-w-190">
            <SearchBox />
          </div>
        </header>

        <section aria-labelledby="attention-title" className="flex flex-col gap-2">
          <h2 id="attention-title" className={sectionTitleClass}>
            Внимание
          </h2>
          <ul className="flex flex-col gap-2 lg:grid lg:grid-cols-[repeat(auto-fit,minmax(320px,1fr))] lg:gap-3">
            {rows.map((r) => (
              <li key={r.key}>
                {r.count > 0 ? (
                  <Link
                    href={r.href}
                    className={`flex min-h-14 flex-col justify-center gap-0.5 rounded-card px-4 py-3 no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy ${TONES[r.tone]}`}
                  >
                    <span className="text-[15px] font-semibold">{r.title}</span>
                    <span className="text-[13px]">{r.sub}</span>
                  </Link>
                ) : (
                  <p className="flex min-h-14 flex-col justify-center gap-0.5 rounded-card border border-border bg-surface px-4 py-3">
                    <span className="text-[15px] font-semibold">{r.emptyTitle}</span>
                    <span className="text-[13px] text-muted">{r.sub}</span>
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="categories-title" className="flex flex-col gap-2">
          <h2 id="categories-title" className={sectionTitleClass}>
            Категории
          </h2>
          <ul className="grid grid-cols-2 gap-2 lg:grid-cols-[repeat(auto-fill,minmax(240px,1fr))] lg:gap-3">
            {categories.map((c) => (
              <li key={c.id}>
                <Link
                  href={searchHref({ categoryId: c.id })}
                  className="flex min-h-16 items-center rounded-card border border-border bg-surface px-4 py-3 text-sm leading-snug font-semibold no-underline hover:bg-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Desktop: "Выйти" lives in the side menu. */}
        <form action={signOut} className="lg:hidden">
          <button type="submit" className={`${secondaryButtonClass} min-h-12 w-full`}>
            Выйти
          </button>
        </form>
      </main>
    </Page>
  );
}
