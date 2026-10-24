/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The build. Bundles src/ (starting at src/index.js) and writes:
//   dist/game.js          the game, minified. It adds its own page markup and styles, and loads its art,
//                         voices and sounds from ../assets next to itself, so a page only needs one script tag
//   dist/style.css        the styles, minified (fonts load from assets/fonts)
//   index.html            a page that plays dist/game.js (GitHub Pages)
//   build/dead-acre.html  everything in one file, assets embedded (the claude.ai version)
// Run: npm install, then npm run build
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { minify as cssMin } from 'csso';
import { ROOT, rd, strip, bundle } from './lib/source.mjs';

const wr = (p, t) => {
  mkdirSync(dirname(join(ROOT, p)), { recursive: true });
  writeFileSync(join(ROOT, p), t);
};
const b64 = p => readFileSync(join(ROOT, p)).toString('base64');
const NOTICE =
  '/*! Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. No permission is granted to copy, modify, distribute or reuse this code or its assets, in whole or in part. */';

const css = strip(rd('css/style.css')),
  markup = strip(rd('src/markup.html')),
  head = strip(rd('src/head.html')).trim();

// the one-file version: the asset pack goes in as window.__DA_DATA, read by the game as it loads
const pack = JSON.parse(rd('assets/pack.json'));
const vox = readFileSync(join(ROOT, 'assets', pack.vox.file)),
  gun = readFileSync(join(ROOT, 'assets', pack.gun.file));
const data = {
  bake: {
    key: pack.bake.key,
    hs: pack.bake.hs,
    pos: pack.bake.pos,
    a: 'data:image/avif;base64,' + b64('assets/' + pack.bake.a),
    h: 'data:image/avif;base64,' + b64('assets/' + pack.bake.h),
  },
  vox: pack.vox.list.map(([id, t, d, o, n, w]) => [id, t, d, vox.subarray(o, o + n).toString('base64'), w]),
  gun: pack.gun.list.map(([n, o, l]) => [n, gun.subarray(o, o + l).toString('base64')]),
};
const cssFull = css.replace(
  /url\(\.\.\/assets\/fonts\/([\w.-]+)\)/g,
  (_, f) => 'url(data:font/woff2;base64,' + b64('assets/fonts/' + f) + ')'
);
const full = await bundle();
wr(
  'build/dead-acre.html',
  `${head}\n<style>${cssFull}</style>\n\n${markup}\n<script>window.__DA_DATA = ${JSON.stringify(data)};</script>\n<script>\n${full}</script>\n`
);

// dist: the game finds its assets next to its own address (window.__DA_BASE)
const min = await bundle({ lean: true, minify: true });
const boot =
  `(function(){var s=document.currentScript,b=s&&s.src?s.src.replace(/[^\\/?#]*([?#].*)?$/,''):'';window.__DA_BASE=b;` +
  `var M=${JSON.stringify(markup)};function go(){if(go.d)return;go.d=1;document.body.insertAdjacentHTML('afterbegin',M);run();}` +
  `var l=document.createElement('link');l.rel='stylesheet';l.href=b+'style.css';l.onload=l.onerror=go;document.head.appendChild(l);setTimeout(go,8000);` +
  `function run(){${min.trim()}}})();`;
wr('dist/game.js', NOTICE + '\n' + boot + '\n');
wr('dist/style.css', NOTICE + '\n' + cssMin(css, { restructure: false, comments: false }).css + '\n');
wr(
  'index.html',
  `<!doctype html>\n<html lang="en">\n<head>\n${head}\n</head>\n<body>\n<script src="dist/game.js"></script>\n</body>\n</html>\n`
);
console.log(
  'dist/game.js',
  Buffer.byteLength(boot) + NOTICE.length,
  'bytes; build/dead-acre.html',
  Buffer.byteLength(full) + JSON.stringify(data).length,
  'bytes; pack',
  pack.v
);
