# Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE.
# Alternative sounds to choose between by ear, for the test range's sound board only (they are not in the game's
# sound set): three lever-actions and three grenade launchers. Writes tools/testrange/cands/*.mp3 and cands.json.
# Run from the repo root: python3 tools/sounds/candidates.py (same library and tools as extra.py).
import sys, os, json, subprocess
import numpy as np
from scipy.signal import butter, sosfilt, resample

sys.path.insert(0, os.path.dirname(__file__))
from slice import SR, load, takes, finish  # noqa: E402

LIB = '/home/claude/buddingmonkey/freefirearmssfxlibrary/'
OUT = os.path.join(os.path.dirname(__file__), '..', 'testrange', 'cands')
os.makedirs(OUT, exist_ok=True)


def lp(y, f):
    return sosfilt(butter(4, f, 'low', fs=SR, output='sos'), y, axis=0)


def bp(y, lo, hi):
    return sosfilt(butter(2, [lo, hi], 'band', fs=SR, output='sos'), y, axis=0)


def pitch(y, k):
    return resample(y, int(len(y) / k), axis=0)


def best(path, ml, rel=0.25, gap=0.35, tail=-55, n=1, i=0):
    t = takes(load(path), ml, rel=rel, gap=gap, tail_db=tail)
    t.sort(key=lambda k: (k['clip'] > 40, -k['peak']))
    return t[min(i, len(t) - 1)]['y']


def trim(y, sec):
    y = y[: int(sec * SR)].copy()
    fo = max(1, int(0.3 * len(y)))
    y[-fo:] *= (np.linspace(1, 0, fo) ** 2)[:, None]
    return y


def cat(*parts):
    # parts: (signal, start time in s), mixed into one
    n = max(int(t * SR) + len(y) for y, t in parts)
    out = np.zeros((n, 2))
    for y, t in parts:
        o = int(t * SR)
        out[o : o + len(y)] += y
    return out


def tone_thump(f0, f1, dur, k):
    t = np.arange(int(dur * SR)) / SR
    s = np.sin(2 * np.pi * (f1 + (f0 - f1) * np.exp(-t * k)) * t) * np.exp(-t * (k * 0.4))
    return np.stack([s, s], 1)


snd = {}
M, W = LIB + 'Master Tracks/Marlin 336/', LIB + 'Master Tracks/Model 1894/'
# Lever A: the Winchester 1894 (.32 Win Special): its own shot, and its own full lever cycle
snd['lvA_shot'] = finish(best(LIB + 'Prepared SFX/Model 1894/L_23P.wav', 1.6, rel=0.3, gap=0.5, tail=-62), 0.35, 0.95)
snd['lvA_cyc'] = finish(trim(best(W + 'L_11.wav', 1.0), 0.7), 0.25, 0.8)
# Lever B: the Marlin 336 shot (as now), with a short crisp cycle: lever down, lever up, nothing else
down, up = trim(best(M + 'I_2.wav', 0.5), 0.22), trim(best(M + 'I_4.wav', 0.5), 0.22)
snd['lvB_shot'] = finish(best(LIB + 'Prepared SFX/Marlin 336/I_22P.wav', 1.45, rel=0.3, gap=0.5, tail=-62), 0.35, 0.95)
snd['lvB_cyc'] = finish(cat((down / np.abs(down).max(), 0), (up / np.abs(up).max() * 0.9, 0.13)), 0.25, 0.75)
# Lever C: the Winchester shot a touch heavier (lower, the top rounded off), with its crisp down-up cycle
d2, u2 = trim(best(W + 'L_2.wav', 0.5), 0.22), trim(best(W + 'L_4.wav', 0.5), 0.22)
snd['lvC_shot'] = finish(lp(pitch(snd['lvA_shot'], 0.9), 9000), 0.35, 0.95)
snd['lvC_cyc'] = finish(cat((d2 / np.abs(d2).max(), 0), (u2 / np.abs(u2).max() * 0.9, 0.12)), 0.25, 0.75)
# Launcher B: a dry pop, the way a 40 mm launcher actually sounds: a hollow low thump, a short burst of air from the
# tube, a ping of the tube itself and the action's click, no gunshot crack at all
th = tone_thump(170, 52, 0.45, 26)
rng = np.random.default_rng(7)
air = bp(rng.standard_normal((int(0.08 * SR), 2)), 300, 1400) * np.exp(-np.arange(int(0.08 * SR)) / SR * 45)[:, None]
t = np.arange(int(0.25 * SR)) / SR
ping = np.stack([np.sin(2 * np.pi * 1150 * t) * np.exp(-t * 40)] * 2, 1) * 0.12
click = trim(best(M + 'I_4.wav', 0.5), 0.12)
snd['glB'] = finish(cat((th, 0), (air / np.abs(air).max() * 0.55, 0), (ping, 0.002), (click / np.abs(click).max() * 0.2, 0.18)), 0.4, 0.95)
# Launcher C: a deep boom: a bolt-action 12 gauge an octave down, the crack filtered away, a heavy thump under it
sh = best(LIB + 'Prepared SFX/Mossberg/N_30P.wav', 1.6, rel=0.3, gap=0.5, tail=-60)
boom = lp(pitch(sh, 0.6), 1100)
boom = boom / np.abs(boom).max()
snd['glC'] = finish(trim(cat((boom, 0), (tone_thump(120, 45, 0.6, 14) * 0.8, 0)), 1.3), 0.4, 0.95)

man = {}
for nm, y in snd.items():
    mp = subprocess.run(
        ['ffmpeg', '-v', 'quiet', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-af', 'highpass=f=30',
         '-c:a', 'libmp3lame', '-b:a', '160k', '-f', 'mp3', '-'],
        input=np.asarray(y, np.float32).tobytes(), capture_output=True, check=True).stdout
    open(os.path.join(OUT, nm + '.mp3'), 'wb').write(mp)
    man[nm] = round(len(y) / SR, 2)
    print(nm, f'{len(y) / SR:.2f}s', len(mp), 'bytes')
json.dump(man, open(os.path.join(OUT, 'cands.json'), 'w'))
