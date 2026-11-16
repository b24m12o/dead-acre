/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Where each asset first came in. The heavy files (the 3D art, the guns, the band, the voices) have their content's hash
// in their names, so the same name is the same bytes in every commit that has it. The game fetches each from the commit
// that first added it (src/core/assets.js), not from the release's own: a release whose files didn't change loads them
// from addresses the CDN and the browser already hold, instead of all of them cold. Written to assets/at.json, which
// the build reads (CI has no history to work it out from). Run before the build, after the last asset change is pushed:
//   node tools/at.mjs
import { execSync } from 'node:child_process';
import { readdirSync, writeFileSync } from 'node:fs';

const sh = c =>
  execSync(c, { stdio: ['ignore', 'pipe', 'ignore'] })
    .toString()
    .trim();
const at = {};
for (const f of readdirSync('assets').sort()) {
  if (!/\.[0-9a-f]{8}\.(bin|avif)$/.test(f)) continue;
  const adds = sh(`git log --diff-filter=A --format=%H origin/main -- assets/${f}`).split('\n').filter(Boolean);
  const sha = adds[adds.length - 1]; // the first commit on GitHub to have it
  if (!sha) continue; // not pushed yet: it comes from the release's own commit
  try {
    sh(`git cat-file -e ${sha}:assets/${f}`);
    at[f] = sha;
  } catch {
    /* not in that commit after all: leave it to the release's own */
  }
}
writeFileSync('assets/at.json', JSON.stringify(at, null, 1) + '\n');
console.log(`assets/at.json: ${Object.keys(at).length} files from the commits that first had them`);
