"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { deviceStore } from "@/lib/offline/browser";
import { findBoxIdByToken, toCatalog, type Snapshot } from "@/lib/offline/snapshot";
import { offlineViewHref, parseOfflineView, type OfflineTab, type OfflineView } from "@/lib/offline/view";
import { getSiteUrlOverride } from "@/lib/env";
import { todayIso } from "@/lib/dates";
import { allowedQrOrigins } from "@/lib/qr";
import { IconPill } from "../icons";
import { OfflineBoxes } from "./OfflineBoxes";
import { OfflineScan } from "./OfflineScan";
import { OfflineSearch } from "./OfflineSearch";
import { OfflineStatus } from "./OfflineStatus";
import { noteClass, tabClass, type Go } from "./shared";

const TABS: readonly { tab: OfflineTab; label: string }[] = [
  { tab: "search", label: "Поиск" },
  { tab: "boxes", label: "Коробки" },
  { tab: "scan", label: "Скан" },
];

export function OfflineApp() {
  const params = useSearchParams();
  const origins = useMemo(() => allowedQrOrigins(window.location.origin, getSiteUrlOverride()), []);
  const view = parseOfflineView(new URLSearchParams(params.toString()), origins);
  /** undefined — still reading the device; null — nothing stored. */
  const [snapshot, setSnapshot] = useState<Snapshot | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      deviceStore.read().then(
        (state) => !cancelled && setSnapshot(state.snapshot),
        () => !cancelled && setSnapshot(null),
      );
    void load();
    // Another tab may have signed out or downloaded meanwhile.
    document.addEventListener("visibilitychange", load);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", load);
    };
  }, []);

  // History only, no request: the page is already here and the network may not be.
  const go = useCallback<Go>(
    (next, options) => {
      const href = offlineViewHref({ ...next, from: view.from });
      if (options?.replace) window.history.replaceState(null, "", href);
      else {
        window.history.pushState(null, "", href);
        window.scrollTo(0, 0);
      }
    },
    [view.from],
  );

  const catalog = useMemo(() => (snapshot ? toCatalog(snapshot) : []), [snapshot]);

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-navy">
      <OfflineStatus savedAt={snapshot?.savedAt ?? null} from={view.from} />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-5 pt-5 pb-10 lg:max-w-[1160px] lg:gap-5 lg:px-10 lg:pt-8">
        <header className="flex items-center gap-3">
          <span className="flex size-9 flex-none items-center justify-center rounded-field bg-accent text-navy">
            <IconPill size={20} />
          </span>
          <h1 className="text-[28px] leading-tight font-bold tracking-[-0.3px]">Local Pharm</h1>
        </header>
        {snapshot === undefined ? (
          <p className="text-[15px] text-muted">Открываем сохранённые данные…</p>
        ) : snapshot === null ? (
          <p role="status" className="rounded-card border border-border bg-surface p-5 text-[15px] leading-normal lg:max-w-xl">
            Офлайн-данных пока нет, откройте приложение с интернетом один раз.
          </p>
        ) : (
          <Screens snapshot={snapshot} catalog={catalog} view={view} go={go} origins={origins} />
        )}
      </div>
    </div>
  );
}

function Screens({
  snapshot,
  catalog,
  view,
  go,
  origins,
}: {
  snapshot: Snapshot;
  catalog: ReturnType<typeof toCatalog>;
  view: OfflineView;
  go: Go;
  origins: string[];
}) {
  const today = todayIso();
  // A sticker token (QR opened by the camera, or scanned here) → its box.
  const tokenBox = view.token ? findBoxIdByToken(snapshot, view.token) : null;
  const unknownToken = Boolean(view.token) && !tokenBox;

  return (
    <>
      <nav aria-label="Разделы" className="grid grid-cols-3 gap-1 rounded-button bg-tint p-1 lg:max-w-105">
        {TABS.map((t) => (
          <button
            key={t.tab}
            type="button"
            aria-current={t.tab === view.tab ? "page" : undefined}
            onClick={() => go({ tab: t.tab })}
            className={`${tabClass} ${t.tab === view.tab ? "bg-surface" : "hover:bg-surface/60"}`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {view.unavailable ? (
        <p role="status" className={noteClass}>
          Этот экран работает только с интернетом. Без сети можно искать препараты и смотреть, где они лежат;
          добавление, реестр Молдовы и международные базы недоступны.
        </p>
      ) : null}
      {unknownToken ? (
        <p role="alert" className={noteClass}>
          Такой коробки нет в сохранённых данных. Если коробку создали недавно, откройте приложение с интернетом.
        </p>
      ) : null}

      {view.tab === "search" ? (
        <OfflineSearch snapshot={snapshot} catalog={catalog} view={view} go={go} today={today} />
      ) : view.tab === "boxes" ? (
        <OfflineBoxes
          snapshot={snapshot}
          boxId={view.boxId ?? tokenBox}
          cellId={view.cellId}
          // An unknown sticker must not look as if it opened the first box.
          preselect={!unknownToken}
          go={go}
          today={today}
        />
      ) : (
        <OfflineScan scan={view.scan} go={go} origins={origins} />
      )}
    </>
  );
}
