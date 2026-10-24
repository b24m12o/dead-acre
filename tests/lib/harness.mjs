/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Shared test plumbing: a browser that renders WebGL in software, a small local web server, and a copy
// of the one-file build with test hooks in it.
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { chromium } from 'playwright';
import { ROOT } from '../../tools/lib/source.mjs';

export { ROOT };
export const browser = () =>
  chromium.launch({
    args: [
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--ignore-gpu-blocklist',
      '--autoplay-policy=no-user-gesture-required',
    ],
  });
export function check(ok, msg) {
  if (!ok) throw new Error(msg);
}

const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.avif': 'image/avif',
  '.bin': 'application/octet-stream',
};
// serves a folder with open cross-origin access, like the CDN does
export function serve(dir, port) {
  const srv = createServer((req, res) => {
    const p = join(dir, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!p.startsWith(dir) || !existsSync(p) || !statSync(p).isFile()) {
      res.writeHead(404, { 'Access-Control-Allow-Origin': '*' });
      return res.end();
    }
    res.writeHead(200, {
      'Content-Type': TYPES[extname(p)] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(readFileSync(p));
  });
  return new Promise(ok => srv.listen(port, '127.0.0.1', () => ok(srv)));
}

// the one-file build with the test hooks in it
let page = null;
export function testPage() {
  if (page) return page;
  const s = readFileSync(join(ROOT, 'build/dead-acre.html'), 'utf8'),
    k = s.indexOf('\nfontsReady.then(');
  check(k > 0, 'build/dead-acre.html has no startup line: run the build first');
  writeFileSync(
    join(ROOT, 'build/test.html'),
    s.slice(0, k + 1) + readFileSync(join(ROOT, 'tests/lib/hooks.js'), 'utf8') + '\n' + s.slice(k + 1)
  );
  return (page = join(ROOT, 'build/test.html'));
}
// opens the game at its menu; ev(code) runs code inside the game's own scope
export async function openGame(b, { noFrames = false } = {}) {
  const pg = await b.newPage({ viewport: { width: 1132, height: 692 } }),
    errs = [];
  pg.setDefaultTimeout(3600000);
  pg.on('pageerror', e => errs.push(String(e.stack || e).slice(0, 600)));
  if (noFrames) await pg.addInitScript('window.requestAnimationFrame = () => 0;');
  await pg.goto('file://' + testPage());
  await pg.waitForSelector('#menu:not([hidden])', { timeout: 600000 });
  return { pg, errs, ev: code => pg.evaluate(c => window.__eval(c), code) };
}
