import type { CSSProperties } from "react";
import { correction, generate } from "lean-qr/nano";
import { toSvgPath } from "lean-qr/extras/svg";

// QR code as inline SVG, built locally with lean-qr (no external service).
// No hooks and no "use client": renders on the server (box preview) and in
// the browser (print page) — only the pages that use it get the library.
//
// Error correction: at least M (~15 % of the code may be damaged).
// Dark modules use currentColor (navy from the text color), the quiet zone is
// the surface token, so the code stays scannable on any background.

type Props = {
  value: string;
  /** Quiet zone in modules around the code (the standard asks for 4). */
  quietZone?: number;
  className?: string;
  style?: CSSProperties;
  /** Accessible name; without it the code is decorative (aria-hidden). */
  label?: string;
};

export function QrCode({ value, quietZone = 4, className, style, label }: Props) {
  const code = generate(value, { minCorrectionLevel: correction.M });
  const side = code.size + quietZone * 2;
  return (
    <svg
      viewBox={`${-quietZone} ${-quietZone} ${side} ${side}`}
      shapeRendering="crispEdges"
      className={className}
      style={style}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <rect x={-quietZone} y={-quietZone} width={side} height={side} className="fill-surface" />
      <path d={toSvgPath(code)} fill="currentColor" />
    </svg>
  );
}
