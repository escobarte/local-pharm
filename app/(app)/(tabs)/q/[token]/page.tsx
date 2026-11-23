import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { findBoxIdByQrToken } from "@/lib/storage/queries";
import { isUuid } from "@/lib/storage/validation";

export const metadata: Metadata = { title: "Коробка — Local Pharm" };

type Props = { params: Promise<{ token: string }> };

/**
 * Target of a QR sticker: /q/<qr_token> → the box page. Protected like every
 * app screen (proxy sends a signed-out visitor to /login?next=/q/<token> and
 * back here after sign-in). The box is looked up under RLS; a malformed,
 * unknown or foreign token all end in the same "not found" page.
 */
export default async function QrPage({ params }: Props) {
  const { token } = await params;
  const boxId = isUuid(token) ? await findBoxIdByQrToken(token) : null;
  if (!boxId) notFound();
  redirect(`/storage/${boxId}`);
}
