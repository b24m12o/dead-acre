# Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE.
import sys, os, subprocess, json, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
sys.path.insert(0, os.path.dirname(__file__)); from clips_all import CLIPS
VR, VH = (sys.argv[1] if len(sys.argv) > 1 else 'af_heart'), (sys.argv[2] if len(sys.argv) > 2 else 'am_michael')
SPR, SPH = 1.14, 1.08
BR = sys.argv[3] if len(sys.argv) > 3 else '24k'
out = '/tmp/claude-0/tts/out_all'; os.makedirs(out, exist_ok=True)
k = Kokoro('/tmp/claude-0/tts/kokoro-v1.0.int8.onnx', '/tmp/claude-0/tts/voices-v1.0.bin')
tot = 0; dur = 0; meta = {}
only = os.environ.get('ONLY')
for cid, sp, txt in CLIPS:
    if only and cid not in only.split(','): continue
    if os.path.exists(f'{out}/{cid}.mp3') and not os.environ.get('FORCE'): a_ = None; meta[cid] = -1; continue
    say = txt.replace('HELP', 'help').replace('...', '…')
    a, sr = k.create(say, voice=VR if sp == 'R' else VH, speed=SPR if sp == 'R' else SPH, lang='en-us')
    a = np.asarray(a, dtype=np.float32)
    nz = np.where(np.abs(a) > 0.01)[0]; a = a[max(0, nz[0] - 240):nz[-1] + 1200] if len(nz) else a  # trim silence
    q = np.abs(a) > 0.012; keep = np.ones(len(a), bool); i = 0; mx = int(0.17 * sr)
    while i < len(a):
        if not q[i]:
            j = i
            while j < len(a) and not q[j]: j += 1
            if j - i > mx: keep[i + mx // 2: j - mx // 2] = False
            i = j
        else: i += 1
    a = a[keep]  # tighten the pauses between phrases
    a = a / (np.sqrt(np.mean(a ** 2)) + 1e-9) * 0.12; a = np.clip(a, -0.98, 0.98)
    wav = f'{out}/{cid}.wav'; mp3 = f'{out}/{cid}.mp3'; sf.write(wav, a, sr)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-af', 'highpass=f=280,lowpass=f=3400', '-ac', '1', '-ar', '16000', '-c:a', 'libmp3lame', '-b:a', BR, mp3], check=True)
    n = os.path.getsize(mp3); tot += n; dur += len(a) / sr; meta[cid] = round(len(a) / sr, 2)
print('clips', len(meta), 'seconds', round(dur, 1), 'bytes', tot)
json.dump(meta, open(f'{out}/meta.json', 'w'))
