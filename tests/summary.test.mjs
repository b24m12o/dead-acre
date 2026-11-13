/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The run summary on both end screens: the ways you took on the road map, your gear, who was lost, the numbers,
// all on screen in a 1132 × 692 window without scrolling; and the copied text carries the nights and the kills.
import { openGame, check } from './lib/harness.mjs';

export const name = 'summary: the end screens tell the run';
export async function run(b) {
  const out = {};
  for (const won of [false, true]) {
    const { pg, errs, ev } = await openGame(b);
    await pg.setViewportSize({ width: 1132, height: 692 });
    await ev(`initAudio(); GS.meta.tutDone = true; begin(); GS.RUN.tut = null; GS.RUN.stop = 4; GS.wave = ${won ? 15 : 11};
      giveGun('shotgun'); LV.dmg = 2;
      GS.RUN.viaLog = [{ s: 1, id: 'pharmacy', i: 0 }, { s: 2, id: 'road', i: 1 }, { s: 3, id: 'bridge', i: 0 }, { s: 4, id: 'checkpoint', i: 1 }];
      GS.RUN.lost = ['Marta Kowalski']; GS.kills = 1234; GS.score = 45678; GS.RUN.metrics.elapsed = 1500; 1`);
    await ev(won ? `GS.RUN.stop = 7; startEvac(); winRun(); 1` : `GS.P.hp = 0; gameOver(); 1`);
    await pg.bringToFront(); // panels are fitted on the next frame: a page in the back gets none
    await pg.waitForTimeout(2600);
    for (let i = 0; i < 30; i++) {
      const fit = await ev(
        `(() => { const pn = document.querySelector('#${won ? 'won' : 'over'} > .panel'); return !!pn && pn.getBoundingClientRect().bottom <= innerHeight + 1; })()`
      );
      if (fit) break;
      await pg.waitForTimeout(200);
    }
    const id = won ? 'won' : 'over',
      sum = won ? 'wSum' : 'oSum';
    out[id] = await ev(`(() => {
      const pn = document.querySelector('#${id} > .panel'), r = pn.getBoundingClientRect(), S = $('${sum}');
      return { shown: !$('${id}').hidden, top: r.top, bottom: r.bottom, h: innerHeight, zoom: +(pn.style.zoom || 1),
        ways: S.querySelectorAll('.rleg.past').length, marks: S.querySelectorAll('.rmark').length,
        text: S.textContent, report: $('${won ? 'wBreakdown' : 'oBreakdown'}').textContent, copy: GS.RUN.sumText };
    })()`);
    out[id].errs = errs;
    await pg.close();
  }
  for (const [id, o] of Object.entries(out)) {
    check(o.shown, `${id}: the end screen should be up`);
    check(
      o.ways >= 4 && o.marks >= 4,
      `${id}: the map should draw the four ways taken: ${o.ways} legs, ${o.marks} marks`
    );
    check(
      /Hollow Points 2/.test(o.text) && /Pump Shotgun/.test(o.text),
      `${id}: the build should list the gun and the gear: ${o.text.slice(0, 200)}`
    );
    check(/Marta Kowalski/.test(o.text), `${id}: the lost should be named`);
    check(/Time in action/.test(o.report) && /25:00/.test(o.report), `${id}: the numbers should be there`);
    check(
      o.top >= 0 && o.bottom <= o.h + 1,
      `${id}: the panel should fit the window: ${Math.round(o.top)}–${Math.round(o.bottom)} of ${o.h}`
    );
    check(o.zoom >= 0.62, `${id}: the panel should stay readable: zoom ${o.zoom}`);
    check(
      /Nights 1[15]/.test(o.copy) && /kills 1234/.test(o.copy),
      `${id}: the copied text should carry the nights and kills: ${o.copy.split('\n')[2]}`
    );
    check(/Past the pharmacy to/.test(o.copy), `${id}: the copied text should carry the road`);
    check(!o.errs.length, `${id}: page errors: ` + o.errs.join(' | '));
  }
  return `death and win screens: map, build, people, numbers; zoom ${out.over.zoom} / ${out.won.zoom}`;
}
