"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { addPageHref } from "@/lib/add-href";
import { parseBarcode } from "@/lib/barcode";
import { getSiteUrlOverride } from "@/lib/env";
import { QR_ERRORS, allowedQrOrigins, boxQrPath, parseBoxQr } from "@/lib/qr";
import { secondaryButtonClass } from "./ui";

// Camera scanner, two modes:
//   kind="barcode" — EAN/UPC of a medication pack (Add screen, "Скан" tab);
//   kind="qr"      — Local Pharm box sticker (Storage → "Скан QR коробки").
// A QR is read with our own parser (lib/qr.ts): only this site's /q/<token>
// opens a box; any other QR shows "Это не наклейка Local Pharm" and the
// camera keeps scanning — the app never goes to an address from a foreign QR.
//
// Decoder: the browser's BarcodeDetector where it exists and knows the format
// (Chrome on Android, macOS); everywhere else — iOS Safari, Firefox, desktop
// Linux/Windows Chrome — ZXing (@zxing/browser / @zxing/library), loaded with
// import() only when the scanner is open, so other screens never download it.
// The camera stops when the component unmounts (another tab, navigation),
// when the page is hidden, and as soon as a code is read.

type Status =
  | "starting"
  | "scanning"
  | "found"
  | "paused"
  | "insecure"
  | "unsupported"
  | "denied"
  | "no-camera"
  | "busy"
  | "load-failed"
  | "error";

export type ScanKind = "barcode" | "qr";

const MANUAL: Record<ScanKind, { lower: string; upper: string }> = {
  barcode: { lower: "введите штрихкод вручную", upper: "Введите штрихкод вручную" },
  qr: { lower: "вставьте ссылку с наклейки вручную", upper: "Вставьте ссылку с наклейки вручную" },
};

function messages(kind: ScanKind): Partial<Record<Status, string>> {
  const { lower, upper } = MANUAL[kind];
  return {
    insecure: `Камера работает только на защищённом адресе (https://). Откройте приложение по https-ссылке или ${lower}.`,
    unsupported: `Этот браузер не даёт доступ к камере. ${upper}.`,
    denied: `Нет доступа к камере. Разрешите его в настройках браузера для этого сайта и нажмите «Попробовать снова» — или ${lower}.`,
    "no-camera": `Камера не найдена. ${upper}.`,
    busy: "Камера занята другим приложением. Закройте его и нажмите «Попробовать снова».",
    "load-failed": "Не удалось загрузить сканер. Проверьте интернет и нажмите «Попробовать снова».",
    error: `Не удалось включить камеру. Нажмите «Попробовать снова» или ${lower}.`,
    paused: "Камера выключена.",
  };
}

const HINTS: Record<ScanKind, { aim: string; found: string }> = {
  barcode: { aim: "Наведите камеру на штрихкод", found: "Штрихкод прочитан, ищем…" },
  qr: { aim: "Наведите камеру на QR-код коробки", found: "QR прочитан, открываем коробку…" },
};

/** Downscale factors tried in turn by the ZXing QR loop (see the comment there). */
const QR_SCALES = [1, 2, 3, 4];

/** How long "Это не наклейка Local Pharm" stays on the camera after a foreign QR. */
const FOREIGN_HINT_MS = 2500;

const RETRYABLE: Status[] = ["denied", "busy", "load-failed", "error", "paused"];

function cameraErrorStatus(e: unknown): Status {
  const name = e instanceof DOMException || e instanceof Error ? e.name : "";
  if (name === "NotAllowedError" || name === "SecurityError" || name === "PermissionDeniedError") return "denied";
  if (name === "NotFoundError" || name === "OverconstrainedError" || name === "DevicesNotFoundError") return "no-camera";
  if (name === "NotReadableError" || name === "TrackStartError" || name === "AbortError") return "busy";
  return "error";
}

