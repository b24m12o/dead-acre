# Tools

- `build.mjs`: the build (`npm run build`). This is the only tool needed to make the game.
- `assets/pack.py`: writes `assets/` (pack.json, the atlas pictures, the voice and sound bundles) from a one-file build that has them embedded.
- `voices/`: the Channel 9 line list (`lines.py`, read from the game's source), the voice generator (Kokoro TTS) and the step that embeds the clips.
- `sounds/`: how the recorded gun, zombie and impact sounds were cut and processed from their CC0 source libraries.

The asset scripts are maintenance tools. They expect the source libraries and models on local paths set at the top of each file, and Python 3 with numpy, soundfile and ffmpeg.
