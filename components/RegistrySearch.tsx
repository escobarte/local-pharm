import Link from "next/link";
import { manufacturerLabel, registrySubtitle } from "@/lib/amdm/format";
import type { RegistrySearch as SearchState } from "@/lib/amdm/queries";
import { REGISTRY_MAX_QUERY_LENGTH, REGISTRY_RESULT_LIMIT } from "@/lib/amdm/search";
import type { RegistryItem } from "@/lib/amdm/types";
import { IconSearch } from "./icons";
import { errorBoxClass, inputClass, sectionTitleClass, sourceTagClass } from "./ui";

const noteClass = "rounded-card border border-dashed border-border px-4 py-5 text-[13px] leading-normal text-muted";

type Props = {
  query: string;
  result: SearchState;
  /** Kept in the GET form so "Добавить сюда" survives the search. */
  hidden: Record<string, string>;
  /** Link to the Add form prefilled from a registry row. */
  pickHref: (code: string) => string;
};

/** Registry search on the Add screen. Plain GET form: works without JS, the URL is the state. */
export function RegistrySearch({ query, result, hidden, pickHref }: Props) {
  return (
    <section
      aria-labelledby="registry-title"
      className="flex flex-col gap-3 lg:rounded-card lg:border lg:border-border lg:bg-surface lg:p-6"
    >
      <h2 id="registry-title" className={`${sectionTitleClass} hidden lg:block`}>
        Реестр лекарств AMDM
      </h2>
      <form action="/add" method="get" role="search" className="flex gap-2 lg:max-w-xl">
        <input type="hidden" name="mode" value="search" />
        {Object.entries(hidden).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <input
          type="search"
          name="q"
          aria-label="Название, вещество или штрихкод"
          aria-describedby="registry-hint"
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
      <p id="registry-hint" className="text-xs leading-normal text-muted">
        Государственный реестр Молдовы. Название или вещество — латиницей или по-русски, либо
        штрихкод (8–13 цифр).
      </p>

      <SearchOutcome result={result} pickHref={pickHref} />
    </section>
  );
}

function SearchOutcome({ result, pickHref }: { result: SearchState; pickHref: Props["pickHref"] }) {
  switch (result.status) {
    case "idle":
      return null;
    case "too-short":
      return <p className={noteClass}>Введите хотя бы 2 буквы.</p>;
    case "not-loaded":
      return (
        <p className={noteClass}>
          Реестр AMDM ещё не загружен в базу. Владельцу: docs/SETUP-SUPABASE.md, шаг 7. Пока можно
          добавить препарат вручную.
        </p>
      );
    case "error":
      return (
        <p role="alert" className={errorBoxClass}>
          {result.message}
        </p>
      );
    case "ok":
      if (result.items.length === 0) {
        return (
          <p className={noteClass}>
            {result.byBarcode
              ? "Штрихкод не найден в реестре: у большинства записей AMDM штрихкода нет. Попробуйте название или добавьте вручную."
              : "Ничего не найдено. Попробуйте латиницей (как на упаковке) или по действующему веществу."}
          </p>
        );
      }
      return (
        <>
          <p role="status" className="text-[13px] text-muted">
            {result.more
              ? `Показаны первые ${REGISTRY_RESULT_LIMIT}. Уточните запрос, если нужного нет.`
              : `Найдено: ${result.items.length}`}
          </p>
          <ul className="flex flex-col gap-2 lg:grid lg:grid-cols-2 lg:gap-3">
            {result.items.map((item) => (
              <RegistryResult key={item.code} item={item} href={pickHref(item.code)} />
            ))}
          </ul>
        </>
      );
  }
}

function RegistryResult({ item, href }: { item: RegistryItem; href: string }) {
  const sub = registrySubtitle(item);
  const maker = manufacturerLabel(item.manufacturer, item.country);
  return (
    <li>
      <Link
        href={href}
        className="flex min-h-11 flex-col gap-1 rounded-card border border-border bg-surface p-4 no-underline hover:bg-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy lg:h-full"
      >
        <span className="flex items-start justify-between gap-2">
          <span className="text-[15px] leading-snug font-semibold break-words">{item.name}</span>
          <span className={sourceTagClass}>Реестр AMDM</span>
        </span>
        {sub ? <span className="text-[13px] leading-snug break-words text-muted">{sub}</span> : null}
        {item.inn ? <span className="text-[13px] leading-snug break-words">{item.inn}</span> : null}
        {maker ? <span className="text-xs leading-snug break-words text-muted">{maker}</span> : null}
      </Link>
    </li>
  );
}

/** The picked registry row above the prefilled form. */
export function RegistryPicked({ item, changeHref }: { item: RegistryItem; changeHref: string }) {
  const sub = registrySubtitle(item);
  const maker = manufacturerLabel(item.manufacturer, item.country);
  return (
    <section
      aria-labelledby="picked-title"
      className="mx-5 mb-4 flex flex-col gap-1.5 rounded-card bg-tint p-4 lg:mx-0 lg:mb-5"
    >
      <div className="flex items-start justify-between gap-2">
        <h2 id="picked-title" className="text-[15px] leading-snug font-semibold break-words">
          {item.name}
        </h2>
        <span className="flex-none rounded-tag bg-surface px-2 py-1 text-[11px] leading-none font-semibold text-muted">
          Реестр AMDM
        </span>
      </div>
      {sub ? <p className="text-[13px] leading-snug break-words text-muted">{sub}</p> : null}
      <p className="text-[13px] leading-snug break-words text-muted">
        {[item.inn, maker, item.barcode ? `штрихкод ${item.barcode}` : null].filter(Boolean).join(" · ")}
      </p>
      <p className="text-[13px] leading-snug">
        Поля ниже заполнены из реестра — их можно поправить перед сохранением.
      </p>
      <Link
        href={changeHref}
        className="-mb-2 flex min-h-11 items-center self-start text-[13px] font-semibold text-navy underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
      >
        Выбрать другой препарат
      </Link>
    </section>
  );
}
