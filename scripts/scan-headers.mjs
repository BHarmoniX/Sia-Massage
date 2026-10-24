// Checks a deployed site from the outside, the way a scanner would.
//   npm run scan-headers -- https://www.example.com.au            (production)
//   npm run scan-headers -- https://preview-url.workers.dev --preview
// Exits 1 if any protection is missing. Runs automatically after every deploy.

const [url, flag] = process.argv.slice(2);
if (!url || !/^https:\/\//.test(url)) {
  console.error('Usage: npm run scan-headers -- https://<site> [--preview]');
  process.exit(1);
}
const expectNoindex = flag === '--preview';

const REQUIRED = {
  'strict-transport-security': /max-age=\d{8,}/,
  'content-security-policy': /frame-ancestors 'none'/,
  'x-frame-options': /^DENY$/i,
  'x-content-type-options': /^nosniff$/i,
  'referrer-policy': /strict-origin-when-cross-origin|no-referrer/,
  'permissions-policy': /camera=\(\)/,
  'cross-origin-opener-policy': /same-origin/,
};
const MUST_NOT_REVEAL = ['x-powered-by', 'x-aspnet-version', 'x-generator'];

const problems = [];
const passes = [];
const check = (ok, good, bad) => (ok ? passes.push(good) : problems.push(bad));

const page = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(15_000) });
check(page.ok, `page loads (${page.status})`, `page returned ${page.status}`);

for (const [name, pattern] of Object.entries(REQUIRED)) {
  const value = page.headers.get(name);
  check(value && pattern.test(value), `${name}`, `${name} missing or weak: ${value ?? '(none)'}`);
}
for (const name of MUST_NOT_REVEAL) {
  check(!page.headers.has(name), `no ${name}`, `${name} reveals server details`);
}

const html = await page.text();
check(
  /<meta http-equiv="content-security-policy"[^>]*script-src[^>]*sha384-/i.test(html),
  'page CSP with script fingerprints',
  'page has no fingerprinted Content Security Policy',
);

const robotsHeader = page.headers.get('x-robots-tag') ?? '';
if (expectNoindex) {
  check(/noindex/.test(robotsHeader), 'preview hidden from search engines', 'preview is indexable (no X-Robots-Tag noindex)');
} else {
  check(!/noindex/.test(robotsHeader) && !/name="robots" content="noindex/.test(html), 'indexable by search engines', 'production site is set to noindex');
}

// Plain http must redirect to https.
const insecure = await fetch(url.replace(/^https:/, 'http:'), {
  redirect: 'manual',
  signal: AbortSignal.timeout(15_000),
}).catch(() => null);
check(
  insecure && [301, 302, 307, 308].includes(insecure.status) && /^https:/.test(insecure.headers.get('location') ?? ''),
  'http redirects to https',
  `http does not redirect to https (${insecure?.status ?? 'no response'})`,
);

// Scanner probes must find nothing.
for (const probe of ['/.env', '/.git/config', '/wp-login.php']) {
  const r = await fetch(new URL(probe, url), { redirect: 'manual', signal: AbortSignal.timeout(15_000) });
  const body = r.status === 200 ? await r.text() : '';
  check(r.status >= 400 || !/(=|\[core\])/.test(body), `${probe} not exposed (${r.status})`, `${probe} answered ${r.status}`);
}

for (const p of passes) console.log(`  ✓ ${p}`);
if (problems.length) {
  console.error(`\n✗ ${url} failed ${problems.length} security check(s):`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`\n✓ ${url} passed all security checks`);
