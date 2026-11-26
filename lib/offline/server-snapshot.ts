import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAllRows } from "./paginate";
import { SNAPSHOT_COLUMNS, SNAPSHOT_TABLES, type SnapshotRows } from "./snapshot";

/**
 * Every row the offline snapshot needs, read through the user's own session
 * (RLS applies). Flat queries, joined on the device; ordered by id so that the
 * pages do not overlap.
 */
export async function readSnapshotRows(supabase: SupabaseClient): Promise<SnapshotRows> {
  const tables = await Promise.all(
    SNAPSHOT_TABLES.map(async (table) => {
      const rows = await fetchAllRows<unknown>(async (from, to) => {
        const { data, error, count } = await supabase
          .from(table)
          .select(SNAPSHOT_COLUMNS[table].join(", "), { count: "exact" })
          .order("id")
          .range(from, to);
        if (error) throw new Error(`snapshot ${table}: ${error.message}`);
        return { rows: data ?? [], total: count ?? 0 };
      });
      return [table, rows] as const;
    }),
  );
  return Object.fromEntries(tables) as unknown as SnapshotRows;
}
