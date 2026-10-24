# Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE.
# finds the individual takes in a raw library track: onset, natural tail, no overlap with the next take
import numpy as np, subprocess
SR = 44100
def load(path):
    raw = subprocess.run(['ffmpeg', '-v', 'quiet', '-i', path, '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).copy()
def env(x, ms=2):
    m = np.abs(x).max(1); k = max(1, int(SR * ms / 1000)); return np.convolve(m, np.ones(k) / k, 'same')
def takes(x, maxlen, rel=0.3, gap=0.35, tail_db=-48):
    e = env(x); mx = e.max(); n = len(e); g = int(gap * SR); out = []; i = 0
    above = e > rel * mx
    while i < n:
        if above[i]:
            s = i
            while s > 0 and e[s] > 0.02 * mx and i - s < int(0.03 * SR): s -= 1
            j = i + g
            while j < n and above[j:j + g // 4].any(): j += g // 4
            out.append(s); i = j
        else: i += 1
    res = []
    for k, s in enumerate(out):
        nxt = out[k + 1] - int(0.03 * SR) if k + 1 < len(out) else n
        end = min(nxt, s + int(maxlen * SR))
        seg = e[s:end]; pk = seg.max(); thr = pk * 10 ** (tail_db / 20)
        loud = np.where(seg > thr)[0]; end2 = s + (loud[-1] if len(loud) else len(seg)) + int(0.02 * SR)
        y = x[max(0, s - int(0.002 * SR)):min(end, end2)].copy()
        if len(y) < int(0.04 * SR): continue
        clip = int((np.abs(y) > 0.995).sum())
        res.append({'start': s / SR, 'len': len(y) / SR, 'peak': float(np.abs(y).max()), 'clip': clip, 'y': y, 'cut': end2 > nxt})
    return res
def finish(y, fade=0.3, peak=0.95):
    y = y.copy(); n = len(y); fi = int(0.0015 * SR); y[:fi] *= np.linspace(0, 1, fi)[:, None]
    fo = max(1, int(n * fade)); y[-fo:] *= (np.linspace(1, 0, fo) ** 2)[:, None]
    return y / (np.abs(y).max() + 1e-9) * peak
