# Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE.
# Builds the soundtrack's instruments (assets/music.<hash>.bin, listed in assets/pack.json) from CC0 sample libraries:
#   guitar  Karoryfer "Emilyguitar" (an Epiphone recorded direct): power chords and lead notes built from its single
#           notes, then run through an amp and cabinet modelled here, hard-panned double tracks for the rhythm part
#   bass    Karoryfer "Black and Blue Basses", the picked "dark black" bass, lightly driven
#   drums   Karoryfer "Big Rusty Drums": close and overhead mics mixed, several velocities and takes of each hit
#   strings VSCO 2 Community Edition cello and viola sections and solo contrabass, sustained and looped, for pads
#   keys    VSCO 2 CE upright piano and glockenspiel
# Every sample keeps a few milliseconds of silence before its attack; the game finds the attack itself after decoding,
# so MP3 encoder delay never puts a hit late. Run sh tools/music/fetch.sh first, then: python3 tools/music/build.py
import os, sys, json, glob, re, hashlib, subprocess, tempfile, numpy as np, soundfile as sf
from scipy import signal

LIB = sys.argv[1] if len(sys.argv) > 1 else '/tmp/claude-0/smp'
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
AS = os.path.join(ROOT, 'assets')
SR = 44100
PRE = int(0.004 * SR)  # silence kept before each attack
rng = np.random.default_rng(7)

def load(p):
    x, sr = sf.read(p, dtype='float32', always_2d=True)
    if sr != SR: x = signal.resample_poly(x, SR, sr, axis=0).astype(np.float32)
    return x
def mono(x): return x.mean(axis=1) if x.ndim == 2 else x
def shift(x, semis):
    """pitch shift by resampling (changes length, as a sampler does)"""
    if abs(semis) < 1e-3: return x
    r = 2 ** (semis / 12); n = int(len(x) / r)
    return np.interp(np.arange(n) * r, np.arange(len(x)), x).astype(np.float32) if x.ndim == 1 else np.stack([shift(x[:, c], semis) for c in range(x.shape[1])], 1)
def onset(x, th=0.03):
    a = np.abs(mono(x)); i = int(np.argmax(a > th * a.max())); return max(0, i - PRE)
def trim(x, dur=None, fade=0.05):
    x = x[onset(x):]
    if dur: x = x[:int(dur * SR)]
    f = min(len(x), int(fade * SR)); w = np.linspace(1, 0, f) ** 2
    x = x.copy(); x[len(x) - f:] *= w[:, None] if x.ndim == 2 else w
    return x
def f0(x):
    """the pitch of a note, as a MIDI number, from the autocorrelation of its steady part"""
    y = mono(x); i = onset(y) + int(0.15 * SR); y = y[i:i + int(0.4 * SR)]; y = y - y.mean()
    c = signal.fftconvolve(y, y[::-1])[len(y) - 1:]; lo, hi = int(SR / 4500), int(SR / 25)
    k = lo + int(np.argmax(c[lo:hi]))
    # prefer the lowest lag peak that is nearly as strong (avoids octave errors)
    for d in (4, 3, 2):
        kk = int(round(k / d))
        if kk > lo and c[kk - 2:kk + 3].max() > 0.85 * c[k]: k = kk; break
    return 69 + 12 * np.log2(SR / k / 440)
NAMES = {'c': 0, 'd': 2, 'e': 4, 'f': 5, 'g': 7, 'a': 9, 'b': 11}
def note(s, octave_shift=0):
    m = re.match(r'([a-gA-G])([b#]?)(-?\d)', s); n = NAMES[m.group(1).lower()] + {'b': -1, '#': 1, '': 0}[m.group(2)]
    return 12 * (int(m.group(3)) + 1 + octave_shift) + n

