// Reading a whole table through PostgREST, which returns at most 1000 rows per
// request (docs/GOTCHAS.md). Pure: the request itself is injected.

export const PAGE_SIZE = 1000;

export type Page<T> = {
  rows: T[];
  /** Total rows in the table (PostgREST `count: "exact"`). */
  total: number;
};

/**
 * Pages until `total` rows are read. It advances by what actually came back, so
 * a server limit lower than `size` still yields everything.
 */
export async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => Promise<Page<T>>,
  size: number = PAGE_SIZE,
): Promise<T[]> {
  const all: T[] = [];
  for (;;) {
    const { rows, total } = await fetchPage(all.length, all.length + size - 1);
    all.push(...rows);
    if (rows.length === 0 || all.length >= total) return all;
  }
}
