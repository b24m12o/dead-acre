/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The build. Joins src/ (in the order listed in src/order.json) back into the game and writes:
//   dist/game.js          the game, minified. It adds its own page markup and styles, and loads its art,
//                         voices and sounds from ../assets next to itself, so a page only needs one script tag
//   dist/style.css        the styles, minified (fonts load from assets/fonts)
//   index.html            a page that plays dist/game.js (GitHub Pages)
//   build/dead-acre.html  everything in one file, assets embedded (the claude.ai version)
// Run: npm install, then npm run build
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { minify } from 'terser';
import { minify as cssMin } from 'csso';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const rd = p => readFileSync(join(ROOT, p), 'utf8');
const wr = (p, t) => { mkdirSync(dirname(join(ROOT, p)), { recursive: true }); writeFileSync(join(ROOT, p), t); };
const b64 = p => readFileSync(join(ROOT, p)).toString('base64');
const NOTICE = '/*! Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. No permission is granted to copy, modify, distribute or reuse this code or its assets, in whole or in part. */';
const HDR = /^(\/\*|<!--) Dead Acre · Copyright/;
const strip = t => { const l = t.split('\n'); if (HDR.test(l[0])) l.shift(); if (l[l.length - 1] === '') l.pop(); return l.join('\n'); };

// the game script, exactly as the parts join up
const order = JSON.parse(rd('src/order.json'));
const body = order.map(f => strip(rd('src/' + f))).join('\n');
const script = ['', '(() => {', "'use strict';", body, '})();', ''].join('\n');
const swap = (src, pre, empty, val) => { const k = src.indexOf('\n' + pre + empty); if (k < 0) throw new Error('missing ' + pre); return src.slice(0, k + 1) + pre + val + src.slice(k + 1 + pre.length + empty.length); };

// the asset pack, for the one-file build
const pack = JSON.parse(rd('assets/pack.json'));
const vox = readFileSync(join(ROOT, 'assets', pack.vox.file)), gun = readFileSync(join(ROOT, 'assets', pack.gun.file));
const BAKE = JSON.stringify({ key: pack.bake.key, hs: pack.bake.hs, pos: pack.bake.pos, a: 'data:image/avif;base64,' + b64('assets/' + pack.bake.a), h: 'data:image/avif;base64,' + b64('assets/' + pack.bake.h) });
const VOX = JSON.stringify(pack.vox.list.map(([id, t, d, o, n, w]) => [id, t, d, vox.subarray(o, o + n).toString('base64'), w]));
const GUN = JSON.stringify(pack.gun.list.map(([n, o, l]) => [n, gun.subarray(o, o + l).toString('base64')]));
let full = swap(script, 'let BAKE_IMG = ', 'null', BAKE); full = swap(full, 'let VOX = ', '[]', VOX); full = swap(full, 'let GUNHD = ', 'null', GUN);

const css = strip(rd('css/style.css')), markup = strip(rd('src/markup.html')), head = strip(rd('src/head.html')).trim();
const cssFull = css.replace(/url\(\.\.\/assets\/fonts\/([\w.-]+)\)/g, (_, f) => 'url(data:font/woff2;base64,' + b64('assets/fonts/' + f) + ')');
wr('build/dead-acre.html', head + '\n' + '<style>' + cssFull + '</style>\n\n' + markup + '\n<script>' + full + '</script>\n');

// dist: the game finds its assets next to its own address
// players never rebuild the 3D character pictures, so the shape code and its library stay out of dist
const lean = script.replace(/bakeGroup\('(\w+)', `[\s\S]*?`\);/g, (_, g) => `bakeGroup('${g}', '');`).replace(/const BAKE_LIB = `[\s\S]*?`;/, "const BAKE_LIB = '';");
if (lean.includes('float map(vec3 p)')) throw new Error('shape code was not stripped');
const net = lean.replace("const ASSET_URL = '';", "const ASSET_URL = window.__DA_BASE ? window.__DA_BASE.replace(/dist\\/$/, 'assets/') : '';");
if (net === lean) throw new Error('ASSET_URL line not found');
const min = await minify(net, { compress: { passes: 2 }, mangle: true, ecma: 2020, format: { comments: false } });
const boot = `(function(){var s=document.currentScript,b=s&&s.src?s.src.replace(/[^\\/?#]*([?#].*)?$/,''):'';window.__DA_BASE=b;` +
  `var M=${JSON.stringify(markup)};function go(){if(go.d)return;go.d=1;document.body.insertAdjacentHTML('afterbegin',M);run();}` +
  `var l=document.createElement('link');l.rel='stylesheet';l.href=b+'style.css';l.onload=l.onerror=go;document.head.appendChild(l);setTimeout(go,8000);` +
  `function run(){${min.code}}})();`;
wr('dist/game.js', NOTICE + '\n' + boot + '\n');
wr('dist/style.css', NOTICE + '\n' + cssMin(css, { restructure: false, comments: false }).css + '\n');
wr('index.html', `<!doctype html>\n<html lang="en">\n<head>\n${head}\n</head>\n<body>\n<script src="dist/game.js"></script>\n</body>\n</html>\n`);
console.log('dist/game.js', readFileSync(join(ROOT, 'dist/game.js')).length, 'bytes; build/dead-acre.html', Buffer.byteLength(head + cssFull + markup + full), 'bytes; pack', pack.v);
