"use client";

import { useState } from "react";
import { expiryStatus, type IsoDate } from "@/lib/dates";
import { foundLabel } from "@/lib/format";
import { parseBarcode } from "@/lib/barcode";
import { categoryAria, categoryCount } from "@/lib/medications/category-counts";
import { MAX_QUERY_LENGTH, placeLabel, sortPacks, summarize } from "@/lib/medications/search";
import type { CatalogMedication } from "@/lib/medications/types";
import { searchSnapshot, snapshotCategories, snapshotCounts, type Snapshot } from "@/lib/offline/snapshot";
import type { OfflineView } from "@/lib/offline/view";
import { ChipRow, CountBadge, chipClass } from "../CategoryChips";
import { IconArrowRight, IconBack } from "../icons";
import { MedicationCardBody, medicationCardClass } from "../MedicationCardBody";
import { Indications, MedicationHead, PackFacts } from "../MedicationView";
import { inputClass, navLinkClass, sectionTitleClass } from "../ui";
import { backClass, noteClass, panelClass, type Go } from "./shared";

type Props = {
  snapshot: Snapshot;
  catalog: CatalogMedication[];
  view: OfflineView;
  go: Go;
  today: IsoDate;
};

const clean = (value: string) => value.replace(/\s+/g, " ").trim();

/** Search field, category chips, results; the picked medication beside (desktop) or instead of them. */
export function OfflineSearch({ snapshot, catalog, view, go, today }: Props) {
  // The field keeps what is typed (spaces included); the URL keeps the clean query.
  const [typed, setTyped] = useState(view.q);
  const [seen, setSeen] = useState(view.q);
  if (view.q !== seen) {
    setSeen(view.q);
    if (clean(typed) !== view.q) setTyped(view.q);
  }

  const query = clean(typed);
  const results = searchSnapshot(catalog, { q: query, categoryId: view.categoryId }, today);
  const counts = snapshotCounts(catalog);
  const picked = view.medicationId ? catalog.find((m) => m.id === view.medicationId) : undefined;
  const shown = picked ?? results[0]?.med;
  const here: Partial<OfflineView> = { tab: "search", q: query, categoryId: view.categoryId };

  const chip = (id: string | null, name: string, count: number) => {
    const active = view.categoryId === id;
    return (
      <li key={id ?? "all"} className="flex-none">
        <button
          type="button"
          aria-pressed={active}
          aria-label={categoryAria(name, count)}
          onClick={() => go({ ...here, categoryId: id }, { replace: true })}
          className={chipClass(active, count)}
        >
          {name}
          <CountBadge count={count} active={active} />
        </button>
      </li>
    );
  };

  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      <div className={`flex flex-col gap-4 lg:gap-5 ${picked ? "max-lg:hidden" : ""}`}>
        <input
          type="search"
          aria-label="Поиск по названию, веществу, категории, показаниям или штрихкоду"
          placeholder="Название, вещество, симптом"
          value={typed}
          maxLength={MAX_QUERY_LENGTH}
          autoComplete="off"
          enterKeyHint="search"
          onChange={(e) => {
            setTyped(e.target.value);
            go({ ...here, q: clean(e.target.value) }, { replace: true });
          }}
          className={`${inputClass} lg:max-w-190`}
        />
        <ChipRow>
          {chip(null, "Все", counts.total)}
          {snapshotCategories(snapshot).map((c) => chip(c.id, c.name, categoryCount(counts, c.id)))}
        </ChipRow>
      </div>

      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
        <section aria-label="Результаты" className={`flex flex-col gap-2.5 ${picked ? "max-lg:hidden" : ""}`}>
          <p role="status" className="text-[13px] font-semibold text-muted">
            {foundLabel(results.length)}
          </p>
          {results.length === 0 ? (
            <p className={noteClass}>
              {parseBarcode(query).ok
                ? "В сохранённых данных этого штрихкода нет. Реестр Молдовы и международные базы доступны только с интернетом."
                : "Дома такого нет. Реестр Молдовы и международные базы доступны только с интернетом."}
            </p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {results.map((r) => (
                <li key={r.med.id}>
                  <button
                    type="button"
                    data-selected={r.med.id === shown?.id ? "true" : undefined}
                    onClick={() => go({ ...here, medicationId: r.med.id })}
                    className={`${medicationCardClass} w-full text-left`}
                  >
                    <MedicationCardBody med={r.med} summary={r.summary} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {shown ? (
          <aside
            aria-label="Выбранный препарат"
            className={`${panelClass} ${picked ? "flex" : "hidden"}`}
          >
            <button type="button" onClick={() => go(here)} className={backClass}>
              <IconBack />К результатам
            </button>
            <Medication med={shown} today={today} go={go} />
          </aside>
        ) : null}
      </div>
    </div>
  );
}

/** Where every pack of the medication lies, read-only. */
function Medication({ med, today, go }: { med: CatalogMedication; today: IsoDate; go: Go }) {
  const packs = sortPacks(med.packs);
  const { totalQuantity } = summarize(med, today);

  return (
    <>
      <MedicationHead med={med} as="h2" />
      <section aria-labelledby="offline-packs" className="flex flex-col gap-2.5">
        <h2 id="offline-packs" className={sectionTitleClass}>
          Упаковки дома{packs.length > 0 ? ` · ${packs.length} · всего ${totalQuantity} шт.` : ""}
        </h2>
        {packs.length === 0 ? (
          <p className={noteClass}>Упаковок нет.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {packs.map((pack, index) => {
              const place = pack.place;
              const title = place ? placeLabel(place) : "Место не найдено";
              return (
                <li
                  key={pack.id}
                  aria-label={`Упаковка ${index + 1}: ${title}`}
                  className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[15px] font-semibold break-words">{title}</p>
                    {place ? (
                      <button
                        type="button"
                        onClick={() => go({ tab: "boxes", boxId: place.boxId, cellId: place.compartmentId })}
                        className={`${navLinkClass} -my-2.5 flex-none`}
                      >
                        Открыть
                        <IconArrowRight size={16} strokeWidth={2} />
                      </button>
                    ) : null}
                  </div>
                  <PackFacts pack={pack} status={expiryStatus(pack.expiry_date, today)} />
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <Indications med={med} titleId="offline-indications" />
    </>
  );
}
