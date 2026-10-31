# Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE.
# Adds to the recorded gun set: the Gunslinger's .38 revolver (shots and a real cylinder reload) and the grenade
# launcher (a deep 40 mm thoomp, the drum indexing, and its reload), all cut from the same CC0 firearms library.
# Appends them to assets/gun.<hash>.bin and rewrites assets/pack.json. Run from the repo root:
#   python3 tools/sounds/extra.py
# Expects the library at LIB (a partial clone of buddingmonkey/freefirearmssfxlibrary; fetch the tracks named below
# with `git checkout HEAD -- <path>`), and Python 3 with numpy, scipy and ffmpeg.
import sys, os, json, hashlib, subprocess
import numpy as np
from scipy.signal import butter, sosfilt, resample

sys.path.insert(0, os.path.dirname(__file__))
from slice import SR, load, takes, finish  # noqa: E402

LIB = '/home/claude/buddingmonkey/freefirearmssfxlibrary/'
SW = LIB + 'Master Tracks/Smith & Wesson 642/'
ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
ASSETS = os.path.join(ROOT, 'assets')


def lp(y, f):
    return sosfilt(butter(4, f, 'low', fs=SR, output='sos'), y, axis=0)


def hp(y, f):
    return sosfilt(butter(2, f, 'high', fs=SR, output='sos'), y, axis=0)


def pitch(y, k):
    # k < 1: lower and slower, like a bigger, heavier part
    return resample(y, int(len(y) / k), axis=0)


def best(path, ml, rel=0.25, gap=0.35, tail=-55, n=1, minlen=0.04):
    t = [k for k in takes(load(path), ml, rel=rel, gap=gap, tail_db=tail) if k['len'] >= minlen]
    t.sort(key=lambda k: (k['clip'] > 40, -k['peak']))
    return [k['y'] for k in t[:n]]


def trim(y, sec):
    n = int(sec * SR)
    y = y[:n].copy()
    fo = max(1, int(0.25 * len(y)))
    y[-fo:] *= (np.linspace(1, 0, fo) ** 2)[:, None]
    return y


out = {}
# the revolver: a .38 snub-nose, near; the reload: flip the cylinder out, punch the empties, load, flip it shut
for i, y in enumerate(best(LIB + 'Prepared SFX/Smith & Wesson 642/V_27P.wav', 1.4, rel=0.3, gap=0.5, tail=-62, n=2)):
    out[f'revolver{i}'] = finish(y, fade=0.35, peak=0.95)
for i, y in enumerate(best(LIB + 'Prepared SFX/Smith & Wesson 642/V_22P.wav', 1.5, rel=0.3, gap=0.5, tail=-62, n=2)):
    out[f'revolver_m{i}'] = finish(y, fade=0.35, peak=0.95)
out['revOpen'] = finish(best(SW + 'V_9.wav', 0.6)[0], 0.25, 0.9)
out['revClose'] = finish(best(SW + 'V_10.wav', 0.6)[0], 0.25, 0.9)
out['revEject'] = finish(best(SW + 'V_3.wav', 0.9)[0], 0.25, 0.9)
out['revLoad'] = finish(trim(best(SW + 'V_18.wav', 2.4, n=3)[0], 1.0), 0.25, 0.85)
# the launcher: a 12-gauge shot an octave and more down, the crack filtered off, a body of air under it and the tube
# ringing, then the drum turning on to the next round: the hollow thoomp of a 40 mm grenade leaving
sh = best(LIB + 'Prepared SFX/Model 12/K_22P.wav', 1.7, rel=0.3, gap=0.5, tail=-60)[0]
y = lp(pitch(sh, 0.48), 1400)
n = len(y)
t = np.arange(n) / SR
thump = (np.sin(2 * np.pi * (58 + 40 * np.exp(-t * 30)) * t) * np.exp(-t * 11))[:, None] * np.array([[1, 1]])
ring = (np.sin(2 * np.pi * 410 * t) * np.exp(-t * 26) * 0.18)[:, None] * np.array([[1, 0.9]])
y = y / (np.abs(y).max() + 1e-9) + 0.75 * thump + ring
idx = lp(pitch(best(SW + 'V_4.wav', 0.25)[0], 0.62), 3500)
o = int(0.2 * SR)
y = np.vstack([y, np.zeros((max(0, o + len(idx) - len(y)), 2))])
y[o:o + len(idx)] += idx / (np.abs(idx).max() + 1e-9) * 0.22
out['launcher'] = finish(trim(hp(y, 30), 1.6), fade=0.4, peak=0.95)
# its reload: the frame swung open, the fat empties out, two rounds pushed home, the drum wound and the frame shut
out['lchOpen'] = finish(lp(pitch(best(SW + 'V_9.wav', 0.6)[0], 0.62), 5000), 0.25, 0.9)
out['lchEject'] = finish(lp(pitch(best(SW + 'V_3.wav', 0.9)[0], 0.55), 4500), 0.25, 0.9)
out['lchLoad'] = finish(lp(pitch(trim(best(SW + 'V_2.wav', 1.5, n=4)[2], 0.5), 0.6), 5000), 0.2, 0.85)
out['lchWind'] = finish(lp(pitch(best(SW + 'V_4.wav', 1.0)[0], 0.7), 4000), 0.3, 0.75)
out['lchClose'] = finish(lp(pitch(best(SW + 'V_10.wav', 0.6)[0], 0.6), 5000), 0.25, 0.95)

# encode and append to the gun bundle
pack = json.load(open(os.path.join(ASSETS, 'pack.json')))
old = open(os.path.join(ASSETS, pack['gun']['file']), 'rb').read()
lst = [r for r in pack['gun']['list'] if r[0].rstrip('0123456789') not in {k.rstrip('0123456789') for k in out}]
blob = bytearray()
for nm, o_, l_ in lst:
    lst_b = old[o_:o_ + l_]
    blob += lst_b
rows = []
off = 0
for nm, o_, l_ in lst:
    rows.append([nm, off, l_])
    off += l_
for nm, y in out.items():
    raw = subprocess.run(
        ['ffmpeg', '-v', 'quiet', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-af', 'highpass=f=30',
         '-c:a', 'libmp3lame', '-b:a', '160k', '-f', 'mp3', '-'],
        input=np.asarray(y, np.float32).tobytes(), capture_output=True, check=True).stdout
    rows.append([nm, len(blob), len(raw)])
    blob += raw
    print(nm, f'{len(y) / SR:.2f}s', len(raw), 'bytes')
h8 = hashlib.sha256(bytes(blob)).hexdigest()[:8]
fn = f'gun.{h8}.bin'
if pack['gun']['file'] != fn:
    os.remove(os.path.join(ASSETS, pack['gun']['file']))
open(os.path.join(ASSETS, fn), 'wb').write(bytes(blob))
pack['gun'] = {'file': fn, 'list': rows}
files = pack['bake']['a'] + pack['bake']['h'] + pack['vox']['file'] + fn
pack['v'] = hashlib.sha256(files.encode()).hexdigest()[:8]
json.dump(pack, open(os.path.join(ASSETS, 'pack.json'), 'w'), separators=(',', ':'))
print('gun bundle', fn, len(blob), 'bytes,', len(rows), 'sounds')
