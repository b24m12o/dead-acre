/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Lamp light and its shadows. A lamp's light stops at a wall: the ground just behind the wall is dark (for the
// picture and for how the dead see you), the ground in front of it is not, and once the wall is gone the light
// gets through. Whoever stands under a lit lamp throws a shadow, which is taken out of the lamps' light only;
// with the lamp out there is none.
import { openGame, check } from './lib/harness.mjs';

export const name = 'lighting: lamp light stops at walls, and figures under a lamp throw shadows';
export async function run(b) {
  const { pg, errs, ev } = await openGame(b);
  const o = await ev(`(() => {
    const out = {};
    initAudio(); GS.meta.tutDone = true; begin(); GS.RUN.tut = null; GS.RUN.jobN = []; GS.state = 'play'; opt.shake = false;
    GS.queue = []; for (const e of GS.enemies) e.dead = true; GS.enemies.length = 0; GS.nightLive = false; GS.interT = 999;
    for (const L of lamps) { L.broken = false; L.shot = false; L.off = 0; }
    const wall = (x, y) => { const i = Math.floor(x / TILE), j = Math.floor(y / TILE); if (i < 0 || j < 0 || i >= MW || j >= MH) return true; const t = ttype[j * MW + i]; return t === 1 || t === 5; };
    // a lamp with a wall 70 to 190 px from it in some direction, and open ground the other way
    let hit = null;
    for (let pass = 0; pass < 2 && !hit; pass++) for (const L of lamps) {
      if (L.lantern || L.down || hit) continue;
      for (let k = 0; k < 64 && !hit; k++) {
        const an = (k / 64) * Math.PI * 2, c = Math.cos(an), s = Math.sin(an);
        let d = 16; for (; d < 330; d += 2) if (wall(L.hx + c * d, L.hy + s * d)) break;
        if (d < 70 || d > (pass ? 190 : 104)) continue;
        let open = true; for (let q = 16; q < 200 && open; q += 4) if (wall(L.hx - c * q, L.hy - s * q)) open = false;
        if (open) hit = { L, c, s, d };
      }
    }
    if (!hit) return out;
    const { L, c, s, d } = hit, at = q => [L.hx + c * q, L.hy + s * q];
    out.dw = d;
    out.front = lampHid(L, ...at(d - 24));
    out.behind = lampHid(L, ...at(d + 72));
    out.open = lampHid(L, L.hx - c * 120, L.hy - s * 120);
    for (const M of lamps) if (M !== L) M.shot = true; // this lamp alone: another's light behind the wall is another matter
    out.hotBehind = lampHot(...at(d + 54)); out.hotOpen = lampHot(L.hx - c * (d + 54), L.hy - s * (d + 54)); // (a lamp counts as lighting you out to 170 px)
    for (const M of lamps) M.shot = false;
    // the wall goes: the light gets through
    for (let q = d - 4; q < d + 130; q += 8) { const [x, y] = at(q), i = Math.floor(y / TILE) * MW + Math.floor(x / TILE); if (ttype[i] === 1 || ttype[i] === 5) { ttype[i] = 0; grid[i] = 0; } }
    occDirty();
    out.gone = lampHid(L, ...at(d + 72));
    // stand under the lamp, on the open side
    GS.P.x = L.hx - c * 90; GS.P.y = L.hy - s * 90; GS.P.vx = GS.P.vy = 0;
    window.__L = L;
    return out;
  })()`);
  await pg.bringToFront();
  for (let i = 0; i < 40 && !(await ev('GS.lampSh > 0 && GS.lnL > 0')); i++) await pg.waitForTimeout(150);
  // read the shadows back over a few frames: a slow machine can land the read between a frame's passes
  let lit = null;
  for (let i = 0; i < 12 && !(lit && lit.n > 0); i++) {
    if (i) await pg.waitForTimeout(120);
    lit = await ev(
      `(() => { const w = rtLampSh.w, h = rtLampSh.h, px = new Uint8Array(w * h * 4); gl.bindFramebuffer(gl.FRAMEBUFFER, rtLampSh.fb); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px); gl.bindFramebuffer(gl.FRAMEBUFFER, null); let n = 0, mx = 0; for (let i = 0; i < px.length; i += 4) { if (px[i] > 40) n++; if (px[i] > mx) mx = px[i]; } return { sh: GS.lampSh, lnL: GS.lnL, ln: GS.ln, n, mx }; })()`
    );
  }
  await ev(`(() => { for (const L of lamps) L.shot = true; return 1; })()`);
  for (let i = 0; i < 40 && !(await ev('GS.lampSh === 0 && GS.lnL === 0')); i++) await pg.waitForTimeout(150);
  const dark = await ev(`({ sh: GS.lampSh, lnL: GS.lnL })`);
  await pg.close();
  check(o.dw > 0, 'the town should have a lamp with a wall near it on one side and open ground on the other');
  check(
    o.front < 0.05 && o.behind > 0.8 && o.open < 0.05,
    `a wall should keep a lamp's light off the ground behind it, and not off the ground in front: front ${o.front}, behind ${o.behind}, open side ${o.open} (wall at ${o.dw} px)`
  );
  check(
    o.hotOpen === 0 || o.hotBehind < o.hotOpen * 0.3,
    `behind the wall you should not count as standing in the light: ${o.hotBehind} against ${o.hotOpen} in the open`
  );
  check(o.gone < 0.05, `with the wall gone the light should get through: ${o.gone}`);
  check(lit.sh > 0 && lit.n > 30 && lit.mx > 60, `under a lit lamp you should throw a shadow: ${JSON.stringify(lit)}`);
  check(
    lit.lnL > 0 && lit.lnL < lit.ln,
    `the lamps should be lit first, apart from the other lights: ${lit.lnL} of ${lit.ln}`
  );
  check(
    dark.sh === 0 && dark.lnL === 0,
    `with every lamp out there should be no lamp shadows: ${JSON.stringify(dark)}`
  );
  check(!errs.length, 'page errors: ' + errs.join(' | '));
  return `wall at ${o.dw} px: ${Math.round(o.behind * 100)}% of the light kept off behind it; ${lit.n} px of shadow under the lamp`;
}
