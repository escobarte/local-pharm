import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { SOON_DAYS } from "@/lib/dates";
import { createDigestStore } from "@/lib/digest/store";
import { runWeeklyDigest, type DigestOutcome } from "@/lib/digest/run";
import { getSiteUrlOverride, getSupabaseEnv, readMailEnv, readResendUrl, resolveSiteUrl } from "@/lib/env";
import { sendMail } from "@/lib/mail/resend";

/**
 * Daily cron (Vercel Cron, see vercel.json), two jobs:
 *  1. keep-alive: one lightweight RPC so the Supabase Free project is not paused
 *     for inactivity. Uses only the publishable key; public.ping() is executable by anon.
 *  2. weekly expiry e-mail: on Mondays (UTC), after the ping. It is skipped (and says
 *     why in the log) when RESEND_API_KEY / MAIL_FROM / NOTIFY_EMAILS are not set.
 *
 * `?force=1` (a manual check) skips the Monday / "once a week" rules. It needs the
 * same CRON_SECRET as the cron itself and does not mark the week as sent.
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

  const outcome = await runWeeklyDigest({
    now: new Date(),
    force: request.nextUrl.searchParams.get("force") === "1",
    mail: readMailEnv({
      RESEND_API_KEY: process.env.RESEND_API_KEY,
      MAIL_FROM: process.env.MAIL_FROM,
      NOTIFY_EMAILS: process.env.NOTIFY_EMAILS,
    }),
    siteUrl: resolveSiteUrl(getSiteUrlOverride(), request.nextUrl.origin),
    store: createDigestStore(supabase, process.env.CRON_SECRET ?? ""),
    soonDays: SOON_DAYS,
    send: (message, idempotencyKey) =>
      sendMail({
        apiKey: process.env.RESEND_API_KEY ?? "",
        url: readResendUrl(process.env.RESEND_API_URL),
        message,
        idempotencyKey,
      }),
  });

  logDigest(outcome);
  // A real sending problem is a non-2xx answer, so it shows up in the Vercel Cron log.
  if (outcome.status === "failed") {
    return NextResponse.json({ ok: false, error: "digest_failed", digest: outcome.status }, { status: 502 });
  }
  return NextResponse.json({ ok: true, digest: outcome.status });
}

/** One log line, never with addresses, keys or message text. */
function logDigest(outcome: DigestOutcome) {
  if (outcome.status === "sent") {
    console.log(
      `digest: sent to ${outcome.recipients} recipient(s), expired=${outcome.expired}, soon=${outcome.soon}, marked=${outcome.marked}`,
    );
  } else if (outcome.status === "skipped") {
    const names = outcome.missing?.length ? ` (set: ${outcome.missing.join(", ")})` : "";
    // The database functions stay silent on a wrong secret, so say where to look.
    const hint =
      outcome.reason === "nothing_to_report"
        ? " (if packs are expiring: the secret in public.digest_config must equal CRON_SECRET)"
        : "";
    console.log(`digest: skipped, ${outcome.reason}${names}${hint}`);
  } else {
    console.error(`digest: failed, ${outcome.reason}`);
  }
}
