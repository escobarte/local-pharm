// Pure check of the Vercel Cron Authorization header.
// Vercel sends `Authorization: Bearer <CRON_SECRET>` when CRON_SECRET is set.

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** Denies when the secret is not configured, so the endpoint is never open. */
export function isAuthorizedCronRequest(
  authorization: string | null | undefined,
  secret: string | null | undefined,
): boolean {
  if (!secret || !authorization) return false;
  return constantTimeEqual(authorization, `Bearer ${secret}`);
}
