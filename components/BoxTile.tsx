import { BoxTileBody, boxTileClass, type BoxTileInfo } from "./BoxTileBody";
import { DesktopSelectLink } from "./DesktopSelectLink";

type Props = {
  box: BoxTileInfo & { id: string };
  /** Muted line under the name: categories on "Хранение", the zone on the home screen. */
  subtitle: string;
  /** Marks the box shown in the desktop panel of "Хранение". */
  selected?: boolean;
};

/**
 * Box tile shared by "Хранение" and the home screen. Mobile: opens /storage/[id];
 * desktop (lg): selects the box in the panel of /storage (`?box=`).
 */
export function BoxTile({ box, subtitle, selected }: Props) {
  return (
    <DesktopSelectLink
      href={`/storage/${box.id}`}
      desktopHref={`/storage?box=${box.id}`}
      selected={selected}
      className={boxTileClass}
    >
      <BoxTileBody box={box} subtitle={subtitle} />
    </DesktopSelectLink>
  );
}
