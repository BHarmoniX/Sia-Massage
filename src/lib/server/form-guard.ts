// One call that runs every gate a public form submission must pass, cheapest first:
//   1. method and content type     4. honeypot (bots fill hidden fields)
//   2. size-capped body read       5. Turnstile spam check (if configured)
//   3. per-visitor rate limit      6. schema validation of every field
// Usage in a live endpoint:
//
//   export const prerender = false;
//   export const POST: APIRoute = async ({ request, clientAddress }) => {
//     const result = await guardForm(request, clientAddress, contactSchema, { limiter, turnstile });
//     if (!result.ok) return result.response;
//     // result.data is validated and typed
//   };

import type { z } from 'zod';
import { BodyTooLargeError, readFieldsLimited, UnsupportedContentTypeError } from './body.ts';
import { type RateLimiter, visitorKey } from './rate-limit.ts';
import { verifyTurnstile, type TurnstileOptions } from './turnstile.ts';

export const HONEYPOT_FIELD = 'website';
export const TURNSTILE_FIELD = 'cf-turnstile-response';

export interface GuardOptions {
  limiter: RateLimiter;
  /** Distinguishes rate-limit buckets, e.g. 'contact' vs 'booking'. */
  purpose: string;
  maxBytes?: number;
  /** Omit only when Turnstile isn't set up yet; the honeypot and rate limit still apply. */
  turnstile?: Omit<TurnstileOptions, 'remoteIp'>;
}

export type GuardResult<T> = { ok: true; data: T } | { ok: false; response: Response };

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

export async function guardForm<T>(
  request: Request,
  clientAddress: string,
  schema: z.ZodType<T>,
  { limiter, purpose, maxBytes = 16 * 1024, turnstile }: GuardOptions,
): Promise<GuardResult<T>> {
  if (request.method !== 'POST') return { ok: false, response: json(405, { error: 'method' }) };

  let fields: Record<string, string>;
  try {
    fields = await readFieldsLimited(request, maxBytes);
  } catch (error) {
    if (error instanceof BodyTooLargeError) return { ok: false, response: json(413, { error: 'too_large' }) };
    if (error instanceof UnsupportedContentTypeError) return { ok: false, response: json(415, { error: 'type' }) };
    return { ok: false, response: json(400, { error: 'malformed' }) };
  }

  if (!(await limiter.hit(await visitorKey(clientAddress, purpose)))) {
    return { ok: false, response: json(429, { error: 'rate_limited' }) };
  }

  // A filled honeypot is a bot. Answer as if it worked so the bot learns nothing.
  if (fields[HONEYPOT_FIELD]) return { ok: false, response: json(200, { ok: true }) };

  if (turnstile) {
    const passed = await verifyTurnstile(fields[TURNSTILE_FIELD] ?? '', {
      ...turnstile,
      remoteIp: clientAddress,
    });
    if (!passed) return { ok: false, response: json(403, { error: 'verification' }) };
  }

  delete fields[HONEYPOT_FIELD];
  delete fields[TURNSTILE_FIELD];

  const parsed = schema.safeParse(fields);
  if (!parsed.success) {
    // Field names only. Never echo submitted values back (reflected-XSS and data leaks).
    const invalid = [...new Set(parsed.error.issues.map((i) => String(i.path[0] ?? 'form')))];
    return { ok: false, response: json(422, { error: 'invalid', fields: invalid }) };
  }
  return { ok: true, data: parsed.data };
}
