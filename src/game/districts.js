/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
import { GS } from '../core/gs.js';
export const FINAL_NIGHT = 15;
export const DISTRICTS = {
  town: {
    name: 'Dead Acre',
    desc: 'Main Street crossroads, wrecked cars and ruined houses.',
    boss: 'Abomination',
    lock: null,
    camp: 0,
  },
  highway: {
    name: 'Route 9',
    desc: 'Open asphalt, a gas station and far too many cars.',
    boss: 'Roadkill',
    lock: 'night10',
    camp: 1,
  },
  cemetery: {
    name: 'Hollow Hill',
    desc: 'Graves, crypts and a fog that never lifts.',
    boss: 'Gravekeeper',
    lock: 'evac1',
    camp: 2,
  },
};
export const INFECTION = [
  { name: 'Clean', desc: 'The standard 15 nights.' },
  { name: 'Tougher dead', desc: 'Zombies have 15% more health.' },
  { name: 'Faster turn', desc: 'More of the dead are runners.' },
  { name: 'Elite surge', desc: 'Tougher elite zombies (gold on the radar) show up twice as often.' },
  { name: 'Short on meds', desc: 'Half as many medkits drop.' },
  { name: 'Restless', desc: 'Zombies move 10% faster.' },
  { name: 'Big bosses', desc: 'Bosses have 30% more health.' },
  { name: 'Dry magazines', desc: 'A third fewer ammo boxes.' },
  { name: 'Spitting season', desc: 'More of the dead that spit acid or shriek.' },
  { name: 'Hungry', desc: 'Zombies hit 25% harder.' },
  { name: 'Ground Zero', desc: 'Night 15 brings two bosses at once.' },
];
export const INF = n => ((GS.RUN && GS.RUN.inf) || 0) >= n;
export const TWISTS = [
  // optional rules for a run, on top of the Infection level: each one changes how you play it, and pays more scrap
  { id: 'pistol', name: 'Sidearm only', desc: 'No weapon cases. Your pistol hits 60% harder.', scrap: 0.5 },
  { id: 'nomeds', name: 'No medkits', desc: 'The dead drop no medkits. Supply crates still patch you up.', scrap: 0.4 },
  { id: 'dark', name: 'Grid down', desc: 'Every night is a blackout.', scrap: 0.3 },
  { id: 'glass', name: 'Glass cannon', desc: 'Half the health. 50% more damage.', scrap: 0.35 },
  { id: 'horde', name: 'Horde', desc: '40% more of the dead every night.', scrap: 0.4 },
];
export const TW = id => !!(GS.RUN && GS.RUN.tw && GS.RUN.tw[id]);
export const twistK = () => 1 + TWISTS.reduce((a, t) => a + (TW(t.id) ? t.scrap : 0), 0);
