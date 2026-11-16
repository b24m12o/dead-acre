/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The town as its people left it (marks.js). Each place on the road has its own messages sprayed on open street or
// pavement, never on a wall or into a building, and in Main Street clear of the HELP at the crossroads; St. Mary's has
// what was dropped on the school's front walk. The dead there are more often the staff who stayed; everywhere they
// come stocky or slight.
import { openGame, check } from './lib/harness.mjs';

export const name = "marks: what each place's people left, the school walk, the staff at St. Mary's, builds";
export async function run(b) {
  const { pg, errs, ev } = await openGame(b, { noFrames: true });
  const o = await ev(`(() => {
    initAudio(); GS.meta.tutDone = true; begin(); GS.RUN.tut = null; GS.RUN.jobN = []; GS.state = 'play';
    const out = {};
    const onStreet = m => { const tx = Math.floor(m.x / TILE), ty = Math.floor(m.y / TILE); return ROAD[ty * MW + tx] > 0 && !isWall(tx, ty); };
    const medics = () => { let n = 0; for (let i = 0; i < 400; i++) { const e = makeEnemy('skitter', -999, -999); if (e.v === 4) n++; e.dead = true; } return n / 400; };
    out.main = MARKS_AT.map(m => m.txt);
    out.mainOk = MARKS_AT.every(onStreet) && MARKS_AT.every(m => Math.hypot(m.x - WW / 2, m.y - WH / 2) >= 300);
    out.mainSchool = SCHOOL_AT.length;
    out.medMain = medics();
    const bw = []; for (let i = 0; i < 60; i++) { const e = makeEnemy('skitter', -999, -999); bw.push(e.bw); e.dead = true; }
    out.bw = [Math.min(...bw), Math.max(...bw)]; out.bwBrute = makeEnemy('beetle', -999, -999).bw;
    // on to St. Mary's
    GS.RUN.stop = 0; GS.wave = 2; GS.nightDone = true; leaveStop('foot'); travelStep();
    { const t = performance.now(); while (performance.now() - t < 700); }
    $('routeGo').click();
    out.at = stopNow();
    out.clinic = MARKS_AT.map(m => m.txt);
    out.clinicOk = MARKS_AT.every(onStreet);
    out.school = SCHOOL_AT.length;
    out.schoolIn = SCHOOL_AT.every(s => s.x >= 21 * TILE && s.x <= 54 * TILE && s.y >= 33 * TILE && s.y <= 35 * TILE);
    out.medClinic = medics();
    return out;
  })()`);
  await pg.close();
  check(
    o.main.length >= 3 && o.mainOk && o.mainSchool === 0,
    `Main Street: its messages on open street, clear of the HELP, no school walk: ${JSON.stringify(o)}`
  );
  check(
    o.at === 1 && o.clinic.includes('EVAC POINT') && o.clinic.length >= 3 && o.clinicOk,
    `St. Mary's: its own messages on open street: ${JSON.stringify(o.clinic)}`
  );
  check(o.school === 16 && o.schoolIn, `St. Mary's school walk: what was dropped there, on the walk: ${o.school}`);
  check(
    o.medClinic > 0.18 && o.medMain < 0.14,
    `the staff who stayed: medics ${o.medClinic} at St. Mary's against ${o.medMain} on Main Street`
  );
  check(
    o.bw[0] >= 0.88 && o.bw[1] <= 1.14 && o.bw[1] - o.bw[0] > 0.15 && o.bwBrute === 1,
    `builds stocky to slight (a brute keeps its own): ${o.bw} ${o.bwBrute}`
  );
  check(!errs.length, 'page errors: ' + errs.join(' | '));
  return `Main Street ${o.main.length} messages, St. Mary's ${o.clinic.length} and ${o.school} things on the school walk; medics ${Math.round(o.medClinic * 100)}% there`;
}
