// Russian (Cyrillic) → Latin spelling variants for searching the AMDM registry,
// whose names are Latin / Romanian ("Paracetamol", "No-spa", "Amoxicilină").
// Pure, no I/O. Best effort: Russian drug names are phonetic copies of Latin
// ones, so one Cyrillic letter can stand for several Latin spellings
// (к → c / k, ц → c / ts, х → h / ch). We generate the most likely spellings
// first and cap their number. Limits are described in docs/GOTCHAS.md.

export const MAX_VARIANTS = 8;

const CYRILLIC_RE = /[а-яё]/i;

export function hasCyrillic(value: string): boolean {
  return CYRILLIC_RE.test(value);
}

/** Letters after which Latin "c" reads as "ts" (ce, ci, cy) — there к is usually "k". */
const SOFT_VOWELS = "еёиыйэюя";
const CONSONANTS = "бвгджзйклмнпрстфхцчшщ";

// `next` is "" at the end of a word, and "abc".includes("") is true — hence the guards.
const isSoftVowel = (ch: string) => ch !== "" && SOFT_VOWELS.includes(ch);
const isConsonant = (ch: string) => ch !== "" && CONSONANTS.includes(ch);

/** Options for one Cyrillic letter, most likely first. Index = cost. */
function letterOptions(ch: string, next: string): string[] {
  switch (ch) {
    case "а": return ["a"];
    case "б": return ["b"];
    case "в": return ["v"];
    // Russian г often renders Latin h: гексорал = hexoral, гидро- = hydro-.
    case "г": return ["g", "h"];
    case "д": return ["d"];
    case "е": return ["e"];
    case "ё": return ["e", "io", "yo"];
    case "ж": return ["j", "zh"];
    case "з": return ["z"];
    case "и": return ["i", "y"];
    case "й": return ["i", "y"];
    // ке / ки → ke / ki (кетопрофен); elsewhere Latin c is more common
    // (кларитромицин, диклофенак, корвалол).
    case "к": return isSoftVowel(next) ? ["k", "c"] : ["c", "k"];
    case "л": return ["l"];
    case "м": return ["m"];
    case "н": return ["n"];
    case "о": return ["o"];
    case "п": return ["p"];
    case "р": return ["r"];
    case "с": return ["s"];
    case "т": return ["t"];
    case "у": return ["u"];
    case "ф": return ["f", "ph"];
    // хлор- → clor- (Romanian) / chlor- (Latin INN); elsewhere h.
    case "х": return isConsonant(next) ? ["c", "ch", "h", "kh"] : ["h", "ch", "kh"];
    // ци / це → ci / ce (цитрамон, цетиризин); elsewhere ts.
    case "ц": return isSoftVowel(next) ? ["c", "ts", "z"] : ["ts", "c", "z"];
    case "ч": return ["ch", "c"];
    case "ш": return ["sh", "s"];
    case "щ": return ["sch", "sh"];
    case "ъ": return [""];
    case "ы": return ["y", "i"];
    case "ь": return [""];
    case "э": return ["e"];
    case "ю": return ["iu", "yu", "u"];
    case "я": return ["ia", "ya", "a"];
    default: return [ch];
  }
}

/** Splits a lowercase word into units (digraphs, doubled letters, single letters) with options. */
function units(word: string): string[][] {
  const out: string[][] = [];
  let i = 0;
  while (i < word.length) {
    const ch = word[i];
    const next = word[i + 1] ?? "";
    if (ch === "к" && next === "с") {
      // кс → x (амоксициллин = amoxicillin, ксилометазолин = xylometazoline)
      out.push(["x", "ks"]);
      i += 2;
      continue;
    }
    if (ch === next && isConsonant(ch) && ch !== "й") {
      // Doubled consonant: Latin INN keeps it (amoxicillin), Romanian often
      // drops it (amoxicilină). Both are offered.
      const after = word[i + 2] ?? "";
      const single = letterOptions(ch, after)[0];
      out.push([single + single, single]);
      i += 2;
      continue;
    }
    out.push(letterOptions(ch, next));
    i += 1;
  }
  return out;
}

/**
 * Latin spellings of a Cyrillic word or phrase, most likely first, at most
 * `max`. Non-Cyrillic characters pass through unchanged. A string without
 * Cyrillic is returned as the only variant.
 */
export function transliterateVariants(value: string, max: number = MAX_VARIANTS): string[] {
  const word = value.toLowerCase();
  if (!hasCyrillic(word)) return [value];

  // Beam search by total cost. Every candidate shares the same unit sequence,
  // so keeping the cheapest `beam` prefixes keeps the cheapest full strings.
  const beam = max * 2;
  let partial: { text: string; cost: number }[] = [{ text: "", cost: 0 }];
  for (const options of units(word)) {
    const expanded: { text: string; cost: number }[] = [];
    for (const p of partial) {
      options.forEach((opt, cost) => expanded.push({ text: p.text + opt, cost: p.cost + cost }));
    }
    // Stable sort keeps the generation order for equal costs.
    expanded.sort((a, b) => a.cost - b.cost);
    partial = expanded.slice(0, beam);
  }

  const seen = new Set<string>();
  const result: string[] = [];
  for (const p of partial) {
    if (seen.has(p.text)) continue;
    seen.add(p.text);
    result.push(p.text);
    if (result.length === max) break;
  }
  return result;
}

/** The single most likely Latin spelling (used to clean stray Cyrillic in data). */
export function transliteratePrimary(value: string): string {
  return transliterateVariants(value, 1)[0] ?? value;
}
