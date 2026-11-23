// Maps database / PostgREST errors to short Russian messages for the UI.

export type DbErrorLike = { code?: string | null; message?: string | null } | null | undefined;

export type DbErrorContext =
  | "save"
  | "create-compartment"
  | "delete-compartment"
  | "delete-box"
  | "save-pack"
  | "take"
  | "delete-pack"
  | "delete-medication";

const GENERIC = "Не удалось выполнить действие. Попробуйте ещё раз.";

export function describeDbError(error: DbErrorLike, context: DbErrorContext = "save"): string {
  const code = error?.code ?? "";

  if (code === "23505" && context === "create-compartment") {
    return "Отсек с таким кодом уже есть в этой коробке.";
  }
  if (code === "23503") {
    if (context === "delete-compartment") {
      return "В отсеке есть упаковки. Сначала переложите их или удалите.";
    }
    if (context === "delete-medication") {
      return "У препарата есть упаковки. Сначала удалите их.";
    }
    if (context === "delete-box") {
      return "В коробке есть упаковки. Сначала переложите их или удалите.";
    }
    return "Выбранная зона, категория или отсек больше не существует. Обновите страницу.";
  }
  // PostgREST: function / column not found → a migration was not applied yet.
  if (["PGRST202", "PGRST204", "42703", "42883"].includes(code)) {
    return "База данных ещё не обновлена. Владельцу нужно выполнить последнюю миграцию (docs/SETUP-SUPABASE.md).";
  }
  // add_registry_medication_with_pack (0004): the registry row is gone or not visible.
  if (code === "P0002") {
    return "Препарат не найден в реестре AMDM. Найдите его в поиске ещё раз.";
  }
  if (code === "42501") return "Нет прав на это действие. Выйдите и войдите заново.";
  if (code === "23514") return "Проверьте значения полей: одно из них не подходит.";
  if (code === "22P02") return "Некорректные данные. Обновите страницу и попробуйте снова.";
  return GENERIC;
}
