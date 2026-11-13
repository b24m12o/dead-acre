/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Every stop on the road, laid out a few times over: from where you walk in, everything a night can ask you to
// reach must be reachable on foot (the jobs' cans, cases, the survivor, the generator, the black box's piles, the
// siege house's people), and so must every spot the dead can be spawned at, the road out and the landing zone, and
// where you leave by truck, the garage door and every fuel can for it.
// Nothing must sit in the river. A pocket you can't get into is where a night would never end.
import { openGame, check } from './lib/harness.mjs';

export const name = 'places: everything on every map can be reached';
const SEEDS = 6;
const PLACES = String.raw`(() => {
  const fam = { main: 'town', clinic: 'town', gas: 'highway', motel: 'highway', quarry: 'highway', bridge: 'highway', hill: 'cemetery', hospital: 'cemetery' };
  const out = [];
  const reach = (x, y) => { const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE); return tx >= 0 && ty >= 0 && tx < MW && ty < MH && flow[ty * MW + tx] < 65535; };
  const wet = (x, y) => { const i = Math.floor(y / TILE) * MW + Math.floor(x / TILE); return !!grid[i] && ttype[i] === 11; };
  for (const id of Object.keys(fam))
    for (let k = 0; k < ${SEEDS}; k++) {
      const bad = [];
      GS.RUN.journey = true; GS.RUN.hm = false; GS.RUN.layout = id; GS.RUN.district = fam[id]; GS.RUN.stop = STOPS.findIndex(s => s.id === id);
      newRun(); GS.state = 'play'; GS.queue = []; GS.enemies.length = 0; placeArrival();
      GS.flowTile = -1; buildFlow(GS.P.x, GS.P.y);
      const P0 = [GS.P.x, GS.P.y];
      const at = (what, x, y) => { if (!reach(x, y)) bad.push(what + ' unreachable at ' + Math.round(x / TILE) + ',' + Math.round(y / TILE)); if (wet(x, y)) bad.push(what + ' in the river'); };
      for (let i = 0; i < 60; i++) { const [x, y] = spawnPoint(460, false); at('spawn', x, y); }
      if (HELIPAD) at('helipad', HELIPAD[0], HELIPAD[1]);
      for (const o of houses) {
        if (o.open || o.garage) continue; // the garage is shut on purpose, till the dawn you bring its truck fuel
        let floor = 0, inn = 0;
        for (let y = o.y + 1; y < o.y + o.h - 1; y++) for (let x = o.x + 1; x < o.x + o.w - 1; x++) if (!isWall(x, y)) { floor++; if (flow[y * MW + x] < 65535) inn++; }
        if (floor > 2 && !inn) bad.push('sealed room at ' + o.x + ',' + o.y);
      } // a door blocked by something dropped in it
      if (STOPS[GS.RUN.stop].leave === 'truck') {
        if (!GARAGE) bad.push('no garage for the truck');
        else {
          GS.blockade = null; planBlockade(); GS.flowTile = -1; buildFlow(GS.P.x, GS.P.y); // the roadblock stands from arrival: nothing may be cut off by it
          if (!(GS.blockade && GS.blockade.cars)) bad.push('no roadblock on the way out');
          at('garage door', (GARAGE.x + GARAGE.w / 2) * TILE, (GARAGE.y + GARAGE.h) * TILE + 30);
          if (Math.hypot(GS.P.x - GARAGE.tx, GS.P.y - GARAGE.ty) < 300) bad.push('the garage stands on the way in');
          GS.truck = null; callTruck();
          for (const c of GS.truck.cans) at('truck fuel', c.x, c.y);
          for (let i = 0; i < 40; i++) { const [x, y] = spawnPoint(460, false); at('spawn past the roadblock', x, y); }
          GS.truck = null;
        }
      } // the truck's garage: its door can be walked to, and so can every can of fuel for it
      for (const job of ['fuel', 'meds', 'rescue', 'gen', 'box']) {
        GS.P.x = P0[0]; GS.P.y = P0[1]; GS.wave = 3; GS.queue = ['skitter']; GS.RUN.job = { t: job }; GS.RUN.nextSig = null;
        GS.obj = null; GS.wrecks.length = 0; nightSetup();
        const o = GS.obj;
        if (!o) { bad.push(job + ': no job made'); continue; }
        if (o.cans) for (const c of o.cans) at(job + ' item', c.x, c.y);
        if (o.s) at(job + ' survivor', o.s.x, o.s.y);
        if (o.type === 'gen') at('generator', o.x, o.y);
        if (o.piles) for (const q of o.piles) at('black box pile', q.x, q.y);
      }
      GS.wave = 3; GS.queue = ['skitter']; GS.RUN.job = null; GS.obj = null; GS.RUN.nextSig = { w: 3, s: 'siege' }; nightSetup();
      if (GS.obj && GS.obj.type === 'siege') for (const c of GS.obj.civ) at('siege survivor', c.x, c.y);
      for (let i = 0; i < 12; i++) { const c = dropCrate(); if (c) { at('crate', c.x, c.y); GS.crates.length = 0; } }
      const W = edgeSpot(1); if (W) at('road out', W[0], W[1]); else bad.push('no road out');
      out.push({ id, k, bad: [...new Set(bad)] });
    }
  return out;
})()`;
export async function run(b) {
  const { pg, errs, ev } = await openGame(b, { noFrames: true });
  await ev(`(()=>{ initAudio(); GS.meta.tutDone = true; begin(); GS.RUN.tut = null; return 1; })()`);
  const r = await ev(PLACES);
  await pg.close();
  const fails = r.filter(p => p.bad.length).map(p => `${p.id} (#${p.k + 1}): ${p.bad.slice(0, 4).join('; ')}`);
  check(!fails.length, fails.join('\n        '));
  check(!errs.length, 'page errors: ' + errs.join(' | '));
  return `${new Set(r.map(p => p.id)).size} places × ${SEEDS}, all reachable`;
}
