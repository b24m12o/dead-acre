/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
import { MUS } from '../audio/audio.js';
import { GS } from '../core/gs.js';
import { pick } from '../core/util.js';
import { saveMeta } from '../core/settings.js';
import { WEAPON_NIGHTS, nextGuns } from './arsenal.js';
import { lamps } from '../world/map.js';
import { sfx } from '../audio/sfx.js';
import { S } from './state.js';
import { showStreak } from '../ui/callouts.js';
import { banner, bossNight } from './waves.js';
import { floatText } from '../render/effects.js';
import { dropCrate } from './combat.js';
import { FINAL_NIGHT, TW } from './districts.js';
import { bump, checkChal, statMax } from './challenges.js';
import { budMax } from '../actors/backups.js';
import { jobNight, openJobs } from './objectives.js';
import { RADIO, STORY, radio, storyDawn, tip } from '../audio/radio.js';
import { finishObjective } from './objective-flow.js';
import { practiceReport } from './practice.js';
function dawnDrops() {
  // dawn has a job now: the convoy drops what the next night needs while it is quiet, and the night waits a little while it sits unopened
  const nx = GS.wave + 1;
  if (WEAPON_NIGHTS[nx] && nextGuns().length && !(nx === 2 && GS.RUN.tutCase))
    GS.later.push({
      t: 1.6,
      fn: () => {
        const gs = nextGuns();
        if (GS.state === 'play' && gs.length) {
          const c = dropCrate(gs[0], gs[1]);
          if (c) c.dawn = true;
        }
      },
    });
  if (WEAPON_NIGHTS[nx] && !nextGuns().length && !TW('pistol') && nx % 2 && !bossNight(nx))
    GS.later.push({
      t: 3.2,
      fn: () => {
        if (GS.state === 'play' && !GS.crates.some(c => !c.gun && !c.open)) {
          const c = dropCrate();
          if (c) {
            c.dawn = true;
            showStreak('Supply drop', 'No guns left to spare · ammo and gear instead');
          }
        }
      },
    }); // the guns have run out: a supply crate in the case's place
  const skip = GS.RUN.noCrate && !bossNight(nx);
  GS.RUN.noCrate = false; // a failed job: the convoy keeps tonight's crate
  if ((nx % 2 === 0 || bossNight(nx)) && !skip)
    GS.later.push({
      t: WEAPON_NIGHTS[nx] ? 4.2 : 3.2,
      fn: () => {
        if (GS.state === 'play' && !GS.crates.some(c => !c.gun && !c.open)) {
          // a boss's own reward crate counts as tonight's supply
          const c = dropCrate();
          if (c) {
            c.dawn = true;
            if (bossNight(nx)) showStreak('Supply drop', 'Stock up · something big comes tonight');
          }
        }
      },
    });
}
export function nightCleared() {
  MUS.clear = true; // the soundtrack marks it
  if (GS.RUN.practice) {
    if (!GS.nightDone) {
      GS.nightDone = true;
      practiceReport(true);
    }
    return;
  }
  if (GS.nightDone) return;
  GS.nightDone = true;
  if (GS.wave > 0 && !bossNight(GS.wave)) sfx.clear();
  if (GS.P && GS.P.stains)
    for (const st of GS.P.stains) {
      st.c = 0.24;
      st.a = 0.8;
    } // by dawn the night's blood has dried dark
  if (GS.obj && !GS.obj.done) {
    if (GS.obj.type === 'box') finishObjective(GS.obj.got >= 1, 'The black box is still out there');
    else if (GS.obj.type === 'fuel')
      finishObjective(
        GS.obj.got >= GS.obj.need,
        GS.obj.job === 'meds' ? 'Not all the med cases were found' : 'Not all the fuel was found'
      );
    else if (GS.obj.type === 'hunt') finishObjective(GS.obj.got >= GS.obj.need, 'A marked one got away');
    else if (GS.obj.type === 'rescue')
      finishObjective(GS.obj.state === 'follow' && GS.obj.s.hp > 0, 'You never reached them');
    else finishObjective(GS.obj.hp > 0);
  }
  if (GS.RUN.low && GS.wave > 0) {
    GS.P.hp = S.maxHp;
    GS.rerolls++;
    GS.later.push({ t: 2.6, fn: () => showStreak('Laid low', 'Patched up · +1 reroll') });
  }
  if (!GS.nightHit && GS.wave > 0) {
    bump('flawless');
    showStreak('Flawless night', 'Not a scratch');
  }
  statMax('maxNight', GS.wave);
  checkChal();
  saveMeta();
  if (GS.RUN.endless || GS.wave < FINAL_NIGHT) {
    GS.interT = 11;
    if (GS.RUN.bossDawn) radio(GS.RUN.bossDawn);
    if (STORY[GS.wave] && !GS.RUN.endless) storyDawn(GS.wave);
    else if (!GS.RUN.bossDawn) radio(pick(RADIO.dawn), null, 0);
    GS.RUN.bossDawn = null;
    for (const b of GS.buddies) {
      if (b.down > 0) {
        b.down = 0;
        b.rev = 0;
        b.hp = b.max * 0.5;
        floatText(b.x, b.y - 40, 'Back on their feet', '#8ef0b8', 14);
      }
      b.max = Math.max(b.max, budMax(b));
    } // at dawn the downed are patched up, and your people toughen with every night
    GS.FOGBT = 0;
    for (const L of lamps) {
      if (L.bflick) L.broken = L.bflick = false;
      if (L.off) {
        L.off = 0;
        L.on = GS.time;
      }
    }
    tip('dawn');
    banner(
      'Dawn',
      GS.RUN.endless ? `Night ${GS.wave} survived` : `Night ${GS.wave} survived · ${FINAL_NIGHT - GS.wave} to go`
    );
    GS.RUN.dawnX = 0;
    dawnDrops();
    if (jobNight(GS.wave + 1)) {
      GS.RUN.jobPend = true;
      GS.later.push({ t: 2.4, fn: openJobs });
    }
  }
}
// ---- boss encounters: the arrival, the radio story, the arena turning with each phase, and the kill as a checkpoint
