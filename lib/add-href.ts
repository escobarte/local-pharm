// URLs of the Add screen (/add). The URL is the whole state of the screen, so
// tabs, search and picks work without JavaScript and survive a reload. Pure;
// used on the server and in the scanner (client).

import { cleanField } from "./openfda/parse.ts";

export type AddMode = "scan" | "search" | "manual";

/** A row picked in the openFDA block: travels in the URL (no second request on pick). */
export type OpenFdaPick = {
  name: string;
  inn: string | null;
  form: string | null;
  strength: string | null;
  manufacturer: string | null;
};

export type AddParams = {
  mode?: AddMode;
  /** Scan tab: barcode to look up. */
  code?: string;
  /** Search tab: query, picked AMDM code, picked openFDA row. */
  q?: string;
  reg?: string;
  fda?: OpenFdaPick | null;
  /** Barcode remembered from a scan; saved with whatever medication is added. */
  bc?: string;
  /** The user chose "Создать отдельную запись" despite a duplicate. */
  dup?: boolean;
  /** Search tab after a scan that found nothing: "Не нашли по штрихкоду". */
  notFound?: boolean;
  /** "Добавить сюда": preselected box / compartment. */
  box?: string;
  cell?: string;
};

const FDA_KEYS = { name: "fn", inn: "fi", form: "ff", strength: "fs", manufacturer: "fm" } as const;

export function addPageHref(p: AddParams): string {
  const sp = new URLSearchParams();
  const mode = p.mode ?? "manual";
  if (mode !== "manual") sp.set("mode", mode);
  if (mode === "scan" && p.code) sp.set("code", p.code);
  if (mode === "search") {
    if (p.q) sp.set("q", p.q);
    if (p.reg) sp.set("reg", p.reg);
    if (p.fda) {
      for (const [field, key] of Object.entries(FDA_KEYS) as [keyof OpenFdaPick, string][]) {
        const value = p.fda[field];
        if (value) sp.set(key, value);
      }
    }
  }
  if (mode !== "scan" && p.bc) sp.set("bc", p.bc);
  if (mode !== "scan" && p.dup) sp.set("dup", "1");
  if (mode === "search" && p.notFound) sp.set("nf", "1");
  if (p.box) sp.set("box", p.box);
  if (p.cell) sp.set("cell", p.cell);
  const qs = sp.toString();
  return qs ? `/add?${qs}` : "/add";
}

type Param = string | string[] | undefined;
const first = (v: Param): string => (Array.isArray(v) ? (v[0] ?? "") : (v ?? ""));

/** openFDA pick from the URL: never trusted — cleaned and cut like the form fields. */
export function parseOpenFdaPick(sp: Record<string, Param>): OpenFdaPick | null {
  const name = cleanField(first(sp[FDA_KEYS.name]));
  if (!name) return null;
  return {
    name,
    inn: cleanField(first(sp[FDA_KEYS.inn])),
    form: cleanField(first(sp[FDA_KEYS.form])),
    strength: cleanField(first(sp[FDA_KEYS.strength])),
    manufacturer: cleanField(first(sp[FDA_KEYS.manufacturer])),
  };
}
