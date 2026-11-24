import type { ComponentType } from "react";
import { IconCart, IconClock, IconHome, IconPlus, IconStorage } from "./icons";

/** Menu badges: open shopping items and packs that are expired or expiring (lib/nav-counts.ts). */
export type NavCounts = { shopping: number; expiry: number };

/** Sections shared by the bottom menu (mobile) and the side menu (desktop). */
export type NavItem = {
  href: string;
  label: string;
  Icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  /** The "+" action: a round button on mobile, an accent button on desktop. */
  primary?: boolean;
  /** Which counter shows as a small badge on this item. */
  badge?: keyof NavCounts;
};

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", label: "Главная", Icon: IconHome },
  { href: "/storage", label: "Хранение", Icon: IconStorage },
  { href: "/add", label: "Добавить препарат", Icon: IconPlus, primary: true },
  { href: "/expiry", label: "Сроки", Icon: IconClock, badge: "expiry" },
  { href: "/shopping", label: "Покупки", Icon: IconCart, badge: "shopping" },
];

export function isNavActive(pathname: string, href: string): boolean {
  // Home owns the search flow: results and medication cards belong to it.
  if (href === "/") {
    return pathname === "/" || pathname.startsWith("/search") || pathname.startsWith("/medications");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
