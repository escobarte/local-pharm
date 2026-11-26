"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { requestSync } from "@/lib/offline/browser";

type Props = {
  userId: string;
  /**
   * Changes whenever the server renders the app layout again — which is what a
   * successful Server Action causes (revalidatePath / redirect).
   */
  stamp: number;
};

/** Opening home, search or storage refreshes the snapshot (rate-limited). */
const refreshes = (path: string) => path === "/" || path === "/search" || path === "/storage" || path.startsWith("/storage/");

/** Keeps the offline snapshot on the device current. Renders nothing. */
export function SnapshotSync({ userId, stamp }: Props) {
  const pathname = usePathname();
  const seenStamp = useRef(stamp);

  // First open of the app, and another account (its predecessor's data goes at once).
  useEffect(() => {
    void requestSync(userId);
  }, [userId]);

  useEffect(() => {
    if (refreshes(pathname)) void requestSync(userId);
  }, [userId, pathname]);

  useEffect(() => {
    if (seenStamp.current === stamp) return;
    seenStamp.current = stamp;
    void requestSync(userId, true);
  }, [userId, stamp]);

  useEffect(() => {
    const again = () => {
      if (document.visibilityState === "visible") void requestSync(userId);
    };
    window.addEventListener("online", again);
    document.addEventListener("visibilitychange", again);
    return () => {
      window.removeEventListener("online", again);
      document.removeEventListener("visibilitychange", again);
    };
  }, [userId]);

  return null;
}
