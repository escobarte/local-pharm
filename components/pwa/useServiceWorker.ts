"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SKIP_WAITING_MESSAGE, SW_PATH } from "@/lib/offline/sw";

/** How often returning to the app may ask the server for a new worker. */
const UPDATE_CHECK_MS = 5 * 60 * 1000;

/**
 * Registers /sw.js (production builds only; `next dev` has none) and reports a
 * new version. Nothing reloads by itself: the new worker waits until `apply()`.
 */
export function useServiceWorker() {
  const [available, setAvailable] = useState(false);
  const waiting = useRef<ServiceWorker | null>(null);
  const applying = useRef(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const container = navigator.serviceWorker;
    let controlled = Boolean(container.controller);
    let registration: ServiceWorkerRegistration | null = null;
    let checkedAt = Date.now();

    const offer = (worker: ServiceWorker) => {
      waiting.current = worker;
      setAvailable(true);
    };
    const onControllerChange = () => {
      if (applying.current) return window.location.reload();
      // Another tab updated: this one runs the old code until the person reloads.
      // The very first worker taking control is not an update.
      if (controlled) {
        waiting.current = null;
        setAvailable(true);
      }
      controlled = true;
    };
    const onVisible = () => {
      if (document.visibilityState !== "visible" || Date.now() - checkedAt < UPDATE_CHECK_MS) return;
      checkedAt = Date.now();
      registration?.update().catch(() => undefined);
    };

    container.addEventListener("controllerchange", onControllerChange);
    document.addEventListener("visibilitychange", onVisible);
    container
      .register(SW_PATH, { scope: "/", updateViaCache: "none" })
      .then((reg) => {
        registration = reg;
        // `controller` is null on the first install: then there is nothing to update.
        if (reg.waiting && container.controller) offer(reg.waiting);
        reg.addEventListener("updatefound", () => {
          const worker = reg.installing;
          worker?.addEventListener("statechange", () => {
            if (worker.state === "installed" && container.controller) offer(worker);
          });
        });
      })
      .catch((error) => console.warn("service worker:", error));

    return () => {
      container.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const apply = useCallback(() => {
    if (!waiting.current) return window.location.reload();
    applying.current = true;
    waiting.current.postMessage({ type: SKIP_WAITING_MESSAGE });
  }, []);

  return { available, apply, dismiss: () => setAvailable(false) };
}
