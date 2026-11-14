/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Each stop on the road looks like itself. The moonlight and the sky's fill take a cast from the place (sodium
// warmth at the gas station, the motel's pink, cold steel at the bridge, a sick green at the hospital), and three
// places have a light of their own that you can see from across the map: the Starlite's neon sign, flickering; the
// quarry's two floodlights still burning over the yard; the red emergency lamp over the hospital's doors. A
// blackout puts out the neon and the floods (the emergency lamp runs on its own battery). Looks only: none of it
// changes who can see whom.
import { GS } from '../core/gs.js';
import { TILE, LAYOUT } from './map.js';
import { addLight } from '../render/sprites.js';

// what the place does to the moon (sun) and to the sky's fill: red, green, blue, times these
export const PLACE_LOOK = {
  main: { sun: [1, 1, 1], sky: [1, 1, 1] },
  clinic: { sun: [0.95, 1.04, 1.0], sky: [0.95, 1.05, 1.0] }, // a little clinical
  gas: { sun: [1.08, 1.0, 0.88], sky: [1.08, 1.0, 0.9] }, // sodium warmth off the forecourt
  motel: { sun: [1.04, 0.96, 1.04], sky: [1.1, 0.95, 1.08] }, // the sign's pink in everything
  quarry: { sun: [1.1, 1.08, 1.0], sky: [1.03, 1.0, 0.95] }, // pale dust, a brighter moon off the stone
  bridge: { sun: [0.9, 0.98, 1.1], sky: [0.92, 1.0, 1.1] }, // cold off the water
  hill: { sun: [0.95, 1.0, 0.95], sky: [1.0, 1.04, 0.98] }, // grey-green under the mist
  hospital: { sun: [0.9, 1.04, 0.98], sky: [0.92, 1.08, 1.0] }, // the green of a building on its last power
};
// the place this map was built as, in the campaign ('main' for Main Street, which is the town's own map), or null
// anywhere else (Horde mode, the range, the menu's backdrop)
export const placeId = () => (GS.RUN && GS.RUN.journey && GS.state !== 'menu' ? LAYOUT || 'main' : null);
export const placeLook = () => PLACE_LOOK[placeId()] || PLACE_LOOK.main;
// the lights a place burns, drawn each frame with the rest of the scene's lights
export function placeLights() {
  const id = placeId();
  if (!id) return;
  const dark = GS.ev === 'blackout',
    t = GS.time;
  if (id === 'motel' && !dark) {
    // the Starlite's sign over the office door: pink neon with a bad tube
    const buzz = Math.sin(t * 31) > 0.86 || (Math.sin(t * 0.9) > 0.97 && Math.sin(t * 47) > 0) ? 0.35 : 1,
      k = buzz * (0.92 + 0.08 * Math.sin(t * 7.3));
    addLight(43.5 * TILE, 17.6 * TILE, 300, 1.05 * k, 0.24 * k, 0.55 * k);
    addLight(43.5 * TILE, 17.6 * TILE, 120, 0.5 * k, 0.1 * k, 0.3 * k);
  } else if (id === 'quarry' && !dark) {
    // two floodlights on their masts at the ends of the yard, turned in over it
    addLight(11 * TILE, 19 * TILE, 560, 0.8, 0.86, 1.0, 0.35, 0.9);
    addLight(49 * TILE, 19 * TILE, 560, 0.8, 0.86, 1.0, Math.PI - 0.35, 0.9);
  } else if (id === 'hospital') {
    // the emergency lamp over the lobby doors, turning
    const k = 0.55 + 0.45 * Math.sin(t * 2.6);
    addLight(29.5 * TILE, 22.6 * TILE, 260, 0.95 * k, 0.1 * k, 0.08 * k);
  }
}
