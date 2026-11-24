import { packsShort } from "@/lib/format";
import { boxColorClasses } from "@/lib/storage/box-colors";
import { CountChip } from "./Badge";
import { DesktopSelectLink } from "./DesktopSelectLink";

type Props = {
  box: { id: string; name: string; number: string | null; color: string | null; packCount: number };
  /** Muted line under the name: categories on "Хранение", the zone on the home screen. */
  subtitle: string;
  /** Marks the box shown in the desktop panel of "Хранение". */
  selected?: boolean;
};

/**
 * Box tile shared by "Хранение" and the home screen: number plate, name,
 * muted subtitle and the pack count chip. Mobile: opens /storage/[id]; desktop
 * (lg): selects the box in the panel of /storage (`?box=`).
 */
export function BoxTile({ box, subtitle, selected }: Props) {
  return (
    <DesktopSelectLink
      href={`/storage/${box.id}`}
      desktopHref={`/storage?box=${box.id}`}
      selected={selected}
      className="flex h-full min-h-28 flex-col gap-3 rounded-card border border-border bg-surface p-3.5 text-navy no-underline hover:bg-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy lg:data-[selected=true]:border-navy lg:data-[selected=true]:ring-2 lg:data-[selected=true]:ring-navy"
    >
      <span className="flex items-center justify-between gap-2">
        <span
          className={`flex size-9 items-center justify-center rounded-field text-sm font-bold ${boxColorClasses(box.color)}`}
        >
          {box.number ?? "•"}
        </span>
        <CountChip text={packsShort(box.packCount)} />
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-base leading-snug font-bold break-words">{box.name}</span>
        {subtitle ? <span className="text-xs leading-snug text-muted">{subtitle}</span> : null}
      </span>
    </DesktopSelectLink>
  );
}
