"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconPlus } from "./icons";
import { NAV_ITEMS, isNavActive } from "./nav";

/** Mobile menu. From lg (1024 px) the side menu replaces it (components/SideNav.tsx). */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Основная навигация"
      className="sticky bottom-0 z-10 border-t border-tint bg-surface pb-[calc(env(safe-area-inset-bottom)+10px)] lg:hidden print:hidden"
    >
      <ul className="mx-auto flex max-w-md items-end px-2 pt-2">
        {NAV_ITEMS.map((item) => {
          const active = isNavActive(pathname, item.href);
          if (item.primary) {
            return (
              <li key={item.href} className="flex flex-1 justify-center">
                <Link
                  href={item.href}
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                  className="-mt-6 flex size-14 items-center justify-center rounded-full bg-accent text-navy shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
                >
                  <IconPlus size={26} strokeWidth={2.2} />
                </Link>
              </li>
            );
          }
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-field text-[11px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy ${
                  active ? "font-semibold text-navy" : "font-medium text-muted"
                }`}
              >
                <item.Icon />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
