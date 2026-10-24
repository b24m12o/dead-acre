# Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE.
import sys, os, json, subprocess, numpy as np
sys.path.insert(0, '/tmp/claude-0/gun'); from slice import *
B = '/home/claude/buddingmonkey/freefirearmssfxlibrary/Master Tracks/'
AL = open('/tmp/claude-0/alltracks.txt').read().split('\n')
PB = '/home/claude/buddingmonkey/freefirearmssfxlibrary/'; AP = open('/tmp/claude-0/allprep.txt').read().split('\n')
P = lambda c: PB + ([a for a in AP if a.endswith('/' + c + '.wav')] if c.endswith('P') else [a for a in AL if a.endswith('/' + c + '.wav')])[0]
# key: ([tracks], maxlen s, kind, max variants)
SHOT = 'shot'; H = 'hand'
SPEC = {
 'pistol': (['X_39P'], 1.3, SHOT, 5), 'pistol_m': (['X_31P'], 1.4, SHOT, 3), 'supp': (['X_43', 'X_45'], 0.7, SHOT, 4),
 'smg': (['G_31P'], 0.9, SHOT, 5), 'smg_m': (['G_20P'], 1.0, SHOT, 3),
 'rifle': (['D_32P'], 1.4, SHOT, 5), 'rifle_m': (['D_24P'], 1.5, SHOT, 3),
 'shotgun': (['O_21P'], 1.7, SHOT, 4), 'shotgun_m': (['O_17P'], 1.8, SHOT, 3),
 'auto': (['K_22P'], 1.5, SHOT, 4), 'auto_m': (['K_17P'], 1.6, SHOT, 2),
 'hunter': (['W_29P'], 2.2, SHOT, 4), 'hunter_m': (['W_24P'], 2.2, SHOT, 2),
 'lever': (['I_22P'], 1.45, SHOT, 4), 'lever_m': (['I_17P'], 2.0, SHOT, 2),
 'lmg': (['C_28P'], 1.0, SHOT, 5), 'lmg_m': (['C_31P'], 1.1, SHOT, 3),
 'magOutP': (['X_5'], 0.8, H, 1), 'magInP': (['X_4'], 0.8, H, 1), 'slideP': (['X_15'], 0.6, H, 1), 'dryP': (['X_18'], 0.4, H, 1),
 'magOutS': (['G_9'], 0.8, H, 1), 'magInS': (['G_8'], 0.8, H, 1), 'boltS': (['G_10'], 0.7, H, 1),
 'magOutR': (['D_5'], 0.8, H, 1), 'magInR': (['D_4'], 0.8, H, 1), 'rack': (['D_14'], 0.9, H, 1), 'dryR': (['D_16'], 0.4, H, 1),
 'magOutK': (['C_11'], 0.8, H, 1), 'magInK': (['C_10'], 0.8, H, 1), 'rackK': (['C_12'], 0.8, H, 1),
 'magOutH': (['W_5'], 0.8, H, 1), 'magInH': (['W_4'], 0.8, H, 1), 'bolt': (['W_16'], 1.2, H, 1), 'dryH': (['W_13'], 0.4, H, 1),
 'shell': (['O_7'], 0.7, H, 2), 'pump': (['O_6'], 0.9, H, 1), 'dryS': (['O_8'], 0.4, H, 1),
 'shellL': (['I_14'], 0.7, H, 2), 'leverAct': (['I_10'], 1.0, H, 1), 'dryL': (['I_8'], 0.4, H, 1),
}
OUT = '/tmp/claude-0/gun/out'; os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT): os.remove(os.path.join(OUT, f))
cache = {}; meta = {}; tot = 0
for key, (trs, ml, kind, nmax) in SPEC.items():
    cand = []
    for t in trs:
        if t not in cache: cache[t] = load(P(t))
        x = cache[t]
        for tk in takes(x, ml, rel=0.3 if kind == SHOT else 0.25, gap=0.5 if kind == SHOT else 0.35, tail_db=-60 if kind == SHOT else -50):
            if kind == SHOT and tk['len'] < 0.45 * ml: continue
            cand.append(tk)
    if not cand: print('NO TAKES', key); continue
    pk = max(c['peak'] for c in cand); cand = [c for c in cand if c['peak'] > pk * 0.5]  # drop weak or partial takes
    cand.sort(key=lambda c: (c['clip'] > 40, -c['len'])); sel = cand[:nmax]
    meta[key] = []
    for i, c in enumerate(sel):
        y = finish(c['y'], fade=0.35 if kind == SHOT else 0.25, peak=0.95 if kind == SHOT else 0.9)
        nm = f'{key}{i}' if nmax > 1 else key; raw = f'{OUT}/{nm}.f32'; mp = f'{OUT}/{nm}.mp3'
        y.astype(np.float32).tofile(raw)
        subprocess.run(['ffmpeg', '-v', 'quiet', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', raw, '-af', 'highpass=f=35', '-c:a', 'libmp3lame', '-b:a', '160k', mp], check=True)
        os.remove(raw); n = os.path.getsize(mp); tot += n; meta[key].append([nm, round(c['len'], 2), c['clip']])
print(json.dumps({k: [m[1] for m in v] for k, v in meta.items()}))
print('files', sum(len(v) for v in meta.values()), 'bytes', tot)
json.dump(meta, open(f'{OUT}/meta.json', 'w'))
