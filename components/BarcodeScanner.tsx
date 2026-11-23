"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { addPageHref } from "@/lib/add-href";
import { parseBarcode } from "@/lib/barcode";
import { secondaryButtonClass } from "./ui";

// Camera barcode scanner for the Add screen ("Скан" tab).
//
// Decoder: the browser's BarcodeDetector where it exists and knows EAN
// (Chrome on Android, macOS); everywhere else — iOS Safari, Firefox, desktop
// Linux/Windows Chrome — ZXing (@zxing/browser), loaded with import() only
// when this tab is open, so other screens never download it.
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

const MESSAGES: Partial<Record<Status, string>> = {
  insecure:
    "Камера работает только на защищённом адресе (https://). Откройте приложение по https-ссылке или введите штрихкод вручную.",
  unsupported: "Этот браузер не даёт доступ к камере. Введите штрихкод вручную.",
  denied:
    "Нет доступа к камере. Разрешите его в настройках браузера для этого сайта и нажмите «Попробовать снова» — или введите штрихкод вручную.",
  "no-camera": "Камера не найдена. Введите штрихкод вручную.",
  busy: "Камера занята другим приложением. Закройте его и нажмите «Попробовать снова».",
  "load-failed": "Не удалось загрузить сканер. Проверьте интернет и нажмите «Попробовать снова».",
  error: "Не удалось включить камеру. Нажмите «Попробовать снова» или введите штрихкод вручную.",
  paused: "Камера выключена.",
};

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
const NATIVE_FORMATS = ["ean_13", "ean_8", "upc_a"];

type Props = {
  /** Kept in the result URL ("Добавить сюда"). */
  box?: string;
  cell?: string;
};

export function BarcodeScanner({ box, cell }: Props) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<Status>("starting");
  const [attempt, setAttempt] = useState(0);

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
      const parsed = parseBarcode(text);
      if (!parsed.ok) return; // misread or a non-retail code: keep scanning
      stopAll();
      setStatus("found");
      router.push(addPageHref({ mode: "scan", code: parsed.value, box, cell }));
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
          const formats = NATIVE_FORMATS.filter((f) => supported.includes(f));
          if (formats.includes("ean_13")) native = new Native({ formats });
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
        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
          import("@zxing/browser"),
          import("@zxing/library"),
        ]);
        if (cancelled) return;
        const hints = new Map<unknown, unknown>([
          [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A]],
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
  }, [active, attempt, router, box, cell]);

  const message = MESSAGES[status];
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
            <div aria-hidden="true" className="relative h-2/5 w-3/4 rounded-field border-2 border-accent" />
            {/* Navy plate under the hint: the camera picture may be light. */}
            <p className="absolute inset-x-3 bottom-3 flex justify-center" role="status">
              <span className="rounded-tag bg-navy/85 px-3 py-1.5 text-center text-[13px] text-white">
                {status === "starting"
                  ? "Включаем камеру…"
                  : status === "found"
                    ? "Штрихкод прочитан, ищем…"
                    : "Наведите камеру на штрихкод"}
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
