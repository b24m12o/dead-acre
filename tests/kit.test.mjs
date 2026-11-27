/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// No Armory: your kit is on the setup screen, between the road and the rules of the run. The starting loadout and the
// E ability are chips with a line that says what the chosen one does; perks are bought with scrap there and switched
// on or off; the win screen's first button goes straight back to it.
import { openGame, check } from './lib/harness.mjs';

export const name = 'kit: loadout, ability and perks on the setup screen, no Armory';
export async function run(b) {
  const { pg, errs, ev } = await openGame(b, { noFrames: true });
  const o = await ev(`(() => {
    const out = {};
    window.__nr = 1;
    out.noArmory = !$('hangarBtn') && !$('hangar');
    GS.meta.seeds = 1000; GS.meta.perks = {}; GS.meta.perkOff = {}; GS.meta.abOwn = {}; GS.meta.abSel = {};
    GS.meta.stats = { ...(GS.meta.stats || {}), maxNight: 6 };
    $('survBtn').click();
    out.setup = !$('survSetup').hidden;
    out.loads = $('hangarOutfits').children.length;
    out.loadOn = $('hangarOutfits').querySelector('.on') && $('hangarOutfits').querySelector('.on').dataset.k;
    out.loadNote = $('loadDesc').textContent;
    // a perk bought
    const buy = $('hangarPerks').querySelector('.buy[data-perk]');
    const id = buy.dataset.perk;
    buy.click();
    out.perk = [id, GS.meta.perks[id], GS.meta.seeds];
    // switched off, and on again
    $('hangarPerks').querySelector('.tgl[data-tog="' + id + '"]').click();
    out.off = !!GS.meta.perkOff[id];
    $('hangarPerks').querySelector('.tgl[data-tog="' + id + '"]').click();
    out.on = !GS.meta.perkOff[id];
    // the second ability bought and picked, then Mortar strike again
    const s0 = GS.meta.seeds;
    $('hangarAbs').querySelector('[data-k="b"]').click();
    out.ab = [GS.meta.abOwn.ranger, GS.meta.abSel.ranger, s0 - GS.meta.seeds];
    $('hangarAbs').querySelector('[data-k="a"]').click();
    out.abBack = GS.meta.abSel.ranger;
    out.scrapShown = $('hangarSeeds').textContent;
    return out;
  })()`);
  await pg.close();
  check(o.noArmory, 'there should be no Armory screen and no button for it');
  check(o.setup, 'Play should open the setup screen');
  check(
    o.loads >= 2 && o.loadOn === 'std' && /Standard Issue/.test(o.loadNote),
    `the loadouts as chips, the standard one taken and said: ${o.loads}, ${o.loadOn}, "${o.loadNote}"`
  );
  check(o.perk[1] === 1 && o.perk[2] < 1000, `a perk should be bought with scrap: ${o.perk}`);
  check(o.off && o.on, `and switched off and on: ${o.off}, ${o.on}`);
  check(
    o.ab[0] === true && o.ab[1] === 'b' && o.ab[2] === 300,
    `the second ability bought for 300 and picked: ${o.ab}`
  );
  check(o.abBack === 'a', `and Mortar strike picked again: ${o.abBack}`);
  check(/Scrap/.test(o.scrapShown), `your scrap should show over the kit: ${o.scrapShown}`);
  check(!errs.length, 'page errors: ' + errs.join(' | '));
  return `${o.loads} loadouts, a perk bought and switched, the second ability bought; no Armory`;
}
