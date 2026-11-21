import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NO_ACCESS_PATH } from "@/lib/routes";

/**
 * Server Components cannot clear cookies, so the protected layout redirects
 * here when a signed-in account is not on the allowlist.
 */
export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  if (supabase) await supabase.auth.signOut({ scope: "local" });
  return NextResponse.redirect(new URL(NO_ACCESS_PATH, request.url));
}
