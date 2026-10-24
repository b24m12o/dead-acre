# Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE.
# Step 2 of rebuilding the 3D pictures: packs build/bake/ (from dump.mjs) into one albedo sheet and one height
# sheet (AVIF), puts them in assets/ under names that carry their hash, and updates assets/pack.json to point at
# them. Old sheets are removed. Then npm run build. Needs Python 3 with numpy and Pillow (with AVIF).
import json, base64, glob, os, io, hashlib, numpy as np
from PIL import Image
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
BK, AS = os.path.join(ROOT, 'build', 'bake'), os.path.join(ROOT, 'assets')
QA, QH, SW = 88, 76, 1024  # albedo and height quality, sheet width
parts = {}
for f in sorted(glob.glob(os.path.join(BK, '*.json'))):
    W, H, c, h = json.load(open(f))
    parts[os.path.basename(f)[:-5]] = (W, H, np.frombuffer(base64.b64decode(c), np.uint8).reshape(H, W, 4), np.frombuffer(base64.b64decode(h), np.uint16).reshape(H, W))
# shelf packing, tallest first
pos, x, y, rowh = {}, 0, 0, 0
for n in sorted(parts, key=lambda n: (-parts[n][1], n)):
    W, H = parts[n][:2]
    if x + W > SW: x, y, rowh = 0, y + rowh + 2, 0
    pos[n] = [x, y, W, H]; x += W + 2; rowh = max(rowh, H)
SH = y + rowh
A, Hh = np.zeros((SH, SW, 4), np.uint8), np.zeros((SH, SW), np.uint16)
for n, (px, py, W, H) in pos.items(): A[py:py + H, px:px + W] = parts[n][2]; Hh[py:py + H, px:px + W] = parts[n][3]
def enc(img, q):
    b = io.BytesIO(); img.save(b, format='AVIF', speed=0, quality=q); return b.getvalue()
ab = enc(Image.fromarray(A, 'RGBA'), QA)
hb = enc(Image.fromarray(np.clip(Hh / 65535 * 255 + 0.5, 0, 255).astype(np.uint8), 'L'), QH)
h8 = lambda b: hashlib.sha256(b).hexdigest()[:8]
pk = json.load(open(os.path.join(AS, 'pack.json')))
for k in ('a', 'h'):
    old = os.path.join(AS, pk['bake'][k])
    if os.path.exists(old): os.remove(old)
fa, fh = f'bake_a.{h8(ab)}.avif', f'bake_h.{h8(hb)}.avif'
open(os.path.join(AS, fa), 'wb').write(ab); open(os.path.join(AS, fh), 'wb').write(hb)
pk['bake'] = {'key': open(os.path.join(BK, 'key.txt')).read().strip(), 'hs': 1.0, 'pos': pos, 'a': fa, 'h': fh}
pk['v'] = h8((fa + fh + pk['vox']['file'] + pk['gun']['file']).encode())
open(os.path.join(AS, 'pack.json'), 'w').write(json.dumps(pk, separators=(',', ':')))
print('sheet %dx%d, %d parts, albedo %d B, height %d B, pack %s' % (SW, SH, len(pos), len(ab), len(hb), pk['v']))
