/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
let mapCache = { fresh: false, d: '' };
function newRun(forMenu = false) {
  noiseRings = [];
  loudSaid = false;
  alarmSaid = false;
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
  radioQ = [];
  radioT = -1;
  {
    const el = $('radio');
    if (el) el.classList.remove('show');
  }
  resetStats();
  {
    const D0 = (RUN && RUN.district) || 'town';
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
  streakT = 0;
  streakCur = null;
  streakQ = [];
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
  FOGB = FOGBT = 0;
  bossDue = false;
  cam.peek = null;
  MUS.cutT = 0;
  MUS.floorT = 0;
  P = {
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
  for (let i = 0; i < 8; i++) P.scarf.push({ x: P.x, y: P.y + i * 5, px: P.x, py: P.y + i * 5 });
  armGuns(P);
  P.ant.x = P.x;
  P.ant.y = P.y;
  firePools = [];
  molos = [];
  wrecks = [];
  bangs = [];
  whiteFlash = 0;
  enemies = [];
  corpses = [];
  pbullets = [];
  ebullets = [];
  darts = [];
  buddies = [];
  pickups = [];
  parts = [];
  decals = [];
  arcs = [];
  flashes = [];
  dwaves = [];
  texts = [];
  ghosts = [];
  later = [];
  dlights = [];
  rings = [];
  pools = [];
  mortars = [];
  gasClouds = [];
  freshGraves = [];
  warns = [];
  screenBlood = [];
  barrels = barrelSpots.map(b => ({ x: b.x, y: b.y, r: 14, hp: 20, dead: false }));
  butterflies = [];
  pollen = [];
  clouds = Array.from({ length: 6 }, () => ({ x: rand(0, WW), y: rand(0, WH), s: rand(2.4, 4), r: rand(0, TAU) }));
  wave = 0;
  queue = [];
  spawnT = 0;
  interT = 1.5;
  score = 0;
  kills = 0;
  level = 1;
  xp = 0;
  xpNeed = need(1);
  combo = 0;
  comboT = 0;
  trauma = 0;
  shakeLoad = 0;
  hitstop = 0;
  chroma = 0;
  nid = 1;
  boss = null;
  flowTile = -1;
  cam.x = P.x - viewW / 2;
  cam.y = P.y - viewH / 2;
  cam.vx = cam.vy = cam.lx = cam.ly = 0;
  crates = [];
  chutesDown = [];
  hitDirs = [];
  slowmo = 0;
  runSeeds = 0;
  streakT = 0;
  obj = null;
  ev = null;
  evac = null;
  nightDone = false;
  nightLive = false;
  lightning = 0;
  lightT = 4;
  stopHeli();
  $('won').hidden = true;
  streakQ = [];
  streakCur = null;
}
const need = l => Math.floor(6 + l * 5 + l * l * 0.6);

/* ---------- Upgrades ---------- */
