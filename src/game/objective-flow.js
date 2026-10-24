/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
const OBJ_TIP = {
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
const OBJ_NAME = {
  gen: 'Defend the generator',
  rescue: 'Rescue the survivor',
  fuel: 'Collect 5 fuel cans',
  hunt: 'Hunt the marked',
};
function objText() {
  if (evac && evac.leave) return '';
  if (evac) {
    if (evac.t < evac.land) return `Evac in ${Math.ceil(evac.land - evac.t)} s · hold the landing zone`;
    const crew = RUN.aboard.length + buddies.length,
      dn = buddies.find(b => b.down > 0),
      ab = crew ? ` · ${RUN.aboard.length} of ${crew} aboard` + (dn ? ` · ${dn.nm || 'one'} is down` : '') : '';
    return (
      (evac.waiting
        ? `Waiting for ${evac.waiting}`
        : evac.hold > 0
          ? `Hold · ${Math.max(0, 2.5 - evac.hold).toFixed(1)} s`
          : 'Chopper down · get in') + ab
    );
  }
  if (!obj) return RUN.low && nightLive && !nightDone ? 'Lying low' : '';
  const pre = ''; // the weather has its own tag beside the night number now
  if (obj.done) return pre + (obj.failed ? 'Job failed' : 'Job done');
  if (obj.type === 'gen')
    return pre + `${obj.title || 'Defend the generator'} · ${Math.ceil((obj.hp / obj.max) * 100)}%`;
  if (obj.type === 'hunt') {
    let nx = 1e9;
    for (const e of enemies) if (e.mark && !e.dead && e.emerge >= 1) nx = Math.min(nx, e.markT ?? 50);
    return (
      pre +
      `Marked elites · ${obj.got} / ${obj.need}` +
      (nx < 1e9 ? ` · next escapes in ${Math.max(0, Math.ceil(nx))} s` : '')
    );
  }
  const dawnIn = obj.hold && obj.grace > 0 ? ` · dawn in ${Math.ceil(obj.grace)} s` : '';
  if (obj.type === 'rescue')
    return (
      pre +
      (obj.state === 'wait'
        ? `Rescue ${obj.s.bud ? obj.s.bud.nm : 'the survivor'} · ${Math.round(Math.hypot(obj.s.x - P.x, obj.s.y - P.y) / 10)} m`
        : `Keep ${obj.s.bud ? obj.s.bud.nm : 'the survivor'} alive · ${Math.ceil((obj.s.hp / obj.s.max) * 100)}%`) +
      dawnIn
    );
  if (obj.type === 'box') {
    if (obj.cur) return `Searching the wreckage · ${Math.min(100, Math.round((obj.cur.prog / BOX_SEARCH) * 100))}%`;
    const left = obj.piles.filter(q => !q.done).length,
      sg = boxSignal(),
      w =
        obj.batt <= 0
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
      `Black box · ${w}${obj.batt > 0 && obj.trend > 0 ? ' · stronger' : obj.batt > 0 && obj.trend < 0 ? ' · weaker' : ''}${Math.hypot(obj.crash.x - P.x, obj.crash.y - P.y) < 320 ? ` · ${left} piles left` : ''}` +
      dawnIn
    );
  }
  return pre + `${obj.name || 'Fuel cans'} · ${obj.got} / ${obj.need}` + dawnIn;
}
function finishObjective(ok, why) {
  if (!obj || obj.done) return;
  obj.done = true;
  obj.failed = !ok;
  if (obj.job === 'relay') RUN.relayOk = ok; // the pilot's way in depends on it
  if (RUN && RUN.metrics) {
    if (ok) RUN.metrics.objectives++;
    else RUN.metrics.objectivesFailed++;
  }
  if (ok) {
    let sc = obj.type === 'gen' ? 25 : 30,
      extra = '';
    bump('objs');
    addAmmo(1.5);
    if (obj.rw === 'scrap') sc += 50;
    else if (obj.rw === 'reroll') {
      rerolls += 2;
      extra += ' · +2 rerolls';
    } else if (obj.rw === 'crate') {
      extra += ' · supply drop inbound';
      later.push({
        t: 2.2,
        fn: () => {
          if (state === 'play') {
            const c = dropCrate();
            if (c && nightDone) c.dawn = true;
          }
        },
      });
    } // the job's pay on top
    if (obj.job === 'meds') {
      S.maxHp += 20;
      P.hp = S.maxHp;
      extra += ' · +20 max health';
    }
    if (obj.fav) {
      RUN.favours = (RUN.favours || 0) + 1;
      extra += ` · ${RUN.voice || 'Reyes'} owes you`;
      if (obj.job === 'hale') RUN.haleOk = true;
    }
    runSeeds += sc;
    if (obj.type === 'rescue') {
      bump('rescues');
      S.maxHp += 15;
      P.hp = Math.min(S.maxHp, P.hp + 40);
      extra += ' · +15 max health';
      // the survivor you kept alive joins your backup (3 at most); a downed one is patched up by the newcomer
      for (const b of buddies)
        if (b.down > 0) {
          b.down = 0;
          b.rev = 0;
          b.hp = b.max * 0.5;
          b.inv = 1.2;
        } // the survivor helps your downed people up first
      if (buddies.length < 3 && obj.s.hp > 0) {
        if ((LV.buddy || 0) < 3) LV.buddy = (LV.buddy || 0) + 1;
        RUN.nextBud = obj.s.bud || null;
        UP.find(u => u.id === 'buddy').apply();
        const b = buddies[buddies.length - 1];
        b.x = obj.s.x;
        b.y = obj.s.y;
        b.look = obj.s.look;
        b.tint = obj.s.tint;
        b.bodyA = obj.s.bodyA;
        obj.joined = true;
        renderMods();
        extra += ' · they join your backup';
      } else {
        runSeeds += 15;
        sc += 15;
        extra +=
          obj.job === 'hale' ? ' · team full: she rides with the convoy' : ' · team full: they head for the convoy';
        for (const b of buddies) b.hp = b.max;
      } // and patch up your people on the way
    }
    if (obj.type === 'fuel') xp += 20;
    radio(
      objKey() === 'hale' && !obj.joined
        ? 'Hale made it to the trucks. I could kiss you, nine.'
        : (RUN.voice === 'Hawk' && RADIO.okHawk[objKey()]) || RADIO.ok[objKey()],
      null,
      2
    );
    showStreak('Job done', `${objName()} · +${sc} scrap${extra}`);
    sfx.elite();
  } else {
    RUN.noCrate = true;
    showStreak('Job failed', (why || objName()) + ' · no supply drop at dawn');
    sfx.hurt();
    radio((RUN.voice === 'Hawk' && RADIO.failHawk[objKey()]) || RADIO.fail[objKey()], null, 2);
  }
}
