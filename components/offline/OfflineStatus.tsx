"use client";

import { useEffect, useState } from "react";
import { snapshotTimeLabel } from "@/lib/offline/snapshot";
import { secondaryButtonSmClass } from "../ui";
import { useOnline } from "../pwa/useOnline";

type Connection = "checking" | "offline" | "unreachable" | "online";

/**
 * Is the server really there? `navigator.onLine` is also true on a Wi-Fi with no
 * internet, so a HEAD request (never served from the cache) decides.
 */
function useConnection(): { connection: Connection; check: () => void } {
  const online = useOnline();
  const [reachable, setReachable] = useState<boolean | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!online) return;
    let cancelled = false;
    fetch("/manifest.webmanifest", { method: "HEAD", cache: "no-store", signal: AbortSignal.timeout(5000) }).then(
      (res) => !cancelled && setReachable(res.ok),
      () => !cancelled && setReachable(false),
    );
    return () => {
      cancelled = true;
    };
  }, [online, attempt]);

  const connection = !online ? "offline" : reachable === null ? "checking" : reachable ? "online" : "unreachable";
  return { connection, check: () => setAttempt((n) => n + 1) };
}

const TITLE: Record<Connection, string> = {
  checking: "Проверяем сеть…",
  offline: "Нет сети",
  unreachable: "Нет связи с сервером",
  online: "Сеть есть",
};

/** The top strip: connection state, the time of the data, and the way back. */
export function OfflineStatus({ savedAt, from }: { savedAt: string | null; from: string | null }) {
  const { connection, check } = useConnection();
  const time = savedAt ? snapshotTimeLabel(savedAt) : "";
  const online = connection === "online";

  return (
    <div className={online ? "bg-tint" : "bg-warn-bg text-warn-fg"}>
      <div className="mx-auto flex min-h-14 w-full max-w-md items-center justify-between gap-3 px-5 py-1.5 lg:max-w-[1160px] lg:px-10">
        <p role="status" className="min-w-0 text-[13px] leading-snug font-semibold">
          {TITLE[connection]}
          {time ? ` · данные на ${time}` : ""}
        </p>
        {/* A full navigation: online it opens the real screen, otherwise this page again. */}
        <a
          href={from ?? "/"}
          onClick={check}
          className={`${secondaryButtonSmClass} flex-none`}
        >
          {online ? "Открыть приложение" : "Повторить"}
        </a>
      </div>
    </div>
  );
}
