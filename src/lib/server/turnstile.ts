// Cloudflare Turnstile: an invisible "are you human" check that, unlike CAPTCHAs, doesn't
// make real visitors solve puzzles. The browser gets a token; the server must confirm it
// with Cloudflare before trusting the submission. Free on any Cloudflare account.

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export interface TurnstileOptions {
  secret: string;
  /** The site's hostname. A token issued for another site is refused. */
  expectedHostname?: string;
  remoteIp?: string;
  /** Injectable for tests. */
  fetchImpl?: typeof fetch;
}

export async function verifyTurnstile(token: string, options: TurnstileOptions): Promise<boolean> {
  if (!token || token.length > 2048) return false;

  const body = new URLSearchParams({ secret: options.secret, response: token });
  if (options.remoteIp) body.set('remoteip', options.remoteIp);

  try {
    const response = await (options.fetchImpl ?? fetch)(SITEVERIFY_URL, {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return false;
    const result = (await response.json()) as { success?: boolean; hostname?: string };
    if (result.success !== true) return false;
    if (options.expectedHostname && result.hostname !== options.expectedHostname) return false;
    return true;
  } catch {
    // Network failure or timeout: fail closed. A spam check that can be skipped by making
    // it time out is no check at all.
    return false;
  }
}
