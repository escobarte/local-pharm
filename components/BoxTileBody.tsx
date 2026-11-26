import { packsShort } from "@/lib/format";
import { boxColorClasses } from "@/lib/storage/box-colors";
import { CountChip } from "./Badge";
import { IconStorage } from "./icons";

// The look of a box tile, shared by the online screens (a link) and the offline
// page (a button).

export type BoxTileInfo = { name: string; number: string | null; color: string | null; packCount: number };

export const boxTileClass =
  "flex h-full min-h-28 flex-col gap-3 rounded-card border border-border bg-surface p-3.5 text-navy no-underline hover:bg-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy lg:data-[selected=true]:border-navy lg:data-[selected=true]:ring-2 lg:data-[selected=true]:ring-navy";

/** Number plate and box icon, name, muted subtitle and the pack count chip. */
export function BoxTileBody({ box, subtitle }: { box: BoxTileInfo; subtitle: string }) {
  return (
    <>
      <span className="flex items-center justify-between gap-2">
        <span
          className={`flex size-9 items-center justify-center rounded-field text-sm font-bold ${boxColorClasses(box.color)}`}
        >
          {box.number ?? "•"}
        </span>
        {/* Own `surface` plate: on hover the tile turns `tint`, where box-icon is below 3:1. */}
        <span className="flex size-9 flex-none items-center justify-center rounded-field bg-surface text-box-icon">
          <IconStorage size={22} fillClassName="fill-none" />
        </span>
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-base leading-snug font-bold break-words">{box.name}</span>
        {subtitle ? <span className="text-xs leading-snug text-muted">{subtitle}</span> : null}
      </span>
      {/* Bottom of the tile: beside the number and the icon it would not fit a narrow phone. */}
      <CountChip text={packsShort(box.packCount)} className="mt-auto self-start" />
    </>
  );
}
