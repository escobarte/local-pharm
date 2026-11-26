"use client";

import { OFFLINE_PATH } from "@/lib/offline/sw";
import { useOnline } from "./useOnline";

/** Thin "Нет сети" strip on top of the app screens while the connection is lost. */
export function OfflineBar() {
  const online = useOnline();
  if (online) return null;
  return (
    <div
      role="status"
      className="sticky top-0 z-20 flex min-h-11 items-center justify-between gap-3 bg-warn-bg px-5 text-[13px] font-semibold text-warn-fg lg:px-10 print:hidden"
    >
      <span>Нет сети</span>
      {/* A full navigation on purpose: the service worker answers it from the device. */}
      <a
        href={OFFLINE_PATH}
        className="flex min-h-11 items-center underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
      >
        Открыть сохранённые данные
      </a>
    </div>
  );
}
