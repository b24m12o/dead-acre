# Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE.
# packs every generated Channel 9 clip into the game's VOX table: [id, exact words, seconds, mp3, speaker]
import sys, os, json, base64, subprocess
sys.path.insert(0, '/tmp/claude-0/tts'); from clips_all import CLIPS
OUT = '/tmp/claude-0/tts/out_all'; rows = []; miss = []
for cid, who, txt in CLIPS:
    f = f'{OUT}/{cid}.mp3'
    if not os.path.exists(f): miss.append(cid); continue
    d = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).decode().strip())
    rows.append([cid, txt, round(d, 2), base64.b64encode(open(f, 'rb').read()).decode(), who])
if miss: print('MISSING', len(miss), miss[:10]); sys.exit(1)
js = 'let VOX = ' + json.dumps(rows, separators=(',', ':')) + '; /* Channel 9 voices for every line: [id, the exact words on screen, seconds, mp3, speaker R/H]. Everyday lines exist in both voices, since Hawk takes the channel on nights 11 and 12; lines are matched piece by piece, longest first */'
p = '/home/claude/rift-ranger.html'; s = open(p).read()
import re
s, k = re.subn(r'^let VOX = .*$', lambda _: js, s, count=1, flags=re.M); assert k == 1
open(p, 'w').write(s); print('VOX', len(rows), 'clips', sum(r[2] for r in rows), 's', len(js), 'chars')
