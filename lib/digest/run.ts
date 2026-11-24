// Orchestrates the weekly digest with injected dependencies (pure; unit-tested
// with stubs). The route handler wires in Supabase and Resend.

import { todayIso, type IsoDate } from "../dates.ts";
import type { MailEnv } from "../env.ts";
import type { MailMessage, SendResult } from "../mail/resend.ts";
import { buildDigest, type DigestRow } from "./build.ts";
import { decideDigest } from "./schedule.ts";

export type DigestStore = {
  lastSentOn(): Promise<IsoDate | null>;
  rows(days: number): Promise<DigestRow[]>;
  markSent(): Promise<void>;
};

export type DigestDeps = {
  now: Date;
  /** Manual check (`?force=1` with the right secret): skip the Monday and "once a week" rules. */
  force: boolean;
  /** Result of readMailEnv(). */
  mail: { env: MailEnv | null; missing: string[] };
  siteUrl: string | null;
  store: DigestStore;
  send(message: MailMessage, idempotencyKey: string): Promise<SendResult>;
  /** How far ahead "expiring" looks (SOON_DAYS). */
  soonDays: number;
};

export type DigestOutcome =
  | { status: "sent"; recipients: number; expired: number; soon: number; marked: boolean }
  | {
      status: "skipped";
      reason: "not_configured" | "not_monday" | "already_sent" | "nothing_to_report";
      /** not_configured: names of the missing variables (never values). */
      missing?: string[];
    }
  | { status: "failed"; reason: string };

export async function runWeeklyDigest(deps: DigestDeps): Promise<DigestOutcome> {
  const { now, force, mail, store } = deps;

  // 1. Not configured → nothing to do, and no database calls.
  if (!mail.env) return { status: "skipped", reason: "not_configured", missing: mail.missing };

  try {
    // 2. Cheap check first: not a Monday → no database call at all.
    const quick = decideDigest({ now, lastSentOn: null, force });
    if (!quick.send) return { status: "skipped", reason: quick.reason };

    // 3. Monday: was it already sent in the last days?
    const decision = decideDigest({ now, lastSentOn: force ? null : await store.lastSentOn(), force });
    if (!decision.send) return { status: "skipped", reason: decision.reason };

    // 4. Anything to say?
    const today = todayIso(now);
    const digest = buildDigest(await store.rows(deps.soonDays), today, deps.siteUrl);
    if (!digest) return { status: "skipped", reason: "nothing_to_report" };

    // 5. Send; mark only after a successful send (a failed one is retried next time).
    const sent = await deps.send(
      { from: mail.env.from, to: mail.env.to, subject: digest.subject, html: digest.html, text: digest.text },
      `local-pharm-digest-${today}`,
    );
    if (!sent.ok) return { status: "failed", reason: sent.error };
    // A failed mark must not turn a sent e-mail into a "failed" run: Resend's
    // idempotency key still blocks a second e-mail for 24 h.
    let marked = false;
    if (!force) {
      try {
        await store.markSent();
        marked = true;
      } catch {
        marked = false;
      }
    }
    return {
      status: "sent",
      recipients: mail.env.to.length,
      expired: digest.expired,
      soon: digest.soon,
      marked,
    };
  } catch (error) {
    return { status: "failed", reason: error instanceof Error ? error.message : "unknown error" };
  }
}
