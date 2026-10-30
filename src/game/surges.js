/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
import { GS } from '../core/gs.js';
import { $ } from '../core/errors.js';
import { TAU, clamp, d2, pick, rand } from '../core/util.js';
import { saveMeta } from '../core/settings.js';
import { WEAPON_NIGHTS, nextGuns } from './arsenal.js';
import { MW, TILE, WH, WW, cars, crystals, grid, isWall, ttype } from '../world/map.js';
import { flow } from '../world/nav.js';
import { MUS } from '../audio/audio.js';
import { sfx } from '../audio/sfx.js';
import { showStreak } from '../ui/callouts.js';
import { banner, bossNight, buildWave, lastNight, spawnPoint } from './waves.js';
import { shake, sparks } from '../render/effects.js';
import { dropCrate } from './combat.js';
import { startAlarm } from './noise.js';
import { FINAL_NIGHT } from './districts.js';
import { statMax } from './challenges.js';
import { nightSetup, objKey, objName } from './objectives.js';
import { EV_NAME, RADIO, radio, tip } from '../audio/radio.js';
import { OBJ_TIP } from './objective-flow.js';
import { BOSS_PRE, bossEntrance, bossName, bossType } from './boss-flow.js';
import { tutStart, tutWanted } from './tutorial.js';
function surgePlan(w) {
  if (bossNight(w) || w < 2 || GS.RUN.tut || GS.RUN.practice || GS.horde) return null; // a horde night has no surges: the horde is the night
  const n = GS.queue.length;
  {
    let cut = Math.round(n * 0.08);
    for (let i = GS.queue.length - 1; i >= 0 && cut > 0; i--)
      if (GS.queue[i] === 'skitter') {
        GS.queue.splice(i, 1);
        cut--;
      }
  } // the dead come bunched up now, so a few less of them
  const m = GS.queue.length,
    sg = {
      m,
      i: 0,
      n: 0,
      cuts: [Math.round(m * 0.34), Math.round(m * 0.68)],
      lull: 0,
      quiet: 0,
      horde: null,
      piece: null,
    };
  if (GS.RUN.sig === 'alarm') sg.piece = GS.RUN.sig;
  else if (w >= 6 && !GS.RUN.sig && Math.random() < 0.3)
    sg.piece = Math.random() < 0.6 || !cars.some(c => c.hasAlarm && !c.alarmUsed && !c.dead) ? 'horde' : 'alarm';
  return sg;
}
export function surgeLull(SG, dt) {
  SG.lull -= dt;
  let alive = 0;
  for (const e of GS.enemies) if (!e.dead && !e.dormant) alive++;
  if (alive <= 3 || SG.lull <= 0) {
    SG.quiet = (SG.quiet || 0) + dt;
    if (SG.quiet >= 3.5 || SG.lull <= -6) surgeGo(SG);
  }
}
function surgeGo(SG) {
  SG.lull = 0;
  SG.quiet = 0;
  GS.spawnT = 0.4;
  const last = SG.i >= SG.cuts.length;
  MUS.sting = true;
  MUS.floor = last && SG.piece === 'horde' ? 0.85 : last ? 0.65 : 0.5;
  MUS.floorT = GS.time + (last ? 16 : 10);
  if (last && SG.piece === 'horde') {
    const a = rand(0, TAU),
      dir = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'][
        Math.round((((a % TAU) + TAU) % TAU) / (TAU / 8)) % 8
      ];
    SG.horde = { a, x: GS.P.x + Math.cos(a) * 640, y: GS.P.y + Math.sin(a) * 640, t: GS.time + 8 };
    showStreak('Horde', `They are coming up out of the ground to the ${dir}`, true);
    radio('Nine, big group breaking through on your ' + dir + ' side. Find a choke point.');
    sfx.rumble(GS.P.x + Math.cos(a) * 400, GS.P.y + Math.sin(a) * 400);
    shake(0.12);
    return;
  }
  if (last && SG.piece === 'alarm') {
    const c = cars
      .filter(
        c =>
          c.hasAlarm &&
          !c.alarmUsed &&
          !c.dead &&
          d2(c.x, c.y, GS.P.x, GS.P.y) > 220 * 220 &&
          d2(c.x, c.y, GS.P.x, GS.P.y) < 700 * 700
      )
      .sort(() => Math.random() - 0.5)[0];
    if (c) {
      startAlarm(c);
      showStreak('Car alarm', 'Something set one off · it pulls them in, use it');
      return;
    }
  }
  showStreak(
    last ? 'Last surge' : 'Here they come',
    last ? 'Hold out and it is dawn' : 'The street is filling up again'
  );
  sfx.growl && sfx.growl(GS.P.x + rand(-300, 300), GS.P.y + rand(-300, 300));
}
export function hordeSpot(H) {
  // up out of the ground in one stretch of the map, the way the horde came
  for (let k = 0; k < 30; k++) {
    const a = H.a + rand(-0.45, 0.45),
      d = rand(560, 760),
      x = clamp(GS.P.x + Math.cos(a) * d, 4 * TILE, WW - 4 * TILE),
      y = clamp(GS.P.y + Math.sin(a) * d, 4 * TILE, WH - 4 * TILE),
      tx = Math.floor(x / TILE),
      ty = Math.floor(y / TILE);
    let ok = flow[ty * MW + tx] < 65535;
    for (let j = -1; j <= 1 && ok; j++)
      for (let i = -1; i <= 1; i++)
        if (isWall(tx + i, ty + j)) {
          ok = false;
          break;
        }
    if (ok) return [x, y];
  }
  return spawnPoint(460, false);
}
export function startWave() {
  for (const c of GS.crates) if (c.dawn) c.dawn = false; // last dawn's drop is just a crate now
  GS.nightLive = true;
  GS.wave++;
  GS.queue = buildWave(GS.wave);
  GS.spawnT = 0.3;
  const qb = bossNight(GS.wave),
    last = lastNight(GS.wave);
  nightSetup();
  GS.RUN.sg = surgePlan(GS.wave);
  const evTxt = GS.ev ? EV_NAME[GS.ev] + ' · ' : '';
  if (qb) {
    const bt = bossType();
    banner(last ? `Night ${GS.wave} · the last night` : `Night ${GS.wave}`, BOSS_PRE[bt], true);
    bossEntrance(bt);
  } else
    banner(
      `Night ${GS.wave}`,
      GS.wave === 1 && true && !GS.RUN.endless
        ? `Survive till dawn · ${FINAL_NIGHT} nights to the evac`
        : GS.obj
          ? evTxt + objName()
          : evTxt + (GS.RUN.low ? `Lying low · ${GS.queue.length} dead walking` : `${GS.queue.length} dead walking`),
      GS.ev === 'blood'
    );
  if (GS.obj && true) {
    GS.meta.tips = GS.meta.tips || {};
    const o = objKey();
    if (!GS.meta.tips[o]) {
      GS.meta.tips[o] = 1;
      saveMeta();
      const nm = objName();
      const full = (o === 'hale' || o === 'rescue') && GS.buddies.length >= 3,
        tx = full
          ? o === 'hale'
            ? 'Reach Dr. Hale and keep her alive till dawn. Your team is full: she rides with the convoy'
            : 'Reach them and keep them alive till dawn. Your team is full: they head for the convoy'
          : OBJ_TIP[o];
      GS.later.push({ t: 0.5, fn: () => showStreak(nm, tx) });
    }
  }
  {
    radio(
      GS.wave === 1 && !GS.RUN.endless
        ? RADIO.n1
        : last
          ? RADIO.last
          : qb
            ? null
            : GS.ev
              ? RADIO.ev[GS.ev]
              : !GS.obj && Math.random() < 0.55
                ? pick(RADIO.night)
                : null,
      null,
      GS.wave === 1 || last ? 2 : 1
    );
    if (GS.obj) {
      const ro = RADIO.obj[objKey()];
      radio(typeof ro === 'function' ? ro() : ro);
    }
  }
  if (qb) {
    const bb = $('bossBox').firstElementChild;
    if (bb) bb.textContent = bossName();
  }
  for (const b of GS.barrels)
    if (b.dead && Math.random() < 0.5) {
      b.dead = false;
      b.hp = 20;
    }
  if (GS.wave === 1 && WEAPON_NIGHTS[1] && nextGuns().length) {
    const gs = nextGuns();
    dropCrate(gs[0], gs[1]);
  } /* the convoy's drops now come at dawn, for the night ahead (see dawnDrops) */
  for (const c of crystals)
    if (
      !c.alive &&
      Math.random() < 0.45 &&
      d2(c.x, c.y, GS.P.x, GS.P.y) > 90 * 90 &&
      !GS.enemies.some(e => d2(c.x, c.y, e.x, e.y) < (e.r + 30) ** 2)
    ) {
      c.alive = true;
      c.hp = 40 + GS.wave * 8;
      c.grow = 1;
      sparks(c.x, c.y - 8, [1, 0.85, 0.5], 8, 200);
      const i = c.ty * MW + c.tx;
      grid[i] = 1;
      ttype[i] = 4;
      GS.flowTile = -1;
    }
  if (tutWanted()) tutStart();
  if (!GS.RUN.tut && !GS.RUN.practice && GS.wave <= 2) GS.later.push({ t: 6, fn: () => tip('ability') });
  statMax('maxNight', GS.wave - 1);
}
/* ---------- objectives in play ---------- */
