// Minimal Resend client over fetch (no SDK). Pure apart from the injected fetch.

export type MailMessage = {
  from: string;
  to: string[];
  subject: string;
  html: string;
  text: string;
};

export type SendResult = { ok: true } | { ok: false; error: string };

type Params = {
  apiKey: string;
  url: string;
  message: MailMessage;
  /** Same key within 24 h → Resend sends once (protects against a double run). */
  idempotencyKey?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

/**
 * POSTs one e-mail. Never throws; the error text carries the HTTP status and
 * Resend's message, never the API key or the message body.
 */
export async function sendMail({
  apiKey,
  url,
  message,
  idempotencyKey,
  fetchImpl = fetch,
  timeoutMs = 10_000,
}: Params): Promise<SendResult> {
  const headers: Record<string, string> = {
    authorization: `Bearer ${apiKey}`,
    "content-type": "application/json",
  };
  if (idempotencyKey) headers["idempotency-key"] = idempotencyKey;

  try {
    const res = await fetchImpl(url, {
      method: "POST",
      headers,
      body: JSON.stringify(message),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (res.ok) return { ok: true };
    let detail = "";
    try {
      const body = (await res.json()) as { message?: unknown };
      if (typeof body.message === "string") detail = `: ${body.message.slice(0, 200)}`;
    } catch {
      // no JSON body
    }
    return { ok: false, error: `HTTP ${res.status}${detail}` };
  } catch (error) {
    const name = error instanceof Error ? error.name : "error";
    return { ok: false, error: `network (${name})` };
  }
}
