// Pure sorting helpers for storage screens.

/** Natural order for compartment codes: A1, A2, A10, B1. */
export function compareCodes(a: string, b: string): number {
  return a.localeCompare(b, "ru", { numeric: true, sensitivity: "base" });
}

export function sortByCode<T extends { code: string }>(items: readonly T[]): T[] {
  return [...items].sort((x, y) => compareCodes(x.code, y.code));
}

/** Box display title: "Коробка 2" style label used in selects and headers. */
export function boxLabel(box: { name: string; number: string | null }): string {
  const number = box.number?.trim();
  return number ? `№${number} · ${box.name}` : box.name;
}