# ---------- filters (RBJ cookbook biquads) ----------
def bq(kind, f, q=0.707, db=0.0, sr=SR):
    A = 10 ** (db / 40); w = 2 * np.pi * f / sr; cs, sn = np.cos(w), np.sin(w); al = sn / (2 * q)
    if kind == 'lp': b = [(1 - cs) / 2, 1 - cs, (1 - cs) / 2]; a = [1 + al, -2 * cs, 1 - al]
    elif kind == 'hp': b = [(1 + cs) / 2, -(1 + cs), (1 + cs) / 2]; a = [1 + al, -2 * cs, 1 - al]
    elif kind == 'pk': b = [1 + al * A, -2 * cs, 1 - al * A]; a = [1 + al / A, -2 * cs, 1 - al / A]
    elif kind == 'ls':
        sq = 2 * np.sqrt(A) * al; b = [A * ((A + 1) - (A - 1) * cs + sq), 2 * A * ((A - 1) - (A + 1) * cs), A * ((A + 1) - (A - 1) * cs - sq)]; a = [(A + 1) + (A - 1) * cs + sq, -2 * ((A - 1) + (A + 1) * cs), (A + 1) + (A - 1) * cs - sq]
    elif kind == 'hs':
        sq = 2 * np.sqrt(A) * al; b = [A * ((A + 1) + (A - 1) * cs + sq), -2 * A * ((A - 1) + (A + 1) * cs), A * ((A + 1) + (A - 1) * cs - sq)]; a = [(A + 1) - (A - 1) * cs + sq, 2 * ((A - 1) - (A + 1) * cs), (A + 1) - (A - 1) * cs - sq]
    return np.array(b) / a[0], np.array(a) / a[0]
def chain(x, *fs, sr=SR):
    for f in fs: b, a = bq(*f, sr=sr); x = signal.lfilter(b, a, x, axis=0)
    return x.astype(np.float32)

# ---------- the amp and cabinet ----------
def amp(x, gain=1.0, lead=False):
    """a high-gain valve amp, modelled: a tight boost, two clipping stages with the tone shaped between them, then a
    4x12 cabinet's response. Runs at four times the sample rate so the clipping does not alias"""
    O = 4; y = signal.resample_poly(x, O, 1, axis=0); s = SR * O
    y = chain(y, ('hp', 140 if not lead else 110, 0.7), ('pk', 760, 0.9, 6.0), ('lp', 7000, 0.7), sr=s)  # the boost in front
    y = np.tanh(y * 26 * gain + 0.08) - np.tanh(0.08)  # first stage, a little asymmetric
    y = chain(y, ('hp', 40, 0.7), ('pk', 420, 0.8, -5.0 if not lead else -2.0), ('hs', 2400, 0.7, 2.0), sr=s)
    y = np.tanh(y * 3.2 * gain)
    y = signal.resample_poly(y, 1, O, axis=0)
    y = chain(y, ('hp', 80, 0.8), ('pk', 115, 1.2, 4.0), ('pk', 400, 1.0, -3.5), ('pk', 2100, 1.4, 3.0), ('pk', 3600, 2.0, 3.5), ('lp', 5200, 0.8), ('lp', 6800, 0.6), ('pk', 8000, 1, -6))  # the cabinet
    return y.astype(np.float32)
def norm(x, peak=0.89):
    m = np.abs(x).max(); return (x * (peak / m)).astype(np.float32) if m > 0 else x

# ---------- sources ----------
def gtr_notes():
    """the guitar's single notes: {(midi, vel): [takes]}"""
    out = {}
    for p in sorted(glob.glob(f'{LIB}/karoryfer.emilyguitar/notes/*.wav')):
        nm = os.path.basename(p); m = re.match(r'([a-g]b?\d)_(f|mf)_rr(\d)', nm)
        if not m: continue
        out.setdefault((note(m.group(1)), m.group(2)), []).append(load(p)[:, 0])
    return out
G = None
def gnote(m, vel='f', rr=0):
    """one guitar note at MIDI m, from the nearest sample (they are a minor third apart)"""
    ks = sorted({k[0] for k in G if k[1] == vel}, key=lambda k: abs(k - m)); k = ks[0]; takes = G[(k, vel)]
    x = takes[rr % len(takes)]; return shift(x[onset(x):], m - k)
def strum(notes, gap, vel='f', rr=0, dur=3.6):
    n = int(dur * SR) + int(gap * SR * len(notes)); y = np.zeros(n, np.float32)
    for i, m in enumerate(notes):
        x = gnote(m, vel, rr + i)[:n]; o = int(i * gap * SR); y[o:o + len(x)] += x[:n - o]
    return y
def power(root, palm, rr):
    """a power chord (root, fifth, octave) on the low strings, strummed down; palm-muted, the strings are damped by the
    hand: a fast decay and no top end going into the amp"""
    gap = (0.004 if palm else 0.007) + rng.uniform(0, 0.003)
    y = strum([root, root + 7, root + 12], gap, 'f', rr, 0.6 if palm else 3.6)
    if palm:
        t = np.arange(len(y)) / SR; y = y * np.exp(-t / 0.075) * 1.6; y = chain(y, ('lp', 900, 0.6))
    y = np.concatenate([np.zeros(PRE, np.float32), y])
    out = amp(y, 1.0)
    return trim(out, 0.42 if palm else 3.5, 0.05 if palm else 0.4)
