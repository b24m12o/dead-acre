/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The ride out, with two of your people aboard: they fire from the cabin's other door, the chopper goes down for the
// second group of survivors and waits while they climb in, and the run ends won with all of it on the end screen.
import { openGame, check } from './lib/harness.mjs';

export const name = 'evac: crew in the cabin, a pickup on the way out';
const fr = `update(1/60); tickWorld(1/60); updateCamera(1/60); if (GS.state==='levelup') { GS.state='play'; $('levelup').hidden=true; } GS.P.hp = S.maxHp;`;
const aim = `{ let best=null, bd=1e12; for (const z of GS.enemies) { if (z.dead) continue; const dd=d2(z.x,z.y,GS.P.x,GS.P.y); if (dd<bd) {bd=dd;best=z;} } if (best) { mouse.x=(best.x-cam.x)*ZOOM; mouse.y=(best.y-cam.y)*ZOOM; } mouse.down = !!best; }`;
export async function run(b) {
  const { pg, errs, ev } = await openGame(b, { noFrames: true });
  const o = await ev(`(() => { initAudio(); GS.meta.tutDone = true; begin(); GS.RUN.tut = null;
    const u = UP.find(u => u.id === 'buddy'); u.apply(); u.apply();
    GS.state = 'play'; GS.queue = []; GS.enemies.length = 0; GS.wave = 15; GS.nightLive = true; GS.nightDone = false; for (let i = 0; i < 60; i++) { ${fr} }
    startEvac(); const e = GS.evac; e.land = 1;
    for (let i = 0; i < 60 * 60 && !e.ride; i++) { GS.P.x = e.x; GS.P.y = e.y; GS.enemies.length = 0; GS.queue = []; ${fr} }
    if (!e.ride) return { err: 'never took off' };
    const r = e.ride, o = { aboard: GS.RUN.aboard.length, hovered: false, lowest: 999 };
    for (const g of r.groups) if (g.pick) for (const s of g.civ) s.hp = s.max = 5000; // tough enough to live to the pickup: it's the pickup under test
    for (let i = 0; i < 60 * 120 && GS.state === 'play'; i++) { ${aim} ${fr} if (r.hover) o.hovered = true; if (r.hover) o.lowest = Math.min(o.lowest, e.z); }
    mouse.down = false;
    return Object.assign(o, { state: GS.state, kills: r.kills, crew: r.crewKills, picked: r.picked, saved: r.saved, lost: r.lost, pick: r.groups.some(g => g.pick), txt: $('wCrew').textContent });
  })()`);
  await pg.close();
  check(!o.err, o.err);
  check(o.state === 'won', `the ride ended in ${o.state}`);
  check(o.aboard === 2 && o.crew > 0, `your people in the cabin got ${o.crew} kills (${o.aboard} aboard)`);
  check(!o.pick || (o.hovered && o.lowest < 170), `never came down for the pickup (lowest ${Math.round(o.lowest)})`);
  check(!o.pick || o.picked > 0, 'nobody was pulled aboard at the pickup');
  check(/pulled aboard|survivors saved/.test(o.txt), 'the end screen says nothing about the ride: ' + o.txt);
  check(!errs.length, 'page errors: ' + errs.join(' | '));
  return `door gun ${o.kills}, cabin ${o.crew}, ${o.picked} pulled aboard, ${o.saved} of ${o.saved + o.lost} saved`;
}
