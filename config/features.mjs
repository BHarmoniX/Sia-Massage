// Optional features that need extra permissions in the security policy.
// Switch one on here and config/security.mjs opens exactly the origins it needs — nothing
// else. Each client repo sets these for its own site.

export const features = {
  /** Cloudflare Turnstile spam check on forms. Needs TURNSTILE_SITE_KEY / TURNSTILE_SECRET_KEY. */
  turnstile: false,
  /**
   * Capture guard: on live (production) builds, a full-page screenshot (a browser window
   * suddenly far taller than any real screen) shows a blank frosted page with a design notice
   * instead of the site. Real visitors never trigger it. It cannot stop ordinary screenshots;
   * it deters casual full-page copying of the design. Off in previews and development.
   */
  captureGuard: true,
};
