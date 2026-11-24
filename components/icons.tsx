import type { ReactNode } from "react";

// Line icons, stroke 1.8, 24 px (docs/BRAND.md). Decorative: aria-hidden.
type IconProps = { size?: number; strokeWidth?: number; className?: string };

function Svg({
  size = 24,
  strokeWidth = 1.8,
  className,
  children,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

/**
 * Duotone menu icons: an outline in `currentColor` plus a soft fill inside.
 * `fillClassName` picks the fill (an `fill-*` token class); the menus pass a denser one
 * for the active item. Defaults to the accent at 20%.
 */
type DuoProps = IconProps & { fillClassName?: string };
const DEFAULT_FILL = "fill-accent/20";

function Fill({ d, className }: { d: string; className?: string }) {
  return <path d={d} stroke="none" className={className ?? DEFAULT_FILL} />;
}

export const IconHome = ({ fillClassName, ...p }: DuoProps) => (
  <Svg {...p}>
    <Fill d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" className={fillClassName} />
    <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
  </Svg>
);
export const IconStorage = ({ fillClassName, ...p }: DuoProps) => (
  <Svg {...p}>
    <Fill d="M3 7l9-4 9 4v10l-9 4-9-4z" className={fillClassName} />
    <path d="M3 7l9-4 9 4v10l-9 4-9-4z" />
    <path d="M3 7l9 4 9-4M12 11v10" />
  </Svg>
);
export const IconPlus = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);
export const IconClock = ({ fillClassName, ...p }: DuoProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" stroke="none" className={fillClassName ?? DEFAULT_FILL} />
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Svg>
);
export const IconCart = ({ fillClassName, ...p }: DuoProps) => (
  <Svg {...p}>
    <Fill d="M6.5 7H21l-2 8H7.5z" className={fillClassName} />
    <circle cx="9" cy="20" r="1.5" />
    <circle cx="18" cy="20" r="1.5" />
    <path d="M3 4h2l2.5 11h11l2-8H6.5" />
  </Svg>
);
export const IconBack = (p: IconProps) => (
  <Svg {...p}>
    <path d="M15 18l-6-6 6-6" />
  </Svg>
);
export const IconClose = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
);
export const IconEdit = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17z" />
    <path d="M14.5 7.5l3 3" />
  </Svg>
);
export const IconCheck = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 12l5 5 9-10" />
  </Svg>
);
/** The app logo (side menu) and the "capsule" medication icon. */
export const IconPill = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="8" width="18" height="8" rx="4" transform="rotate(-45 12 12)" />
    <path d="M9.2 9.2l5.6 5.6" />
  </Svg>
);

export const IconSearch = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Svg>
);

export const IconQr = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="4" width="6" height="6" />
    <rect x="14" y="4" width="6" height="6" />
    <rect x="4" y="14" width="6" height="6" />
    <path d="M14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2" />
  </Svg>
);

export const IconPrint = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 9V4h10v5" />
    <rect x="3" y="9" width="18" height="8" rx="2" />
    <path d="M7 14h10v6H7z" />
  </Svg>
);

export const IconArrowRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Svg>
);

export const IconBarcode = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 6v12M8 6v12M13 6v12M17 6v12M20 6v12" />
  </Svg>
);

// ---- Medication icons by dosage form (lib/medications/form-icon.ts) ----
// Same style as above: line, stroke 1.8, 24 px. Color comes from the parent (`text-med-icon`).

export const IconTablet = (p: IconProps) => (
  <Svg {...p}>
    <ellipse cx="12" cy="9.5" rx="8.5" ry="4.5" />
    <path d="M3.5 9.5v4c0 2.5 3.8 4.5 8.5 4.5s8.5-2 8.5-4.5v-4" />
    <path d="M8.5 11.6l7-4.2" />
  </Svg>
);

export const IconSyrup = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9.5 3h5" />
    <path d="M10.5 3v4L8 10v9a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-9l-2.5-3V3" />
    <path d="M8 13.5h8" />
  </Svg>
);

export const IconDrops = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.2c3 3.7 5.6 6.6 5.6 10a5.6 5.6 0 0 1-11.2 0c0-3.4 2.6-6.3 5.6-10z" />
    <path d="M9.6 14.2a2.6 2.6 0 0 0 2 2.5" />
  </Svg>
);

export const IconOintment = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10 3h4v3h-4z" />
    <path d="M8 6h8l-1 12H9z" />
    <path d="M9 18h6v3H9z" />
  </Svg>
);

export const IconInjection = (p: IconProps) => (
  <Svg {...p}>
    <g transform="rotate(-45 12 12)">
      <rect x="6.5" y="9.5" width="10" height="5" rx="1" />
      <path d="M16.5 12H20M20 9.5v5M6.5 12H3M9.5 9.5v2M12.5 9.5v2" />
    </g>
  </Svg>
);

export const IconSpray = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 10h7v9.5a1.5 1.5 0 0 1-1.5 1.5h-4A1.5 1.5 0 0 1 8 19.5z" />
    <path d="M10 10V7h3v3M10 7V5h5" />
    <path d="M18 4.8h2.5M17.8 7.4l2.3 1M17.8 2.4l2.3-1" />
  </Svg>
);

export const IconPowder = (p: IconProps) => (
  <Svg {...p}>
    <rect x="5" y="3.5" width="14" height="17" rx="1.5" />
    <path d="M5 7.5h14M5 16.5h14" />
    <path d="M10 11.5h.01M14 11.5h.01M12 13.5h.01" />
  </Svg>
);

export const IconSuppository = (p: IconProps) => (
  <Svg {...p}>
    <g transform="rotate(-45 12 12)">
      <path d="M3.5 12c0-3 2.6-5.5 6.5-5.5h9.5v11H10c-3.9 0-6.5-2.5-6.5-5.5z" />
      <path d="M7.5 10.2c.6-.9 1.4-1.4 2.6-1.5" />
    </g>
  </Svg>
);

export const IconPatch = (p: IconProps) => (
  <Svg {...p}>
    <g transform="rotate(-45 12 12)">
      <rect x="2.5" y="8.5" width="19" height="7" rx="3.5" />
      <path d="M9 8.5v7M15 8.5v7" />
      <path d="M11 11h.01M13 11h.01M11 13h.01M13 13h.01" />
    </g>
  </Svg>
);
