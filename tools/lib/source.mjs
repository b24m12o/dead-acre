/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Shared by the build, the fingerprint and the tests: where the repo is, reading files, and bundling src/
// (entry src/index.js) into one script with esbuild.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const rd = p => readFileSync(join(ROOT, p), 'utf8');
const HDR = /^(\/\*|<!--) Dead Acre · Copyright/;
// a file without its copyright line and trailing newline
export const strip = t => {
  const l = t.split('\n');
  if (HDR.test(l[0])) l.shift();
  if (l[l.length - 1] === '') l.pop();
  return l.join('\n');
};

// players never rebuild the 3D character pictures, so dist leaves out the shapes they are built from
const LEAN = /src[\\/]render[\\/]bake(-shapes)?\.js$/;
const leanPlugin = {
  name: 'lean',
  setup(b) {
    b.onLoad({ filter: LEAN }, a => {
      const out = readFileSync(a.path, 'utf8')
        .replace(/bakeGroup\(\s*'(\w+)',\s*`[\s\S]*?`\s*\);/g, (_, g) => `bakeGroup('${g}', '');`)
        .replace(/const BAKE_LIB = `[\s\S]*?`;/, "const BAKE_LIB = '';");
      if (out.includes('float map(vec3 p)')) throw new Error('shape code was not stripped from ' + a.path);
      return { contents: out, loader: 'js' };
    });
  },
};

// src/ as one script. entry: the module to start from; lean: leave out the shape code; minify: for dist
export async function bundle({ entry = 'src/index.js', lean = false, minify = false, fingerprint = false } = {}) {
  const r = await esbuild.build({
    entryPoints: [join(ROOT, entry)],
    bundle: true,
    write: false,
    format: 'iife',
    target: 'es2020',
    charset: 'utf8',
    legalComments: 'none',
    minify,
    minifySyntax: fingerprint || minify,
    minifyWhitespace: fingerprint || minify,
    plugins: lean ? [leanPlugin] : [],
    logOverride: { 'direct-eval': 'silent' },
  });
  return r.outputFiles[0].text;
}
