# Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE.
# Adds to the recorded gun set: the Gunslinger's .38 revolver (shots and a real cylinder reload), the grenade
# launcher (a dry 40 mm pop and its reload) and the lever-action (a Winchester 1894, shot and lever), all cut from the
# same CC0 firearms library.
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
MR = LIB + 'Master Tracks/Marlin 336/'
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


def bp(y, lo, hi):
    return sosfilt(butter(2, [lo, hi], 'band', fs=SR, output='sos'), y, axis=0)


def tone_thump(f0, f1, dur, k):
    t = np.arange(int(dur * SR)) / SR
    s = np.sin(2 * np.pi * (f1 + (f0 - f1) * np.exp(-t * k)) * t) * np.exp(-t * (k * 0.4))
    return np.stack([s, s], 1)


def cat(*parts):
    n = max(int(t * SR) + len(y) for y, t in parts)
    o = np.zeros((n, 2))
    for y, t in parts:
        a = int(t * SR)
        o[a:a + len(y)] += y
    return o


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
# the launcher (chosen by ear in the test range, "Launcher B"): a dry pop, the way a 40 mm launcher sounds: a hollow
# low thump, a short burst of air from the tube, a ping of the tube itself and the action's click, no gunshot crack
th = tone_thump(170, 52, 0.45, 26)
rng = np.random.default_rng(7)
na = int(0.08 * SR)
air = bp(rng.standard_normal((na, 2)), 300, 1400) * np.exp(-np.arange(na) / SR * 45)[:, None]
tt = np.arange(int(0.25 * SR)) / SR
ping = np.stack([np.sin(2 * np.pi * 1150 * tt) * np.exp(-tt * 40)] * 2, 1) * 0.12
click = trim(best(MR + 'I_4.wav', 0.5)[0], 0.12)
out['launcher'] = finish(
    cat((th, 0), (air / np.abs(air).max() * 0.55, 0), (ping, 0.002), (click / np.abs(click).max() * 0.2, 0.18)), 0.4, 0.95)
# the lever-action ("Lever A"): the Winchester 1894, its own shot near and further off, and its own lever cycle
for i, y in enumerate(best(LIB + 'Prepared SFX/Model 1894/L_23P.wav', 1.6, rel=0.3, gap=0.5, tail=-62, n=2)):
    out[f'lever{i}'] = finish(y, 0.35, 0.95)
for i, y in enumerate(best(LIB + 'Prepared SFX/Model 1894/L_17P.wav', 2.0, rel=0.3, gap=0.5, tail=-62, n=2)):
    out[f'lever_m{i}'] = finish(y, 0.35, 0.95)
out['leverAct'] = finish(trim(best(LIB + 'Master Tracks/Model 1894/L_11.wav', 1.0)[0], 0.7), 0.25, 0.8)
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
