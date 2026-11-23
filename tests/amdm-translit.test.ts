import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_VARIANTS, hasCyrillic, transliteratePrimary, transliterateVariants } from "../lib/amdm/translit.ts";
import { queryWordVariants } from "../lib/amdm/search.ts";

/** Variants of a one-word query as the search uses them (normalized). */
const variants = (word: string) => queryWordVariants(word)[0] ?? [];

// Russian name → spelling found in the AMDM registry (Latin / Romanian / INN).
const DRUGS: [string, string][] = [
  ["парацетамол", "paracetamol"],
  ["ибупрофен", "ibuprofen"],
  ["амоксициллин", "amoxicillin"],
  ["нурофен", "nurofen"],
  ["анальгин", "analgin"],
  ["цитрамон", "citramon"],
  ["но-шпа", "nospa"], // "No-spa®" → search_text "nospa"
  ["аспирин", "aspirin"],
  ["диклофенак", "diclofenac"],
  ["кетопрофен", "ketoprofen"],
  ["лоратадин", "loratadin"],
  ["цетиризин", "cetirizin"],
  ["омепразол", "omeprazol"],
  ["ацикловир", "aciclovir"],
  ["кларитромицин", "claritromicin"],
  ["ксилометазолин", "xilometazolin"],
  ["корвалол", "corvalol"],
  ["валидол", "validol"],
  ["хлоргексидин", "clorhexidin"], // Romanian "Clorhexidină"
  ["гидрокортизон", "hidrocortizon"], // Romanian "Hidrocortizon"
];

for (const [ru, latin] of DRUGS) {
  test(`transliteration: ${ru} → ${latin}`, () => {
    const v = variants(ru);
    assert.ok(v.includes(latin), `${ru}: ${JSON.stringify(v)}`);
    assert.ok(v.length <= MAX_VARIANTS);
  });
}

test("the most common spelling comes first", () => {
  for (const [ru, latin] of [
    ["парацетамол", "paracetamol"],
    ["ибупрофен", "ibuprofen"],
    ["амоксициллин", "amoxicillin"],
    ["нурофен", "nurofen"],
    ["анальгин", "analgin"],
    ["цитрамон", "citramon"],
    ["диклофенак", "diclofenac"],
    ["кетопрофен", "ketoprofen"],
  ]) {
    assert.equal(variants(ru)[0], latin, ru);
  }
});

test("doubled consonants: both the INN (ll) and the Romanian (l) spellings", () => {
  const v = variants("амоксициллин");
  assert.ok(v.includes("amoxicillin") && v.includes("amoxicilin"));
});

test("но-шпа: hyphen joins, ш gives sh and s", () => {
  assert.deepEqual(variants("но-шпа"), ["noshpa", "nospa"]);
  assert.deepEqual(variants("ношпа"), ["noshpa", "nospa"]);
});

test("word end: final к is c (no 'next letter' bug)", () => {
  assert.equal(variants("диклофенак")[0], "diclofenac");
  assert.equal(variants("смекта")[0], "smecta");
});

test("number of variants is capped", () => {
  for (const word of ["активированный", "хлоргексидин", "цинк", "щёлочь"]) {
    const v = transliterateVariants(word);
    assert.ok(v.length >= 1 && v.length <= MAX_VARIANTS, word);
    assert.equal(new Set(v).size, v.length, `${word}: duplicates`);
  }
  assert.equal(transliterateVariants("парацетамол", 3).length, 3);
});

test("Latin and digits pass through; no Cyrillic → the input itself", () => {
  assert.deepEqual(transliterateVariants("Nurofen"), ["Nurofen"]);
  assert.equal(transliteratePrimary("Нурофен 200"), "nurofen 200");
  assert.equal(hasCyrillic("ibuprofen"), false);
  assert.equal(hasCyrillic("Ёж"), true);
});

test("multi-word query: each word gets its own variants", () => {
  const words = queryWordVariants("нурофен форте 200");
  assert.equal(words.length, 3);
  assert.equal(words[0][0], "nurofen");
  assert.ok(words[1].includes("forte"));
  assert.deepEqual(words[2], ["200"]);
});
