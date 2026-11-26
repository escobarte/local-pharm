"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { wipeForSignOut, wipeOnAuthScreen } from "@/lib/offline/browser";
import { OFFLINE_SAVE_MESSAGE, OFFLINE_SIGN_OUT_MESSAGE, isBlockedOffline } from "@/lib/offline/guard";
import { IconClose } from "../icons";
import { iconButtonClass, primaryButtonSmClass } from "../ui";
import { useOnline } from "./useOnline";
import { useServiceWorker } from "./useServiceWorker";

type Blocked = { message: string; dialog: HTMLElement | null; at: number };

const NOTICE_MS = 6000;

/**
 * App-wide client behavior (root layout):
 *  - registers the service worker and offers "Доступна новая версия · Обновить";
 *  - stops data-changing forms while offline (no request, a message instead);
 *  - erases the offline snapshot on sign-out and on "no access".
 */
export function AppRuntime() {
  const pathname = usePathname();
  const online = useOnline();
  const update = useServiceWorker();
  const [blocked, setBlocked] = useState<Blocked | null>(null);

  useEffect(() => {
    if (pathname === "/login" || pathname === "/no-access") void wipeOnAuthScreen(pathname);
  }, [pathname]);

  // On `window` in the capture phase: runs before React sees the submit.
  useEffect(() => {
    function onSubmit(event: Event) {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      const signOut = form.hasAttribute("data-signout");
      if (isBlockedOffline(form.getAttribute("method"), navigator.onLine)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        setBlocked({
          message: signOut ? OFFLINE_SIGN_OUT_MESSAGE : OFFLINE_SAVE_MESSAGE,
          // Inside an open modal dialog the message must be part of it.
          dialog: form.closest<HTMLElement>("dialog[open]"),
          at: Date.now(),
        });
        return;
      }
      if (signOut) wipeForSignOut();
    }
    window.addEventListener("submit", onSubmit, true);
    return () => window.removeEventListener("submit", onSubmit, true);
  }, []);

  useEffect(() => {
    if (!blocked) return;
    const timer = setTimeout(() => setBlocked(null), NOTICE_MS);
    // A closed dialog takes its message with it.
    const close = () => setBlocked(null);
    blocked.dialog?.addEventListener("close", close);
    return () => {
      clearTimeout(timer);
      blocked.dialog?.removeEventListener("close", close);
    };
  }, [blocked]);

  const notice = blocked && !online ? (
    <p
      key={blocked.at}
      role="alert"
      className="pointer-events-auto rounded-card border border-warn-fg bg-warn-bg px-4 py-3 text-[13px] leading-normal font-semibold text-warn-fg"
    >
      {blocked.message}
    </p>
  ) : null;

  return (
    <>
      {notice && blocked?.dialog ? createPortal(<div className="mt-3">{notice}</div>, blocked.dialog) : null}
      {/* Mobile: above the bottom menu and the sticky "Сохранить" bar. Desktop: top right,
          because there "Сохранить" sits at the bottom right of a form. */}
      <div className="pointer-events-none fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+96px)] z-50 mx-auto flex max-w-md flex-col gap-2 lg:top-6 lg:right-6 lg:bottom-auto lg:left-auto lg:mx-0 lg:w-96 print:hidden">
        {notice && !blocked?.dialog ? notice : null}
        {update.available ? (
          <div
            role="status"
            className="pointer-events-auto flex items-center gap-2 rounded-card border border-navy bg-surface py-2 pr-2 pl-4 text-navy shadow-fab"
          >
            <p className="min-w-0 flex-1 text-[13px] leading-snug font-semibold">Доступна новая версия</p>
            <button type="button" onClick={update.apply} className={primaryButtonSmClass}>
              Обновить
            </button>
            <button type="button" onClick={update.dismiss} aria-label="Позже" className={`${iconButtonClass} flex-none`}>
              <IconClose size={20} />
            </button>
          </div>
        ) : null}
      </div>
    </>
  );
}
