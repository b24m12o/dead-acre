#!/bin/sh
# Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE.
# Fetches the CC0 instrument libraries the soundtrack is built from, only the files build.py uses.
# Partial clones: git downloads a sample the first time it is checked out. Usage: sh tools/music/fetch.sh DIR
D=${1:-/tmp/claude-0/smp}
mkdir -p "$D" && cd "$D" || exit 1
for r in sfzinstruments/karoryfer.emilyguitar sfzinstruments/karoryfer.big-rusty-drums sfzinstruments/karoryfer.black-and-blue-basses sgossner/VSCO-2-CE; do
  n=$(basename $r); [ -d "$n" ] || git clone -q --filter=blob:none --no-checkout https://github.com/$r "$n"
done
pick() { (cd "$1" && git ls-tree -r --name-only HEAD | grep -E "$2" | git -c advice.detachedHead=false checkout HEAD --pathspec-from-file=- 2>&1 | grep -v "^Updated" ); }
pick karoryfer.emilyguitar '^notes/[a-g]b?[2-5]_(f|mf)_rr[123]\.wav$'
pick karoryfer.black-and-blue-basses '^Samples/darkblack/reg/darkblack_[a-g]b?[1-4]_f_rr[12]\.wav$'
pick karoryfer.big-rusty-drums '^Samples/(kick_24/kick/(kick|oh)/k_vl(14|11|8)_rr[123]|snare_14/(rimshot|center)/(top|btm|oh)/sn_(rims|center)_vl[0-9]+_rr[123]|hihat_14/(tc|open)/(cl|oh)/ht_(tc|open)_vl[0-9]+_rr[123]|crash_17/cr/(cl|oh)/cr_vl[345]_rr[12]|tom_(15|18)/center/(cl|oh)/t1[58]_vl[0-9]+_rr[12])\.flac$'
pick VSCO-2-CE '^(Strings/(Cello Section/susvib/susvib_[A-G]#?[0-9]_v1_1|Viola Section/susvib/ViolaEns_susvib_[A-G]#?[0-9]_v1_1|Solo Contrabass/SusVib/[^/]*)|Percussion/Glock/[^/]*|Keys/Upright Nr1/UR1_[CG][1-7]_mf_RR1|Percussion/Timpani/Timpani[0-9]_Hit_v4_rr1_Sum)(\.wav)?$'
du -sh "$D"/*/ 2>/dev/null
