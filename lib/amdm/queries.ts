import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  REGISTRY_FETCH_LIMIT,
  REGISTRY_RESULT_LIMIT,
  isRegistryCode,
  planRegistryQuery,
  rankRegistryItems,
  wordFilters,
} from "./search";
import type { RegistryItem } from "./types";
import { barcodeLookupVariants } from "@/lib/barcode";

// Reads go through the user's session: RLS (is_allowed) decides visibility.
// Search errors do not throw — the Add screen stays usable in manual mode.

const SELECT = "code, name, form, dose, volume, pack_size, inn, atc, manufacturer, country, barcode, rx";

type RawRow = {
  code: string;
  name: string;
  form: string | null;
  dose: string | null;
  volume: string | null;
  pack_size: string | null;
  inn: string | null;
  atc: string | null;
  manufacturer: string | null;
  country: string | null;
  barcode: string | null;
  rx: boolean | null;
};

function toItem(r: RawRow): RegistryItem {
  return {
    code: r.code,
    name: r.name,
    form: r.form,
    dose: r.dose,
    volume: r.volume,
    packSize: r.pack_size,
    inn: r.inn,
    atc: r.atc,
    manufacturer: r.manufacturer,
    country: r.country,
    barcode: r.barcode,
    rx: r.rx,
  };
}

export type RegistrySearch =
  | { status: "idle" }
  | { status: "too-short" }
  | { status: "ok"; items: RegistryItem[]; byBarcode: boolean; more: boolean }
  | { status: "not-loaded" }
  | { status: "error"; message: string };

const NOT_MIGRATED = ["PGRST205", "PGRST202", "42P01", "42883", "42703"];
const NOT_MIGRATED_MESSAGE =
  "Реестр AMDM ещё не подключён. Владельцу нужно выполнить миграцию 0004 (docs/SETUP-SUPABASE.md).";
const GENERIC_MESSAGE = "Не удалось выполнить поиск. Попробуйте ещё раз.";

function errorResult(error: { code?: string | null }): RegistrySearch {
  return {
    status: "error",
    message: NOT_MIGRATED.includes(error.code ?? "") ? NOT_MIGRATED_MESSAGE : GENERIC_MESSAGE,
  };
}

async function client() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase;
}

export async function searchRegistry(query: string): Promise<RegistrySearch> {
  const plan = planRegistryQuery(query);
  if (plan.kind === "empty") return { status: "idle" };
  if (plan.kind === "too-short") return { status: "too-short" };

  const supabase = await client();
  try {
    let items: RegistryItem[];
    let more = false;
    if (plan.kind === "barcode") {
      const { data, error } = await supabase
        .from("amdm_registry")
        .select(SELECT)
        .in("barcode", plan.candidates)
        .order("name")
        .limit(REGISTRY_RESULT_LIMIT + 1);
      if (error) return errorResult(error);
      const rows = ((data ?? []) as RawRow[]).map(toItem);
      more = rows.length > REGISTRY_RESULT_LIMIT;
      items = rows.slice(0, REGISTRY_RESULT_LIMIT);
    } else {
      let request = supabase.from("amdm_registry").select(SELECT);
      for (const filter of wordFilters(plan.words)) request = request.or(filter);
      const { data, error } = await request.order("name").limit(REGISTRY_FETCH_LIMIT);
      if (error) return errorResult(error);
      const rows = ((data ?? []) as RawRow[]).map(toItem);
      more = rows.length > REGISTRY_RESULT_LIMIT;
      items = rankRegistryItems(rows, plan.words, REGISTRY_RESULT_LIMIT);
    }

    if (items.length === 0) {
      // Nothing found: tell "the registry was never loaded" apart from "no match".
      const probe = await supabase.from("amdm_registry").select("code").limit(1);
      if (probe.error) return errorResult(probe.error);
      if ((probe.data ?? []).length === 0) return { status: "not-loaded" };
    }
    return { status: "ok", items, byBarcode: plan.kind === "barcode", more };
  } catch {
    return { status: "error", message: "Не удалось связаться с сервером. Проверьте интернет и попробуйте ещё раз." };
  }
}

/** One registry row by code, or null (unknown code, not migrated, network). */
export async function getRegistryItem(code: string): Promise<RegistryItem | null> {
  if (!isRegistryCode(code)) return null;
  const supabase = await client();
  try {
    const { data, error } = await supabase.from("amdm_registry").select(SELECT).eq("code", code).maybeSingle();
    if (error || !data) return null;
    return toItem(data as RawRow);
  } catch {
    return null;
  }
}

/**
 * Registry rows with this barcode (normalized EAN; the export may hold the
 * 12-digit UPC spelling). Throws on errors: the scan screen shows them.
 */
export async function findRegistryByBarcode(barcode: string): Promise<RegistryItem[]> {
  const supabase = await client();
  const { data, error } = await supabase
    .from("amdm_registry")
    .select(SELECT)
    .in("barcode", barcodeLookupVariants(barcode))
    .order("name")
    .limit(REGISTRY_RESULT_LIMIT);
  if (error) throw new Error(`amdm_registry by barcode: ${error.message}`);
  return ((data ?? []) as RawRow[]).map(toItem);
}
