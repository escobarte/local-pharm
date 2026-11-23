import Link from "next/link";
import type { ReactNode } from "react";
import type { OpenFdaPick } from "@/lib/add-href";
import { manufacturerLabel, registrySubtitle } from "@/lib/amdm/format";
import type { RegistrySearch as RegistryState } from "@/lib/amdm/queries";
import { REGISTRY_MAX_QUERY_LENGTH, REGISTRY_RESULT_LIMIT } from "@/lib/amdm/search";
import type { RegistryItem } from "@/lib/amdm/types";
import { formatExpiry } from "@/lib/dates";
import { pcsLabel } from "@/lib/format";
import { placeLabel, sourceName, type SearchResult } from "@/lib/medications/search";
import type { OpenFdaItem } from "@/lib/openfda/parse";
import { searchOpenFda } from "@/lib/openfda/fetch";
import { IconSearch } from "./icons";
import {
  errorBoxClass,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
  sectionTitleClass,
  sourceTagClass,
} from "./ui";

// Server blocks of the Add screen: search form, the three result blocks in
// lookup order (own base → AMDM → openFDA), the picked-row card and the
// "already at home" notice. Links carry the whole state in the URL.

const noteClass = "rounded-card border border-dashed border-border px-4 py-5 text-[13px] leading-normal text-muted";
const cardLinkClass =
  "flex min-h-11 flex-col gap-1 rounded-card border border-border bg-surface p-4 no-underline hover:bg-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy lg:h-full";
const smallLinkClass =
  "flex min-h-11 flex-1 items-center justify-center rounded-field px-2 text-[13px] font-semibold no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy";
const listClass = "flex flex-col gap-2 lg:grid lg:grid-cols-2 lg:gap-3";

// ---------- Search form ----------

