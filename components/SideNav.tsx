"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconPill } from "./icons";
import { badgeText } from "@/lib/shopping/logic";
import { NAV_ITEMS, isNavActive, type NavCounts } from "./nav";

type Props = {
  email: string;
  /** Server Action that ends the session on this device. */
  signOutAction: () => Promise<void>;
  /** Badges for "Сроки" and "Покупки"; null = unknown (no badges). */
  counts?: NavCounts | null;
};

const focus =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

/**
 * Desktop menu (from lg, 1024 px), the only one of its kind: below lg it is
 * hidden and BottomNav takes over. The active section follows the route.
 */
export function SideNav({ email, signOutAction, counts }: Props) {
  const pathname = usePathname();
  const sections = NAV_ITEMS.filter((i) => !i.primary);
  const add = NAV_ITEMS.find((i) => i.primary);
  const initial = email.trim().charAt(0).toUpperCase() || "•";

  return (
    <aside className="hidden w-62 flex-none flex-col gap-6 bg-navy px-4 py-6 text-white lg:sticky lg:top-0 lg:flex lg:h-dvh print:hidden">
      <Link
        href="/"
        className={`flex items-center gap-3 rounded-field px-1.5 py-1 text-[17px] font-bold text-white no-underline ${focus}`}
      >
        <span className="flex size-9 flex-none items-center justify-center rounded-field bg-accent text-navy">
          <IconPill size={20} />
        </span>
        Local Pharm
      </Link>

      <nav aria-label="Основная навигация">
        <ul className="flex flex-col gap-1">
          {sections.map((item) => {
            const active = isNavActive(pathname, item.href);
            const badge = item.badge ? badgeText(counts?.[item.badge]) : null;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-11 items-center gap-3 rounded-field px-3.5 text-[15px] no-underline ${focus} ${
                    active
                      ? "bg-accent font-semibold text-navy"
                      : "font-medium text-tint hover:bg-surface/10"
                  }`}
                >
                  <item.Icon size={20} />
                  {item.label}
                  {badge ? (
                    <>
                      <span
                        aria-hidden="true"
                        className={`ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs leading-none font-bold ${
                          active ? "bg-navy text-white" : "bg-surface text-navy"
                        }`}
                      >
                        {badge}
                      </span>
                      <span className="sr-only">, {badge}</span>
                    </>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex-1" />

      {add ? (
        <Link
          href={add.href}
          aria-current={isNavActive(pathname, add.href) ? "page" : undefined}
          className={`flex min-h-12 items-center justify-center gap-2 rounded-button bg-accent px-5 text-[15px] font-semibold text-navy no-underline hover:bg-accent/90 ${focus}`}
        >
          <add.Icon size={20} />
          {add.label}
        </Link>
      ) : null}

      <div className="flex items-center gap-2.5 border-t border-surface/20 px-1.5 pt-3">
        <span
          aria-hidden="true"
          className="flex size-8 flex-none items-center justify-center rounded-full bg-accent text-[13px] font-bold text-navy"
        >
          {initial}
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[13px] text-white" title={email || undefined}>
            {email || "Аккаунт"}
          </span>
          <form action={signOutAction}>
            <button
              type="submit"
              className={`-ml-1 flex min-h-11 items-center rounded-field px-1 text-xs text-tint hover:text-white ${focus}`}
            >
              Выйти
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
