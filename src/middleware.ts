// Gatekeeper for pages that run live (`export const prerender = false`).
// Pre-built pages get the same headers from the host via _headers / .htaccess.

import { SITE_ENV } from 'astro:env/server';
import { defineMiddleware } from 'astro:middleware';
import { blockedPathPatterns, maxBodyBytes, securityHeaders } from '../config/security.mjs';

const ALLOWED_METHODS = new Set(['GET', 'HEAD', 'POST', 'OPTIONS']);

function withSecurityHeaders(response: Response): Response {
  for (const [name, value] of Object.entries(securityHeaders)) {
    // Keep a stricter CSP if the route set one (Astro adds script/style hashes).
    if (name === 'Content-Security-Policy' && response.headers.has(name)) {
      response.headers.set(name, `${response.headers.get(name)}; ${value}`);
      continue;
    }
    response.headers.set(name, value);
  }
  if (SITE_ENV !== 'production') response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  response.headers.delete('X-Powered-By');
  return response;
}

const refuse = (status: number) =>
  withSecurityHeaders(new Response(null, { status, headers: { 'Cache-Control': 'no-store' } }));

export const onRequest = defineMiddleware(async (context, next) => {
  if (context.isPrerendered) return next();

  const { request, url } = context;
  const path = url.pathname.toLowerCase();

  if (!ALLOWED_METHODS.has(request.method)) return refuse(405);

  if (blockedPathPatterns.some((p) => path.startsWith(p.toLowerCase())) || path.endsWith('.php')) {
    return refuse(404);
  }

  // Cheap early refusal. A sender can omit Content-Length, so form handlers must still read
  // bodies through a size-capped reader, never request.text() unbounded.
  const declaredLength = Number(request.headers.get('content-length') ?? 0);
  if (declaredLength > maxBodyBytes) return refuse(413);

  const response = await next();
  return withSecurityHeaders(response);
});
