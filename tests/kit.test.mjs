/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// No Armory and no starting loadouts: your kit opens from the setup screen. The E ability is one of six, picked as a
// chip with a line saying what it does: the flashbang yours from the start, the rest opened by challenges (the mortar
// strike last, five bosses down). Perks are bought with scrap there and switched on or off. A run takes the picked
// ability, and starts with the pistol alone.
import { openGame, check } from './lib/harness.mjs';

export const name = 'kit: six abilities opened by challenges, perks, no loadouts, no Armory';
export async function run(b) {
  const { pg, errs, ev } = await openGame(b, { noFrames: true });
  const o = await ev(`(() => {
    const out = {};
    window.__nr = 1;
    out.noArmory = !$('hangarBtn') && !$('hangar') && !$('hangarOutfits');
    GS.meta.seeds = 1000; GS.meta.perks = {}; GS.meta.perkOff = {}; GS.meta.abOwn = {}; GS.meta.ab = undefined;
    GS.meta.chal = {};
    $('survBtn').click();
    $('kitBtn').click();
    out.setup = !$('survSetup').hidden && !$('kitDrawer').hidden;
    const chips = () => [...$('hangarAbs').children];
    out.abs = chips().map(c => c.dataset.k + (c.classList.contains('lockd') ? '-' : '+')).join(' ');
    out.on = (chips().find(c => c.classList.contains('on')) || {}).dataset?.k;
    out.note = $('abDesc').textContent;
    // a locked one says how it's opened, and can't be picked
    $('hangarAbs').querySelector('[data-k="mortar"]').click();
    out.mortarLocked = GS.meta.ab !== 'mortar';
    // five bosses down: the mortar strike opens, and is picked, and a run takes it
    GS.meta.chal = { boss5: true };
    renderKit();
    $('hangarAbs').querySelector('[data-k="mortar"]').click();
    out.picked = GS.meta.ab;
    // the claymore, bought back when it was the Soldier's second, stays open
    GS.meta.chal = {}; GS.meta.abOwn = { ranger: true }; renderKit();
    out.claymore = !$('hangarAbs').querySelector('[data-k="claymore"]').classList.contains('lockd');
    GS.meta.chal = { boss5: true };
    // a perk bought, switched off and on
    const buy = $('hangarPerks').querySelector('.buy[data-perk]'), id = buy.dataset.perk;
    buy.click();
    out.perk = [id, GS.meta.perks[id], GS.meta.seeds];
    $('hangarPerks').querySelector('.tgl[data-tog="' + id + '"]').click();
    out.off = !!GS.meta.perkOff[id];
    $('hangarPerks').querySelector('.tgl[data-tog="' + id + '"]').click();
    out.onAgain = !GS.meta.perkOff[id];
    out.kitSum = $('kitSum').textContent;
    // into a run: the mortar strike, and only the pistol
    GS.meta.tutDone = true;
    document.querySelector('#kitDrawer [data-close]').click();
    $('startBtn').click();
    out.runAb = GS.RUN.ab; out.abName = AB().name; out.guns = GS.P.owned.join();
    return out;
  })()`);
  await pg.close();
  check(o.noArmory, 'there should be no Armory and no loadouts');
  check(o.setup, 'Your kit should open from the setup screen');
  check(
    o.abs === 'flash+ flare- dyn- claymore- rapid- mortar-' && o.on === 'flash' && /Flashbang/.test(o.note),
    `six abilities, the flashbang open and picked, the rest locked: ${o.abs}, ${o.on}, "${o.note}"`
  );
  check(o.mortarLocked, 'a locked ability should not be picked');
  check(o.picked === 'mortar', `five bosses down, the mortar strike can be picked: ${o.picked}`);
  check(o.claymore, 'a claymore bought before stays open');
  check(o.perk[1] === 1 && o.perk[2] < 1000, `a perk should be bought with scrap: ${o.perk}`);
  check(o.off && o.onAgain, `and switched off and on: ${o.off}, ${o.onAgain}`);
  check(/Mortar strike/.test(o.kitSum), `the kit's button should say what it comes to: "${o.kitSum}"`);
  check(o.runAb === 'mortar' && o.abName === 'Mortar strike', `the run should take the picked ability: ${o.runAb}`);
  check(o.guns === 'pistol', `and start with the pistol alone: ${o.guns}`);
  check(!errs.length, 'page errors: ' + errs.join(' | '));
  return `abilities ${o.abs}; mortar opened by five bosses and taken into the run; a perk bought and switched`;
}
