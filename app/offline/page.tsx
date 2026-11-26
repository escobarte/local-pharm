import type { Metadata } from "next";
import { Suspense } from "react";
import { OfflineApp } from "@/components/offline/OfflineApp";

export const metadata: Metadata = { title: "Без сети — Local Pharm" };

/**
 * The offline copy of the app. Statically prerendered and data-free: the service
 * worker stores it and opens it when a page cannot be loaded. Everything it
 * shows comes from the snapshot on this device (lib/offline).
 */
export default function OfflinePage() {
  return (
    <Suspense fallback={<p className="p-5 text-[15px] text-muted">Открываем сохранённые данные…</p>}>
      <OfflineApp />
    </Suspense>
  );
}
