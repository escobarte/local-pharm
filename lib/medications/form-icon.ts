// "Dosage form → icon kind". Pure. Forms arrive in Romanian (the AMDM registry),
// English (openFDA) and Russian (typed by hand), so the rules list keywords in all three.

export type FormIconKind =
  | "tablet"
  | "capsule"
  | "syrup"
  | "drops"
  | "ointment"
  | "injection"
  | "spray"
  | "powder"
  | "suppository"
  | "patch";

/** Lowercase, no diacritics (ș → s, ă → a, й → и, ё → е), single spaces. */
export function normalizeForm(raw: string | null | undefined): string {
  return (raw ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// Keywords are normalized stems and match at the START of a word ("plic" finds
// "plicuri" but not "aplicare"; "gel" is not "angel"). Order matters, first hit wins:
//  - injection first: "pulbere pentru soluție injectabilă" is a vial, not a powder;
//  - capsule before ointment: Romanian "gelule" begins with "gel";
//  - tablet before syrup/powder: "comprimate pentru soluție orală" is still a tablet;
//  - "granule pentru suspensie" is a syrup, other "pulbere / plic" forms are powders.
const RULES: readonly (readonly [FormIconKind, readonly string[]])[] = [
  ["injection", ["injectab", "injecti", "perfuz", "injection", "infusion", "инъекц", "ампул", "укол"]],
  ["drops", ["picatur", "drops", "капл", "oftalm", "ophthalm", "auricul"]],
  ["spray", ["spray", "aerosol", "inhalat", "inhaler", "спрей", "аэрозол", "ингалятор"]],
  ["capsule", ["capsul", "gelul", "капсул"]],
  ["ointment", ["unguent", "crema", "cream", "gel", "ointment", "мазь", "мази", "крем", "гель"]],
  ["suppository", ["supozit", "suppositor", "свеч", "свечи"]],
  ["patch", ["plasture", "patch", "bandage", "пластыр", "бинт"]],
  ["tablet", ["comprimat", "drajeu", "tablet", "таблет", "драже"]],
  ["syrup", ["granule pentru suspensie"]],
  ["powder", ["pulbere", "plic", "powder", "порош", "саше", "sachet"]],
  ["syrup", ["sirop", "suspensie", "suspension", "solutie orala", "oral solution", "syrup", "сироп", "суспенз", "для приема внутрь", "elixir", "эликсир"]],
];

const ESCAPE = /[.*+?^${}()|[\]\\]/g;

const MATCHERS = RULES.map(
  ([kind, words]) =>
    [kind, new RegExp(`(?:^|[^\\p{L}\\p{N}])(?:${words.map((w) => normalizeForm(w).replace(ESCAPE, "\\$&")).join("|")})`, "u")] as const,
);

/** Icon kind for a dosage form; anything unknown or empty gets the general tablet. */
export function formIconKind(form: string | null | undefined): FormIconKind {
  const text = normalizeForm(form);
  if (!text) return "tablet";
  for (const [kind, re] of MATCHERS) if (re.test(text)) return kind;
  return "tablet";
}
