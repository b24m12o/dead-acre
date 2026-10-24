/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Registers every 3D shape group and the parts built from it, in this order (the order is part of the pictures'
// key: change it and the pictures need rebuilding with tools/bake)
import { shapeInfected } from './shapes/infected.js';
import { shapeBosses } from './shapes/bosses.js';
import { shapeSurvivors } from './shapes/survivors.js';
import { shapeVehicles } from './shapes/vehicles.js';
import { shapePickups } from './shapes/pickups.js';
import { shapeProps } from './shapes/props.js';

// runs once, in order with every other part's init, when the game starts (see src/index.js)
export function init() {
  shapeInfected();
  shapeBosses();
  shapeSurvivors();
  shapeVehicles();
  shapePickups();
  shapeProps();
}
