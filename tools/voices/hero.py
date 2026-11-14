# Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE.
# Records what you say (src/audio/hero-lines.js), each of the three in their own voice, with Kokoro TTS, and puts
# the clips in the voice bundle next to Channel 9's and your backups': assets/vox.<hash>.bin, listed in
# assets/pack.json with speaker codes Pranger, Pbreacher, Pgrenadier. Each voice is a blend of two of the model's
# voices (HERO_VOICES), so it is nobody else's. Clips from an earlier run are replaced; everything else in the bundle
# is kept as it is. Run from the repo root:
#   python3 tools/voices/hero.py
# Needs kokoro-onnx, numpy, soundfile, ffmpeg, node, and the Kokoro v1.0 model files in KOKORO (default below).
import os, json, hashlib, subprocess, tempfile
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
AS = os.path.join(ROOT, 'assets')
KOK = os.environ.get('KOKORO', '/tmp/claude-0/tts')
SR_OUT = 22050

src = subprocess.check_output(
    ['node', '--input-type=module', '-e',
     "import('./src/audio/hero-lines.js').then(m=>console.log(JSON.stringify({L:m.HERO_LINES,V:m.HERO_VOICES})))"],
    cwd=ROOT).decode()
cfg = json.loads(src)
k = Kokoro(os.path.join(KOK, 'kokoro-v1.0.int8.onnx'), os.path.join(KOK, 'voices-v1.0.bin'))


def style(mix):
    return sum(k.get_voice_style(v) * w for v, w in mix.items()) / sum(mix.values())


def make(text, voice, speed):
    a, sr = k.create(text, voice=voice, speed=speed, lang='en-us')
    a = np.asarray(a, dtype=np.float32)
    nz = np.where(np.abs(a) > 0.01)[0]
    if len(nz):
        a = a[max(0, nz[0] - 200):nz[-1] + 1600]  # trim the silence round it, keep the tail
    a = a / (np.sqrt(np.mean(a ** 2)) + 1e-9) * 0.14
    a = np.tanh(a * 1.6) / 1.6  # a little push, as for the backups: nobody murmurs in a fight
    a = a / (np.max(np.abs(a)) + 1e-9) * 0.9
    with tempfile.TemporaryDirectory() as d:
        wav, mp3 = os.path.join(d, 'a.wav'), os.path.join(d, 'a.mp3')
        sf.write(wav, a, sr)
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-af', 'highpass=f=100,lowpass=f=7500',
                        '-ac', '1', '-ar', str(SR_OUT), '-c:a', 'libmp3lame', '-b:a', '32k', mp3], check=True)
        b = open(mp3, 'rb').read()
        dur = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of',
                                             'csv=p=0', mp3]).decode().strip())
    return b, round(dur, 2)


pk = json.load(open(os.path.join(AS, 'pack.json')))
old = open(os.path.join(AS, pk['vox']['file']), 'rb').read()
blob, rows = bytearray(), []
for cid, txt, dur, o, n, who in pk['vox']['list']:
    if str(who).startswith('P'):
        continue  # an earlier run's hero lines: recorded again below
    rows.append([cid, txt, dur, len(blob), n, who])
    blob += old[o:o + n]
made = 0
for hero, V in cfg['V'].items():
    code = 'P' + hero
    st = style(V['mix'])
    for t in sorted({t for ts in cfg['L'][hero].values() for t in ts}):
        b, dur = make(t, st, V['speed'])
        rows.append([code + hashlib.sha1(t.encode()).hexdigest()[:7], t, dur, len(blob), len(b), code])
        blob += b
        made += 1
h8 = lambda b: hashlib.sha256(b).hexdigest()[:8]
fn = f'vox.{h8(bytes(blob))}.bin'
if fn != pk['vox']['file']:
    os.remove(os.path.join(AS, pk['vox']['file']))
open(os.path.join(AS, fn), 'wb').write(bytes(blob))
pk['vox'] = {'file': fn, 'list': rows}
names = pk['bake']['a'] + pk['bake']['h'] + fn + pk['gun']['file'] + pk['mus']['file']
pk['v'] = h8(names.encode())
open(os.path.join(AS, 'pack.json'), 'w').write(json.dumps(pk, separators=(',', ':')))
print('hero lines', made, 'clips;', fn, len(blob), 'bytes; pack', pk['v'])
