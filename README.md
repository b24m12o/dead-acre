# Dead Acre

A night-by-night top-down survival shooter. Hold out for fifteen nights, keep your people alive,
listen to Channel 9, and make the evac.

Desktop, keyboard and mouse. WebGL2.

**Copyright (c) 2026 b24m12o. All rights reserved.** The source is public to read, not to reuse.
See [LICENSE](LICENSE).

## Play

- **CodePen:** the Pen's HTML panel holds a single line, pinned to one released version:
  ```html
  <script src="https://cdn.jsdelivr.net/gh/b24m12o/dead-acre@COMMIT/dist/game.js"></script>
  ```
  Leave the CSS and JS panels empty. The game adds its own markup and styles and loads its art,
  voices and sounds from `assets/` at the same version.
- **GitHub Pages** (optional): turn on Pages for the `main` branch, root folder, and open the site.

## Layout

```
src/            the game, in the order listed in src/order.json
  core/         errors, utilities, settings, profile, input, the update loop, startup
  render/       WebGL, sprites, lighting, the painted atlas, the 3D character bake, drawing
  world/        the map, navigation, physics, wear, fire, weather, sight lines
  actors/       zombies and their AI, bosses, the player's weapons, backups, legs
  game/         runs, waves, surges, combat, upgrades, objectives and jobs, story, evac
  audio/        audio core, sound effects, music, the Channel 9 radio
  ui/           HUD, radar, crosshair, menus, settings, markers
  markup.html   the page markup the game runs in
  head.html     the page head (title, meta)
css/style.css   styles (fonts in assets/fonts)
assets/         art, voices and recorded sounds (pack.json lists them), fonts
tools/          the build, and the scripts that make the assets
dist/           built files: game.js and style.css (do not edit; run the build)
index.html      a page that plays dist/game.js
```

## Build

```sh
npm install
npm run build
```

This writes `dist/game.js`, `dist/style.css`, `index.html`, and `build/dead-acre.html`
(everything in one file, assets embedded).

The parts in `src/` share one scope and are joined in the listed order; the build checks nothing
else. Keep each file's copyright line at the top.
