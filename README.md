# Illuminara Core — client websites main code base

This is the main adaptable code base for the majority of client builds. This code base is to
be updated and improved over time to create a dependable, secure and optimised foundation to
design the clients front-ends on. It must be pushed/pulled to each individual client
repositories before starting a client site.

Each client gets a new front-end design; the security, deployment and Illuminara footer stay
standard.

- **Astro 7**, TypeScript (strictest), Tailwind CSS 4
- **Static, hybrid or fully dynamic**: pages are pre-built unless they opt into running live
- **Hosts**: Cloudflare Pages (default), any Node host, or plain static hosting (Hostinger)
- **No PHP**, ever
- Security first: see [docs/SECURITY.md](docs/SECURITY.md). Plan: [docs/PLAN.md](docs/PLAN.md)
- Deploying: [docs/CLOUDFLARE.md](docs/CLOUDFLARE.md) or [docs/HOSTINGER.md](docs/HOSTINGER.md) (set `DEPLOY_HOST`)

## Base repository vs client repositories

This repository ([BHarmoniX/Illuminara-client-websites-main-code-base](https://github.com/BHarmoniX/Illuminara-client-websites-main-code-base))
holds **only the reusable base**. Client front-end design never goes here.

- Every client gets their **own new private repository**. The base is copied into it before
  the client build starts.
- In a client repo, the base is a **pull-only** remote called `upstream`. Pushing to it is
  disabled, so client work can't flow back here.
- Improvements useful to every client are made **here**, then pulled into client repos with
  `npm run update-base`.
- The `.illuminara-base` marker switches on a guard (pre-commit hook + GitHub Action) that
  refuses commits containing client images, video, audio, 3D models, fonts or a client name
  or domain in `src/config/site.ts`. Never delete the marker in this repo.

After cloning this repo, run `npm ci` then `npm run setup` once (switches on the hook).

## Start a new client site

1. On GitHub, create an empty **private** repository for the client (no README),
   e.g. `BHarmoniX/sa-massage-website`.
2. From this folder:
   ```bash
   npm run new-client -- sa-massage https://github.com/BHarmoniX/sa-massage-website.git
   ```
   This creates `../sa-massage` with the base, the remotes wired as above, and the first
   commit pushed to the client's repo.
3. In the client folder: `npm ci`, `npm run setup`, then fill in `src/config/site.ts`
   (business name, ABN, phone, email, address, links, security contact). It's checked at
   build time, so a typo'd phone or URL stops the build.
4. Design: change the token values at the top of `src/styles/global.css` (colours, fonts,
   radius). Every component, the footer included, follows them. Pages go in `src/pages`.
5. Pick the host: set `DEPLOY_TARGET` to `cloudflare`, `node` or `static`.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Local preview (Node mode; Cloudflare's local emulator can't handle the `:` in the folder path) |
| `npm run build` | Build for `DEPLOY_TARGET` (default cloudflare), then run the security check |
| `npm run build:static` | Plain files for Hostinger / Apache (upload `dist/`) |
| `npm run build:node` / `npm run start` | Build and run on a Node host |
| `npm test` | Attack tests for the form gatekeeper |
| `npm run scan-headers -- <url>` | Check a live site's security from the outside |
| `npm run verify` | Guard + type check + tests + audit + guarded build. Runs on every push. |

The scripts call Astro through `node ./node_modules/...` on purpose: the `:` in the
`Website:App Builds` folder name breaks npm's usual way of finding tools.

## Static or live pages

Every page is pre-built by default: fastest, and nothing to attack. To make a page run live
(forms, shop, bookings, logins), add this to it:

```ts
export const prerender = false;
```

Live pages need the `cloudflare` or `node` target. Building a live page for `static` stops
the build with an explanation instead of shipping a page that silently doesn't work.

## Layout

```
config/security.mjs        every header and CSP rule (single source of truth)
integrations/              build-time: host security files, deploy-target guard
server/node.mjs            production server for the node target
scripts/check-dist.mjs     build guard: blocks secrets, PHP, source maps, missing CSP
scripts/guard-base-repo.mjs  keeps client work out of the base repo
scripts/new-client.mjs     creates a client repo from the base
.githooks/, .github/       pre-commit hook and the Verify GitHub Action
src/config/site.ts         the per-client settings file (contact, hours, logo, social, footer menus)
src/config/studio.ts       Illuminara Creative Studio credit (base-owned)
src/components/footer/     the standard Illuminara footer
src/components/layout/     header (nav, mobile menu, CTA) and Section for one-page sites
src/layouts/OnePageLayout  header + scroll-spy + footer; use for every page
src/scripts/one-page.ts    highlights the section in view, keeps the address shareable
src/styles/depth.css       depth module: .btn-3d, .card-3d + data-tilt, data-depth parallax,
                           .breathe, .img-reveal, .scroll-drift, data-reveal (see file header)
src/scripts/depth.ts       pointer light/tilt and scroll motion for the depth module
src/components/media/Img   optimised responsive images (AVIF/WebP, srcset, no layout jump)
src/components/media/AmbientVideo  lazy, muted background video; poster on data saver / reduced motion
src/components/media/AmbientAudio  floating play/pause brand music (site.audio)
src/middleware.ts          gatekeeper for live pages
src/layouts, components    page shell and head tags
src/pages                  pages, robots.txt, security.txt, /api/health
```

## Installing packages

Supply-chain rule: only versions at least 14 days old, except signed security patches.

```bash
npm install --before=2026-10-10 <package>
```

Your npm cache (`~/.npm`) has root-owned files from an old npm bug. Until it's fixed, use a
temporary cache: `export npm_config_cache="$TMPDIR/npm-cache"`. To fix it for good, run
`sudo chown -R 501:20 ~/.npm` yourself.
