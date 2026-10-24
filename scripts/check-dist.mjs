// Runs after every build. Fails the build (exit 1) if the public output contains anything
// that must never reach the internet. Hosts serve dist/ as-is, so this is the last gate.

import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const distDir = fileURLToPath(new URL('../dist/', import.meta.url));
// For server targets the public files are in dist/client; server code is never served.
const publicDir = (await exists(join(distDir, 'client'))) ? join(distDir, 'client') : distDir;

// Secret formats. A publishable key (Stripe pk_, Turnstile site key) is public by design and
// is deliberately not listed.
const SECRET_PATTERNS = [
  ['Stripe secret key', /\b(sk|rk)_(live|test)_[A-Za-z0-9]{10,}/],
  ['Stripe webhook secret', /\bwhsec_[A-Za-z0-9]{10,}/],
  ['Anthropic API key', /\bsk-ant-[A-Za-z0-9_-]{10,}/],
  ['OpenAI API key', /\bsk-(proj-)?[A-Za-z0-9]{32,}/],
  ['Resend API key', /\bre_[A-Za-z0-9]{8,}_[A-Za-z0-9]{8,}/],
  ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/],
  ['GitHub token', /\bgh[pousr]_[A-Za-z0-9]{36,}/],
  ['Slack token', /\bxox[abpr]-[A-Za-z0-9-]{10,}/],
  ['Cloudflare Turnstile secret', /\b0x4AAAAAAA[A-Za-z0-9_-]{20,}/],
  ['Private key block', /-----BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY-----/],
  ['Google API key', /\bAIza[0-9A-Za-z_-]{35}\b/],
];

const FORBIDDEN_FILES = [
  [/\.php\d?$|\.phtml$|\.phar$/i, 'PHP file (this base never uses PHP)'],
  [/\.map$/i, 'source map (exposes original source code)'],
  [/(^|\/)\.env(\.|$)/, '.env file'],
  [/(^|\/)\.dev\.vars$/, 'Cloudflare local secrets file'],
  [/(^|\/)\.git(\/|$)/, 'git metadata'],
  [/\.(sql|sqlite|db|bak|log)$/i, 'database, backup or log file'],
];

const REQUIRED_FILES = ['_headers', '.htaccess', 'robots.txt', '.well-known/security.txt', '404.html'];

const TEXT_EXT = /\.(html|js|mjs|css|json|txt|xml|svg|webmanifest)$|^_headers$|\.htaccess$/i;

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

const problems = [];

for await (const file of walk(publicDir)) {
  const rel = relative(publicDir, file);
  for (const [pattern, why] of FORBIDDEN_FILES) {
    if (pattern.test(rel)) problems.push(`${rel}: ${why}`);
  }
  if (!TEXT_EXT.test(rel)) continue;
  const text = await readFile(file, 'utf8');
  for (const [name, pattern] of SECRET_PATTERNS) {
    if (pattern.test(text)) problems.push(`${rel}: contains what looks like a ${name}`);
  }
  if (rel.endsWith('.html')) {
    if (!/<meta http-equiv="content-security-policy"/i.test(text)) {
      problems.push(`${rel}: page has no Content Security Policy`);
    }
    if (/\son[a-z]+\s*=\s*["']/i.test(text)) {
      problems.push(`${rel}: inline event handler (onclick= etc.) — the CSP will block it; use a script`);
    }
  }
}

for (const required of REQUIRED_FILES) {
  if (!(await exists(join(publicDir, required)))) problems.push(`missing ${required}`);
}

if (problems.length) {
  console.error(`\n✗ Build output failed the security check (${problems.length}):\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('\nNothing has been deployed. Fix the above and rebuild.\n');
  process.exit(1);
}
console.log('✓ Build output passed the security check');