def lead(m, rr):
    y = gnote(m, 'f', rr)[:int(3.0 * SR)]; y = np.concatenate([np.zeros(PRE, np.float32), y])
    return trim(amp(y, 0.75, True), 2.8, 0.6)

def bass_notes():
    out = {}
    for p in sorted(glob.glob(f'{LIB}/karoryfer.black-and-blue-basses/Samples/darkblack/reg/*_f_rr*.wav')):
        m = note(re.search(r'darkblack_([a-g]b?\d)_', p).group(1), -1)  # this library names notes an octave up
        out.setdefault(m, []).append(mono(load(p)))
    return out
def bass(B, m):
    k = min(B, key=lambda k: abs(k - m)); x = B[k][0]; x = shift(x[onset(x):], m - k)[:int(2.0 * SR)]
    x = np.concatenate([np.zeros(PRE, np.float32), x])
    x = chain(x, ('hp', 35, 0.7), ('pk', 90, 1.0, 3.0), ('pk', 800, 1.0, 2.0), ('pk', 2500, 1.0, 2.5))
    x = np.tanh(x / np.abs(x).max() * 2.2) * 0.8  # a little grind, so it speaks under the guitars
    return trim(x, 1.8, 0.3)

def drum(folder, mics, vl, rr, gains=None, dur=None):
    """one drum hit, its close and overhead mics mixed (all in stereo)"""
    D = f'{LIB}/karoryfer.big-rusty-drums/Samples/{folder}'
    y = None
    for i, mic in enumerate(mics):
        fs = sorted(glob.glob(f'{D}/{mic}/*_vl{vl}_rr{rr}.flac'))
        if not fs: return None
        x = load(fs[0]); x = x if x.shape[1] == 2 else np.repeat(x, 2, 1); x = x * (gains[i] if gains else 1)
        y = x if y is None else y[:min(len(y), len(x))] + x[:min(len(y), len(x))]
    return trim(y, dur, 0.08)
def vls(folder, mic):
    D = f'{LIB}/karoryfer.big-rusty-drums/Samples/{folder}/{mic}'
    return sorted({int(re.search(r'_vl(\d+)_', f).group(1)) for f in os.listdir(D)}) if os.path.isdir(D) else []

def vsco(pattern, octave_shift=0):
    """VSCO notes by their names (the string sections name them an octave low, so they pass octave_shift=1)"""
    out = {}
    for p in sorted(glob.glob(f'{LIB}/VSCO-2-CE/{pattern}')):
        m = re.search(r'_([A-G]#?\d)_', os.path.splitext(os.path.basename(p))[0] + '_')
        if m: out[note(m.group(1), octave_shift)] = mono(load(p))
    return out
def pad_note(S, m):
    """a sustained string note, looped: the loop's end is crossfaded into the part before its start, so it never clicks"""
    k = min(S, key=lambda k: abs(k - m)); x = S[k]; x = shift(x[onset(x, 0.01):], m - k)
    a, b, F = int(0.9 * SR), min(len(x) - int(0.3 * SR), int(4.4 * SR)), int(0.5 * SR)
    y = x[:b].copy(); w = np.linspace(0, 1, F)
    y[b - F:b] = y[b - F:b] * (1 - w) + x[a - F:a] * w
    y = np.concatenate([np.zeros(PRE, np.float32), y])
    return y.astype(np.float32), (a + PRE) / SR, (b + PRE) / SR

# ---------- build ----------
def mp3(x, kbps):
    with tempfile.TemporaryDirectory() as d:
        w, o = os.path.join(d, 'a.wav'), os.path.join(d, 'a.mp3')
        sf.write(w, np.clip(x, -1, 1), SR, subtype='FLOAT')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', w, '-c:a', 'libmp3lame', '-b:a', f'{kbps}k', o], check=True)
        return open(o, 'rb').read()
