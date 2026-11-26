// What the offline page shows, as URL parameters — and which of its views
// stands in for an app address that could not be loaded. Pure.

import { parseBarcode } from "../barcode.ts";
import { MAX_QUERY_LENGTH } from "../medications/search.ts";
import { parseBoxQr } from "../qr.ts";
import { safeNextPath } from "../routes.ts";
import { isUuid } from "../storage/validation.ts";
import { OFFLINE_PATH } from "./sw.ts";

export type OfflineTab = "search" | "boxes" | "scan";
export type ScanKind = "qr" | "barcode";

export type OfflineView = {
  tab: OfflineTab;
  q: string;
  categoryId: string | null;
  medicationId: string | null;
  boxId: string | null;
  cellId: string | null;
  /** A QR sticker token still to be looked up in the snapshot. */
  token: string | null;
  scan: ScanKind;
  /** The app address that was asked for, to return to when the network is back. */
  from: string | null;
  /** The asked-for screen has no offline version. */
  unavailable: boolean;
};

export const DEFAULT_VIEW: OfflineView = {
  tab: "search",
  q: "",
  categoryId: null,
  medicationId: null,
  boxId: null,
  cellId: null,
  token: null,
  scan: "qr",
  from: null,
  unavailable: false,
};

const id = (value: string | null) => (value && isUuid(value) ? value.toLowerCase() : null);
const text = (value: string | null) => (value ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_QUERY_LENGTH);

/** App address ("/storage/<id>?cell=<id>") → the offline view that answers it. */
export function viewFromPath(from: string, origins: readonly string[]): OfflineView {
  const path = safeNextPath(from);
  const url = new URL(path, "http://app.invalid");
  const parts = url.pathname.split("/").filter(Boolean);
  const p = url.searchParams;
  const view: OfflineView = { ...DEFAULT_VIEW, from: path === "/" ? null : path };
  const [section, second] = parts;

  if (!section) return view;
  if (section === "search") return { ...view, q: text(p.get("q")), categoryId: id(p.get("cat")) };
  if (section === "medications" && id(second ?? null)) return { ...view, medicationId: id(second) };
  if (section === "q") {
    const parsed = parseBoxQr(url.pathname, origins);
    return parsed.ok ? { ...view, tab: "boxes", token: parsed.token } : { ...view, tab: "boxes" };
  }
  if (section === "storage") {
    if (second === "scan") {
      const link = p.get("link");
      const parsed = link ? parseBoxQr(link, origins) : null;
      return parsed?.ok ? { ...view, tab: "boxes", token: parsed.token } : { ...view, tab: "scan", scan: "qr" };
    }
    // "/storage?box=" (desktop) and "/storage/<id>" (mobile, QR).
    const boxId = id(second ?? p.get("box"));
    return { ...view, tab: "boxes", boxId, cellId: id(p.get("cell")), unavailable: Boolean(second) && !boxId };
  }
  if (section === "add") {
    const mode = p.get("mode");
    const code = parseBarcode(p.get("code") ?? p.get("q") ?? p.get("bc"));
    if (code.ok) return { ...view, q: code.value };
    if (mode === "scan") return { ...view, tab: "scan", scan: "barcode" };
    if (mode === "search") return { ...view, q: text(p.get("q")), unavailable: true };
    return { ...view, unavailable: true };
  }
  return { ...view, unavailable: true };
}

/** The query string of /offline → view. A bare `?from=` is the service worker's redirect. */
export function parseOfflineView(params: URLSearchParams, origins: readonly string[]): OfflineView {
  const from = params.get("from");
  const tab = params.get("tab");
  if (!tab) return from ? viewFromPath(from, origins) : DEFAULT_VIEW;
  const safeFrom = from ? safeNextPath(from) : "/";
  return {
    tab: tab === "boxes" || tab === "scan" ? tab : "search",
    q: text(params.get("q")),
    categoryId: id(params.get("cat")),
    medicationId: id(params.get("med")),
    boxId: id(params.get("box")),
    cellId: id(params.get("cell")),
    token: id(params.get("token")),
    scan: params.get("scan") === "barcode" ? "barcode" : "qr",
    from: safeFrom === "/" ? null : safeFrom,
    unavailable: params.get("na") === "1",
  };
}

/** View → "/offline?tab=…" (always with `tab`, so `from` is kept only as the way back). */
export function offlineViewHref(view: Partial<OfflineView>): string {
  const v = { ...DEFAULT_VIEW, ...view };
  const p = new URLSearchParams({ tab: v.tab });
  if (v.q) p.set("q", v.q);
  if (v.categoryId) p.set("cat", v.categoryId);
  if (v.medicationId) p.set("med", v.medicationId);
  if (v.boxId) p.set("box", v.boxId);
  if (v.cellId) p.set("cell", v.cellId);
  if (v.token) p.set("token", v.token);
  if (v.tab === "scan") p.set("scan", v.scan);
  if (v.from) p.set("from", v.from);
  if (v.unavailable) p.set("na", "1");
  return `${OFFLINE_PATH}?${p}`;
}
