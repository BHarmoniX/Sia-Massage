// Single source of truth for every security header and CSP rule.
//
// astro.config.mjs, the header integration (Cloudflare `_headers`, Hostinger `.htaccess`)
// and the server middleware all read from here, so the hosts can never drift apart.
// Loosen a rule only per client, only when a feature needs it, and note why in the client's
// docs/SECURITY-EXCEPTIONS.md.

/**
 * Extra origins a client site is allowed to talk to. Empty by default: the site may only
 * load from itself. Modules add to these lists when they are switched on (for example the
 * Stripe module adds https://js.stripe.com to `script` and `frame`).
 */
/** @type {Record<'script' | 'style' | 'img' | 'font' | 'connect' | 'frame' | 'media' | 'formAction', string[]>} */
export const allowedOrigins = {
  script: [],
  style: [],
  img: [],
  font: [],
  connect: [],
  frame: [],
  media: [],
  formAction: [],
};

const list = (extra) => ["'self'", ...extra].join(' ');

/**
 * CSP directives other than script-src / style-src. Astro adds those two itself, with a
 * SHA-384 hash of every bundled script and style, so injected inline code is refused.
 * @typedef {NonNullable<Exclude<NonNullable<NonNullable<import('astro').AstroUserConfig['security']>['csp']>, boolean>['directives']>} CspDirectives
 * @param {typeof allowedOrigins} origins
 * @returns {CspDirectives}
 */
export function cspDirectives(origins = allowedOrigins) {
  return /** @type {CspDirectives} */ ([
    "default-src 'self'",
    `img-src ${list(origins.img)} data: blob:`,
    `font-src ${list(origins.font)}`,
    `connect-src ${list(origins.connect)}`,
    `media-src ${list(origins.media)} blob:`,
    `frame-src ${origins.frame.length ? origins.frame.join(' ') : "'none'"}`,
    `form-action ${list(origins.formAction)}`,
    "object-src 'none'",
    "base-uri 'self'",
    "manifest-src 'self'",
    "worker-src 'self' blob:",
    'upgrade-insecure-requests',
  ]);
}

/**
 * Directives that only work as a real HTTP header, never in a <meta> tag. Browsers enforce
 * this header policy alongside Astro's <meta> policy, and a request must pass both.
 */
export const headerOnlyCsp = "frame-ancestors 'none'";

/** Response headers sent on every page and file. */
export const securityHeaders = {
  // Force HTTPS for two years, subdomains included. Only takes effect over HTTPS.
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'Content-Security-Policy': headerOnlyCsp,
  // Legacy clickjacking protection for browsers without frame-ancestors.
  'X-Frame-Options': 'DENY',
  // Stop browsers guessing file types (blocks disguised script uploads).
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // Deny powerful browser features by default. Modules opt in (audio needs none of these;
  // a 3D/AR module may need `xr-spatial-tracking=(self)`).
  'Permissions-Policy': [
    'accelerometer=()',
    'autoplay=(self)',
    'camera=()',
    'display-capture=()',
    'geolocation=()',
    'gyroscope=()',
    'magnetometer=()',
    'microphone=()',
    'midi=()',
    'payment=()',
    'usb=()',
    'interest-cohort=()',
    'browsing-topics=()',
  ].join(', '),
  // Isolate the site from other windows (blocks a class of cross-site leaks).
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'X-Permitted-Cross-Domain-Policies': 'none',
  // Ask the browser to keep this site in its own process, apart from sibling subdomains.
  'Origin-Agent-Cluster': '?1',
};

/** Long-lived caching for fingerprinted build files (their names change when content does). */
export const immutableAssetHeaders = {
  'Cache-Control': 'public, max-age=31536000, immutable',
};

/** Paths no visitor should ever reach. Probed constantly by automated scanners. */
export const blockedPathPatterns = [
  '/.env',
  '/.git',
  '/.npmrc',
  '/wp-admin',
  '/wp-login.php',
  '/xmlrpc.php',
  '/phpmyadmin',
  '/.DS_Store',
];

/** Largest request body (bytes) the server accepts. Forms are small; anything bigger is hostile. */
export const maxBodyBytes = 64 * 1024;
