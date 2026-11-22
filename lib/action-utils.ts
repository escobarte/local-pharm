import "server-only";
import { redirect } from "next/navigation";
import { getAccess, createSupabaseServerClient } from "@/lib/supabase/server";
import { describeDbError, type DbErrorContext } from "@/lib/storage/db-errors";

// Shared by every Server Action file. A "use server" file may only export
// async functions, so these helpers live here.
//
// Every action: (1) re-checks session + allowlist (Proxy is only an optimistic
// check), (2) validates input on the server, (3) writes through the user's own
// session so RLS is the last line of defense. Raw DB messages never reach the UI.

export const NETWORK_ERROR =
  "Не удалось связаться с сервером. Проверьте интернет и попробуйте ещё раз.";

export async function requireClient() {
  const access = await getAccess();
  if (!access) redirect("/not-configured");
  if (access.status === "no-session") redirect("/login");
  if (access.status === "denied") redirect("/auth/denied");
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/not-configured");
  return supabase;
}

export function valuesOf(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") values[key] = value;
  }
  return values;
}

type DbResult = { error: { code?: string | null; message?: string | null } | null };

/** Runs a DB call; a thrown error (network) becomes a user message. */
export async function run<T extends DbResult>(
  fn: () => PromiseLike<T>,
  context: DbErrorContext,
): Promise<{ ok: true; result: T } | { ok: false; message: string }> {
  try {
    const result = await fn();
    if (result.error) return { ok: false, message: describeDbError(result.error, context) };
    return { ok: true, result };
  } catch {
    return { ok: false, message: NETWORK_ERROR };
  }
}
