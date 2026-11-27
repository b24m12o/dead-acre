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
// things carried, thrown and set down: grenades, molotovs, mines, flares, the brass (drawn with the hands that hold them)
export const GEAR = PEOPLE;
// an electrical box on the sidewalk (and a gas pump): about 1.2 m across
export const BOX = 0.5;
// an air-dropped supply box (about 1 m) and the long weapon case (about 1.3 m), with their parachutes, drawn a third
// over life size so they read at a glance as what you came for (at life size the case was a sliver among the litter);
// the generator you guard; a jerrycan
export const CRATE = 0.66,
  WCASE = 0.52,
  GEN = 0.6,
  JERRY = 0.5;
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
// how far one full stride carries it (two steps): a runner's are long, a walker's short; the 3D pose swings its feet
// to match (render/fig3d.js), so they plant instead of skating
export const strideLen = e =>
  (e.type === 'beetle' ? 120 : e.type === 'hound' ? 70 : e.type === 'mini' ? 44 : e.run ? 112 : 58) * GK;
// the camera's tilt: how far up the screen each unit of height goes (0: straight down). The walls, roofs and props
// were always drawn this way (their pictures show their fronts); the figures, cars and lamps now are too
export let TILT = 0.45;
export const TILTED = 0.45; // the tilt, when it's on (Settings: Camera); off, straight down
export const setTilt = on => (TILT = on ? TILTED : 0);
// how high a standing figure's picture reaches up the screen from its feet: a round that strikes anywhere on it hits
export const bodyTop = e =>
  TILT *
  (e.crawl || e.down > 0 || e.half
    ? 8
    : (e.type === 'hound' ? 22 : e.type === 'queen' ? 120 : 50) * (figK(e) / PEOPLE));
// a body's gait at a speed v (its top speed top): how far it has gone from a walk into a run (runK), strides a second
// (f: a step with each foot), and the part of a stride each foot is down (st: past half, both are down at once, walking;
// well under, there are moments with neither, running). People change the length of their stride more than its beat
export const gaitOfSpeed = (v, top) => {
  const x = Math.min(1, Math.max(0, (v / top - 0.42) / 0.4)),
    runK = x * x * (3 - 2 * x);
  return { runK, f: 0.95 + 1.0 * runK, st: 0.6 - 0.22 * runK }; // (a soldier with his gun up: a quick, short-stepped jog)
};
