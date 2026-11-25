import type { Metadata } from "next";
import Link from "next/link";
import { FormPlate, ListPlate } from "@/components/FormIcon";
import { IconStorage } from "@/components/icons";
import { Page } from "@/components/Page";
import { BoughtCheckbox, RemoveItemButton, ReturnButton, ShoppingAddForm } from "@/components/ShoppingParts";
import { sectionTitleClass, secondaryButtonSmClass } from "@/components/ui";
import { positionsLabel } from "@/lib/format";
import { buyerName, reasonLabel, shortDate } from "@/lib/shopping/logic";
import { BOUGHT_LIMIT, getBoughtItems, getOpenItems, type ShoppingItem } from "@/lib/shopping/queries";

export const metadata: Metadata = { title: "Покупки — Local Pharm" };

/** Icon by form for an item linked to a medication, a list icon for the rest. */
function ItemPlate({ item }: { item: ShoppingItem }) {
  return item.medicationId ? <FormPlate form={item.form} /> : <ListPlate />;
}

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
                  // Below `xl` the remove button shares the second line with the reason, so
                  // the name runs to the right edge. From `xl` it is its own column again.
                  <li
                    key={item.id}
                    className="grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center rounded-card border border-border bg-surface p-1"
                  >
                    <div className="row-span-2">
                      <BoughtCheckbox itemId={item.id} title={item.title} />
                    </div>
                    <div className="row-span-2 mr-2">
                      <ItemPlate item={item} />
                    </div>
                    <span className="col-span-2 self-end pt-1 pr-2 text-[15px] leading-snug font-bold break-words xl:col-span-1">
                      {item.title}
                    </span>
                    <span className="col-start-3 self-start pt-0.5 text-[13px] text-muted">{reasonLabel(item.reason)}</span>
                    {/* -mt-1 stays under the baseline of the name: the delete target never covers its text. */}
                    <div className="-mt-1 xl:col-start-4 xl:row-span-2 xl:row-start-1 xl:mt-0">
                      <RemoveItemButton itemId={item.id} title={item.title} />
                    </div>
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
                      <div className="flex items-start gap-2.5">
                        <ItemPlate item={item} />
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <span className="text-[15px] leading-snug font-bold break-words">{item.title}</span>
                          <span className="text-[13px] text-muted">
                            {buyerName(item.boughtBy)} · {shortDate(item.boughtAt)}
                          </span>
                        </div>
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
