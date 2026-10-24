// Run with `npm test`. Each test plays an attacker (or a real visitor) against the gates.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { z } from 'zod';
import { BodyTooLargeError, readTextLimited } from '../src/lib/server/body.ts';
import { guardForm, HONEYPOT_FIELD, TURNSTILE_FIELD } from '../src/lib/server/form-guard.ts';
import { memoryRateLimiter, visitorKey } from '../src/lib/server/rate-limit.ts';
import { verifyTurnstile } from '../src/lib/server/turnstile.ts';

const contact = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.email(),
  message: z.string().trim().min(1).max(2000),
});

const valid = { name: 'Jo Citizen', email: 'jo@example.com.au', message: 'Booking enquiry' };

function post(fields: Record<string, string>, headers: Record<string, string> = {}) {
  return new Request('https://example.com.au/api/contact', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', ...headers },
    body: new URLSearchParams(fields),
  });
}

const generous = () => memoryRateLimiter({ limit: 100, windowMs: 60_000 });
const opts = () => ({ limiter: generous(), purpose: 'contact' });

/** A body that streams without declaring its size (the Content-Length trick). */
function streamOf(bytes: number) {
  const chunk = new Uint8Array(1024).fill(120);
  let sent = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (sent >= bytes) return controller.close();
      controller.enqueue(chunk);
      sent += chunk.byteLength;
    },
  });
}

describe('size-capped body reading', () => {
  it('refuses a body larger than the cap even without Content-Length', async () => {
    const request = new Request('https://x.test', {
      method: 'POST',
      body: streamOf(1024 * 1024),
      // @ts-expect-error Node needs this for streamed request bodies.
      duplex: 'half',
    });
    await assert.rejects(readTextLimited(request, 16 * 1024), BodyTooLargeError);
  });

  it('reads a body under the cap', async () => {
    const request = new Request('https://x.test', { method: 'POST', body: 'hello' });
    assert.equal(await readTextLimited(request, 1024), 'hello');
  });
});

describe('guardForm', () => {
  it('accepts a genuine submission and returns typed data', async () => {
    const result = await guardForm(post(valid), '203.0.113.5', contact, opts());
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.data.email, 'jo@example.com.au');
  });

  it('refuses GET', async () => {
    const result = await guardForm(new Request('https://x.test'), '203.0.113.5', contact, opts());
    assert.equal(!result.ok && result.response.status, 405);
  });

  it('refuses unsupported content types (e.g. file uploads)', async () => {
    const request = post(valid, { 'content-type': 'multipart/form-data; boundary=x' });
    const result = await guardForm(request, '203.0.113.5', contact, opts());
    assert.equal(!result.ok && result.response.status, 415);
  });

  it('refuses oversized submissions', async () => {
    const result = await guardForm(post({ ...valid, message: 'x'.repeat(20_000) }), '203.0.113.5', contact, opts());
    assert.equal(!result.ok && result.response.status, 413);
  });

  it('silently drops bots that fill the honeypot (looks like success to the bot)', async () => {
    const result = await guardForm(post({ ...valid, [HONEYPOT_FIELD]: 'http://spam' }), '203.0.113.5', contact, opts());
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.response.status, 200);
      assert.deepEqual(await result.response.json(), { ok: true });
    }
  });

  it('rate-limits a visitor hammering the form', async () => {
    const limiter = memoryRateLimiter({ limit: 3, windowMs: 60_000 });
    const statuses = [];
    for (let i = 0; i < 5; i++) {
      const r = await guardForm(post(valid), '198.51.100.7', contact, { limiter, purpose: 'contact' });
      statuses.push(r.ok ? 200 : r.response.status);
    }
    assert.deepEqual(statuses, [200, 200, 200, 429, 429]);
    // A different visitor is unaffected.
    const other = await guardForm(post(valid), '198.51.100.8', contact, { limiter, purpose: 'contact' });
    assert.equal(other.ok, true);
  });

  it('rejects invalid fields without echoing what was submitted', async () => {
    const evil = '<script>alert(1)</script>';
    const result = await guardForm(post({ ...valid, email: evil }), '203.0.113.5', contact, opts());
    assert.equal(!result.ok && result.response.status, 422);
    if (!result.ok) {
      const text = await result.response.text();
      assert.ok(!text.includes('script'), 'response must not reflect input');
      assert.deepEqual(JSON.parse(text), { error: 'invalid', fields: ['email'] });
    }
  });

  it('uses only the first value when a field is repeated', async () => {
    const body = 'name=Jo&name=Evil&email=jo%40example.com.au&message=hi';
    const request = new Request('https://x.test', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });
    const result = await guardForm(request, '203.0.113.5', contact, opts());
    assert.equal(result.ok && result.data.name, 'Jo');
  });

  it('requires a valid Turnstile token when Turnstile is configured', async () => {
    const fakeCloudflare = (success: boolean, hostname = 'example.com.au') =>
      (async () => Response.json({ success, hostname })) as typeof fetch;
    const withTurnstile = (fetchImpl: typeof fetch) => ({
      ...opts(),
      turnstile: { secret: 'test-secret', expectedHostname: 'example.com.au', fetchImpl },
    });

    const missing = await guardForm(post(valid), '203.0.113.5', contact, withTurnstile(fakeCloudflare(true)));
    assert.equal(!missing.ok && missing.response.status, 403);

    const rejected = await guardForm(post({ ...valid, [TURNSTILE_FIELD]: 'tok' }), '203.0.113.5', contact, withTurnstile(fakeCloudflare(false)));
    assert.equal(!rejected.ok && rejected.response.status, 403);

    const accepted = await guardForm(post({ ...valid, [TURNSTILE_FIELD]: 'tok' }), '203.0.113.5', contact, withTurnstile(fakeCloudflare(true)));
    assert.equal(accepted.ok, true);
  });
});

describe('verifyTurnstile', () => {
  it('refuses a token issued for a different website', async () => {
    const fetchImpl = (async () => Response.json({ success: true, hostname: 'evil.example' })) as typeof fetch;
    assert.equal(await verifyTurnstile('tok', { secret: 's', expectedHostname: 'example.com.au', fetchImpl }), false);
  });

  it('fails closed when Cloudflare cannot be reached', async () => {
    const fetchImpl = (async () => {
      throw new Error('network down');
    }) as typeof fetch;
    assert.equal(await verifyTurnstile('tok', { secret: 's', fetchImpl }), false);
  });
});

describe('visitorKey', () => {
  it('never contains the raw IP address', async () => {
    const key = await visitorKey('203.0.113.5', 'contact');
    assert.match(key, /^[0-9a-f]{64}$/);
    assert.ok(!key.includes('203.0.113.5'));
  });
});
