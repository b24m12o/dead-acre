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
}
