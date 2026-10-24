// Production server for the node target: `npm run build:node && npm run start`.
//
// Wraps Astro's handler so every response — pages, files, 404s and Astro's own CSRF
// refusals — carries the security headers. Cloudflare and Apache add these at the host
// (_headers / .htaccess); a bare Node host has nothing in front of it, so this does it.

import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { securityHeaders } from '../config/security.mjs';

/** @param {(req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => void} astroHandler */
export function withSecurityHeaders(astroHandler) {
  return (req, res) => {
    for (const [name, value] of Object.entries(securityHeaders)) res.setHeader(name, value);
    res.removeHeader('X-Powered-By');
    astroHandler(req, res);
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { handler } = await import('../dist/server/entry.mjs');
  const host = process.env.HOST ?? '127.0.0.1';
  const port = Number(process.env.PORT ?? 4321);
  const server = createServer(withSecurityHeaders(handler));
  // Drop slow or stalled connections (slowloris-style attacks).
  server.headersTimeout = 10_000;
  server.requestTimeout = 30_000;
  server.keepAliveTimeout = 5_000;
  server.listen(port, host, () => console.log(`Listening on http://${host}:${port}`));
}
