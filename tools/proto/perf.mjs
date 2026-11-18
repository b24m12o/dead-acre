/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// PROTOTYPE, not part of the game: builds the 3D measuring page into build/perf/ (index.html, dist/, assets/,
// perf.js). It is the test build of the game (the one that keeps the 3D shapes and lets outside code reach inside)
// with the prototypes on top: abom3d-page.js, abom3d-clip.js, crowd3d-page.js and perf-page.js, run once the game is
// at its menu. Self-contained: its assets sit next to it. Run npm run build and node tools/web/stage.mjs first.
//   node tools/proto/perf.mjs              assets copied next to it (to try it here)
//   node tools/proto/perf.mjs --cdn <sha>  assets from the repo at that commit, through the CDN (to publish it)
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, rd, strip, bundle } from '../lib/source.mjs';
import { minify as cssMin } from 'csso';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(ROOT, 'build/perf');
rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, 'dist'), { recursive: true });
const NOTICE = '/*! Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. A measuring page, not the game. */';
const css = strip(rd('css/style.css')),
  markup = strip(rd('src/markup.html')),
  head = strip(rd('src/head.html')).trim();
const ci = process.argv.indexOf('--cdn'),
  SHA = ci > 0 ? process.argv[ci + 1] : null,
  CDN = SHA ? `https://cdn.jsdelivr.net/gh/b24m12o/dead-acre@${SHA}/` : null,
  AT = SHA ? JSON.parse(rd('assets/at.json')) : {};
const game = await bundle({ entry: 'tests/lib/entry.js' });
const boot =
  `(function(){var s=document.currentScript,b=s&&s.src?s.src.replace(/[^\\/?#]*([?#].*)?$/,''):'';window.__DA_BASE=${CDN ? JSON.stringify(CDN + 'dist/') : 'b'};window.__DA_AT=${JSON.stringify(AT)};` +
  `var M=${JSON.stringify(markup)};function go(){if(go.d)return;go.d=1;document.body.insertAdjacentHTML('afterbegin',M);run();}` +
  `var l=document.createElement('link');l.rel='stylesheet';l.href=b+'style.css';l.onload=l.onerror=go;document.head.appendChild(l);setTimeout(go,8000);` +
  `function run(){${game}}})();`;
writeFileSync(join(OUT, 'dist/game.js'), NOTICE + '\n' + boot + '\n');
writeFileSync(
  join(OUT, 'dist/style.css'),
  NOTICE +
    '\n' +
    cssMin(CDN ? css.replace(/url\(\.\.\/assets\//g, `url(${CDN}assets/`) : css, {
      restructure: false,
      comments: false,
    }).css +
    '\n'
);
const parts = ['abom3d-page.js', 'abom3d-clip.js', 'crowd3d-page.js', 'perf-page.js'].map(f =>
  readFileSync(join(HERE, f), 'utf8')
);
writeFileSync(
  join(OUT, 'perf.js'),
  `${NOTICE}
(function(){var P=${JSON.stringify(parts)};
function ready(){var m=document.getElementById('menu');return window.__eval&&m&&!m.hidden&&window.GS!==undefined||window.__eval&&m&&!m.hidden;}
var t=setInterval(function(){if(!ready())return;clearInterval(t);try{P.forEach(function(c){console.log(window.__eval(c));});}catch(e){document.body.insertAdjacentHTML('beforeend','<pre style="position:fixed;left:10px;top:10px;z-index:99999;color:#f88;background:#000;padding:10px">'+(e&&e.stack||e)+'</pre>');}},300);})();
`
);
writeFileSync(
  join(OUT, 'index.html'),
  `<!doctype html>\n<html lang="en">\n<head>\n${head}\n<title>Dead Acre · 3D measuring page</title>\n</head>\n<body>\n<script src="dist/game.js"></script>\n<script src="perf.js"></script>\n</body>\n</html>\n`
);
if (!CDN) cpSync(join(ROOT, 'build/web/game/assets'), join(OUT, 'assets'), { recursive: true });
console.log('build/perf: index.html, dist/game.js', (Buffer.byteLength(boot) / 1e6).toFixed(1), 'MB, perf.js, assets');
