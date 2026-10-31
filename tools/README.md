# Tools

- `build.mjs`: the build (`npm run build`). This is the only tool needed to make the game.
- `testrange/`: a separate test build, never part of the game: `npm run build`, then `npm run testrange` writes
  `build/test-range.html`, the game with a panel on top to start any night, kind of night, character and district
  straight away (every gun, invulnerable, a trap kit; K clears the night) and a sound board for every gun's shot and
  reload. Its storage lives in memory, so nothing is saved and no profile is touched.
- `fingerprint.mjs`: a hash of the bundled program, for proving a change (such as formatting) left the program as it was.
- `lib/source.mjs`: bundling `src/` with esbuild, shared by the build, the fingerprint and the tests.
- `bake/`: rebuilding the 3D pictures after a change to the shapes in `src/render/shapes/`: `npm run build`, then `node tools/bake/dump.mjs` (draws every part from its shapes in a software-rendering browser, about three minutes), then `python3 tools/bake/pack.py` (packs them into `assets/` and updates `pack.json`), then `npm run build` again.
- `assets/pack.py`: writes `assets/` (pack.json, the atlas pictures, the voice and sound bundles) from a one-file build that has them embedded.
- `voices/`: the Channel 9 line list (`lines.py`, read from the game's source), the voice generator (Kokoro TTS) and the step that embeds the clips.
- `music/`: the soundtrack's instruments. `fetch.sh` fetches just the samples used from the CC0 libraries; `build.py` builds power chords and lead notes from the single guitar notes, runs them through a modelled amp and cabinet, mixes the drum mics, loops the string notes, and writes `assets/music.<hash>.bin` into `pack.json`. Needs Python 3 with numpy, scipy, soundfile and ffmpeg.
- `sounds/`: how the recorded gun, zombie and impact sounds were cut and processed from their CC0 source libraries.

The asset scripts are maintenance tools. They expect the source libraries and models on local paths set at the top of each file, and Python 3 with numpy, soundfile and ffmpeg.
