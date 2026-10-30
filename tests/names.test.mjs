/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Every name the player can read on a card, in the Armory or on the wheel is used once: no two upgrades, combos,
// perks, kits, abilities, traps, guns or challenges share a name, and each character's ability upgrades are named
// for that ability (a claymore's upgrade never borrows the mortar's radio).
import { openGame, check } from './lib/harness.mjs';

export const name = 'names: every upgrade and item name is used once';
const CHECK = String.raw`(() => {
  const out = [], at = (src, n) => out.push([String(n), src]);
  for (const u of UP.filter(u => u.id !== 'abcd' && u.id !== 'abpow')) at('upgrade ' + u.id, u.name);
  for (const v of EVOS) at('combo ' + v.id, v.name);
  for (const p of PERKS) at('perk ' + p.id, p.name);
  for (const [k, v] of Object.entries(KITS)) at('kit ' + k, v.name);
  const k0 = Object.fromEntries(Object.entries(KITS).map(([k, v]) => [k, v.name]));
  setSidearm('grenadier');
  for (const [k, v] of Object.entries(KITS)) if (v.name !== k0[k]) at('revolver kit ' + k, v.name);
  setSidearm('ranger');
  for (const d of [AB_DEF, AB_B]) for (const [k, v] of Object.entries(d)) { at('ability ' + k + ' ' + v.name, v.name); at('ability upgrade ' + k + ' ' + v.name, v.cdName); at('ability upgrade ' + k + ' ' + v.name, v.upName); }
  for (const [k, v] of Object.entries(TRAP)) at('trap ' + k, v.name);
  for (const [k, v] of Object.entries(GUNS)) at('gun ' + k, v.name);
  for (const c of CHAL) at('challenge ' + c.id, c.name);
  const by = {};
  for (const [n, s] of out) (by[n] = by[n] || []).push(s);
  return Object.entries(by).filter(([, s]) => s.length > 1).map(([n, s]) => n + ' (' + s.join(', ') + ')');
})()`;
export async function run(b) {
  const { pg, errs, ev } = await openGame(b, { noFrames: true });
  const dup = await ev(CHECK);
  await pg.close();
  check(!dup.length, 'names used twice: ' + dup.join(' | '));
  check(!errs.length, 'page errors: ' + errs.join(' | '));
  return 'all names distinct';
}
