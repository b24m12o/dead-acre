/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
import { GS } from '../core/gs.js';
import { $ } from '../core/errors.js';
import { TAU, rand } from '../core/util.js';
import { viewH, viewW } from '../render/sprites.js';
import { WH, WW, barrelSpots, cars, generateMap, lamps } from '../world/map.js';
import { MUS } from '../audio/audio.js';
import { S, armGuns, cam, resetStats } from './state.js';
import { resetWear } from '../world/wear.js';
import { HUDF } from '../ui/hud.js';
import { stopHeli } from './evac.js';
let mapCache = { fresh: false, d: '' };
export function newRun(forMenu = false) {
  GS.noiseRings = [];
  GS.loudSaid = false;
  GS.alarmSaid = false;
  {
    HUDF.gun = null;
    HUDF.own = 0;
    HUDF.ownSet = [];
    HUDF.prev = null;
    HUDF.got = {};
    HUDF.newGun = null;
    HUDF.swapT = 0;
    HUDF.a = {};
    HUDF.radarA = 0.62;
    HUDF.t = 0;
  }
  GS.radioQ = [];
  GS.radioT = -1;
  {
    const el = $('radio');
    if (el) el.classList.remove('show');
  }
  resetStats();
  {
    const D0 = (GS.RUN && GS.RUN.district) || 'town';
    if (!forMenu && mapCache.fresh && mapCache.d === D0) {
      mapCache.fresh = false;
      resetWear();
      for (const c of cars) c.alarm = 0;
    } // the menu's backdrop becomes the run's map, so Play doesn't bake a second one
    else {
      generateMap();
      mapCache = { fresh: forMenu, d: D0 };
    }
  }
  GS.streakT = 0;
  GS.streakCur = null;
  GS.streakQ = [];
  {
    const se = $('streak'),
      be = $('banner');
    if (se) se.classList.remove('show');
    if (be) be.classList.remove('show');
  } // a new run starts with a clean screen
  for (const L of lamps) {
    L.off = 0;
    L.on = 0;
    if (L.bflick) L.broken = L.bflick = false;
  }
  GS.FOGB = GS.FOGBT = 0;
  GS.bossDue = false;
  cam.peek = null;
  MUS.cutT = 0;
  MUS.floorT = 0;
  GS.P = {
    x: WW / 2,
    y: WH / 2 + 40,
    vx: 0,
    vy: 0,
    r: 16,
    hp: S.maxHp,
    moveA: -Math.PI / 2,
    bodyA: -Math.PI / 2,
    aimA: -Math.PI / 2,
    stride: 0,
    strideAmp: 0,
    fireCd: 0,
    dashCd: 0,
    dashT: 0,
    dashA: 0,
    inv: 0,
    recoil: 0,
    dartT: 2.5,
    pulseT: 4,
    abT: 4,
    hurt: 0,
    scarf: [],
    ant: { x: 0, y: 0, vx: 0, vy: 0 },
  };
  for (let i = 0; i < 8; i++) GS.P.scarf.push({ x: GS.P.x, y: GS.P.y + i * 5, px: GS.P.x, py: GS.P.y + i * 5 });
  armGuns(GS.P);
  GS.P.ant.x = GS.P.x;
  GS.P.ant.y = GS.P.y;
  GS.firePools = [];
  GS.molos = [];
  GS.wrecks = [];
  GS.bangs = [];
  GS.whiteFlash = 0;
  GS.enemies = [];
  GS.corpses = [];
  GS.pbullets = [];
  GS.ebullets = [];
  GS.darts = [];
  GS.buddies = [];
  GS.pickups = [];
  GS.parts = [];
  GS.decals = [];
  GS.arcs = [];
  GS.flashes = [];
  GS.dwaves = [];
  GS.texts = [];
  GS.ghosts = [];
  GS.later = [];
  GS.dlights = [];
  GS.rings = [];
  GS.pools = [];
  GS.mortars = [];
  GS.gasClouds = [];
  GS.freshGraves = [];
  GS.warns = [];
  GS.screenBlood = [];
  GS.barrels = barrelSpots.map(b => ({ x: b.x, y: b.y, r: 14, hp: 20, dead: false }));
  GS.butterflies = [];
  GS.pollen = [];
  GS.clouds = Array.from({ length: 6 }, () => ({ x: rand(0, WW), y: rand(0, WH), s: rand(2.4, 4), r: rand(0, TAU) }));
  GS.wave = 0;
  GS.queue = [];
  GS.spawnT = 0;
  GS.interT = 1.5;
  GS.score = 0;
  GS.kills = 0;
  GS.level = 1;
  GS.xp = 0;
  GS.xpNeed = need(1);
  GS.combo = 0;
  GS.comboT = 0;
  GS.trauma = 0;
  GS.shakeLoad = 0;
  GS.hitstop = 0;
  GS.chroma = 0;
  GS.nid = 1;
  GS.boss = null;
  GS.flowTile = -1;
  cam.x = GS.P.x - viewW / 2;
  cam.y = GS.P.y - viewH / 2;
  cam.vx = cam.vy = cam.lx = cam.ly = 0;
  GS.crates = [];
  GS.chutesDown = [];
  GS.hitDirs = [];
  GS.slowmo = 0;
  GS.runSeeds = 0;
  GS.streakT = 0;
  GS.obj = null;
  GS.ev = null;
  GS.evac = null;
  GS.nightDone = false;
  GS.nightLive = false;
  GS.lightning = 0;
  GS.lightT = 4;
  stopHeli();
  $('won').hidden = true;
  GS.streakQ = [];
  GS.streakCur = null;
}
export const need = l => Math.floor(6 + l * 5 + l * l * 0.6);

/* ---------- Upgrades ---------- */
