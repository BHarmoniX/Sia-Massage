# Security

Security is the top priority of this base, ahead of visuals and convenience. Every client
site is public on the internet, and the attackers it faces are increasingly automated and
AI-assisted: they scan every site, try every known hole, and never get tired.

The rule of thumb: **nothing reaches a visitor's browser, or the server, unless it has been
explicitly allowed.**

## What protects a site, layer by layer

| Layer | What it does | Where it lives |
|---|---|---|
| Edge shield | HTTPS, firewall, bot filter, rate limits | Cloudflare dashboard (step 2) |
| Security headers | HSTS, clickjacking block, nosniff, Permissions-Policy, cross-origin isolation | `config/security.mjs` → `_headers`, `.htaccess`, `server/node.mjs`, `src/middleware.ts` |
| Content Security Policy | Only fingerprinted (SHA-384) scripts and styles run; injected code is refused | `astro.config.mjs` `security.csp` + `config/security.mjs` |
| Gatekeeper (live pages) | Allowed methods only, scanner probes refused, body size capped, CSRF origin check | `src/middleware.ts`, `security.checkOrigin` |
| Build guard | Build fails if a secret key, PHP file, source map, `.env` or missing CSP reaches the output | `scripts/check-dist.mjs` |
| Deploy-target guard | A live page can't silently become a dead static file on a host without a server | `integrations/deploy-target.mjs` |
| Supply chain | Exact versions, no install scripts, audit on every verify, 14-day age rule | `.npmrc`, `package.json` |
| Disclosure | `/.well-known/security.txt` tells researchers how to report a problem | `src/pages/.well-known/security.txt.ts` |

## No PHP

This base never uses PHP. The Apache `.htaccess` refuses to run any PHP (or CGI, Perl,
Python or shell) file that ends up on the server, and the build guard fails if one is in the
output. Server logic runs in Cloudflare Workers or Node instead.

## Changing a security rule

All headers and CSP rules come from **one file**: `config/security.mjs`. Never edit the
generated `_headers` or `.htaccess` by hand.

When a feature needs to loosen a rule (for example Stripe needs `https://js.stripe.com` in
`script` and `frame`):

1. Add only the exact origin to `allowedOrigins`. Never use wildcards or `'unsafe-inline'`.
2. Write why in the client's `docs/SECURITY-EXCEPTIONS.md`.
3. Rebuild and confirm the build guard passes.

## Secrets

- Secret keys (Stripe secret, email API, chatbot API) live **only** in the host's encrypted
  secrets settings, read on the server. Never in code, never in a file in the repo.
- Publishable keys (Stripe `pk_`, Turnstile site key) are public by design.
- `.env` and `.dev.vars` are git-ignored; `.env.example` lists names only.
- The build guard scans the public output for known secret formats and fails if it finds one.

## Dependencies (supply chain)

- `ignore-scripts=true`: packages can't run code when installed.
- `save-exact=true`: versions are pinned, never ranges.
- **14-day rule:** install new versions with `npm install --before=<date 14 days ago>`.
  Poisoned releases are usually caught and pulled within days.
- **Exception:** a security patch may be taken immediately if it has signed provenance
  (`npm view <pkg>@<version> dist.attestations` shows a SLSA provenance), meaning it was
  built from the official source by the maintainers' CI. Pin it with `overrides` if it is a
  sub-dependency. Current overrides and why:
  - `zod` 4.6.7 — memory exhaustion on oversized input (fixed 2026-10-12).
  - `fast-uri` 3.1.9 — URI scheme spoofing (fixed 2026-10-19).
  - `undici` 7.30.1 / 8.12.2 — memory exhaustion in the event-stream parser (fixed 2026-10-15).
- `npm run verify` runs the type check, the audit and the guarded build. Run it before every
  deploy.

## AI-era threats and the counter for each

| Threat | Counter |
|---|---|
| AI vulnerability scanners | Static by default, no database or admin exposed, probes refused |
| AI-written form spam | Turnstile, honeypot, rate limits, server validation (forms module) |
| Leaked API keys | Server-only secrets, build-time leak scan |
| Chatbot prompt injection | Fixed knowledge, no tools, text-only output, per-visitor limits (chat module) |
| Poisoned npm packages | Pins, no install scripts, age rule, audits |
| Fake payment confirmations | Stripe hosted checkout + verified webhook signatures (payments module) |
| Scraping and AI training crawlers | `robots.txt` AI-crawler block (`blockAiTrainingCrawlers`), edge bot management |
| Clickjacking and injected scripts | `frame-ancestors 'none'`, `X-Frame-Options`, strict CSP |

## Verified on 2026-10-24

- All three targets (cloudflare, node, static) build and pass the build guard.
- The build guard caught a planted Stripe secret, a PHP file and an inline `onclick`.
- Requests fed to the node server: normal visit 200; `/.env`, `/wp-login.php`, `.php`
  probes 404; `DELETE` 405; forged cross-site POST 403; 1 MB body 413. Every response
  carried HSTS, CSP, nosniff and frame-deny headers.
- `npm audit`: 0 vulnerabilities. `astro check`: 0 errors.

## Before every launch

See the launch checklist (step 8). Minimum: `npm run verify` passes, HTTPS works, and a
header scan of the live URL (securityheaders.com or Mozilla Observatory) grades A or above.
