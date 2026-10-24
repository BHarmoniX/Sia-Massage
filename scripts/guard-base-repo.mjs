// Keeps client work out of the base repository.
//
// Rule: the base repo (BHarmoniX/Illuminara-client-websites-main-code-base) holds only the
// reusable base. Client front-end design — branding, images, video, audio, 3D models, fonts,
// client details — belongs in that client's own repository, never here.
//
// Active only when the `.illuminara-base` marker file exists, i.e. in the base repo.
// scripts/new-client.mjs removes the marker when it creates a client repo, so client repos
// are free to add whatever their design needs.
//
// Runs as a git pre-commit hook (.githooks/pre-commit) and in GitHub Actions
// (.github/workflows/base-guard.yml), so it can't be skipped by accident.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
if (!existsSync(`${root}.illuminara-base`)) process.exit(0);

// The template's placeholder identity. A real client name or domain here means a client
// site is being built in the base repo.
const TEMPLATE_IDENTITY = [
  ["name: 'Illuminara Core'", 'site name must stay the template placeholder'],
  ["url: 'https://example.com.au'", 'site URL must stay https://example.com.au'],
  ["legalName: 'Illuminara Creative Studio'", 'legal name must stay the template placeholder'],
];

// Media and design files are client design by definition.
const CLIENT_ASSET = /\.(png|jpe?g|webp|avif|gif|bmp|tiff?|heic|psd|ai|fig|sketch|xd|mp4|webm|mov|m4v|mp3|wav|ogg|m4a|flac|aac|glb|gltf|fbx|obj|usdz|blend|hdr|exr|ktx2|woff2?|ttf|otf|eot)$/i;

// Base files that are allowed despite matching the above. Keep this list short.
const ALLOWED_ASSETS = new Set(['public/og-default.png']);

// Folders that only ever hold client work.
const CLIENT_ONLY_DIRS = ['src/client/', 'public/client/', 'client-assets/'];

const tracked = execFileSync('git', ['ls-files', '--cached'], { cwd: root, encoding: 'utf8' })
  .split('\n')
  .filter(Boolean);

const problems = [];

for (const file of tracked) {
  if (CLIENT_ASSET.test(file) && !ALLOWED_ASSETS.has(file)) {
    problems.push(`${file}: media/design file — client assets go in the client's own repo`);
  }
  if (CLIENT_ONLY_DIRS.some((dir) => file.startsWith(dir))) {
    problems.push(`${file}: client-only folder`);
  }
}

const siteConfig = readFileSync(`${root}src/config/site.ts`, 'utf8');
for (const [needle, why] of TEMPLATE_IDENTITY) {
  if (!siteConfig.includes(needle)) problems.push(`src/config/site.ts: ${why}`);
}

if (problems.length) {
  console.error('\n✗ This is the Illuminara base repository. Client work can\'t be committed here:\n');
  for (const p of problems) console.error(`  - ${p}`);
  console.error(
    '\nCreate the client\'s own repository with `npm run new-client` and build the site there.\n' +
      'If this is a genuine base improvement, remove the client-specific parts first.\n',
  );
  process.exit(1);
}
console.log('✓ Base repository guard passed (no client work)');
