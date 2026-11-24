"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconPlus } from "./icons";
import { badgeText } from "@/lib/shopping/logic";
import { NAV_ITEMS, isNavActive, type NavCounts } from "./nav";

/** Mobile menu. From lg (1024 px) the side menu replaces it (components/SideNav.tsx). */
export function BottomNav({ counts }: { counts?: NavCounts | null }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Основная навигация"
      className="sticky bottom-0 z-10 border-t border-tint bg-surface pb-[calc(env(safe-area-inset-bottom)+10px)] shadow-nav lg:hidden print:hidden"
    >
      <ul className="mx-auto flex max-w-md items-end px-2 pt-2">
        {NAV_ITEMS.map((item) => {
          const active = isNavActive(pathname, item.href);
          const badge = item.badge ? badgeText(counts?.[item.badge]) : null;
          if (item.primary) {
            return (
              <li key={item.href} className="flex flex-1 justify-center">
                <Link
                  href={item.href}
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                  className="-mt-6 flex size-14 items-center justify-center rounded-full bg-accent text-navy shadow-fab focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
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
                  active ? "font-bold text-navy" : "font-medium text-muted"
                }`}
              >
                <span className="relative text-navy">
                  <item.Icon fillClassName={active ? "fill-accent/60" : "fill-accent/20"} />
                  {badge ? (
                    <span
                      aria-hidden="true"
                      className="absolute -top-1 left-[calc(100%-10px)] flex h-4 min-w-4 items-center justify-center rounded-full bg-navy px-1 text-[10px] leading-none font-bold text-white"
                    >
                      {badge}
                    </span>
                  ) : null}
                </span>
                {item.label}
                {badge ? <span className="sr-only">, {badge}</span> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
