/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Every line Channel 9 can say must have a voice clip in the voice of whoever says it.
import { openGame, check } from './lib/harness.mjs';

export const name = 'radio: every line is voiced';
const CHECK = String.raw`(()=>{ const miss=[]; let ok=0; const T=(t,who)=>{ if(!t) return; if (voxFor(t,who)) ok++; else miss.push(who+': '+t.slice(0,80)); };
const walk=(v,f)=>{ if (typeof v==='string') f(v); else if (Array.isArray(v)) v.forEach(x=>walk(x,f)); else if (v && typeof v==='object') Object.values(v).forEach(x=>walk(x,f)); };
const both=t=>{ if (t.length>=12 && / /.test(t)) { T(t,'Reyes'); T(t,'Hawk'); } };
for (const k of Object.keys(RADIO)) { if (k==='okHawk'||k==='failHawk') { walk(RADIO[k], t=>T(t,'Hawk')); continue; } if (k==='obj') { for (const [ok_,v] of Object.entries(RADIO.obj)) { if (typeof v==='function') { for (const d of ['east','south-east','south','south-west','west','north-west','north','north-east',null]) { GS.obj={dir:d}; both(v()); } GS.obj=null; } else both(v); } continue; } walk(RADIO[k], both); }
GS.RUN.district='cemetery'; both(RADIO.n1); both(RADIO.last); GS.RUN.district='town';
walk(TIPS, t=>{ if (typeof t==='string') both(t); }); walk(BOSS_RADIO, both);
for (const [w,[who,v]] of Object.entries(STORY)) { const ts = typeof v==='function' ? [v()] : [v]; ts.forEach(t=>T(t,who)); }
for (const d of ['east','south-east','south','south-west','west','north-west','north','north-east']) both('Nine, big group breaking through on your ' + d + ' side. Find a choke point.');
['Hawk here. Relay is strong, I am coming straight in on your signal.','Hawk here. No relay, I am flying blind. Give me time, nine.'].forEach(t=>T(t,'Hawk'));
['We heard. Nothing you could do, nine. Keep moving.','Lost one of yours? Copy. Keep the rest close.','They did not make it. Eyes up, nine.','Hale made it to the trucks. I could kiss you, nine.','Copy, nine. You know the drill. Hold till dawn.','That is the drill, nine. The rest of them heard the shooting. Hold till dawn.'].forEach(both);
for (const f of [0,1,3]) for (const c of [[],['a']]) { GS.RUN.favours=f; GS.RUN.aboard=c; const [who,t]=storyEnd(); T(t,who); }
return {ok, miss}; })()`;
export async function run(b) {
  const { pg, errs, ev } = await openGame(b);
  await ev('GS.meta.tutDone = true; begin(false); 1');
  const r = await ev(CHECK);
  await pg.close();
  check(!r.miss.length, `${r.miss.length} lines without a voice: ` + r.miss.slice(0, 5).join(' | '));
  check(!errs.length, 'page errors: ' + errs.join(' | '));
  return `${r.ok} lines voiced`;
}
