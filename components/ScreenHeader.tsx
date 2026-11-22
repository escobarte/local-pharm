import Link from "next/link";
import type { ReactNode } from "react";
import { IconBack, IconClose } from "./icons";
import { iconButtonClass } from "./ui";

type Props = {
  title: string;
  backHref: string;
  backLabel?: string;
  /** "close" renders ✕ (modal-like screens), default is a back arrow. */
  backIcon?: "back" | "close";
  /** Right slot: one 44 px control (or nothing; a spacer keeps the title centered). */
  right?: ReactNode;
  /**
   * The screen has no heading of its own: on desktop the title becomes the
   * page's 28 px <h1> under the back link. Without it the title is hidden on
   * desktop (the page already has a heading).
   */
  heading?: boolean;
};

export function ScreenHeader({
  title,
  backHref,
  backLabel,
  backIcon = "back",
  right,
  heading = false,
}: Props) {
  const label = backLabel ?? (backIcon === "close" ? "Закрыть" : "Назад");
  const Title = heading ? "h1" : "span";
  return (
    <header className="flex items-center justify-between px-3 pt-4 pb-2 lg:flex-wrap lg:gap-y-3 lg:px-0 lg:pt-0 lg:pb-6">
      <Link
        href={backHref}
        aria-label={label}
        className={`${iconButtonClass} lg:-ml-3 lg:w-auto lg:gap-1.5 lg:pr-3 lg:text-sm lg:font-semibold lg:no-underline`}
      >
        {backIcon === "close" ? <IconClose size={22} /> : <IconBack />}
        <span className="hidden lg:inline">{label}</span>
      </Link>
      <Title
        className={`text-[15px] font-semibold ${
          heading
            ? "lg:order-last lg:basis-full lg:text-[28px] lg:leading-tight lg:font-bold lg:tracking-[-0.3px]"
            : "lg:hidden"
        }`}
      >
        {title}
      </Title>
      {right ?? <span className="size-11 lg:hidden" aria-hidden="true" />}
    </header>
  );
}
