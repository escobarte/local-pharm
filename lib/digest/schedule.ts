// "Once a week" decision for the digest e-mail (pure).

import { daysUntil, todayIso, type IsoDate } from "../dates.ts";

/** Monday = 1 in JS (UTC). The Vercel cron runs daily; the e-mail goes out on Mondays. */
export const DIGEST_WEEKDAY_UTC = 1;

/** A run counts as "already sent" when the last e-mail went out within this many days. */
export const MIN_DAYS_BETWEEN_DIGESTS = 6;

export const isDigestDay = (now: Date): boolean => now.getUTCDay() === DIGEST_WEEKDAY_UTC;

export type SkipReason = "not_monday" | "already_sent";

export type DigestDecision = { send: true } | { send: false; reason: SkipReason };

/**
 * Send when it is Monday (UTC) and nothing went out in the last 6 days.
 * `force` (manual check with the right secret) skips both rules.
 * `lastSentOn` is the UTC date stored by digest_mark_sent(), or null if never.
 */
export function decideDigest(params: {
  now: Date;
  lastSentOn: IsoDate | null;
  force?: boolean;
}): DigestDecision {
  if (params.force) return { send: true };
  if (!isDigestDay(params.now)) return { send: false, reason: "not_monday" };
  if (params.lastSentOn) {
    const ago = daysUntil(todayIso(params.now), params.lastSentOn);
    if (ago >= 0 && ago <= MIN_DAYS_BETWEEN_DIGESTS) return { send: false, reason: "already_sent" };
  }
  return { send: true };
}
