import { NextResponse, type NextRequest } from "next/server";
import { checkAccess, createSupabaseServerClient } from "@/lib/supabase/server";
import { LOGIN_PATH, NOT_CONFIGURED_PATH, NO_ACCESS_PATH, safeNextPath } from "@/lib/routes";

/** OAuth (PKCE) callback: exchanges ?code for a session, then checks the allowlist. */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));
  const to = (path: string) => NextResponse.redirect(new URL(path, request.url));

  const supabase = await createSupabaseServerClient();
  if (!supabase) return to(NOT_CONFIGURED_PATH);

  if (!code) return to(`${LOGIN_PATH}?error=auth`);

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return to(`${LOGIN_PATH}?error=auth`);

  let access;
  try {
    access = await checkAccess(supabase);
  } catch {
    await supabase.auth.signOut({ scope: "local" });
    return to(`${LOGIN_PATH}?error=server`);
  }

  if (access.status === "allowed") return to(next);

  await supabase.auth.signOut({ scope: "local" });
  return to(access.status === "denied" ? NO_ACCESS_PATH : `${LOGIN_PATH}?error=auth`);
}
