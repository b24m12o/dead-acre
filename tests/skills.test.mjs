/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The long one, again, with the newer moves: the bot shoves when they close round it, throws mines and sets down
// gas drums into crowds, boards a gap a crowd is coming through, and shops at every campaign dawn. It must still
// make the evac, and must have used each of them along the way.
import { campaign, wonRun } from './campaign.test.mjs';
import { check } from './lib/harness.mjs';

export const name = 'skills: the bot plays all 15 nights with shove, traps, boards and supplies';
export const long = true;
export async function run(b) {
  const { r, errs } = await campaign(b, { skills: true });
  wonRun(r, errs, 'skills');
  const k = r.sk || {};
  check(k.shoves > 0 && k.caught > 0, `the bot should have shoved some of them back: ${JSON.stringify(k)}`);
  check(k.traps > 0, `the bot should have used its traps: ${JSON.stringify(k)}`);
  check(k.dawns >= 5 && k.spent > 0, `the bot should have shopped at the dawns: ${JSON.stringify(k)}`);
  return `won; ${k.shoves} shoves (${k.caught} thrown back), ${k.traps} traps, ${k.boards} boards, ${k.spent} scrap on ${JSON.stringify(k.buys)}`;
}
