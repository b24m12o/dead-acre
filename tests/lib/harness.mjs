/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Shared test plumbing: a browser that renders WebGL in software, a small local web server, and a copy
// of the one-file build with test hooks in it.
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { chromium } from 'playwright';
import { ROOT, bundle } from '../../tools/lib/source.mjs';

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

// the one-file build, with the game bundled from tests/lib/entry.js so tests can reach inside it
let page = null;
export async function testPage() {
  if (page) return page;
  const html = readFileSync(join(ROOT, 'build/dead-acre.html'), 'utf8');
  const k = html.lastIndexOf('<script>\n');
  check(k > 0, 'build/dead-acre.html not found or not built: run the build first');
  const game = await bundle({ entry: 'tests/lib/entry.js' });
  writeFileSync(join(ROOT, 'build/test.html'), html.slice(0, k) + '<script>\n' + game + '</script>\n');
  return (page = join(ROOT, 'build/test.html'));
}
// opens the game at its menu; ev(code) runs code inside the game's own scope
export async function openGame(b, { noFrames = false } = {}) {
  const pg = await b.newPage({ viewport: { width: 1132, height: 692 } }),
    errs = [];
  pg.setDefaultTimeout(3600000);
  pg.on('pageerror', e => errs.push(String(e.stack || e).slice(0, 600)));
  if (noFrames) await pg.addInitScript('window.requestAnimationFrame = () => 0;');
  await pg.goto('file://' + (await testPage()));
  await pg.waitForSelector('#menu:not([hidden])', { timeout: 600000 });
  const ev = code => pg.evaluate(c => globalThis.__eval(c), code);
  await ev(readFileSync(join(ROOT, 'tests/lib/hooks.js'), 'utf8') + ';1');
  return { pg, errs, ev };
}
