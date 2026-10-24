# Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE.
# builds the CDN asset pack from the full (everything-embedded) build: pack.json + atlas pictures + one voice bundle
import re, json, base64, hashlib, os, sys
SRC = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/rift-ranger.html'
OUT = sys.argv[2] if len(sys.argv) > 2 else '/home/claude/assets'
s = open(SRC).read()
bake = json.loads(re.search(r'^let BAKE_IMG = (\{.*?\}); //', s, re.M).group(1))
vox = json.loads(re.search(r'^let VOX = (\[.*?\]); /\*', s, re.M).group(1))
gun = json.loads(re.search(r'^let GUNHD = (\[.*?\]); /\*', s, re.M).group(1))
os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT):
    if f != '.git' and not f.startswith('README') and os.path.isfile(os.path.join(OUT, f)): os.remove(os.path.join(OUT, f))
h8 = lambda b: hashlib.sha256(b).hexdigest()[:8]
def put(name, ext, b):
    fn = f'{name}.{h8(b)}.{ext}'; open(os.path.join(OUT, fn), 'wb').write(b); return fn
uri = lambda u: base64.b64decode(u.split(',', 1)[1])
fa = put('bake_a', 'avif', uri(bake['a'])); fh = put('bake_h', 'avif', uri(bake['h']))
blob = bytearray(); lst = []
for row in vox:
    cid, txt, dur, b64 = row[:4]; who = row[4] if len(row) > 4 else 'R'
    b = base64.b64decode(b64); lst.append([cid, txt, dur, len(blob), len(b), who]); blob += b
fv = put('vox', 'bin', bytes(blob))
gblob = bytearray(); glst = []
for nm, b64 in gun:
    b = base64.b64decode(b64); glst.append([nm, len(gblob), len(b)]); gblob += b
fg = put('gun', 'bin', bytes(gblob))
v = h8((fa + fh + fv + fg).encode())
pack = {'v': v, 'bake': {'key': bake['key'], 'hs': bake['hs'], 'pos': bake['pos'], 'a': fa, 'h': fh}, 'vox': {'file': fv, 'list': lst}, 'gun': {'file': fg, 'list': glst}}
open(os.path.join(OUT, 'pack.json'), 'w').write(json.dumps(pack, separators=(',', ':')))
tot = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT) if f != '.git')
print('pack', v, 'files', sorted(f for f in os.listdir(OUT) if f != '.git'), 'bytes', tot)
