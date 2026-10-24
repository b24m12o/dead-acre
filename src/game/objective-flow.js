/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
import { GS } from '../core/gs.js';
import { sfx } from '../audio/sfx.js';
import { LV, S, addAmmo } from './state.js';
import { UP, renderMods } from './upgrades.js';
import { showStreak } from '../ui/callouts.js';
import { dropCrate } from './combat.js';
import { bump } from './challenges.js';
import { BOX_SEARCH, boxSignal, objKey, objName } from './objectives.js';
import { RADIO, radio } from '../audio/radio.js';
export const OBJ_TIP = {
  box: 'Watch the signal on the night plate. At the wreck, stand still at a pile to search it',
  hale: 'Reach Dr. Hale, then keep her alive till dawn. She joins as your medic',
  relay: 'Keep the dead off the relay generator till dawn',
  scouts: 'Marked elites run from you. Catch each one before its timer runs out',
  gen: 'Keep the dead off it till dawn. If it blows, the lamps go dark',
  rescue: 'Reach them, then keep them alive till dawn. They join your backup',
  fuel: 'Grab all 5 cans before dawn',
  meds: 'Grab all 4 med cases before dawn',
  hunt: 'Marked elites run from you. Catch each one before its timer runs out',
};
export const OBJ_NAME = {
  gen: 'Defend the generator',
  rescue: 'Rescue the survivor',
  fuel: 'Collect 5 fuel cans',
  hunt: 'Hunt the marked',
};
export function objText() {
  if (GS.evac && GS.evac.leave) return '';
  if (GS.evac) {
    if (GS.evac.t < GS.evac.land) return `Evac in ${Math.ceil(GS.evac.land - GS.evac.t)} s · hold the landing zone`;
    const crew = GS.RUN.aboard.length + GS.buddies.length,
      dn = GS.buddies.find(b => b.down > 0),
      ab = crew ? ` · ${GS.RUN.aboard.length} of ${crew} aboard` + (dn ? ` · ${dn.nm || 'one'} is down` : '') : '';
    return (
      (GS.evac.waiting
        ? `Waiting for ${GS.evac.waiting}`
        : GS.evac.hold > 0
          ? `Hold · ${Math.max(0, 2.5 - GS.evac.hold).toFixed(1)} s`
          : 'Chopper down · get in') + ab
    );
  }
  if (!GS.obj) return GS.RUN.low && GS.nightLive && !GS.nightDone ? 'Lying low' : '';
  const pre = ''; // the weather has its own tag beside the night number now
  if (GS.obj.done) return pre + (GS.obj.failed ? 'Job failed' : 'Job done');
  if (GS.obj.type === 'gen')
    return pre + `${GS.obj.title || 'Defend the generator'} · ${Math.ceil((GS.obj.hp / GS.obj.max) * 100)}%`;
  if (GS.obj.type === 'hunt') {
    let nx = 1e9;
    for (const e of GS.enemies) if (e.mark && !e.dead && e.emerge >= 1) nx = Math.min(nx, e.markT ?? 50);
    return (
      pre +
      `Marked elites · ${GS.obj.got} / ${GS.obj.need}` +
      (nx < 1e9 ? ` · next escapes in ${Math.max(0, Math.ceil(nx))} s` : '')
    );
  }
  const dawnIn = GS.obj.hold && GS.obj.grace > 0 ? ` · dawn in ${Math.ceil(GS.obj.grace)} s` : '';
  if (GS.obj.type === 'rescue')
    return (
      pre +
      (GS.obj.state === 'wait'
        ? `Rescue ${GS.obj.s.bud ? GS.obj.s.bud.nm : 'the survivor'} · ${Math.round(Math.hypot(GS.obj.s.x - GS.P.x, GS.obj.s.y - GS.P.y) / 10)} m`
        : `Keep ${GS.obj.s.bud ? GS.obj.s.bud.nm : 'the survivor'} alive · ${Math.ceil((GS.obj.s.hp / GS.obj.s.max) * 100)}%`) +
      dawnIn
    );
  if (GS.obj.type === 'box') {
    if (GS.obj.cur)
      return `Searching the wreckage · ${Math.min(100, Math.round((GS.obj.cur.prog / BOX_SEARCH) * 100))}%`;
    const left = GS.obj.piles.filter(q => !q.done).length,
      sg = boxSignal(),
      w =
        GS.obj.batt <= 0
          ? 'beacon dead'
          : sg > 0.8
            ? 'signal strong'
            : sg > 0.6
              ? 'signal good'
              : sg > 0.35
                ? 'signal weak'
                : sg > 0.08
                  ? 'signal faint'
                  : 'no signal';
    return (
      `Black box · ${w}${GS.obj.batt > 0 && GS.obj.trend > 0 ? ' · stronger' : GS.obj.batt > 0 && GS.obj.trend < 0 ? ' · weaker' : ''}${Math.hypot(GS.obj.crash.x - GS.P.x, GS.obj.crash.y - GS.P.y) < 320 ? ` · ${left} piles left` : ''}` +
      dawnIn
    );
  }
  return pre + `${GS.obj.name || 'Fuel cans'} · ${GS.obj.got} / ${GS.obj.need}` + dawnIn;
}
export function finishObjective(ok, why) {
  if (!GS.obj || GS.obj.done) return;
  GS.obj.done = true;
  GS.obj.failed = !ok;
  if (GS.obj.job === 'relay') GS.RUN.relayOk = ok; // the pilot's way in depends on it
  if (GS.RUN && GS.RUN.metrics) {
    if (ok) GS.RUN.metrics.objectives++;
    else GS.RUN.metrics.objectivesFailed++;
  }
  if (ok) {
    let sc = GS.obj.type === 'gen' ? 25 : 30,
      extra = '';
    bump('objs');
    addAmmo(1.5);
    if (GS.obj.rw === 'scrap') sc += 50;
    else if (GS.obj.rw === 'reroll') {
      GS.rerolls += 2;
      extra += ' · +2 rerolls';
    } else if (GS.obj.rw === 'crate') {
      extra += ' · supply drop inbound';
      GS.later.push({
        t: 2.2,
        fn: () => {
          if (GS.state === 'play') {
            const c = dropCrate();
            if (c && GS.nightDone) c.dawn = true;
          }
        },
      });
    } // the job's pay on top
    if (GS.obj.job === 'meds') {
      S.maxHp += 20;
      GS.P.hp = S.maxHp;
      extra += ' · +20 max health';
    }
    if (GS.obj.fav) {
      GS.RUN.favours = (GS.RUN.favours || 0) + 1;
      extra += ` · ${GS.RUN.voice || 'Reyes'} owes you`;
      if (GS.obj.job === 'hale') GS.RUN.haleOk = true;
    }
    GS.runSeeds += sc;
    if (GS.obj.type === 'rescue') {
      bump('rescues');
      S.maxHp += 15;
      GS.P.hp = Math.min(S.maxHp, GS.P.hp + 40);
      extra += ' · +15 max health';
      // the survivor you kept alive joins your backup (3 at most); a downed one is patched up by the newcomer
      for (const b of GS.buddies)
        if (b.down > 0) {
          b.down = 0;
          b.rev = 0;
          b.hp = b.max * 0.5;
          b.inv = 1.2;
        } // the survivor helps your downed people up first
      if (GS.buddies.length < 3 && GS.obj.s.hp > 0) {
        if ((LV.buddy || 0) < 3) LV.buddy = (LV.buddy || 0) + 1;
        GS.RUN.nextBud = GS.obj.s.bud || null;
        UP.find(u => u.id === 'buddy').apply();
        const b = GS.buddies[GS.buddies.length - 1];
        b.x = GS.obj.s.x;
        b.y = GS.obj.s.y;
        b.look = GS.obj.s.look;
        b.tint = GS.obj.s.tint;
        b.bodyA = GS.obj.s.bodyA;
        GS.obj.joined = true;
        renderMods();
        extra += ' · they join your backup';
      } else {
        GS.runSeeds += 15;
        sc += 15;
        extra +=
          GS.obj.job === 'hale' ? ' · team full: she rides with the convoy' : ' · team full: they head for the convoy';
        for (const b of GS.buddies) b.hp = b.max;
      } // and patch up your people on the way
    }
    if (GS.obj.type === 'fuel') GS.xp += 20;
    radio(
      objKey() === 'hale' && !GS.obj.joined
        ? 'Hale made it to the trucks. I could kiss you, nine.'
        : (GS.RUN.voice === 'Hawk' && RADIO.okHawk[objKey()]) || RADIO.ok[objKey()],
      null,
      2
    );
    showStreak('Job done', `${objName()} · +${sc} scrap${extra}`);
    sfx.elite();
  } else {
    GS.RUN.noCrate = true;
    showStreak('Job failed', (why || objName()) + ' · no supply drop at dawn');
    sfx.hurt();
    radio((GS.RUN.voice === 'Hawk' && RADIO.failHawk[objKey()]) || RADIO.fail[objKey()], null, 2);
  }
}
