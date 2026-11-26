"use client";

import { useCallback, useState, type FormEvent } from "react";
import { parseBarcode } from "@/lib/barcode";
import type { ScanKind } from "@/lib/offline/view";
import { QR_ERRORS, parseBoxQr } from "@/lib/qr";
import { BarcodeScanner } from "../BarcodeScanner";
import { FormField, fieldAria } from "../FormField";
import { inputClass, primaryButtonClass, sectionTitleClass, secondaryButtonClass } from "../ui";
import { noteClass, tabClass, type Go } from "./shared";

const MODES: readonly { kind: ScanKind; label: string }[] = [
  { kind: "qr", label: "QR коробки" },
  { kind: "barcode", label: "Штрихкод" },
];

/** The same scanner as online; what it reads is looked up on the device. */
export function OfflineScan({ scan, go, origins }: { scan: ScanKind; go: Go; origins: string[] }) {
  // The camera starts only on request: this tab is also reached without wanting it.
  const [camera, setCamera] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const found = useCallback(
    (value: string) => {
      if (scan === "qr") go({ tab: "boxes", token: value });
      else go({ tab: "search", q: value });
    },
    [go, scan],
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = String(new FormData(event.currentTarget).get("value") ?? "");
    if (scan === "qr") {
      const parsed = parseBoxQr(value, origins);
      if (parsed.ok) return found(parsed.token);
      setError(QR_ERRORS[parsed.error]);
    } else {
      const parsed = parseBarcode(value);
      if (parsed.ok) return found(parsed.value);
      setError(parsed.error);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label="Что сканировать" className="grid grid-cols-2 gap-1 rounded-button bg-tint p-1 lg:max-w-105">
        {MODES.map((m) => (
          <button
            key={m.kind}
            type="button"
            aria-pressed={m.kind === scan}
            onClick={() => {
              setError(undefined);
              go({ tab: "scan", scan: m.kind }, { replace: true });
            }}
            className={`${tabClass} ${m.kind === scan ? "bg-surface" : "hover:bg-surface/60"}`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-5">
        <section aria-labelledby="offline-camera" className="flex flex-col gap-3">
          <h2 id="offline-camera" className={sectionTitleClass}>
            Камера
          </h2>
          {camera ? (
            // The key restarts the camera for the other mode.
            <BarcodeScanner key={scan} kind={scan} onFound={found} />
          ) : (
            <button type="button" onClick={() => setCamera(true)} className={`${secondaryButtonClass} lg:self-start lg:min-w-56`}>
              Включить камеру
            </button>
          )}
          {scan === "barcode" ? (
            <p className={noteClass}>
              Без сети штрихкод ищется только среди ваших препаратов. Реестр Молдовы и международные базы доступны с
              интернетом.
            </p>
          ) : null}
        </section>

        <section aria-labelledby="offline-manual" className="flex flex-col gap-3 lg:rounded-card lg:border lg:border-border lg:bg-surface lg:p-6">
          <h2 id="offline-manual" className={sectionTitleClass}>
            {scan === "qr" ? "Или вставьте ссылку" : "Или введите штрихкод"}
          </h2>
          {/* method="get": nothing is sent, so the offline guard lets it through. */}
          <form key={scan} method="get" onSubmit={submit} className="flex flex-col gap-3" noValidate>
            <FormField
              label={scan === "qr" ? "Ссылка с наклейки или код коробки" : "Цифры под штрихкодом"}
              htmlFor="value"
              error={error}
            >
              <input
                {...fieldAria("value", error)}
                name="value"
                type="text"
                inputMode={scan === "qr" ? "url" : "numeric"}
                maxLength={500}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                enterKeyHint="search"
                className={inputClass}
              />
            </FormField>
            <button type="submit" className={`${primaryButtonClass} lg:self-start lg:min-w-56`}>
              {scan === "qr" ? "Открыть коробку" : "Найти по штрихкоду"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
