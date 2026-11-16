/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Reads the runs tools/sim/sim.mjs wrote and prints what they say: where runs end, what kills, how each hero does,
// which cards go with fewer deaths later in the run and which with more.
//   node tools/sim/report.mjs /tmp/sim/base.jsonl [/tmp/sim/after.jsonl]   (a second file: the two side by side)
import { readFileSync } from 'node:fs';

const load = f =>
  readFileSync(f, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map(l => JSON.parse(l))
    .filter(r => !r.brk && !Object.values(r.nights).some(n => n.stuck)); // a night the bot couldn't finish says nothing about balance
const pct = x => (100 * x).toFixed(0).padStart(3) + '%';
const NIGHTS = Array.from({ length: 15 }, (_, i) => i + 1);

function summary(R) {
  const o = { n: R.length };
  // a night is lost when the bot is eaten in it at least once; a run ends at its first lost night
  o.lost = NIGHTS.map(w => R.filter(r => r.died.some(d => d.w === w)).length / R.length);
  o.reach = NIGHTS.map(w => R.filter(r => !r.died.some(d => d.w < w)).length / R.length);
  o.hz = NIGHTS.map(w => {
    const at = R.filter(r => !r.died.some(d => d.w < w));
    return at.length ? at.filter(r => r.died.some(d => d.w === w)).length / at.length : 0;
  }); // of the runs still alive, how many end here
  o.win = R.filter(r => !r.died.length).length / R.length;
  o.dmg = NIGHTS.map(w => avg(R.map(r => (r.nights[w] ? r.nights[w].dmg / r.maxHp : 0))));
  o.t = NIGHTS.map(w => avg(R.map(r => (r.nights[w] ? r.nights[w].t : 0))));
  o.dry = NIGHTS.map(w => avg(R.map(r => (r.nights[w] ? r.nights[w].dry || 0 : 0))));
  return o;
}
const avg = a => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);

function print(R, name) {
  const s = summary(R);
  console.log(`\n== ${name}: ${s.n} runs · would have won ${pct(s.win)} ==`);
  console.log('night  reached  ends-here  lost-in  dmg/maxHP  secs  dry-secs');
  for (const w of NIGHTS)
    console.log(
      `${String(w).padStart(5)}  ${pct(s.reach[w - 1])}     ${pct(s.hz[w - 1])}       ${pct(s.lost[w - 1])}     ${s.dmg[w - 1].toFixed(2).padStart(5)}   ${String(Math.round(s.t[w - 1])).padStart(4)}  ${String(Math.round(s.dry[w - 1])).padStart(4)}`
    );
  // heroes
  console.log('\nhero        runs  won   first death (avg night)  deaths/run');
  for (const h of [...new Set(R.map(r => r.hero))]) {
    const H = R.filter(r => r.hero === h);
    console.log(
      `${h.padEnd(11)} ${String(H.length).padStart(4)}  ${pct(H.filter(r => !r.died.length).length / H.length)}  ${avg(
        H.map(r => (r.died.length ? r.died[0].w : 16))
      )
        .toFixed(1)
        .padStart(6)}                  ${avg(H.map(r => r.died.length)).toFixed(1)}`
    );
  }
  // what does the damage, and what lands the killing blow
  const by = {},
    kill = {};
  for (const r of R) {
    for (const n of Object.values(r.nights)) for (const [k, v] of Object.entries(n.by || {})) by[k] = (by[k] || 0) + v;
    for (const d of r.died) kill[d.by] = (kill[d.by] || 0) + 1;
  }
  const tot = Object.values(by).reduce((a, b) => a + b, 0) || 1;
  console.log('\ndamage by source (share)  · deaths');
  for (const [k, v] of Object.entries(by)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 16))
    console.log(`  ${k.padEnd(18)} ${pct(v / tot)}  ${kill[k] || 0}`);
  // cards: lost nights after it was taken, against the same nights in runs that hadn't taken it (yet)
  const base = NIGHTS.map(w => s.lost[w - 1]);
  const card = {};
  for (const r of R) {
    const got = {};
    for (const w of NIGHTS) {
      const n = r.nights[w];
      if (!n) continue;
      for (const k in got) {
        const c = (card[k] = card[k] || { runs: new Set(), ex: 0, n: 0 });
        c.ex += (r.died.some(d => d.w === w) ? 1 : 0) - base[w - 1];
        c.n++;
        c.runs.add(r.i);
      }
      for (const p of n.picks || []) got[p] = Math.min(w, got[p] || 99);
    }
  }
  const rows = Object.entries(card)
    .filter(([, c]) => c.runs.size >= 5)
    .map(([k, c]) => [k, c.ex / c.n, c.runs.size, c.n])
    .sort((a, b) => a[1] - b[1]);
  console.log('\ncards: lost-night rate after taking it, against the night average (negative = fewer deaths)');
  for (const [k, e, nr, nn] of rows)
    console.log(
      `  ${k.padEnd(14)} ${(e >= 0 ? '+' : '') + (100 * e).toFixed(1).padStart(5)} pts   ${nr} runs, ${nn} nights`
    );
  // how often each card is taken, given it was offered we can't see; picks are random, so this is how often it's offered
  return s;
}

const A = load(process.argv[2]);
const sa = print(A, process.argv[2]);
if (process.argv[3]) {
  const B = load(process.argv[3]);
  const sb = print(B, process.argv[3]);
  console.log('\nnight   lost-in before → after');
  for (const w of NIGHTS) console.log(`${String(w).padStart(5)}   ${pct(sa.lost[w - 1])} → ${pct(sb.lost[w - 1])}`);
  console.log(`would have won ${pct(sa.win)} → ${pct(sb.win)}`);
}
