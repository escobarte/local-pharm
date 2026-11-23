import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { FormField, fieldAria } from "@/components/FormField";
import { Page } from "@/components/Page";
import { ScreenHeader } from "@/components/ScreenHeader";
import { inputClass, primaryButtonClass, sectionTitleClass } from "@/components/ui";
import { getSiteUrlOverride } from "@/lib/env";
import { QR_ERRORS, allowedQrOrigins, boxQrPath, originFromHeaders, parseBoxQr } from "@/lib/qr";

export const metadata: Metadata = { title: "Скан QR коробки — Local Pharm" };

type Props = { searchParams: Promise<{ link?: string | string[] }> };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/**
 * Storage → "Скан QR коробки": camera (BarcodeScanner in QR mode) and, for
 * when the camera is not available, a field for the sticker's link or code.
 * The typed link goes through the same parser as the camera: only this site's
 * /q/<token> is opened, then /q/<token> finds the box under RLS.
 */
export default async function ScanBoxPage({ searchParams }: Props) {
  const raw = one((await searchParams).link);
  const link = raw?.slice(0, 500);

  let error: string | undefined;
  if (link !== undefined) {
    const h = await headers();
    const current = originFromHeaders({
      host: h.get("host"),
      forwardedHost: h.get("x-forwarded-host"),
      forwardedProto: h.get("x-forwarded-proto"),
    });
    const parsed = parseBoxQr(link, allowedQrOrigins(current ?? "", getSiteUrlOverride()));
    if (parsed.ok) redirect(boxQrPath(parsed.token));
    error = QR_ERRORS[parsed.error];
  }

  return (
    <Page>
      <ScreenHeader title="Скан QR коробки" backHref="/storage" backLabel="Назад к хранению" heading />
      <main className="flex flex-col gap-4 px-5 pb-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-5 lg:p-0">
        <section aria-labelledby="camera-title" className="flex flex-col gap-3">
          <h2 id="camera-title" className={`${sectionTitleClass} hidden lg:block`}>
            Камера
          </h2>
          <BarcodeScanner kind="qr" />
        </section>
        <section
          aria-labelledby="manual-link-title"
          className="flex flex-col gap-3 lg:rounded-card lg:border lg:border-border lg:bg-surface lg:p-6"
        >
          <h2 id="manual-link-title" className={sectionTitleClass}>
            Или вставьте ссылку
          </h2>
          <form action="/storage/scan" method="get" className="flex flex-col gap-3" noValidate>
            <FormField
              label="Ссылка с наклейки или код коробки"
              htmlFor="link"
              error={error}
              hint={error ? undefined : "Например, ссылка из приложения камеры. Код — 36 символов после /q/."}
            >
              <input
                {...fieldAria("link", error, "hint")}
                name="link"
                type="text"
                inputMode="url"
                maxLength={500}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                enterKeyHint="go"
                defaultValue={link}
                className={inputClass}
              />
            </FormField>
            <button type="submit" className={`${primaryButtonClass} lg:min-w-56 lg:self-start`}>
              Открыть коробку
            </button>
          </form>
        </section>
      </main>
    </Page>
  );
}
