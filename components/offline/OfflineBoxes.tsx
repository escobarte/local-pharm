"use client";

import type { IsoDate } from "@/lib/dates";
import { compartmentsLabel, packsLabel } from "@/lib/format";
import { snapshotBox, snapshotOverview, type Snapshot, type SnapshotBoxView } from "@/lib/offline/snapshot";
import { compartmentColumns } from "@/lib/storage/summary";
import { BoxHeader, BoxItemBody, CellBody, boxItemClass, cellClass } from "../BoxParts";
import { BoxTileBody, boxTileClass } from "../BoxTileBody";
import { IconBack } from "../icons";
import { sectionTitleClass } from "../ui";
import { backClass, noteClass, panelClass, type Go } from "./shared";

type Props = {
  snapshot: Snapshot;
  boxId: string | null;
  cellId: string | null;
  /** Desktop: show the first box in the panel when none is picked. */
  preselect: boolean;
  go: Go;
  today: IsoDate;
};

/** Zones with box tiles; the picked box beside (desktop) or instead of them. */
export function OfflineBoxes({ snapshot, boxId, cellId, preselect, go, today }: Props) {
  const { zones, totals } = snapshotOverview(snapshot);
  const picked = boxId ? snapshotBox(snapshot, boxId, cellId) : null;
  const first = zones.flatMap((z) => z.boxes)[0];
  const shown = picked ?? (preselect && first ? snapshotBox(snapshot, first.id, null) : null);

  return (
    <div className="flex flex-col gap-4">
      {boxId && !picked ? (
        <p role="alert" className={noteClass}>
          Такой коробки нет в сохранённых данных.
        </p>
      ) : null}
      {totals.boxes === 0 ? <p className={noteClass}>Коробок пока нет.</p> : null}

      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:items-start lg:gap-6">
        <div className={`flex flex-col gap-5 ${picked ? "max-lg:hidden" : ""}`}>
          {zones.map((zone) =>
            zone.boxes.length === 0 ? null : (
              <section key={zone.id} aria-labelledby={`zone-${zone.id}`} className="flex flex-col gap-2">
                <h2 id={`zone-${zone.id}`} className={sectionTitleClass}>
                  {zone.name}
                </h2>
                <ul className="grid grid-cols-2 gap-2 lg:grid-cols-1 xl:grid-cols-2">
                  {zone.boxes.map((b) => (
                    <li key={b.id}>
                      <button
                        type="button"
                        data-selected={b.id === shown?.box.id ? "true" : undefined}
                        onClick={() => go({ tab: "boxes", boxId: b.id })}
                        className={`${boxTileClass} w-full text-left`}
                      >
                        <BoxTileBody box={b} subtitle={b.categories} />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ),
          )}
        </div>

        {shown ? (
          <aside aria-label="Выбранная коробка" className={`${panelClass} ${picked ? "flex" : "hidden"}`}>
            <button type="button" onClick={() => go({ tab: "boxes" })} className={backClass}>
              <IconBack />К коробкам
            </button>
            <Box view={shown} go={go} today={today} />
          </aside>
        ) : null}
      </div>
    </div>
  );
}

function Box({ view: { box, locationName, detail }, go, today }: { view: SnapshotBoxView; go: Go; today: IsoDate }) {
  const subtitle = [box.number ? `№${box.number}` : null, locationName, detail.categories].filter(Boolean).join(" · ");

  return (
    <>
      <BoxHeader box={box} subtitle={subtitle} />
      {detail.cells.length === 0 ? (
        <p className={noteClass}>В этой коробке пока нет отсеков.</p>
      ) : (
        <>
          <section aria-labelledby="offline-cells" className="flex flex-col gap-3">
            <h2 id="offline-cells" className={sectionTitleClass}>
              Отсеки · {compartmentsLabel(detail.cells.length)}
            </h2>
            <ul
              className="grid gap-2 rounded-card border border-border bg-surface p-2"
              style={{ gridTemplateColumns: `repeat(${compartmentColumns(detail.cells.length)}, minmax(0, 1fr))` }}
            >
              {detail.cells.map((c) => {
                const selected = c.id === detail.selectedId;
                return (
                  <li key={c.id} className="min-w-0">
                    <button
                      type="button"
                      aria-pressed={selected}
                      onClick={() => go({ tab: "boxes", boxId: box.id, cellId: c.id }, { replace: true })}
                      className={cellClass(selected)}
                    >
                      <CellBody cell={c} selected={selected} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
          <section aria-labelledby="offline-items" className="flex flex-col gap-3">
            <h2 id="offline-items" className={sectionTitleClass}>
              В отсеке {detail.selectedCode}
              {detail.items.length > 0 ? ` · ${packsLabel(detail.items.length)}` : ""}
            </h2>
            {detail.items.length === 0 ? (
              <p className={noteClass}>В этом отсеке пока ничего нет.</p>
            ) : (
              <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
                {detail.items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => go({ tab: "search", medicationId: item.medicationId })}
                      className={boxItemClass}
                    >
                      <BoxItemBody item={item} today={today} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </>
  );
}
