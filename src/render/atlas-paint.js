/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Paints every picture in the atlas, area by area (src/render/paint/). The order matters: it is the order the
// regions are packed in, and the order the random details are drawn in
import { paintBasics } from './paint/basics.js';
import { paintSurvivors } from './paint/survivors.js';
import { paintBlocks } from './paint/blocks.js';
import { paintStreet } from './paint/street.js';
import { paintInteriors } from './paint/interiors.js';
import { paintDead } from './paint/dead.js';
import { paintPeople } from './paint/people.js';
import { paintBeasts } from './paint/beasts.js';
import { paintGore } from './paint/gore.js';
import { paintProps } from './paint/props.js';
import { region } from './atlas.js';
import { RF_SIZES, WB_SIZES } from './bake.js';
export function paintAtlas() {
  paintBasics();
  paintSurvivors();
  paintBlocks();
  paintStreet();
  paintInteriors();
  paintDead();
  paintPeople();
  paintBeasts();
  paintGore();
  paintProps();
  for (const [n, [w, h, z]] of Object.entries(WB_SIZES))
    region(
      n,
      w,
      h,
      (a, e) => {
        if (!/win$/.test(n)) return;
        e.fillStyle = n === 'wb_c30win' ? '#9fc4d8' : '#ffb060';
        if (n === 'wb_c30win') e.fillRect(-16.5, 17.4 - 24.5 + z / 2, 33, 21);
        else e.fillRect(-8.5, 17.2 - 20.6 + z / 2, 17, 14);
      },
      0.2,
      0.5,
      0.7
    ); // the 3D wall blocks; a lit window's pane glows (drawn where the glass sits in the picture)
  for (const [n, [w, h]] of Object.entries(RF_SIZES)) region(n, w, h, () => {}, 0.12, 0.4, 0.6); // the roof pieces, last: they only fill the gaps left in the atlas's rows
}
