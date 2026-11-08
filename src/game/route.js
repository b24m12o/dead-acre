/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The campaign's road: every stop on the way from Dead Acre to the hospital, the last night spent at each, how you
// leave it (on foot along the road, or in the back of a convoy truck), and which nights bring a boss or a horde.
// Plain data, so the wave and night code can read it without pulling in the journey itself (journey.js).
// map: which of the game's grounds stands for the place.
export const STOPS = [
  {
    id: 'main',
    name: 'Main Street',
    area: 'Dead Acre',
    short: 'Main St',
    map: 'town',
    to: 2,
    leave: 'foot',
    desc: 'Shops, a crossroads, and relay 9 on the hardware store roof.',
  },
  {
    id: 'clinic',
    name: "St. Mary's",
    area: 'Dead Acre',
    short: "St. Mary's",
    map: 'town',
    to: 5,
    leave: 'truck',
    desc: 'The clinic where Hale worked, and the school behind it.',
  },
  {
    id: 'gas',
    name: 'Route 9 gas station',
    area: 'Route 9',
    short: 'Gas',
    map: 'highway',
    to: 7,
    leave: 'foot',
    desc: 'A truck stop off Route 9. The pumps ran dry weeks ago.',
  },
  {
    id: 'motel',
    name: 'The Starlite Motel',
    area: 'Route 9',
    short: 'Motel',
    map: 'highway',
    to: 8,
    leave: 'foot',
    desc: 'A roadside motel across from a burnt-out fire station.',
  },
  {
    id: 'quarry',
    name: 'The quarry',
    area: 'Route 9',
    short: 'Quarry',
    map: 'highway',
    to: 10,
    leave: 'truck',
    desc: 'The pit off Route 9 where the convoy stopped for fuel.',
  },
  {
    id: 'bridge',
    name: 'Mill River bridge',
    area: 'Mill River',
    short: 'Bridge',
    map: 'highway',
    to: 12,
    leave: 'foot',
    desc: 'The only way over the river for thirty miles.',
  },
  {
    id: 'hill',
    name: 'Hollow Hill',
    area: 'Hollow Hill',
    short: 'Hill',
    map: 'cemetery',
    to: 14,
    leave: 'truck',
    desc: 'The cemetery on the road up to the hospital. The fog never lifts.',
  },
  {
    id: 'hospital',
    name: 'County Hospital',
    area: 'Hollow Hill',
    short: 'Hospital',
    map: 'cemetery',
    to: 15,
    desc: 'Where it began. The helipad is on the lawn past the east wing.',
  },
];
// the stop you are at on a night (the night before the first is the first stop's)
export const stopAt = w => {
  const i = STOPS.findIndex(s => Math.max(1, w) <= s.to);
  return i < 0 ? STOPS.length - 1 : i;
};
// one boss for most places on the road, each where it belongs
export const BOSS_J = { 5: 'abom', 8: 'chief', 10: 'roadkill', 13: 'grave', 15: 'pz' };
// the hordes, placed round the bosses rather than on top of them: one to learn them before the first boss, one
// over the bridge while the trucks cross, the dead the Gravekeeper raises with him (a smaller horde, on his
// night), and the flood at the evac
export const HORDE_J = { 4: 1, 11: 1 };
export const BOSS_HORDE_J = { 13: 0.45 };
export const JOBS_J = [3, 7, 12, 9]; // the convoy's favours, in order: the black box, Hale, the relay, the scouts
