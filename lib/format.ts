// Pure formatting helpers (Russian plurals and summaries).

/** plural(1,"упаковка","упаковки","упаковок") → "упаковка"; 2 → "упаковки"; 5 → "упаковок". */
export function plural(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(Math.trunc(n));
  const mod100 = abs % 100;
  const mod10 = abs % 10;
  if (mod100 >= 11 && mod100 <= 14) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

export const zonesLabel = (n: number) => `${n} ${plural(n, "зона", "зоны", "зон")}`;
export const boxesLabel = (n: number) => `${n} ${plural(n, "коробка", "коробки", "коробок")}`;
export const packsLabel = (n: number) => `${n} ${plural(n, "упаковка", "упаковки", "упаковок")}`;
export const compartmentsLabel = (n: number) =>
  `${n} ${plural(n, "отсек", "отсека", "отсеков")}`;

/** The three parts of the storage summary: a number and its word ("3" + "зоны"). */
export function storageSummaryParts(counts: {
  zones: number;
  boxes: number;
  packs: number;
}): { n: number; word: string }[] {
  return [
    { n: counts.zones, word: plural(counts.zones, "зона", "зоны", "зон") },
    { n: counts.boxes, word: plural(counts.boxes, "коробка", "коробки", "коробок") },
    { n: counts.packs, word: plural(counts.packs, "упаковка", "упаковки", "упаковок") },
  ];
}

export function storageSummary(counts: { zones: number; boxes: number; packs: number }): string {
  return storageSummaryParts(counts)
    .map((part) => `${part.n} ${part.word}`)
    .join(" · ");
}

/** Short pack count for tiles and cells: "3 упак." / "пусто". */
export function packsShort(n: number): string {
  return n === 0 ? "пусто" : `${n} упак.`;
}

/** "12 шт." — "шт." is an abbreviation and never declines. */
export const pcsLabel = (n: number) => `${n} шт.`;

export const medicationsLabel = (n: number) =>
  `${n} ${plural(n, "препарат", "препарата", "препаратов")}`;

/** "Найден: 1 препарат" / "Найдено: 3 препарата" / "Найдено: 11 препаратов". */
export const foundLabel = (n: number) =>
  `${plural(n, "Найден", "Найдено", "Найдено")}: ${medicationsLabel(n)}`;

/** Home "Внимание" rows: the verb agrees with the count. */
export const expiringText = (n: number) =>
  `${n} ${plural(n, "упаковка истекает", "упаковки истекают", "упаковок истекают")}`;
export const expiredText = (n: number) =>
  `${n} ${plural(n, "упаковка просрочена", "упаковки просрочены", "упаковок просрочено")}`;
export const lowStockText = (n: number) =>
  `${n} ${plural(n, "упаковка заканчивается", "упаковки заканчиваются", "упаковок заканчиваются")}`;

/** "ещё 1 место" / "ещё 2 места" / "ещё 5 мест". */
export const morePlacesLabel = (n: number) => `ещё ${n} ${plural(n, "место", "места", "мест")}`;
