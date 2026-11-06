# Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE.
# Records new Channel 9 lines in Reyes's or Hawk's voice, the same way the rest were made (generate.py), and adds
# them to the voice bundle (assets/vox.<hash>.bin, listed in assets/pack.json). A line that already has a clip in
# that voice is skipped. Run from the repo root with a JSON list of [speaker R or H, exact words on screen]:
#   python3 tools/voices/radio_add.py lines.json
# The radio test (tests/radio.test.mjs) lists any line still without a voice.
import os, sys, json, hashlib, subprocess, tempfile
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
AS = os.path.join(ROOT, 'assets')
KOK = os.environ.get('KOKORO', '/tmp/claude-0/tts')
VOICE = {'R': ('af_heart', 1.14), 'H': ('am_michael', 1.08)}
want = json.load(open(sys.argv[1]))
k = Kokoro(os.path.join(KOK, 'kokoro-v1.0.int8.onnx'), os.path.join(KOK, 'voices-v1.0.bin'))


def record(text, who):
    voice, speed = VOICE[who]
    a, sr = k.create(text.replace('...', '…'), voice=voice, speed=speed, lang='en-us')
    a = np.asarray(a, dtype=np.float32)
    nz = np.where(np.abs(a) > 0.01)[0]
    a = a[max(0, nz[0] - 240):nz[-1] + 1200] if len(nz) else a
    q = np.abs(a) > 0.012
    keep = np.ones(len(a), bool)
    i, mx = 0, int(0.17 * sr)
    while i < len(a):
        if not q[i]:
            j = i
            while j < len(a) and not q[j]:
                j += 1
            if j - i > mx:
                keep[i + mx // 2: j - mx // 2] = False
            i = j
        else:
            i += 1
    a = a[keep]  # the pauses between phrases tightened, as in the rest
    a = np.clip(a / (np.sqrt(np.mean(a ** 2)) + 1e-9) * 0.12, -0.98, 0.98)
    with tempfile.TemporaryDirectory() as d:
        wav, mp3 = os.path.join(d, 'a.wav'), os.path.join(d, 'a.mp3')
        sf.write(wav, a, sr)
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-af', 'highpass=f=280,lowpass=f=3400',
                        '-ac', '1', '-ar', '16000', '-c:a', 'libmp3lame', '-b:a', '24k', mp3], check=True)
        b = open(mp3, 'rb').read()
        dur = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of',
                                             'csv=p=0', mp3]).decode().strip())
    return b, round(dur, 2)


pk = json.load(open(os.path.join(AS, 'pack.json')))
old = open(os.path.join(AS, pk['vox']['file']), 'rb').read()
rows = pk['vox']['list']
blob = bytearray(old)
have = {(r[5], r[1]) for r in rows}
made = 0
for who, text in want:
    if (who, text) in have:
        continue
    b, dur = record(text, who)
    rows.append([who.lower() + hashlib.sha1(text.encode()).hexdigest()[:7], text, dur, len(blob), len(b), who])
    blob += b
    made += 1
    print(who, dur, 's', text[:70])
if made:
    h8 = lambda b: hashlib.sha256(b).hexdigest()[:8]
    fn = f'vox.{h8(bytes(blob))}.bin'
    names = pk['bake']['a'] + pk['bake']['h'] + fn + pk['gun']['file'] + pk['mus']['file']
    open(os.path.join(AS, fn), 'wb').write(bytes(blob))
    if fn != pk['vox']['file']:
        os.remove(os.path.join(AS, pk['vox']['file']))
    pk['vox'] = {'file': fn, 'list': rows}
    pk['v'] = h8(names.encode())
    open(os.path.join(AS, 'pack.json'), 'w').write(json.dumps(pk, separators=(',', ':')))
print('radio lines added', made)
