"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconCart, IconClock, IconHome, IconPlus, IconStorage } from "./icons";

const ITEMS = [
  { href: "/", label: "Главная", Icon: IconHome },
  { href: "/storage", label: "Хранение", Icon: IconStorage },
  { href: "/add", label: "Добавить препарат", Icon: IconPlus, primary: true },
  { href: "/expiry", label: "Сроки", Icon: IconClock },
  { href: "/shopping", label: "Покупки", Icon: IconCart },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Основная навигация"
      className="sticky bottom-0 z-10 border-t border-tint bg-surface pb-[calc(env(safe-area-inset-bottom)+10px)]"
    >
      <ul className="mx-auto flex max-w-md items-end px-2 pt-2">
        {ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          if ("primary" in item) {
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