// Minimal typing of the native API (not in TypeScript's DOM lib yet).
type NativeDetector = { detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]> };
type NativeDetectorCtor = {
  new (options: { formats: string[] }): NativeDetector;
  getSupportedFormats(): Promise<string[]>;
};
/** Native formats per mode; the first one must be supported to use the native API. */
const NATIVE_FORMATS: Record<ScanKind, string[]> = {
  barcode: ["ean_13", "ean_8", "upc_a"],
  qr: ["qr_code"],
};

type Props = {
  kind?: ScanKind;
  /** Barcode mode: kept in the result URL ("Добавить сюда"). */
  box?: string;
  cell?: string;
  /**
   * Takes the result (box token or barcode) instead of opening a server page:
   * the offline page looks it up on the device. Must be a stable function.
   */
  onFound?: (value: string) => void;
};

export function BarcodeScanner({ kind = "barcode", box, cell, onFound }: Props) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<Status>("starting");
  const [attempt, setAttempt] = useState(0);
  const [foreign, setForeign] = useState(false);
  const foreignTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(foreignTimer.current), []);

  // Pause when the page is hidden (app switch, locked phone): frees the camera.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") setStatus((s) => (s === "scanning" || s === "starting" ? "paused" : s));
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const active = status === "starting" || status === "scanning";

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let stream: MediaStream | null = null;
    let stopDecoder: (() => void) | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const stopAll = () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      stopDecoder?.();
      stream?.getTracks().forEach((t) => t.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    };

    const onText = (text: string) => {
      if (cancelled) return;
      if (kind === "qr") {
        const parsed = parseBoxQr(text, allowedQrOrigins(window.location.origin, getSiteUrlOverride()));
        if (!parsed.ok) {
          // Someone else's QR: say so, never open it, keep scanning.
          setForeign(true);
          clearTimeout(foreignTimer.current);
          foreignTimer.current = setTimeout(() => setForeign(false), FOREIGN_HINT_MS);
          return;
        }
        stopAll();
        setForeign(false);
        setStatus("found");
        if (onFound) onFound(parsed.token);
        else router.push(boxQrPath(parsed.token));
        return;
      }
      const parsed = parseBarcode(text);
      if (!parsed.ok) return; // misread or a non-retail code: keep scanning
      stopAll();
      setStatus("found");
      if (onFound) onFound(parsed.value);
      else router.push(addPageHref({ mode: "scan", code: parsed.value, box, cell }));
    };

    (async () => {
      if (!window.isSecureContext) return setStatus("insecure");
      if (!navigator.mediaDevices?.getUserMedia) return setStatus("unsupported");
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
      } catch (e) {
        if (!cancelled) setStatus(cameraErrorStatus(e));
        return;
      }
      if (cancelled) return stream.getTracks().forEach((t) => t.stop());
      const video = videoRef.current;
      if (!video) return stopAll();

      const Native = (window as unknown as { BarcodeDetector?: NativeDetectorCtor }).BarcodeDetector;
      let native: NativeDetector | null = null;
      if (Native) {
        try {
          const supported = await Native.getSupportedFormats();
          const wanted = NATIVE_FORMATS[kind];
          const formats = wanted.filter((f) => supported.includes(f));
          if (formats.includes(wanted[0])) native = new Native({ formats });
        } catch {
          native = null;
        }
      }

      if (native) {
        video.srcObject = stream;
        await video.play().catch(() => undefined);
        if (cancelled) return;
        setStatus("scanning");
        const tick = async () => {
          if (cancelled) return;
          try {
            if (video.readyState >= 2) {
              const codes = await native.detect(video);
              for (const c of codes) onText(c.rawValue);
            }
          } catch {
            // a frame that cannot be read — try the next one
          }
          if (!cancelled) timer = setTimeout(tick, 200);
        };
        tick();
        return;
      }

      try {
        if (kind === "qr") {
          // ZXing-js finds a QR only when a module is ≤ ~4 px in the image it
          // gets; a sticker held close to the camera is much bigger. So every
          // tick decodes the frame at one of several sizes (full, ½, ⅓, ¼).
          const { BinaryBitmap, DecodeHintType, HybridBinarizer, QRCodeReader, RGBLuminanceSource } =
            await import("@zxing/library");
          if (cancelled) return;
          video.srcObject = stream;
          await video.play().catch(() => undefined);
          if (cancelled) return;
          setStatus("scanning");
          const reader = new QRCodeReader();
          const hints = new Map([[DecodeHintType.TRY_HARDER, true]]);
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          let step = 0;
          const tick = () => {
            if (cancelled) return;
            if (ctx && video.readyState >= 2 && video.videoWidth > 0) {
              const f = QR_SCALES[step++ % QR_SCALES.length];
              const w = Math.max(1, Math.round(video.videoWidth / f));
              const h = Math.max(1, Math.round(video.videoHeight / f));
              canvas.width = w;
              canvas.height = h;
              ctx.drawImage(video, 0, 0, w, h);
              const { data } = ctx.getImageData(0, 0, w, h);
              const lum = new Uint8ClampedArray(w * h);
              for (let i = 0; i < lum.length; i++) {
                lum[i] = (data[i * 4] * 299 + data[i * 4 + 1] * 587 + data[i * 4 + 2] * 114) / 1000;
              }
              try {
                const bitmap = new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(lum, w, h)));
                onText(reader.decode(bitmap, hints).getText());
              } catch {
                // no QR at this size — the next tick tries another one
              }
              reader.reset();
            }
            if (!cancelled) timer = setTimeout(tick, 120);
          };
          tick();
          return;
        }

        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
          import("@zxing/browser"),
          import("@zxing/library"),
        ]);
        if (cancelled) return;
        const formats = [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A];
        const hints = new Map<unknown, unknown>([
          [DecodeHintType.POSSIBLE_FORMATS, formats],
          [DecodeHintType.TRY_HARDER, true],
        ]);
        const reader = new BrowserMultiFormatReader(hints as Map<never, unknown>, {
          delayBetweenScanAttempts: 150,
        });
        const controls = await reader.decodeFromStream(stream, video, (result) => {
          if (result) onText(result.getText());
        });
        stopDecoder = () => controls.stop();
        if (cancelled) return stopAll();
        setStatus("scanning");
      } catch (e) {
        stopAll();
        const loadError = e instanceof Error && /chunk|import|fetch/i.test(`${e.name} ${e.message}`);
        setStatus(loadError ? "load-failed" : "error");
      }
    })();

    return stopAll;
  }, [active, attempt, router, box, cell, kind, onFound]);

  const message = messages(kind)[status];
  const hint = HINTS[kind];
  const showVideo = status === "starting" || status === "scanning" || status === "found";

  return (
    <div className="flex flex-col gap-3">
      <div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-card bg-navy lg:max-w-md">
        <video
          ref={videoRef}
          muted
          playsInline
          aria-label="Изображение с камеры"
          className={`absolute inset-0 size-full object-cover ${showVideo ? "" : "hidden"}`}
        />
        {showVideo ? (
          <>
            <div
              aria-hidden="true"
              className={`relative rounded-field border-2 border-accent ${
                kind === "qr" ? "aspect-square h-3/5" : "h-2/5 w-3/4"
              }`}
            />
            {/* Navy plate under the hint: the camera picture may be light. */}
            <p className="absolute inset-x-3 bottom-3 flex justify-center" role="status">
              <span className="rounded-tag bg-navy/85 px-3 py-1.5 text-center text-[13px] text-white">
                {status === "starting"
                  ? "Включаем камеру…"
                  : status === "found"
                    ? hint.found
                    : foreign
                      ? `${QR_ERRORS.foreign} Наведите камеру на QR-код коробки.`
                      : hint.aim}
              </span>
            </p>
          </>
        ) : (
          <p role="alert" className="px-5 text-center text-[13px] leading-normal text-white">
            {message}
          </p>
        )}
      </div>
      {RETRYABLE.includes(status) ? (
        <button
          type="button"
          onClick={() => {
            setAttempt((n) => n + 1);
            setStatus("starting");
          }}
          className={`${secondaryButtonClass} lg:max-w-md`}
        >
          {status === "paused" ? "Включить камеру" : "Попробовать снова"}
        </button>
      ) : null}
    </div>
  );
}
