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
};

export function ScreenHeader({ title, backHref, backLabel, backIcon = "back", right }: Props) {
  return (
    <header className="flex items-center justify-between px-3 pt-4 pb-2">
      <Link
        href={backHref}
        aria-label={backLabel ?? (backIcon === "close" ? "Закрыть" : "Назад")}
        className={iconButtonClass}
      >
        {backIcon === "close" ? <IconClose size={22} /> : <IconBack />}
      </Link>
      <span className="text-[15px] font-semibold">{title}</span>
      {right ?? <span className="size-11" aria-hidden="true" />}
    </header>
  );
}
