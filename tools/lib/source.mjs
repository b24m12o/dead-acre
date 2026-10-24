/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Reads src/ and joins the parts into the game script, in the order listed in src/order.json.
// Every tool (build, lint, tests) goes through here, so they all see the same program.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const rd = p => readFileSync(join(ROOT, p), 'utf8');
const HDR = /^(\/\*|<!--) Dead Acre · Copyright/;
export const strip = t => {
  const l = t.split('\n');
  if (HDR.test(l[0])) l.shift();
  if (l[l.length - 1] === '') l.pop();
  return l.join('\n');
};

// the joined script, plus where each file starts in it (for mapping a line back to its file)
export function joinSource() {
  const order = JSON.parse(rd('src/order.json')),
    parts = [],
    map = [];
  let line = 4; // after the three opening lines below
  for (const f of order) {
    const t = strip(rd('src/' + f));
    parts.push(t);
    map.push({ file: 'src/' + f, start: line, off: 1 });
    line += t.split('\n').length;
  }
  const script = ['', '(() => {', "'use strict';", parts.join('\n'), '})();', ''].join('\n');
  return { script, map, order };
}
// a line of the joined script back to its source file and line
export function whereIs(map, line) {
  let m = map[0];
  for (const x of map) if (x.start <= line) m = x;
  return { file: m.file, line: line - m.start + 1 + m.off };
}
// the code players never need: the shapes the 3D character pictures are built from
export function lean(script) {
  const out = script
    .replace(/bakeGroup\(\s*'(\w+)',\s*`[\s\S]*?`\s*\);/g, (_, g) => `bakeGroup('${g}', '');`)
    .replace(/const BAKE_LIB = `[\s\S]*?`;/, "const BAKE_LIB = '';");
  if (out.includes('float map(vec3 p)')) throw new Error('shape code was not stripped');
  return out;
}
