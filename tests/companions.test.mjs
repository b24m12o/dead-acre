/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// One hero, the Soldier. The Deputy and the Gunslinger are met on the road, from the third night on, once each in a
// run: the Deputy around town, the Gunslinger out on the highway (or anywhere from the sixth night). At your side the
// Deputy carries a shotgun, the thickest skin of anyone and a riot shove for what crowds him; the Gunslinger's
// revolver fires faster, hits harder and goes through one. Both speak with their own recorded voices, and whoever
// bought them as heroes has the scrap back, once.
import { openGame, check } from './lib/harness.mjs';

export const name = 'companions: the Deputy and the Gunslinger join you on the road, in their own voices';
export async function run(b) {
  const { pg, errs, ev } = await openGame(b, { noFrames: true });
  const o = await ev(`(() => {
    const out = {};
    // the refund, once
    const m = GS.meta;
    m.oneHero = false; m.seeds = 100; m.unlocked.breacher = true; m.unlocked.grenadier = true;
    m.abOwn = m.abOwn || {}; m.abOwn.breacher = true; m.hero = 'grenadier';
    normalizeMeta();
    out.seeds1 = m.seeds; out.hero = m.hero; out.refund = m.heroRefund;
    normalizeMeta();
    out.seeds2 = m.seeds;
    menuInit(); renderHeroes();
    out.heroBtns = document.querySelectorAll('#heroes [data-h]').length;
    out.heroIds = [...document.querySelectorAll('#heroes [data-h]')].map(x => x.dataset.h).join();
    // the roll
    initAudio(); m.tutDone = true;
    begin(); GS.RUN.tut = null; GS.RUN.jobN = []; GS.state = 'play';
    const rnd = Math.random;
    const roll = (wave, district, n = 40) => {
      GS.wave = wave; GS.RUN.district = district; GS.RUN.met = {}; GS.RUN.offered = {}; GS.buddies.length = 0;
      const seen = {};
      for (let i = 0; i < n; i++) { GS.RUN.offered = {}; const r = rollBud(); seen[r.tr] = (seen[r.tr] || 0) + 1; }
      return seen;
    };
    let k = 0;
    Math.random = () => [0.1, 0.1, 0.1, 0.9][k++ % 4]; // (always a companion if one may come; the pick alternating)
    out.w2 = roll(2, 'town');
    out.town = roll(3, 'town');
    out.road = roll(3, 'highway');
    out.road6town = roll(6, 'town');
    // once in a run: joined, never offered again
    GS.wave = 4; GS.RUN.district = 'town'; GS.RUN.met = {}; GS.RUN.offered = {}; GS.buddies.length = 0;
    const P = GS.P;
    const add = r => { const s = Object.assign(makeSurvivor(P.x - 40, P.y + 30), { a: 0, cd: 0, aim: 0, look: 0, tint: [1, 0.9, 0.9] }); budSetup(s, r); GS.buddies.push(s); return s; };
    const r1 = rollBud();
    const dep = add(r1);
    GS.buddies.length = 0; GS.RUN.offered = {};
    let again = 0;
    for (let i = 0; i < 40; i++) { GS.RUN.offered = {}; if (rollBud().tr === 'deputy') again++; }
    out.first = r1.tr; out.again = again;
    out.depNm = dep.nm; out.depLook = dep.look; out.depTint = dep.tint; out.depHv = dep.hv;
    Math.random = rnd;
    // the Deputy: thick skin, a shotgun, and the shove
    GS.wave = 4; GS.buddies.length = 0;
    const d = add({ nm: 'Ruiz', tr: 'deputy' }), c = add({ nm: 'Kim', tr: 'cop' }), mk = add({ nm: 'Ann', tr: 'medic' });
    out.maxD = budMax(d); out.maxC = budMax(c); out.maxM = budMax(mk);
    for (const e of GS.enemies) e.dead = true; GS.enemies.length = 0;
    const z = [makeEnemy('skitter', d.x + 10, d.y), makeEnemy('skitter', d.x - 8, d.y + 6)]; // (on him: makeEnemy adds them)
    for (const e of z) e.emerge = 1;
    d.riotT = 0; budPerk(d, 1 / 60, 999);
    out.shoved = d.riotT > 1 && z.every(e => e.kx * (e.x - d.x) + e.ky * (e.y - d.y) > 0);
    out.riotT = d.riotT; out.kz = z.map(e => [e.kx, e.ky, e.flT, e.type, e.fly, e.emerge]);
    // one on him isn't a crowd
    for (const e of GS.enemies) e.dead = true; GS.enemies.length = 0;
    const one = makeEnemy('skitter', d.x + 10, d.y); one.emerge = 1;
    d.riotT = 0; budPerk(d, 1 / 60, 999); out.oneT = d.riotT;
    for (const e of GS.enemies) e.dead = true; GS.enemies.length = 0;
    // the Gunslinger's revolver
    GS.buddies.length = 0;
    const g = add({ nm: 'Boone', tr: 'slinger' }), p = add({ nm: 'Sam', tr: 'scav' });
    const shoot = s => {
      const t = makeEnemy('skitter', s.x + 110, s.y); t.emerge = 1; t.hp = 1e6;
      GS.pbullets.length = 0; s.cd = 0; s.mag = 30; s.aim = 0;
      for (let i = 0; i < 60 && !GS.pbullets.some(q => q.small); i++) { t.hp = 1e6; update(1 / 60); }
      const b = GS.pbullets.find(q => q.small);
      const r = { dmg: b && b.dmg, pierce: b && b.pierce, cd: s.cd };
      t.dead = true; GS.enemies.length = 0; return r;
    };
    out.g = shoot(g); out.p = shoot(p);
    out.gLook = g.look; out.gHv = g.hv;
    // their own picks, while they're with you
    GS.buddies.length = 0;
    const pool = () => upgradePool().filter(u => u.buddy).map(u => u.id).sort().join();
    out.pool0 = pool();
    const d2_ = add({ nm: 'Ruiz', tr: 'deputy' });
    out.poolD = pool();
    const g2 = add({ nm: 'Boone', tr: 'slinger' });
    out.poolDG = pool();
    // Riot Line: one alone on him is enough, and it comes back sooner; Grit: him and you patched up
    LV.riotline = 1; LV.grit = 1;
    d2_.hp = 50; GS.P.hp = 40;
    const lone = makeEnemy('skitter', d2_.x + 10, d2_.y); lone.emerge = 1;
    d2_.riotT = 0; budPerk(d2_, 1 / 60, 999);
    out.rlT = d2_.riotT; out.gritB = d2_.hp; out.gritP = GS.P.hp;
    lone.dead = true; GS.enemies.length = 0;
    // Fan the Hammer, Through and Through
    LV.rollhot = 1; LV.sleight = 1; GS.buddies.length = 0; GS.buddies.push(g2); // (his rounds alone)
    out.g2 = shoot(g2);
    LV.riotline = LV.grit = LV.rollhot = LV.sleight = 0;
    GS.buddies.length = 0; GS.buddies.push(d, g);
    // their own voices
    const lines = [];
    for (const [s, kinds] of [[d, ['reload', 'hurt', 'clear', 'kill']], [g, ['reload', 'hurt', 'horde', 'idle']]]) {
      for (const k of kinds) {
        s.say = null;
        for (let i = 0; i < 30 && !s.say; i++) { GS.time += 60; s.bk = {}; bark(s, k); } // (past the cooldowns and the odds)
        lines.push([s.hv, k, s.say ? s.say.txt : null]);
      }
    }
    out.lines = lines;
    out.heroLine = lines.every(([h, k, t]) => t == null || Object.values(HERO_LINES[h]).some(L => L.includes(t)));
    out.said = lines.filter(x => x[2]).length;
    out.code = voiceOf(p) !== 'Pbreacher';
    return out;
  })()`);
  await pg.close();
  check(
    o.seeds1 === 100 + 250 + 400 + 300,
    `the Deputy, the Gunslinger and his second ability should come back as scrap: ${o.seeds1}`
  );
  check(o.seeds2 === o.seeds1, `and only once: ${o.seeds2}`);
  check(o.refund === 950, `the refund should be noted for the scrap line: ${o.refund}`);
  check(o.hero === 'ranger', `the hero should be the Soldier: ${o.hero}`);
  check(o.heroBtns === 1 && o.heroIds === 'ranger', `the setup should offer only the Soldier: ${o.heroIds}`);
  check(!o.w2.deputy && !o.w2.slinger, `neither before the third night: ${JSON.stringify(o.w2)}`);
  check(o.town.deputy && !o.town.slinger, `around town, the Deputy: ${JSON.stringify(o.town)}`);
  check(o.road.slinger && !o.road.deputy, `out on the highway, the Gunslinger: ${JSON.stringify(o.road)}`);
  check(
    o.road6town.slinger && o.road6town.deputy,
    `from the sixth night, either, anywhere: ${JSON.stringify(o.road6town)}`
  );
  check(o.first === 'deputy' && o.again === 0, `once he's joined, never again that run: ${o.first}, ${o.again}`);
  check(o.depNm === 'Ruiz' && o.depHv === 'breacher', `the Deputy is himself: ${o.depNm}, ${o.depHv}`);
  check(
    o.depLook === 1 && o.depTint == null && o.gLook === 2 && o.gHv === 'grenadier',
    `in his own clothes: ${o.depLook} ${o.depTint} / ${o.gLook}`
  );
  check(
    o.maxD > o.maxC && o.maxC > o.maxM,
    `the Deputy should have the thickest skin: ${o.maxD} > ${o.maxC} > ${o.maxM}`
  );
  check(o.shoved, `two on the Deputy should be shoved off him: ${o.riotT} ${JSON.stringify(o.kz)}`);
  check(o.oneT < 1, `but one is no crowd: ${o.oneT}`);
  check(
    o.g.dmg > o.p.dmg * 1.2 && o.g.pierce === 1 && o.p.pierce === 0,
    `the Gunslinger hits harder and goes through one: ${JSON.stringify(o.g)} vs ${JSON.stringify(o.p)}`
  );
  check(o.g.cd < o.p.cd * 0.7, `and fires faster: ${o.g.cd} vs ${o.p.cd}`);
  check(
    o.pool0 === '' && o.poolD === 'grit,riotline' && o.poolDG === 'grit,riotline,rollhot,sleight',
    `their picks only while they're with you: '${o.pool0}' / ${o.poolD} / ${o.poolDG}`
  );
  check(Math.abs(o.rlT - 3.5 * 0.7) < 0.01, `Riot Line: one alone shoved, and back in 2.45 s: ${o.rlT}`);
  check(o.gritB === 56 && o.gritP === 42, `Grit: +6 for him, +2 for you: ${o.gritB}, ${o.gritP}`);
  check(
    o.g2.pierce === 2 && Math.abs(o.g2.dmg / o.g.dmg - 1.2) < 0.01 && Math.abs(o.g2.cd / o.g.cd - 1 / 1.2) < 0.01,
    `Fan the Hammer and Through and Through: ${JSON.stringify(o.g2)} vs ${JSON.stringify(o.g)}`
  );
  check(o.said >= 4 && o.heroLine, `they should speak their own lines: ${JSON.stringify(o.lines)}`);
  check(o.code, 'an ordinary survivor keeps an ordinary voice');
  check(!errs.length, errs.join('\n'));
}
