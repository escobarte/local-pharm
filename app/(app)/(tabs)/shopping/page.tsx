import type { Metadata } from "next";
import Link from "next/link";
import { IconStorage } from "@/components/icons";
import { Page } from "@/components/Page";
import { BoughtCheckbox, RemoveItemButton, ReturnButton, ShoppingAddForm } from "@/components/ShoppingParts";
import { sectionTitleClass, secondaryButtonSmClass } from "@/components/ui";
import { positionsLabel } from "@/lib/format";
import { buyerName, reasonLabel, shortDate } from "@/lib/shopping/logic";
import { BOUGHT_LIMIT, getBoughtItems, getOpenItems } from "@/lib/shopping/queries";

export const metadata: Metadata = { title: "Покупки — Local Pharm" };

export default async function ShoppingPage() {
  const [open, bought] = await Promise.all([getOpenItems(), getBoughtItems()]);

  return (
    <Page>
      <main className="flex flex-col gap-5 px-5 pt-6 pb-6 lg:gap-6 lg:p-0">
        <header className="flex flex-col gap-1">
          <h1 className="text-[28px] leading-tight font-bold tracking-[-0.3px]">Покупки</h1>
          <p className="text-[13px] text-muted">{positionsLabel(open.length)} · общий список</p>
        </header>

        <div className="lg:max-w-xl">
          <ShoppingAddForm />
        </div>

        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-8">
          <section aria-labelledby="buy-title" className="flex flex-col gap-3">
            <h2 id="buy-title" className={sectionTitleClass}>
              Купить
            </h2>
            {open.length === 0 ? (
              <p className="rounded-card border border-dashed border-border px-4 py-5 text-[13px] leading-normal text-muted">
                Пока ничего не нужно покупать. Добавьте пункт выше или нажмите «В покупки» на экране «Сроки».
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {open.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-1 rounded-card border border-border bg-surface py-1.5 pr-1.5 pl-1.5"
                  >
                    <BoughtCheckbox itemId={item.id} title={item.title} />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5 py-1">
                      <span className="text-[15px] leading-snug font-bold break-words">{item.title}</span>
                      <span className="text-[13px] text-muted">{reasonLabel(item.reason)}</span>
                    </div>
                    <RemoveItemButton itemId={item.id} title={item.title} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="bought-title" className="flex flex-col gap-3">
            <h2 id="bought-title" className={sectionTitleClass}>
              Куплено
            </h2>
            {bought.length === 0 ? (
              <p className="rounded-card border border-dashed border-border px-4 py-5 text-[13px] leading-normal text-muted">
                Здесь появится то, что вы отметите купленным.
              </p>
            ) : (
              <>
                <ul className="flex flex-col gap-2">
                  {bought.map((item) => (
                    <li
                      key={item.id}
                      className="flex flex-col gap-2 rounded-card border border-border bg-surface p-3.5"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[15px] leading-snug font-bold break-words">{item.title}</span>
                        <span className="text-[13px] text-muted">
                          {buyerName(item.boughtBy)} · {shortDate(item.boughtAt)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {item.medicationId ? (
                          <Link
                            href={`/medications/${item.medicationId}/pack/new`}
                            className={secondaryButtonSmClass}
                          >
                            <IconStorage size={18} className="flex-none" />
                            Разложить
                          </Link>
                        ) : null}
                        <ReturnButton itemId={item.id} />
                      </div>
                    </li>
                  ))}
                </ul>
                {bought.length >= BOUGHT_LIMIT ? (
                  <p className="text-xs text-muted">Показаны последние {BOUGHT_LIMIT}.</p>
                ) : null}
              </>
            )}
          </section>
        </div>
      </main>
    </Page>
  );
}
