// Counts for the category chips and tiles: medications that have at least one pack.
// Pure, so the search page (full catalog already loaded) and the home page (light
// query, see getCategoryRows) show the same numbers.

export type CategoryRow = { categoryId: string | null; packCount: number };

export type CategoryCounts = {
  /** Every counted medication, with or without a category ("Все"). */
  total: number;
  byCategory: Record<string, number>;
};

export function countByCategory(rows: readonly CategoryRow[]): CategoryCounts {
  const byCategory: Record<string, number> = {};
  let total = 0;
  for (const row of rows) {
    if (row.packCount <= 0) continue;
    total += 1;
    if (row.categoryId) byCategory[row.categoryId] = (byCategory[row.categoryId] ?? 0) + 1;
  }
  return { total, byCategory };
}

/** Count for one category; unknown → 0. */
export function categoryCount(counts: CategoryCounts, categoryId: string): number {
  return counts.byCategory[categoryId] ?? 0;
}

/** Screen-reader text for a chip or tile: "Пищеварение, 3 препарата". */
export function categoryAria(name: string, count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  const word =
    mod10 === 1 && mod100 !== 11
      ? "препарат"
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
        ? "препарата"
        : "препаратов";
  return `${name}, ${count} ${word}`;
}
