import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { OfflineBar } from "@/components/pwa/OfflineBar";
import { SnapshotSync } from "@/components/pwa/SnapshotSync";
import { SideNav } from "@/components/SideNav";
import { getNavCounts } from "@/lib/nav-counts";
import { getAccess } from "@/lib/supabase/server";
import { LOGIN_PATH, NOT_CONFIGURED_PATH } from "@/lib/routes";
import { signOut } from "./actions";

/** A value that differs on every server render (see SnapshotSync). */
const renderStamp = () => Date.now();

/**
 * Server-side gate for every app screen: valid session + allowlist.
 * Data access is additionally protected by RLS in the database.
 *
 * Also the app shell: from lg (1024 px) the side menu sits to the left of the
 * content; below lg the menu is the bottom bar rendered by (tabs)/layout.tsx.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const access = await getAccess();
  if (!access) redirect(NOT_CONFIGURED_PATH);
  if (access.status === "no-session") redirect(LOGIN_PATH);
  if (access.status === "denied") redirect("/auth/denied");

  const counts = await getNavCounts();

  return (
    <div className="lg:flex lg:min-h-dvh">
      <SideNav email={access.email} signOutAction={signOut} counts={counts} />
      <div className="min-w-0 lg:flex-1">
        <OfflineBar />
        {children}
      </div>
      <SnapshotSync userId={access.userId} stamp={renderStamp()} />
    </div>
  );
}