def main():
    global G
    items = []  # [name, mp3 bytes, extra]
    def add(name, x, kbps=112, extra=None):
        x = norm(x, 0.89); items.append([name, mp3(x, kbps), extra or []]); print(name, round(len(x) / SR, 2), 's', file=sys.stderr)
    G = gtr_notes()
    # rhythm guitar: open and palm-muted power chords every two semitones, two takes panned hard left and right
    for root in range(36, 60, 2):
        for palm in (False, True):
            L, R = power(root, palm, 0), power(root, palm, 1); n = min(len(L), len(R))
            add(f'g{"p" if palm else "o"}{root}', np.stack([L[:n], R[:n] * 0.97], 1), 144 if not palm else 128)
    for m in range(52, 97, 3): add(f'l{m}', lead(m, 1), 112)
    B = bass_notes()
    for m in range(26, 52, 3): add(f'b{m}', bass(B, m), 96)
    # drums: the hardest and a medium layer, a few takes each
    def kit(name, folder, mics, gains, picks, rrs=(1, 2, 3), dur=None, kbps=128):
        lv = vls(folder, mics[0])
        for j, p in enumerate(picks):
            v = lv[min(len(lv) - 1, int(round(p * (len(lv) - 1))))]
            for r in rrs:
                x = drum(folder, mics, v, r, gains, dur)
                if x is not None: add(f'{name}{"q" if j else ""}{r - 1}', x, kbps)
    kit('k', 'kick_24/kick', ['kick', 'oh'], [1.0, 0.35], [1.0, 0.6], dur=0.6)
    kit('s', 'snare_14/rimshot', ['top', 'btm', 'oh'], [1.0, 0.35, 0.5], [1.0], dur=0.9)
    kit('sc', 'snare_14/center', ['top', 'btm', 'oh'], [1.0, 0.35, 0.5], [0.9, 0.45], (1, 2), 0.7)  # 'scq': the softer hits for fills and ghost notes
    kit('h', 'hihat_14/tc', ['cl', 'oh'], [1.0, 0.4], [0.85, 0.5], dur=0.3, kbps=112)
    kit('ho', 'hihat_14/open', ['cl', 'oh'], [1.0, 0.4], [0.8], (1, 2), 0.9, 112)
    kit('c', 'crash_17/cr', ['cl', 'oh'], [0.7, 1.0], [1.0], (1, 2), 3.2, 128)
    kit('t', 'tom_15/center', ['cl', 'oh'], [1.0, 0.4], [0.9], (1,), 1.0)
    kit('tl', 'tom_18/center', ['cl', 'oh'], [1.0, 0.4], [0.9], (1,), 1.2)
    # strings for the pads: contrabass at the bottom, celli, then violas
    S = {}
    S.update(vsco('Strings/Solo Contrabass/SusVib/*_v1_rr1.wav', 1))
    S.update({k: v for k, v in vsco('Strings/Cello Section/susvib/*_v1_1.wav', 1).items() if k >= 36})
    S.update({k: v for k, v in vsco('Strings/Viola Section/susvib/*_v1_1.wav', 1).items() if k >= 55})
    for m in range(28, 68, 3):
        y, a, b = pad_note(S, m); add(f'p{m}', y, 80, [round(a, 4), round(b, 4)])
    P = vsco('Keys/Upright Nr1/*_mf_RR1.wav')
    for m in range(45, 90, 3):
        k = min(P, key=lambda k: abs(k - m)); x = P[k]; add(f'n{m}', trim(np.concatenate([np.zeros(PRE, np.float32), shift(x[onset(x):], m - k)]), 3.0, 0.8), 96)
    for k, x in vsco('Percussion/Glock/*.wav', 1).items(): add(f'e{k}', trim(x, 2.6, 0.6), 96)
    # the bundle
    blob, lst = bytearray(), []
    for name, b, extra in items: lst.append([name, len(blob), len(b)] + extra); blob += b
    h8 = lambda b: hashlib.sha256(b).hexdigest()[:8]
    pk = json.load(open(os.path.join(AS, 'pack.json')))
    if pk.get('mus') and os.path.exists(os.path.join(AS, pk['mus']['file'])): os.remove(os.path.join(AS, pk['mus']['file']))
    fn = f'music.{h8(bytes(blob))}.bin'; open(os.path.join(AS, fn), 'wb').write(blob)
    pk['mus'] = {'file': fn, 'list': lst}
    pk['v'] = h8((pk['bake']['a'] + pk['bake']['h'] + pk['vox']['file'] + pk['gun']['file'] + fn).encode())
    open(os.path.join(AS, 'pack.json'), 'w').write(json.dumps(pk, separators=(',', ':')))
    print('music', fn, len(items), 'samples', len(blob), 'bytes, pack', pk['v'])
if __name__ == '__main__': main()
