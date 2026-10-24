// Sets up a new client site in its own repository, starting from this base.
//
//   1. On GitHub, create an empty PRIVATE repository for the client (no README), e.g.
//      BHarmoniX/sa-massage-website
//   2. From the base folder run:
//        npm run new-client -- <folder-name> <client-repo-url>
//      e.g. npm run new-client -- sa-massage https://github.com/BHarmoniX/sa-massage-website.git
//
// Result: a sibling folder holding a copy of the base, wired so that
//   origin   → the client's repo (push and pull)
//   upstream → the base repo, PULL ONLY. Pushing to it is disabled, so client work can never
//              land in the base. Get base improvements later with: npm run update-base

import { execFileSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE_REPO = 'https://github.com/BHarmoniX/Illuminara-client-websites-main-code-base.git';

const [folder, clientRepo] = process.argv.slice(2);
if (!folder || !clientRepo) {
  console.error('Usage: npm run new-client -- <folder-name> <client-repo-url>');
  process.exit(1);
}
if (!/^[a-z0-9][a-z0-9-]*$/.test(folder)) {
  console.error('Folder name: lowercase letters, numbers and dashes only (e.g. sa-massage).');
  process.exit(1);
}
if (!/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\.git$/.test(clientRepo)) {
  console.error('Client repo URL should look like https://github.com/BHarmoniX/<name>.git');
  process.exit(1);
}
if (clientRepo === BASE_REPO) {
  console.error('That is the base repository. Create a separate repository for the client.');
  process.exit(1);
}

const baseDir = fileURLToPath(new URL('..', import.meta.url));
const target = resolve(baseDir, '..', folder);
if (existsSync(target)) {
  console.error(`${target} already exists. Pick another folder name.`);
  process.exit(1);
}

/** @param {string[]} args @param {string} [cwd] */
const git = (args, cwd = target) => execFileSync('git', args, { cwd, stdio: 'inherit' });

git(['clone', '--origin', 'upstream', BASE_REPO, target], baseDir);
git(['remote', 'set-url', '--push', 'upstream', 'DISABLED-never-push-client-work-to-the-base']);
git(['remote', 'add', 'origin', clientRepo]);

// Leaving base-repo mode: the client repo may hold design assets.
rmSync(resolve(target, '.illuminara-base'));
git(['add', '-A']);
git(['commit', '-m', `Start ${folder} from Illuminara Core base`]);
git(['push', '-u', 'origin', 'main']);

console.log(`
✓ ${folder} is ready at ${target}

Next:
  cd "${target}"
  npm ci
  git config core.hooksPath .githooks
  Fill in src/config/site.ts, then design away.
`);
