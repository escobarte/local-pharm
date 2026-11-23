import { headers } from "next/headers";
import { getSiteUrlOverride } from "@/lib/env";
import { boxQrUrl, originFromHeaders, qrOrigin } from "@/lib/qr";
import { QrCode } from "./QrCode";

/**
 * Small QR of a box (server-rendered, no client JS): the same URL the sticker
 * gets — NEXT_PUBLIC_SITE_URL if set, else the address the page is open at.
 */
export async function BoxQrPreview({ token, className }: { token: string; className?: string }) {
  const h = await headers();
  const current = originFromHeaders({
    host: h.get("host"),
    forwardedHost: h.get("x-forwarded-host"),
    forwardedProto: h.get("x-forwarded-proto"),
  });
  const origin = qrOrigin(getSiteUrlOverride(), current ?? "");
  if (!origin) return null;
  return <QrCode value={boxQrUrl(origin, token)} quietZone={2} className={className} />;
}
