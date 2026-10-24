/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
function dawnDrops() { // dawn has a job now: the convoy drops what the next night needs while it is quiet, and the night waits a little while it sits unopened
  const nx = wave + 1;
  if (WEAPON_NIGHTS[nx] && nextGuns().length && !(nx === 2 && RUN.tutCase)) later.push({ t: 1.6, fn: () => { const gs = nextGuns(); if (state === 'play' && gs.length) { const c = dropCrate(gs[0], gs[1]); if (c) c.dawn = true; } } });
  if (WEAPON_NIGHTS[nx] && !nextGuns().length && !TW('pistol') && nx % 2 && !bossNight(nx)) later.push({ t: 3.2, fn: () => { if (state === 'play' && !crates.some(c => !c.gun && !c.open)) { const c = dropCrate(); if (c) { c.dawn = true; showStreak('Supply drop', 'No guns left to spare · ammo and gear instead'); } } } }); // the guns have run out: a supply crate in the case's place
  const skip = RUN.noCrate && !bossNight(nx); RUN.noCrate = false; // a failed job: the convoy keeps tonight's crate
  if ((nx % 2 === 0 || bossNight(nx)) && !skip) later.push({ t: WEAPON_NIGHTS[nx] ? 4.2 : 3.2, fn: () => { if (state === 'play' && !crates.some(c => !c.gun && !c.open)) { /* a boss's own reward crate counts as tonight's supply */ const c = dropCrate(); if (c) { c.dawn = true; if (bossNight(nx)) showStreak('Supply drop', 'Stock up · something big comes tonight'); } } } });
}
function nightCleared() {
  if (RUN.practice) { if (!nightDone) { nightDone = true; practiceReport(true); } return; }
  if (nightDone) return; nightDone = true; if (wave > 0 && !bossNight(wave)) sfx.clear(); if (P && P.stains) for (const st of P.stains) { st.c = 0.24; st.a = 0.8; } // by dawn the night's blood has dried dark
  if (obj && !obj.done) { if (obj.type === 'box') finishObjective(obj.got >= 1, 'The black box is still out there'); else if (obj.type === 'fuel') finishObjective(obj.got >= obj.need, obj.job === 'meds' ? 'Not all the med cases were found' : 'Not all the fuel was found'); else if (obj.type === 'hunt') finishObjective(obj.got >= obj.need, 'A marked one got away'); else if (obj.type === 'rescue') finishObjective(obj.state === 'follow' && obj.s.hp > 0, 'You never reached them'); else finishObjective(obj.hp > 0); }
  if (RUN.low && wave > 0) { P.hp = S.maxHp; rerolls++; later.push({ t: 2.6, fn: () => showStreak('Laid low', 'Patched up · +1 reroll') }); }
  if ((!nightHit) && wave > 0) { bump('flawless'); showStreak('Flawless night', 'Not a scratch'); }
  statMax('maxNight', wave); checkChal(); saveMeta();
  if ((RUN.endless || wave < FINAL_NIGHT)) { interT = 11; if (RUN.bossDawn) radio(RUN.bossDawn); if (STORY[wave] && !RUN.endless) storyDawn(wave); else if (!RUN.bossDawn) radio(pick(RADIO.dawn), null, 0); RUN.bossDawn = null; for (const b of buddies) { if (b.down > 0) { b.down = 0; b.rev = 0; b.hp = b.max * 0.5; floatText(b.x, b.y - 40, 'Back on their feet', '#8ef0b8', 14); } b.max = Math.max(b.max, budMax(b)); } /* at dawn the downed are patched up, and your people toughen with every night */ FOGBT = 0; for (const L of lamps) { if (L.bflick) L.broken = L.bflick = false; if (L.off) { L.off = 0; L.on = time; } } tip('dawn'); banner('Dawn', RUN.endless ? `Night ${wave} survived` : `Night ${wave} survived · ${FINAL_NIGHT - wave} to go`); RUN.dawnX = 0; dawnDrops(); if (jobNight(wave + 1)) { RUN.jobPend = true; later.push({ t: 2.4, fn: openJobs }); } }
}
// ---- boss encounters: the arrival, the radio story, the arena turning with each phase, and the kill as a checkpoint