export function AddSearchForm({ query, hidden }: { query: string; hidden: Record<string, string> }) {
  return (
    <div className="flex flex-col gap-2">
      <form action="/add" method="get" role="search" className="flex gap-2 lg:max-w-xl">
        <input type="hidden" name="mode" value="search" />
        {Object.entries(hidden).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <input
          type="search"
          name="q"
          aria-label="Название, вещество или штрихкод"
          aria-describedby="add-search-hint"
          placeholder="Например, нурофен или ibuprofen"
          defaultValue={query}
          maxLength={REGISTRY_MAX_QUERY_LENGTH}
          autoComplete="off"
          autoFocus={query === ""}
          enterKeyHint="search"
          className={inputClass}
        />
        <button
          type="submit"
          aria-label="Найти"
          className="flex size-12 flex-none items-center justify-center rounded-field bg-navy text-white hover:bg-navy/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
        >
          <IconSearch size={22} />
        </button>
      </form>
      <p id="add-search-hint" className="text-xs leading-normal text-muted">
        Ищем по очереди: у вас дома, в реестре Молдовы, в международных базах. Название или вещество —
        латиницей или по-русски, либо штрихкод.
      </p>
    </div>
  );
}

// ---------- Blocks ----------

function Block({ id, title, status, children }: { id: string; title: string; status?: string; children: ReactNode }) {
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-2.5 lg:rounded-card lg:border lg:border-border lg:bg-surface lg:p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id={id} className={sectionTitleClass}>
          {title}
        </h2>
        {status ? (
          <p role="status" className="text-xs text-muted">
            {status}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/** «У вас дома»: medications already at home; adding a pack is the main action. */
export function HomeResults({ results, packHref }: { results: SearchResult[]; packHref: (id: string) => string }) {
  return (
    <Block id="home-title" title="У вас дома" status={results.length ? `Найдено: ${results.length}` : undefined}>
      {results.length === 0 ? (
        <p className={noteClass}>Дома такого нет.</p>
      ) : (
        <ul className={listClass}>
          {results.map(({ med, summary }) => {
            const sub = [med.activeIngredient, med.form, med.dosage].filter(Boolean).join(" · ");
            const meta = [
              summary.place ? placeLabel(summary.place) : "Нет упаковок",
              summary.packCount ? pcsLabel(summary.totalQuantity) : null,
              summary.nearestExpiry ? `до ${formatExpiry(summary.nearestExpiry)}` : null,
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <li key={med.id} className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-[15px] leading-snug font-semibold break-words">{med.name}</p>
                  <span className={sourceTagClass}>{sourceName(med.source)}</span>
                </div>
                {sub ? <p className="text-[13px] leading-snug break-words text-muted">{sub}</p> : null}
                <p className="text-[13px] leading-snug break-words">{meta}</p>
                <div className="flex gap-2 border-t border-tint pt-2">
                  <Link href={packHref(med.id)} className={`${smallLinkClass} bg-navy text-white hover:bg-navy/90`}>
                    Добавить упаковку
                  </Link>
                  <Link href={`/medications/${med.id}`} className={`${smallLinkClass} text-navy hover:bg-tint`}>
                    Открыть
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Block>
  );
}

/** «Реестр Молдовы» (AMDM). */
export function RegistryResults({
  result,
  pickHref,
  title = "Реестр Молдовы",
}: {
  result: RegistryState;
  pickHref: (code: string) => string;
  title?: string;
}) {
  if (result.status === "idle") return null;
  const status =
    result.status === "ok" && result.items.length > 0
      ? result.more
        ? `Показаны первые ${REGISTRY_RESULT_LIMIT}`
        : `Найдено: ${result.items.length}`
      : undefined;
  return (
    <Block id="registry-title" title={title} status={status}>
      {result.status === "too-short" ? (
        <p className={noteClass}>Введите хотя бы 2 буквы.</p>
      ) : result.status === "not-loaded" ? (
        <p className={noteClass}>
          Реестр AMDM ещё не загружен в базу. Владельцу: docs/SETUP-SUPABASE.md, шаг 7.
        </p>
      ) : result.status === "error" ? (
        <p role="alert" className={errorBoxClass}>
          {result.message}
        </p>
      ) : result.items.length === 0 ? (
        <p className={noteClass}>
          {result.byBarcode
            ? "В реестре этого штрихкода нет: у большинства записей AMDM штрихкода нет."
            : "В реестре не нашли. Попробуйте латиницей, как на упаковке, или по веществу."}
        </p>
      ) : (
        <ul className={listClass}>
          {result.items.map((item) => (
            <RegistryRow key={item.code} item={item} href={pickHref(item.code)} />
          ))}
        </ul>
      )}
    </Block>
  );
}

function RegistryRow({ item, href }: { item: RegistryItem; href: string }) {
  const sub = registrySubtitle(item);
  const maker = manufacturerLabel(item.manufacturer, item.country);
  return (
    <li>
      <Link href={href} className={cardLinkClass}>
        <span className="flex flex-wrap items-start justify-between gap-2">
          <span className="text-[15px] leading-snug font-semibold break-words">{item.name}</span>
          <span className={sourceTagClass}>{sourceName("amdm")}</span>
        </span>
        {sub ? <span className="text-[13px] leading-snug break-words text-muted">{sub}</span> : null}
        {item.inn ? <span className="text-[13px] leading-snug break-words">{item.inn}</span> : null}
        {maker ? <span className="text-xs leading-snug break-words text-muted">{maker}</span> : null}
      </Link>
    </li>
  );
}

/** «Международные базы» (openFDA). Async: rendered inside <Suspense>, so it never delays the other blocks. */
export async function OpenFdaResults({ query, pickHref }: { query: string; pickHref: (pick: OpenFdaPick) => string }) {
  const result = await searchOpenFda(query);
  if (result.status === "skipped") return null;
  return (
    <Block
      id="openfda-title"
      title="Международные базы"
      status={result.status === "ok" && result.items.length ? `Найдено: ${result.items.length}` : undefined}
    >
      {result.status === "unavailable" ? (
        <p className={noteClass}>Международные базы сейчас недоступны. Попробуйте позже или добавьте вручную.</p>
      ) : result.items.length === 0 ? (
        <p className={noteClass}>В openFDA не нашли. Там в основном препараты рынка США, названия на английском.</p>
      ) : (
        <ul className={listClass}>
          {result.items.map((item) => (
            <OpenFdaRow key={item.key} item={item} href={pickHref(toPick(item))} />
          ))}
        </ul>
      )}
    </Block>
  );
}

export function OpenFdaLoading() {
  return (
    <Block id="openfda-title" title="Международные базы">
      <p role="status" className={noteClass}>
        Ищем в международных базах…
      </p>
    </Block>
  );
}

const toPick = (i: OpenFdaItem): OpenFdaPick => ({
  name: i.name,
  inn: i.inn,
  form: i.form,
  strength: i.strength,
  manufacturer: i.manufacturer,
});

function OpenFdaRow({ item, href }: { item: OpenFdaItem; href: string }) {
  const sub = [item.form, item.strength].filter(Boolean).join(" · ");
  return (
    <li>
      <Link href={href} className={cardLinkClass} lang="en">
        <span className="flex flex-wrap items-start justify-between gap-2">
          <span className="text-[15px] leading-snug font-semibold break-words">{item.name}</span>
          <span className={sourceTagClass} lang="ru">
            {sourceName("openfda")}
          </span>
        </span>
        {sub ? <span className="text-[13px] leading-snug break-words text-muted">{sub}</span> : null}
        {item.inn ? <span className="text-[13px] leading-snug break-words">{item.inn}</span> : null}
        {item.manufacturer ? (
          <span className="text-xs leading-snug break-words text-muted">{item.manufacturer}</span>
        ) : null}
      </Link>
    </li>
  );
}

// ---------- Picked row, duplicate notice, barcode notice ----------

const changeLinkClass =
  "-mb-2 flex min-h-11 items-center self-start text-[13px] font-semibold text-navy underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy";

/** The row picked in the registry or openFDA, above the prefilled form. */
export function PickedCard({
  source,
  title,
  lines,
  changeHref,
}: {
  source: "amdm" | "openfda";
  title: string;
  lines: string[];
  changeHref: string;
}) {
  return (
    <section
      aria-labelledby="picked-title"
      className="mx-5 mb-4 flex flex-col gap-1.5 rounded-card bg-tint p-4 lg:mx-0 lg:mb-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 id="picked-title" className="text-[15px] leading-snug font-semibold break-words">
          {title}
        </h2>
        <span className="flex-none rounded-tag bg-surface px-2 py-1 text-[11px] leading-none font-semibold text-muted">
          {sourceName(source)}
        </span>
      </div>
      {lines.filter(Boolean).map((line) => (
        <p key={line} className="text-[13px] leading-snug break-words text-muted">
          {line}
        </p>
      ))}
      <p className="text-[13px] leading-snug">Поля ниже заполнены — их можно поправить перед сохранением.</p>
      <Link href={changeHref} className={changeLinkClass}>
        Выбрать другой препарат
      </Link>
    </section>
  );
}

export function registryLines(item: RegistryItem, barcodeNote: string | null): string[] {
  const maker = manufacturerLabel(item.manufacturer, item.country);
  return [registrySubtitle(item), [item.inn, maker].filter(Boolean).join(" · "), barcodeNote ?? ""];
}

export function openFdaLines(pick: OpenFdaPick): string[] {
  return [[pick.form, pick.strength].filter(Boolean).join(" · "), [pick.inn, pick.manufacturer].filter(Boolean).join(" · ")];
}

/** "Already at home": add a pack to the existing medication (main), or a separate entry (secondary). */
export function DuplicateNotice({
  medications,
  packHref,
  separateHref,
  reason,
}: {
  medications: { id: string; name: string; dosage: string | null }[];
  packHref: (id: string) => string;
  separateHref: string;
  reason: "registry" | "barcode";
}) {
  return (
    <section
      aria-labelledby="duplicate-title"
      className="flex flex-col gap-3 rounded-card border border-navy bg-surface p-4 lg:p-6"
    >
      <h2 id="duplicate-title" className="text-[17px] leading-snug font-semibold">
        Уже есть дома
      </h2>
      <p className="text-[13px] leading-normal text-muted">
        {reason === "registry" ? "Этот препарат из реестра уже записан." : "Препарат с этим штрихкодом уже записан."}{" "}
        Добавьте к нему новую упаковку — так количество и сроки будут в одной карточке.
      </p>
      <ul className="flex flex-col gap-2">
        {medications.map((m) => (
          <li key={m.id} className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <Link
              href={`/medications/${m.id}`}
              className="flex min-h-11 items-center text-[15px] font-semibold break-words text-navy underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
            >
              {m.name}
              {m.dosage ? ` ${m.dosage}` : ""}
            </Link>
            <Link href={packHref(m.id)} className={`${primaryButtonClass} no-underline lg:min-w-72`}>
              Добавить упаковку к существующему
            </Link>
          </li>
        ))}
      </ul>
      <Link href={separateHref} className={`${secondaryButtonClass} no-underline lg:self-start`}>
        Создать отдельную запись
      </Link>
    </section>
  );
}

/** Remembered barcode on the Search / Manual tabs. */
export function BarcodeNotice({ barcode, notFound }: { barcode: string; notFound: boolean }) {
  return (
    <p role="status" className="rounded-card bg-tint px-4 py-3 text-[13px] leading-normal">
      {notFound ? (
        <>
          <strong className="font-semibold">Не нашли по штрихкоду {barcode}.</strong> Найдите препарат по названию или
          добавьте вручную — штрихкод сохранится вместе с ним.
        </>
      ) : (
        <>Штрихкод {barcode} сохранится вместе с препаратом.</>
      )}
    </p>
  );
}
