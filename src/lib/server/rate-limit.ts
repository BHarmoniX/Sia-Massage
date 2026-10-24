// Per-visitor rate limiting for live endpoints (forms, checkout, chat).
//
// On Cloudflare it uses the Workers rate limiting binding declared in wrangler.jsonc, which
// counts across Cloudflare's whole network. On Node it falls back to an in-memory counter
// (per server process — fine for one server; put Cloudflare in front for more).
// Visitor IPs are hashed before use, so raw addresses are never kept.

export interface RateLimiter {
  /** Records one hit for `key`. Returns false when the key is over its limit. */
  hit(key: string): Promise<boolean>;
}

interface CloudflareRateLimitBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export function memoryRateLimiter({
  limit,
  windowMs,
  maxKeys = 10_000,
}: {
  limit: number;
  windowMs: number;
  /** Cap on tracked visitors, so a flood of fake addresses can't exhaust memory. */
  maxKeys?: number;
}): RateLimiter {
  const windows = new Map<string, { start: number; count: number }>();
  return {
    async hit(key) {
      const now = Date.now();
      const current = windows.get(key);
      if (!current || now - current.start >= windowMs) {
        if (windows.size >= maxKeys) {
          const oldest = windows.keys().next().value;
          if (oldest !== undefined) windows.delete(oldest);
        }
        windows.delete(key);
        windows.set(key, { start: now, count: 1 });
        return true;
      }
      current.count += 1;
      return current.count <= limit;
    },
  };
}

export function cloudflareRateLimiter(binding: CloudflareRateLimitBinding): RateLimiter {
  return {
    async hit(key) {
      const { success } = await binding.limit({ key });
      return success;
    },
  };
}

const fallbacks = new Map<string, RateLimiter>();

/**
 * The limiter for a named binding (see `ratelimits` in wrangler.jsonc), or an in-memory
 * one with the same limits when not running on Cloudflare.
 */
export async function getRateLimiter(
  bindingName: string,
  fallback: { limit: number; windowMs: number },
): Promise<RateLimiter> {
  try {
    const moduleName = 'cloudflare:workers';
    const { env } = (await import(/* @vite-ignore */ moduleName)) as {
      env: Record<string, unknown>;
    };
    const binding = env[bindingName] as CloudflareRateLimitBinding | undefined;
    if (binding && typeof binding.limit === 'function') return cloudflareRateLimiter(binding);
  } catch {
    // Not on Cloudflare.
  }
  let limiter = fallbacks.get(bindingName);
  if (!limiter) {
    limiter = memoryRateLimiter(fallback);
    fallbacks.set(bindingName, limiter);
  }
  return limiter;
}

/** SHA-256 of the visitor address plus a purpose, so keys can't be reversed to an IP. */
export async function visitorKey(clientAddress: string, purpose: string): Promise<string> {
  const data = new TextEncoder().encode(`${purpose}:${clientAddress}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}
