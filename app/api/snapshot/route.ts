import { readSnapshotRows } from "@/lib/offline/server-snapshot";
import { buildSnapshot } from "@/lib/offline/snapshot";
import { checkAccess, createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * The data the device keeps for offline use. Read with the signed-in user's
 * session and the allowlist check, never cached (neither by HTTP nor by the
 * service worker, which does not touch /api/*).
 */
export async function GET() {
  const reply = (body: unknown, status: number) =>
    Response.json(body, { status, headers: { "cache-control": "private, no-store" } });

  const supabase = await createSupabaseServerClient();
  if (!supabase) return reply({ error: "not-configured" }, 503);

  try {
    const access = await checkAccess(supabase);
    if (access.status === "no-session") return reply({ error: "no-session" }, 401);
    if (access.status === "denied") return reply({ error: "denied" }, 403);
    const rows = await readSnapshotRows(supabase);
    return reply(buildSnapshot(rows, access.userId, new Date().toISOString()), 200);
  } catch (error) {
    console.error("snapshot:", error instanceof Error ? error.message : error);
    return reply({ error: "unavailable" }, 502);
  }
}
