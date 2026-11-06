/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The campaign the ways people play it besides straight through, each a whole run by the bot:
//  - closing the game at every dawn and picking the run up again with Continue (the save, the map, the drops,
//    the way on all have to come back as they were)
//  - Sidearm only: no weapon case ever, the pistol all the way
//  - Infection 10, Ground Zero: every Infection level at once, and two bosses on the last night
import { check } from './lib/harness.mjs';
import { campaign, wonRun } from './campaign.test.mjs';

export const name = 'variants: Continue every dawn, Sidearm only, Ground Zero';
export const long = true;
const CONTINUE = `function (N) {
  const X = (window.__extra = window.__extra || { n: 0, bad: [] });
  if (GS.state === 'over' && !X.why) X.why = 'killed by ' + GS.P.lastBy + ' on night ' + GS.wave + ' ' + GS.time.toFixed(1) + 's, hp ' + GS.P.hp + ', traps ' + JSON.stringify((GS.traps || []).slice(0, 4).map(t => [t.k || t.type, Math.round(t.x), Math.round(t.y)]));
  if (GS.state !== 'play' || !GS.nightDone || GS.evac || N.contW === GS.wave || (GS.truck && GS.truck.ride)) return;
  const d = savedRun();
  if (!d || d.wave !== GS.wave) return;
  N.contW = GS.wave;
  const lay = GS.RUN.layout, stop = GS.RUN.stop, how = GS.RUN.moveOut, sig = GS.RUN.nextSig && GS.RUN.nextSig.s, owned = GS.P.owned.join(), s0 = { ...S }, lv0 = JSON.stringify(LV), hp0 = [Math.round(GS.P.hp), S.maxHp], lvl0 = GS.level;
  $('hud').hidden = true; GS.state = 'menu'; menuInit(); continueRun();
  X.n++;
  const w = 'dawn ' + GS.wave + ': ';
  if (GS.state !== 'play') X.bad.push(w + 'state ' + GS.state + ' after Continue');
  if (GS.RUN.layout !== lay || GS.RUN.stop !== stop) X.bad.push(w + 'came back at ' + GS.RUN.layout + ' not ' + lay);
  if ((GS.RUN.moveOut || false) !== (how || false)) X.bad.push(w + 'way on ' + how + ' became ' + GS.RUN.moveOut);
  if (sig && (!GS.RUN.nextSig || GS.RUN.nextSig.s !== sig)) X.bad.push(w + 'tomorrow was ' + sig + ', now ' + (GS.RUN.nextSig && GS.RUN.nextSig.s));
  if (GS.P.owned.join() !== owned) X.bad.push(w + 'guns ' + owned + ' became ' + GS.P.owned.join());
  for (const k in s0) if (typeof s0[k] === 'number' && Math.abs(s0[k] - S[k]) > 1e-6) X.bad.push(w + 'stat ' + k + ' ' + s0[k] + ' became ' + S[k]);
  if (JSON.stringify(LV) !== lv0) X.bad.push(w + 'upgrades changed');
  if (Math.round(GS.P.hp) !== hp0[0] || S.maxHp !== hp0[1] || GS.level !== lvl0) X.bad.push(w + 'health or level changed');
}`;
const SIDEARM = `function (N) {
  const X = (window.__extra = window.__extra || { bad: [] });
  if (GS.crates.some(c => c.gun || c.kit) && !X.bad.length) X.bad.push('a weapon case dropped on night ' + GS.wave);
  if (GS.P.owned.some(g => g !== 'pistol') && !X.bad.some(b => b.startsWith('owns'))) X.bad.push('owns ' + GS.P.owned.join());
}`;
const GZ = `function (N) {
  const X = (window.__extra = window.__extra || { bosses: 0, seen: [] });
  if (GS.wave === 15) for (const e of GS.enemies) if (e.type === 'queen' && !X.seen.includes(e.id)) { X.seen.push(e.id); X.bosses++; }
}`;
export async function run(b) {
  const out = [];
  {
    const { r, errs } = await campaign(b, { hook: CONTINUE });
    wonRun(r, errs, 'Continue every dawn');
    const x = JSON.parse(r.extra);
    check(x && x.n >= 12, `Continue every dawn: only continued ${x && x.n} times`);
    check(!x.bad.length, 'Continue every dawn: ' + x.bad.slice(0, 5).join('; '));
    out.push(`continued at ${x.n} dawns`);
  }
  {
    const { r, errs } = await campaign(b, { setup: 'GS.meta.twists = { pistol: true }', hook: SIDEARM });
    wonRun(r, errs, 'Sidearm only');
    const x = JSON.parse(r.extra || 'null');
    check(!x || !x.bad.length, 'Sidearm only: ' + (x ? x.bad.join('; ') : ''));
    out.push('Sidearm only won');
  }
  {
    const { r, errs } = await campaign(b, { setup: 'GS.meta.infMax = 10; GS.meta.inf = 10', hook: GZ });
    wonRun(r, errs, 'Ground Zero');
    const x = JSON.parse(r.extra);
    check(x && x.bosses >= 2, `Ground Zero: ${x && x.bosses} boss(es) on the last night`);
    out.push(`Ground Zero won past ${x.bosses} bosses`);
  }
  return out.join(', ');
}
