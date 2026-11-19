/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// How big things are drawn against the world. The street is built to life (a car 4 m long is 80 units: 20 to the
// metre); the pictures of people were painted about three times too big for it. Here they are brought to life size:
// people and dogs to their true size, the big ones (the brute, the bloater, the dragger, the egg sac) big but not
// buildings, the bosses as they are. And the props painted too big with them (the barrels).
export const PER_M = 20, // units to the metre
  PEOPLE = 0.3, // the hero, survivors, the ordinary dead, the dogs: their pictures against life size
  BIG = 0.5, // the big dead
  BARREL = 0.45; // an oil drum: 0.6 m across
// how much smaller than its picture this one is drawn
export function figK(e) {
  if (e.type === 'queen') return 1;
  if (e.type === 'beetle' || e.type === 'hopper' || e.type === 'egg' || e.kind === 'drag') return BIG;
  return PEOPLE;
}
