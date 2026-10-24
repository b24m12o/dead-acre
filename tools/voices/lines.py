# Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE.
# every line Channel 9 can say -> (id, speaker R/H, exact text). Story lines keep their speaker; everyday lines get both voices
import json, re, hashlib
A = json.load(open('/tmp/claude-0/tts/all_lines.json'))
DIRS = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east']
story_src = open('/home/claude/rift-ranger.html').read()
i = story_src.index('const STORY = {'); j = story_src.index('\n};', i); story_blk = story_src[i:j]
def story_who(t):
    for line in story_blk.split('\n'):
        if t in line: return 'H' if "['Hawk'" in line else 'R'
    return None
HAWK_ONLY = {'Hawk here. Relay is strong, I am coming straight in on your signal.', 'Hawk here. No relay, I am flying blind. Give me time, nine.'}
src = open('/home/claude/rift-ranger.html').read()
for m in re.finditer(r"okHawk: \{(.*?)\},", src): pass
hk = re.search(r"okHawk: \{(.*?)\},\s*failHawk: \{(.*?)\},", src, re.S); HAWK_ONLY |= set(re.findall(r"'([^']{12,})'", hk.group(1) + hk.group(2)))
lines = []
for a in A:
    t = a['t']
    if a['kind'] == 'tpl' or t in ('Nine, big group breaking through on your', 'side. Find a choke point.'): continue
    if a['from'] == 'STORY': lines.append((story_who(t) or 'R', t)); continue
    if a['from'] == 'storyEnd': lines.append(('H' if t.startswith('Convoy has gone quiet') else 'R', t)); continue
    if t in HAWK_ONLY: lines.append(('H', t)); continue
    lines += [('R', t), ('H', t)]
for d in DIRS + [None]:
    t = f"The truck went over somewhere {'to the ' + d if d else 'out there'}. Look for the smoke. The beacon will not last long."; lines += [('R', t), ('H', t)]
for d in DIRS:
    t = f'Nine, big group breaking through on your {d} side. Find a choke point.'; lines += [('R', t), ('H', t)]
lines.append(('R', 'One got away. Let it go, nine.'))  # also a Reyes line (RADIO.fail.scouts), not only Hawk's
# the ending is assembled from pieces (it changes with how the run went)
for t in ['Nine, it is Reyes. We are over the river, every truck we had left.', 'Hale and her notes made it.', 'Hawk says you are aboard.', 'Bring your people home.', 'Get some sleep.', 'We are across, most of us. Not everyone. You kept that relay alive long enough.', 'Get some sleep, nine.']:
    lines.append(('R', t))
seen = set(); CLIPS = []
for who, t in lines:
    t = t.replace('[static]', '').strip()  # the static is the game's job, not the voice's
    if (who, t) in seen: continue
    seen.add((who, t)); CLIPS.append((who.lower() + hashlib.sha1(t.encode()).hexdigest()[:7], who, t))
if __name__ == '__main__':
    print(len(CLIPS), 'clips', sum(len(c[2]) for c in CLIPS), 'chars', sum(1 for c in CLIPS if c[1] == 'H'), 'Hawk')
