/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// How big things are drawn against the world. The street is built to life (a car 4 m long is 80 units: 20 to the
// metre); the pictures of people were painted about three times too big for it. Here they are brought to life size:
// people and dogs to their true size, the big ones (the brute, the bloater, the dragger, the egg sac) big but not
// buildings, the bosses as they are. And the props painted too big with them (the barrels).
export const PER_M = 20, // units to the metre
  HEROIC = 1, // the living and the dead against life size (props stay true): a touch over it reads better from above
  PEOPLE = 0.3 * HEROIC, // the hero, survivors, the ordinary dead, the dogs: their pictures against life size
  BIG = 0.5 * HEROIC, // the big dead
  BRUTE = 0.68 * HEROIC, // and the brute: a hulk 2.6 m tall, over the people
  BARREL = 0.45, // an oil drum: 0.6 m across
  MANHOLE = 0.6; // a manhole lid: 0.7 m
// the street's things against their pictures, by what they are across in life: a hydrant 0.6 m with its nozzles, a
// bin 0.6 m, a mailbox 0.5 m, a newspaper box 0.5 m, a bench 1.8 m, a cone 0.36 m, a tyre 0.65 m, a dumpster 2 m, a
// shopping cart 0.95 m; the coffin, the signals, the shelter, the generator already true
export const PROP_K = {
  hydrant: 0.55,
  trash: 0.67,
  mailbox: 0.65,
  news: 0.7,
  bench: 0.9,
  cone: 0.52,
  tire: 0.7,
  dumpster: 0.87,
  cart: 0.6,
};
// how much smaller than its picture this one is drawn
export function figK(e) {
  if (e.type === 'queen') return 1;
  if (e.type === 'beetle') return BRUTE;
  if (e.type === 'hopper' || e.type === 'egg' || e.kind === 'drag') return BIG;
  return PEOPLE;
}
