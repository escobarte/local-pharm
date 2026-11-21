import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { getSupabaseEnv } from "@/lib/env";

/**
 * Daily keep-alive (Vercel Cron, see vercel.json): one lightweight RPC so the
 * Supabase Free project is not paused for inactivity. Uses only the
 * publishable key; public.ping() is executable by anon.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const env = getSupabaseEnv();
  if (!env) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 500 });
  }

  const supabase = createClient(env.url, env.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.rpc("ping");

  if (error || data !== true) {
    console.error("keepalive: ping failed", error?.message);
    return NextResponse.json({ ok: false, error: "ping_failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
