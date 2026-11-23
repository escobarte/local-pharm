// ATC code → one of the 9 home categories (seeded in migration 0001). Pure.
//
// Only by the FIRST LETTER of the ATC code, and only where that letter maps to
// exactly one category. Everything else is left for the user to choose:
//   A (digestion AND vitamins AND diabetes), B, D (wounds AND acne AND fungi),
//   G, H, J (antibiotics AND antivirals for colds AND vaccines), L, M, N
//   (painkillers AND sleeping pills), P, R (colds AND allergy AND asthma), S, V.
// "Детское" and "Рецептурные и курсовые" do not follow from ATC at all.

export const ATC_FIRST_LETTER_CATEGORY: Readonly<Record<string, string>> = {
  C: "Давление и сердце", // cardiovascular system
};

/** Category name for an ATC code, or null when the mapping is not unambiguous. */
export function categoryForAtc(atc: string | null | undefined): string | null {
  const letter = (atc ?? "").trim().charAt(0).toUpperCase();
  return ATC_FIRST_LETTER_CATEGORY[letter] ?? null;
}
