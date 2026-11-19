/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// How big things are against the world. The street is built to life (a car 4 m long is 80 units: 20 to the metre);
// the people were made about three times too big for it, and everything they do (how fast they go, how far they
// reach, see, hear and shoot) with them. Here they are brought down to a little over life size (1.4x: true size
// reads as specks from above), and all they do with them, so the game plays as it did, in a street to scale. The
// bosses with them, a little bigger again: they were made to tower over you and still do. And the props painted too
// big with the people (the barrels).
export const PER_M = 20, // units to the metre
  HEROIC = 1.4, // the living and the dead against life size (props stay true): a touch over it reads better from above
  PEOPLE = 0.3 * HEROIC, // the hero, survivors, the dead, the dogs: their pictures (and bodies) against what they were
  BIG = PEOPLE, // the big dead were drawn big against the people already: they keep that
  BRUTE = PEOPLE * 1.2, // the brute a little more: a hulk over the people
  BOSS = PEOPLE * 1.2, // and the bosses
  GK = 0.41, // everything the living and the dead do, in distance and speed, against what it was (the view closed in by as much)
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
// how much smaller than its picture (and its old body) this one is
export function figK(e) {
  if (e.type === 'queen') return BOSS;
  if (e.type === 'beetle') return BRUTE;
  if (e.type === 'hopper' || e.type === 'egg' || e.kind === 'drag') return BIG;
  return PEOPLE;
}
