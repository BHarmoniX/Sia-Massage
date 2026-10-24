// Optional features that need extra permissions in the security policy.
// Switch one on here and config/security.mjs opens exactly the origins it needs — nothing
// else. Each client repo sets these for its own site.

export const features = {
  /** Cloudflare Turnstile spam check on forms. Needs TURNSTILE_SITE_KEY / TURNSTILE_SECRET_KEY. */
  turnstile: false,
};
