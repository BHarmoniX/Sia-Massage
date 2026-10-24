import type { APIRoute } from 'astro';

// Proves live (dynamic) mode works on cloudflare and node targets, and gives uptime
// monitoring something to check. Reveals nothing about the server.
// On the static target there is no server, so integrations/deploy-target.mjs pre-builds
// it as a fixed file instead.
export const prerender = false;

export const GET: APIRoute = () =>
  new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
