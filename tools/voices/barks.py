# Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE.
# Records what your backups say (src/audio/bark-lines.js) in each of their voices with Kokoro TTS and puts the clips
# in the voice bundle next to Channel 9's: assets/vox.<hash>.bin, listed in assets/pack.json with speaker codes
# bM0, bM1, bF0, bF1. Clips from an earlier run are replaced, Channel 9's are kept as they are. Run from the repo root:
#   python3 tools/voices/barks.py
# Needs kokoro-onnx, numpy, soundfile, ffmpeg, node, and the Kokoro v1.0 model files in KOKORO (default below).
import os, sys, json, hashlib, subprocess, tempfile
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
AS = os.path.join(ROOT, 'assets')
KOK = os.environ.get('KOKORO', '/tmp/claude-0/tts')
SR_OUT = 22050
# lines a TTS voice says too briefly: drawn out (tempo) and pitched up a little (rate) after recording
STRETCH = {'Aaaaaaaaaaaaaaah!': (0.55, 1.1)}

src = subprocess.check_output(
    ['node', '--input-type=module', '-e',
     "import('./src/audio/bark-lines.js').then(m=>console.log(JSON.stringify({L:m.BARK_LINES,V:m.BARK_VOICES})))"],
    cwd=ROOT).decode()
cfg = json.loads(src)
lines = sorted({t for ts in cfg['L'].values() for t in ts})
k = Kokoro(os.path.join(KOK, 'kokoro-v1.0.int8.onnx'), os.path.join(KOK, 'voices-v1.0.bin'))


CACHE = os.environ.get('BARK_CACHE', '/tmp/claude-0/tts/barks')
os.makedirs(CACHE, exist_ok=True)


def record(text, voice):
    ck = os.path.join(CACHE, hashlib.sha1((voice + '|' + text).encode()).hexdigest()[:12])
    if os.path.exists(ck + '.mp3'):
        return open(ck + '.mp3', 'rb').read(), json.load(open(ck + '.json'))
    b, dur = make(text, voice)
    open(ck + '.mp3', 'wb').write(b)
    json.dump(dur, open(ck + '.json', 'w'))
    return b, dur


def make(text, voice):
    a, sr = k.create(text, voice=voice, speed=1.12, lang='en-us')
    a = np.asarray(a, dtype=np.float32)
    nz = np.where(np.abs(a) > 0.01)[0]
    if len(nz):
        a = a[max(0, nz[0] - 200):nz[-1] + 1600]  # trim the silence round it, keep the tail
    a = a / (np.sqrt(np.mean(a ** 2)) + 1e-9) * 0.14
    a = np.tanh(a * 1.8) / 1.8  # a little push: people raise their voice in a fight
    a = a / (np.max(np.abs(a)) + 1e-9) * 0.9
    with tempfile.TemporaryDirectory() as d:
        wav, mp3 = os.path.join(d, 'a.wav'), os.path.join(d, 'a.mp3')
        sf.write(wav, a, sr)
        fx = 'highpass=f=120,lowpass=f=7500'
        if text in STRETCH:
            tp, pr = STRETCH[text]
            fx = f'asetrate={int(sr * pr)},aresample={sr},atempo={tp / pr:.3f},' + fx
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-af', fx,
                        '-ac', '1', '-ar', str(SR_OUT), '-c:a', 'libmp3lame', '-b:a', '32k', mp3], check=True)
        b = open(mp3, 'rb').read()
        dur = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of',
                                             'csv=p=0', mp3]).decode().strip())
    return b, round(dur, 2)


pk = json.load(open(os.path.join(AS, 'pack.json')))
old = open(os.path.join(AS, pk['vox']['file']), 'rb').read()
blob, rows = bytearray(), []
for cid, txt, dur, o, n, who in pk['vox']['list']:
    if str(who).startswith('b'):
        continue  # an earlier run's backup lines: recorded again below
    rows.append([cid, txt, dur, len(blob), n, who])
    blob += old[o:o + n]
made = 0
for g, vs in cfg['V'].items():
    for i, voice in enumerate(vs):
        code = f'b{g}{i}'
        for t in lines:
            b, dur = record(t, voice)
            cid = code + hashlib.sha1(t.encode()).hexdigest()[:7]
            rows.append([cid, t, dur, len(blob), len(b), code])
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
print('backup lines', made, 'clips;', fn, len(blob), 'bytes; pack', pk['v'])
