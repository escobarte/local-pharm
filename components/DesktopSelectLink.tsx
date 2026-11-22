"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";

type Props = {
  /** Where the link goes everywhere (mobile, new tab, no JavaScript). */
  href: string;
  /** Where a plain click goes on desktop (from lg): same page, other `?selected=`. */
  desktopHref: string;
  className: string;
  /** Marks the item shown in the desktop detail panel (styled by the caller via data-selected). */
  selected?: boolean;
  children: ReactNode;
};

/** Matches Tailwind's `lg`; keep in sync with the `lg:` classes of the master-detail screens. */
const DESKTOP_QUERY = "(min-width: 1024px)";

/**
 * Master-detail link. On desktop a click only changes the query string of the
 * current page (the detail panel updates), on mobile it opens the full page.
 * Modified clicks (new tab, etc.) keep the normal `href`.
 */
export function DesktopSelectLink({ href, desktopHref, className, selected, children }: Props) {
  const router = useRouter();

  function onClick(e: MouseEvent<HTMLAnchorElement>) {
    if (e.defaultPrevented || e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (!window.matchMedia(DESKTOP_QUERY).matches) return;
    e.preventDefault();
    router.replace(desktopHref, { scroll: false });
  }

  return (
    <Link
      href={href}
      onClick={onClick}
      data-selected={selected ? "true" : undefined}
      className={className}
    >
      {children}
    </Link>
  );
}
