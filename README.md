# Dead Acre

A night-by-night top-down survival shooter. Hold out for fifteen nights, keep your people alive,
listen to Channel 9, and make the evac.

Desktop, keyboard and mouse. WebGL2.

**Copyright (c) 2026 b24m12o. All rights reserved.** The source is public to read, not to reuse.
See [LICENSE](LICENSE).

## Play

- **On your computer:** run the build (below), then open `build/dead-acre.html` in a browser. It is the whole
  game in one file, with every asset inside it.
- **GitHub Pages** (optional): turn on Pages for the `main` branch, root folder, and open the site. It plays
  `dist/game.js`, which loads its art, voices and sounds from `assets/`.

## Layout

```
src/
  index.js      the start: imports every part, then runs each part's init() in order
  core/         errors, utilities, settings, profile, input, the update loop, startup,
                the asset pack (assets.js); gs.js holds GS, the shared game state
  render/       WebGL, sprites, lighting, the painted atlas, the 3D bake (characters, cars, props), drawing
    paint/      the painted atlas, one file per area (survivors, the town, props, people, gore...)
    shapes/     the 3D shapes the shipped pictures are built from (infected, bosses, cars, props...)
  world/        the map, navigation, physics, wear, fire, weather, sight lines
  actors/       zombies and their AI, bosses, the player's weapons, backups, legs
  game/         runs, waves, surges, combat, upgrades, objectives and jobs, story, evac
  audio/        audio core, sound effects, music, the Channel 9 radio
  ui/           HUD, radar, crosshair, menus, settings, markers
  markup.html   the page markup the game runs in
  head.html     the page head (title, meta)
css/style.css   styles (fonts in assets/fonts)
assets/         3D pictures, voices, recorded sounds, the band's instruments (pack.json lists them), fonts
tools/          the build, fingerprint, and the scripts that make the assets
tests/          the tests and the bot that plays the campaign test
dist/           built files: game.js and style.css (do not edit; run the build)
index.html      a page that plays dist/game.js
```

Every file in `src/` is an ES module: it imports what it uses and exports what others use.
Values that several parts change (the night, the run, the boss, the lists of zombies and effects,
timers) live on one shared object, `GS`, as `GS.wave`, `GS.boss` and so on. A file's top level only
declares things; anything that has to run when the game loads is in that file's `init()`, and
`src/index.js` calls the inits in order.

## Build

```sh
npm install
npm run build
```

This writes `dist/game.js`, `dist/style.css`, `index.html`, and `build/dead-acre.html`
(everything in one file, assets embedded).

## Check

```sh
npm run format      # Prettier
npm run lint        # ESLint
npm test            # startup from one script tag, every radio line voiced, every boss (about 2 minutes)
npm run test:campaign   # a bot plays all fifteen nights (about 30 minutes)
npm run fingerprint # a hash of the bundled program: unchanged by formatting or comments
```

GitHub runs formatting, lint, the build (dist/ must match it) and the quick tests on every push.

The build bundles `src/` with esbuild, starting at `src/index.js`. Keep each file's copyright line at the top.
