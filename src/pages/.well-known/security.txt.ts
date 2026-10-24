import type { APIRoute } from 'astro';
import { site } from '../../config/site';

// RFC 9116: tells security researchers how to report a problem instead of exploiting it.
// Expires one year from each build, so a regularly rebuilt site never serves a stale file.
export const GET: APIRoute = () => {
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  const body = [
    `Contact: mailto:${site.securityContact}`,
    `Expires: ${expires}`,
    `Preferred-Languages: en`,
    `Canonical: ${new URL('/.well-known/security.txt', site.url)}`,
    '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
