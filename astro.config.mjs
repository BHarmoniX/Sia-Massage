// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { allowedOrigins, cspDirectives, maxBodyBytes } from './config/security.mjs';
import deployTarget from './integrations/deploy-target.mjs';
import securityHeaders from './integrations/security-headers.mjs';
import { site } from './src/config/site.ts';

// Where this site is deployed. Set DEPLOY_TARGET in the host's build settings.
//   cloudflare (default) → Cloudflare Pages/Workers, live pages run at the edge
//   node                 → any Node host (VPS, Hostinger Node plan, Docker)
//   static               → plain files only (Hostinger shared, any Apache host); no live pages
const target = process.env.DEPLOY_TARGET ?? 'cloudflare';

/** @param {string} name */
async function adapterFor(name) {
  switch (name) {
    case 'cloudflare':
      return (await import('@astrojs/cloudflare')).default({
        // Pre-build static pages in Node (no local inspector port, faster). Live pages
        // still run on Cloudflare's runtime.
        prerenderEnvironment: 'node',
        // Optimise images at build time; no paid Cloudflare Images binding needed.
        imageService: 'compile',
      });
    case 'node':
      return (await import('@astrojs/node')).default({ mode: 'standalone' });
    case 'static':
      return undefined;
    default:
      throw new Error(`Unknown DEPLOY_TARGET "${name}". Use cloudflare, node or static.`);
  }
}

const adapter = await adapterFor(target);

export default defineConfig({
  site: site.url,
  // Pages are pre-built (fastest, nothing to attack) unless a page opts into running live
  // with `export const prerender = false`. That needs a cloudflare or node target.
  output: 'static',
  ...(adapter ? { adapter } : {}),
  trailingSlash: 'never',
  build: { format: 'file', inlineStylesheets: 'never' },

  security: {
    // Reject cross-site form posts to live pages (CSRF).
    checkOrigin: true,
    actionBodySizeLimit: maxBodyBytes,
    csp: {
      algorithm: 'SHA-384',
      directives: cspDirectives(allowedOrigins),
      scriptDirective: { resources: ["'self'", ...allowedOrigins.script] },
      styleDirective: { resources: ["'self'", ...allowedOrigins.style] },
    },
  },

  // Shiki highlighting injects inline styles, which the CSP refuses. Prism works with it.
  markdown: { syntaxHighlight: 'prism' },

  integrations: [deployTarget({ target }), sitemap(), securityHeaders()],

  vite: {
    plugins: [tailwindcss()],
    build: { sourcemap: false },
  },

  devToolbar: { enabled: false },
});
