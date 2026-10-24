// Enforces what a deploy target can actually run.
//
// Live pages declare `export const prerender = false`. On the static target there is no
// server, so a live page would silently become a fixed file (forms that never send,
// payments that never confirm). This stops the build instead, unless the page is on the
// short list of routes that are safe to pre-build as a fixed file.

/** Live routes that may be pre-built as a fixed file when there is no server. */
const STATIC_FALLBACK_OK = new Set(['src/pages/api/health.ts']);

/**
 * @param {{ target: string }} options
 * @returns {import('astro').AstroIntegration}
 */
export default function deployTarget({ target }) {
  return {
    name: 'illuminara:deploy-target',
    hooks: {
      'astro:route:setup': ({ route, logger }) => {
        if (target !== 'static' || route.prerender !== false) return;
        if (STATIC_FALLBACK_OK.has(route.component)) {
          route.prerender = true;
          return;
        }
        logger.error(
          `${route.component} runs live (prerender = false) but DEPLOY_TARGET is "static", ` +
            'which has no server. Deploy to cloudflare or node, or remove the live page.',
        );
        throw new Error(`Live page ${route.component} cannot be built for a static-only host.`);
      },
    },
  };
}
