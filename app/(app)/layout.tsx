import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getAccess } from "@/lib/supabase/server";
import { LOGIN_PATH, NOT_CONFIGURED_PATH } from "@/lib/routes";

/**
 * Server-side gate for every app screen: valid session + allowlist.
 * Data access is additionally protected by RLS in the database.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const access = await getAccess();
  if (!access) redirect(NOT_CONFIGURED_PATH);
  if (access.status === "no-session") redirect(LOGIN_PATH);
  if (access.status === "denied") redirect("/auth/denied");

  return <>{children}</>;
}
