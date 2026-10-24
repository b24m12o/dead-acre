# Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE.
import subprocess, os, glob, json, numpy as np
C = '/tmp/claude-0/cc0/CC0-Public-Domain-Sounds/'
OUT = '/tmp/claude-0/fx/out'; os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT): os.remove(os.path.join(OUT, f))
cr = lambda n: C + '80-CC0-creature-SFX/' + n + '.ogg'; ki = lambda n: C + 'kenney_impactsounds/Audio/' + n + '.ogg'
r5 = lambda p: [f'{p}_{i:03d}' for i in range(5)]
# key: list of (source, pitch, lowpass Hz, highpass Hz)
SPEC = {
 'zgroan': [(cr(f'monster_0{i}'), 0.76, 2600, 80) for i in range(1, 8)] + [(cr(f'grunt_0{i}'), 0.74, 2400, 80) for i in range(1, 6)],
 'zgrowl': [(cr(f'roar_0{i}'), 0.82, 3600, 90) for i in range(1, 4)] + [(cr(f'monster_0{i}'), 0.9, 3600, 90) for i in (2, 5)],
 'zscream': [(cr(f'scream_0{i}'), p, 6000, 200) for i in (1, 2) for p in (0.92, 1.04)],
 'zretch': [(cr(f'cough_0{i}'), 0.72, 2400, 90) for i in (1, 2, 3)],
 'zspit': [(cr(f'spit_0{i}'), 0.95, 7000, 150) for i in (1, 2, 3)],
 'zinhale': [(cr('breath'), p, 5000, 150) for p in (0.82, 0.95)],
 'fhit': [(ki(n), 1.0, 9000, 120) for n in r5('impactPunch_medium') + r5('impactSoft_medium')],
 'fbody': [(ki(n), 0.8, 5000, 50) for n in r5('impactSoft_heavy') + r5('impactPunch_heavy')],
 'fstep': [(ki(n), 1.0, 9000, 80) for n in r5('footstep_concrete')],
 'ftink': [(ki(n), 1.0, 14000, 300) for n in r5('impactMetal_light')] + [(C + f'warfork-cc0/sounds/weapons/ric{i}.ogg', 1.0, 14000, 300) for i in (1, 2)],
 'fclang': [(ki(n), 1.0, 12000, 100) for n in r5('impactMetal_heavy')],
 'fglass': [(ki(n), 1.0, 15000, 300) for n in r5('impactGlass_light') + r5('impactGlass_medium')],
}
SR = 44100; meta = {}; tot = 0
for key, lst in SPEC.items():
    meta[key] = []
    for i, (src, pitch, lp, hp) in enumerate(lst):
        if not os.path.exists(src): print('missing', src); continue
        nm = f'{key}{i}'; mp = f'{OUT}/{nm}.mp3'
        af = f'aresample=48000,asetrate={int(48000 * pitch)},aresample={SR},highpass=f={hp},lowpass=f={lp},silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-55dB,areverse,dynaudnorm=p=0.9:m=4:f=200'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-ac', '1', '-af', af, '-c:a', 'libmp3lame', '-b:a', '96k', mp], check=True)
        # peak-normalise the mono take
        raw = subprocess.run(['ffmpeg', '-v', 'quiet', '-i', mp, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True).stdout; x = np.frombuffer(raw, np.float32)
        if len(x) < 400: print('empty', nm); os.remove(mp); continue
        g = 0.9 / (np.abs(x).max() + 1e-9)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', mp, '-af', f'volume={g:.3f}', '-c:a', 'libmp3lame', '-b:a', '96k', mp + '.tmp.mp3'], check=True); os.replace(mp + '.tmp.mp3', mp)
        meta[key].append([nm, round(len(x) / SR, 2)]); tot += os.path.getsize(mp)
print({k: len(v) for k, v in meta.items()}, 'bytes', tot)
json.dump(meta, open(f'{OUT}/meta.json', 'w'))
