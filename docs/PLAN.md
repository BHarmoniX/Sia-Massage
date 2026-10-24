# Illuminara Core — plan

A secure, production-ready base for client websites. The front end is redesigned per client;
the security shell, deployment pipeline and Illuminara footer stay standard.

Separate project from Mothership. Started 2026-10-24.

## Repositories

- Base: `BHarmoniX/Illuminara-client-websites-main-code-base`. Reusable base only, never
  client front-end design (enforced by `.illuminara-base` + `scripts/guard-base-repo.mjs`).
- Each client: its own new private repo, created with `npm run new-client`. The base is a
  pull-only `upstream` remote there; improvements flow base → clients, never back.

## Ground rules

- **Security is the top priority**, ahead of visuals and convenience. Threat model assumes
  AI-assisted attackers: automated scanning, AI form spam, scraping, prompt injection, npm
  supply-chain attacks.
- **No PHP.** Server logic runs in edge/serverless functions or Node.
- **Static and dynamic.** Astro with per-page choice: static, hybrid, or fully server-rendered.
- **Every site goes on the public internet**, so deployment is part of the base.
- Australian defaults (en-AU, AEST, ABN, AU phone format), configurable per client.

## Survey findings (2026-10-24)

- No PHP in any build or zip under `Website:App Builds`.
- **Sa Massage** (React 18 + Vite SPA on Hostinger, source in
  `Sa Massage Full Website plus Full Reports (Very Important-Keep Safe)/3D Website for Sa Massage/Samassagewebsite-main`):
  - `.htaccess` has SPA rewrite only: no CSP, HSTS, X-Frame-Options, nosniff, Referrer or Permissions policy.
  - Analytics and Facebook Pixel injected via inline `innerHTML`, which blocks a strict CSP.
  - Unused Express/passport/session/Postgres/Replit dependencies; error handler rethrows; logs response bodies.
  - 585 KB single bundle; legal pages need JS to render.
  - Phone number hard-coded in 6 places.
  - Keep: footer, 14 legal pages, JSON-LD, audio autoplay fallback, loading screen, WebP pipeline.
- **Rise 2** (`Rise Website Design/Rise 2/rise-2`, Astro static): good base. Has `noopener`,
  reduced-motion, ARIA, checksummed checkpoints. No security headers. `BaseHead` crashes when
  a page passes no image.
- **Harvest from other builds:** R3F + postprocessing (`ImmersivePortfolioStudio`,
  `portfolio-of-brandon-williams`), Stripe (`HD-WebsiteE-commerce-store`), Claude SDK chatbot
  (`Harmonic-Dreamer`), Embla carousels (most React builds).

## Structure

1. Security shell: headers, strict CSP, HTTPS, audits
2. Design layer: tokens + Illuminara footer (merged Sa + Rise), one client config file
3. Page shells: single page / multi page, legal page templates
4. Experience modules (opt-in): 3D, smooth scroll + GSAP, spatial nav, audio, video, carousels, hover/lighting
5. Business modules (opt-in): forms, Stripe + shop, git-based CMS, chatbot
6. Edge functions: forms, payments, chatbot keys

## Security layers

1. Edge shield: HTTPS, firewall, bot filter, rate limits
2. Browser lockdown: strict CSP, no inline scripts, security headers
3. Server gatekeeper: input validation (Zod), CSRF, Turnstile + honeypot
4. Secrets vault: keys server-side only; build fails if one leaks
5. Supply chain: exact pins, audit every build, approved package list, no install scripts

| Threat | Counter |
|---|---|
| AI vulnerability scanners | Static by default, no DB/admin exposed, edge blocks probes |
| AI form spam | Turnstile, honeypot, rate limits, server validation |
| Leaked API keys | Server secrets only, build-time leak check |
| Chatbot prompt injection | Fixed knowledge, no tools, text-only output, per-visitor limits |
| Poisoned npm packages | Pins, audits, allowlist, no install scripts |
| Fake payment confirmations | Stripe hosted checkout + verified webhook signatures |
| Scraping / AI crawlers | robots + AI-crawler rules, edge bot management |
| Clickjacking / injected scripts | HSTS, frame-ancestors, nosniff, Permissions-Policy |

## Deployment pipeline

Local build → private GitHub repo (one per client) → automatic security checks (block on fail)
→ private staging preview (client approves) → live on client domain behind edge shield →
ongoing watch (uptime, header scans, dependency alerts). One-click rollback.

Domains stay with their registrar; DNS points at Cloudflare. Default host: Cloudflare Pages.
Hostinger supported for static sites with a hardened `.htaccess`.

## Build steps

1. ✅ Base project (Astro 7, TypeScript strictest, Tailwind 4; static/hybrid/server ready) — done 2026-10-24.
   Includes the security headers, strict CSP, live-page gatekeeper, build guard and
   deploy-target guard, all verified (see docs/SECURITY.md).
2. ✅ Security shell + deploy pipeline — code done 2026-10-24: form gatekeeper (size cap,
   rate limits, honeypot, Turnstile, validation) with 14 attack tests; preview/production
   split with noindex previews; GitHub deploy workflow (client repos only); live header
   scanner; actions pinned to SHAs. Dashboard steps in docs/CLOUDFLARE.md.
3. Illuminara footer + client config + design tokens
4. Page shells + legal templates
5. Experience modules
6. Business modules
7. Rebuild Sa Massage on the base as the first client
8. Docs, launch security checklist, maintained system map
