/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The infected as 3D shapes: bodies (standing, face down, face up), heads, limbs, and the special kinds. Each group is SDF code (map: the shape, alb: its colours) that tools/bake renders into
// the pictures the game ships; dist leaves the code out (see tools/lib/source.mjs).
import { bakeGroup, bakePart } from '../bake.js';
export function shapeInfected() {
  bakeGroup(
    'zt',
    `
  const float ZD=9.5, ZW=15.5;
  float body(vec3 p){
    float d=sdEll(p,vec3(-0.9,0.0,0.0),vec3(8.4,13.2,7.0));
    d=smin(d,sdCap(p,vec3(0.6,-11.4,3.4),vec3(0.6,11.4,3.4),4.3,4.3),3.2);
    d=smin(d,sdSph(p,vec3(0.9,-12.7,3.2),4.2),1.6); d=smin(d,sdSph(p,vec3(0.9,12.7,3.2),4.2),1.6);
    d=smin(d,sdEll(p,vec3(1.4,0.0,6.0),vec3(5.2,7.6,3.4)),2.4);
    d=smin(d,sdCap(p,vec3(3.3,0.0,6.0),vec3(3.6,0.0,10.2),3.0,2.7),1.4);
    return d;
  }
  float relief(vec3 p){ // folds, the spine groove, the shoulder blades: only on the upper surface so the outline stays clean
    float top=clamp((p.z-1.5)/4.0,0.0,1.0);
    float fold=(sin(p.y*1.15+sin(p.x*0.7)*1.6)*0.5+sin(p.y*0.55-p.x*0.9)*0.35)*0.55*(1.0-exp(-abs(p.y)*0.25));
    float spine=p.x<1.0?exp(-p.y*p.y/3.0)*0.5*min(1.0,(1.0-p.x)/4.0):0.0;
    float blades=p.x<0.0?exp(-pow(abs(p.y)-5.2,2.0)/2.5)*exp(-pow(p.x+3.5,2.0)/6.0)*-0.45:0.0;
    return (fold-spine-blades+(fbm(p.xy*0.6+uSeed)-0.5)*0.3)*top;
  }
  float lyBack(vec3 p){ /* a body lying face down, seen from above: x runs from the waist (-23) to the top of the shoulders (+25), y across, z up out of the back */
    float d=sdEll(p,vec3(5.0,0.0,3.4),vec3(14.5,14.2,6.0));
    d=smin(d,sdEll(p,vec3(-12.5,0.0,2.7),vec3(12.0,12.0,4.7)),6.0);
    d=smin(d,sdCap(p,vec3(15.6,-12.2,3.1),vec3(15.6,12.2,3.1),4.7,4.7),4.0);
    d=smin(d,sdSph(p,vec3(14.6,-14.8,2.7),4.5),2.0); d=smin(d,sdSph(p,vec3(14.6,14.8,2.7),4.5),2.0);
    d=smin(d,sdCap(p,vec3(18.5,0.0,4.0),vec3(25.0,0.0,3.3),3.5,3.2),2.2);
    return d;
  }
  float lyRelief(vec3 p){ /* the spine, the shoulder blades and cloth creased where the body met the ground */
    float top=clamp((p.z-1.2)/3.0,0.0,1.0);
    float spine=exp(-p.y*p.y/2.6)*0.55*smoothstep(17.0,12.0,p.x)*smoothstep(-24.0,-18.0,p.x);
    float blades=exp(-pow(abs(p.y)-6.2,2.0)/5.0)*exp(-pow(p.x-8.0,2.0)/16.0)*0.7;
    float creas=sin(p.x*0.85+sin(p.y*0.45)*2.2)*0.32*smoothstep(-2.0,-14.0,p.x)+sin(p.y*1.3+p.x*0.3)*0.18*smoothstep(9.0,14.0,abs(p.y));
    return (blades-spine+creas+(fbm(p.xy*0.55+uSeed)-0.5)*0.35)*top;
  }
  float lyHip(vec3 p){ /* the seat of the trousers: belt at +11, thighs leave at -12 */
    float d=sdEll(p,vec3(3.0,0.0,2.4),vec3(10.5,11.6,4.2));
    d=smin(d,sdEll(p,vec3(-2.5,-5.6,3.0),vec3(8.4,6.3,4.4)),3.0); d=smin(d,sdEll(p,vec3(-2.5,5.6,3.0),vec3(8.4,6.3,4.4)),3.0);
    d=smin(d,sdCap(p,vec3(-4.0,-6.0,2.6),vec3(-14.0,-6.4,2.6),5.6,5.6),3.0); d=smin(d,sdCap(p,vec3(-4.0,6.0,2.6),vec3(-14.0,6.4,2.6),5.6,5.6),3.0);
    float cleft=exp(-p.y*p.y/1.1)*smoothstep(4.0,-2.0,p.x)*0.7;
    float belt=step(8.6,p.x)*step(p.x,12.4)*0.28;
    vec2 pk=vec2(p.x+2.0,abs(p.y)-5.8); float pocket=(1.0-smoothstep(0.0,0.4,max(abs(pk.x)-3.4,abs(pk.y)-2.9)))*0.16;
    return d+cleft-belt-pocket-(sin(p.y*1.6+p.x*0.5)*0.12)*smoothstep(5.0,9.0,p.x);
  }
  float lyLeg(vec3 p){ /* one trouser leg lying flat: hip end at +22, ankle at -22 */
    float d=sdCap(p,vec3(17.0,0.0,3.3),vec3(2.0,0.0,2.7),6.2,4.9);
    d=smin(d,sdCap(p,vec3(2.0,0.0,2.7),vec3(-11.0,0.0,2.6),4.9,4.9),2.0);
    d=smin(d,sdCap(p,vec3(-11.0,0.0,2.6),vec3(-20.5,0.0,2.2),4.9,3.9),2.0);
    d=smin(d,sdCap(p,vec3(-19.0,0.0,2.2),vec3(-22.5,0.0,2.1),4.3,4.3),1.0);
    float knee=exp(-pow(p.x-1.5,2.0)/1.6)*0.45; float folds=sin(p.x*1.25+p.y*0.6)*0.22*(smoothstep(8.0,1.0,abs(p.x-1.5))+smoothstep(-13.0,-20.0,p.x));
    return d+knee-folds;
  }
  float lyChest(vec3 p){ /* a body lying on its back, seen from above: x runs from the waist (-23) to the top of the shoulders (+25); the chest, the belly, the throat */
    float d=sdEll(p,vec3(6.0,0.0,3.6),vec3(14.2,14.0,6.2));
    d=smin(d,sdEll(p,vec3(-11.5,0.0,3.1),vec3(12.4,12.2,5.4)),6.0);
    d=smin(d,sdCap(p,vec3(15.0,-12.4,3.0),vec3(15.0,12.4,3.0),4.6,4.6),4.0);
    d=smin(d,sdSph(p,vec3(14.0,-14.8,2.6),4.4),2.0); d=smin(d,sdSph(p,vec3(14.0,14.8,2.6),4.4),2.0);
    d=smin(d,sdCap(p,vec3(18.5,0.0,3.7),vec3(25.0,0.0,3.1),3.4,3.1),2.2);
    return d;
  }
  float lyFront(vec3 p){ /* chest muscle under the cloth, the breastbone, the collar, cloth creased across the belly */
    float top=clamp((p.z-1.2)/3.0,0.0,1.0);
    float pecs=exp(-pow(abs(p.y)-5.6,2.0)/14.0)*exp(-pow(p.x-9.0,2.0)/22.0)*0.6;
    float sternum=-exp(-p.y*p.y/1.6)*0.32*smoothstep(1.0,6.0,p.x)*smoothstep(17.0,13.0,p.x);
    float creas=sin(p.x*0.72+sin(p.y*0.5)*2.0)*0.28*smoothstep(2.0,-12.0,p.x)+sin(p.y*1.2-p.x*0.25)*0.16*smoothstep(9.0,14.0,abs(p.y));
    float collar=exp(-pow(p.x-18.2,2.0)/1.3)*0.42*smoothstep(8.5,3.0,abs(p.y));
    return (pecs+sternum+creas+collar+(fbm(p.xy*0.55+uSeed)-0.5)*0.35)*top;
  }
  float lyHipF(vec3 p){ /* the front of the trousers: belt and buckle at +11, the fly, the front pockets; the thighs leave at -12 */
    float d=sdEll(p,vec3(3.0,0.0,2.6),vec3(10.5,11.8,4.4));
    d=smin(d,sdEll(p,vec3(-2.5,-5.6,3.0),vec3(8.4,6.3,4.4)),3.0); d=smin(d,sdEll(p,vec3(-2.5,5.6,3.0),vec3(8.4,6.3,4.4)),3.0);
    d=smin(d,sdCap(p,vec3(-4.0,-6.0,2.6),vec3(-14.0,-6.4,2.6),5.6,5.6),3.0); d=smin(d,sdCap(p,vec3(-4.0,6.0,2.6),vec3(-14.0,6.4,2.6),5.6,5.6),3.0);
    float fly=exp(-p.y*p.y/0.5)*smoothstep(-1.0,3.0,p.x)*step(p.x,8.6)*0.22;
    float belt=step(8.6,p.x)*step(p.x,12.4)*0.28, buckle=(1.0-smoothstep(0.0,0.3,max(abs(p.x-10.5)-1.7,abs(p.y)-2.2)))*0.45;
    float pocket=exp(-pow((p.x-4.0)-(abs(p.y)-7.0)*0.9,2.0)/0.4)*step(abs(p.y),10.0)*step(5.0,abs(p.y))*0.18;
    return d-belt-buckle+fly+pocket-(sin(p.y*1.6+p.x*0.5)*0.12)*smoothstep(5.0,9.0,p.x);
  }
  float lyMap(vec3 p){
    float d;
    if(uPart==60) d=lyHip(p);
    else if(uPart==61) d=lyLeg(p);
    else if(uPart==62) d=lyHipF(p);
    else if(uPart>=70){ vec3 q=p; int k=uPart-70; d=lyChest(q); /* the same people lying on their backs */
      if(k==14) d-=0.8+0.45*abs(sin(q.x*0.95));
      if(k==17) d-=0.12*sin(q.y*3.6);
      if(k==18) d=smin(d,sdEll(q,vec3(13.0,0.0,5.4),vec3(9.0,16.0,3.4))-0.2,1.6);
      if(k==3||k==8){ float m=(1.0-smoothstep(12.0,13.4,abs(q.y)))*smoothstep(-22.0,-20.0,q.x)*(1.0-smoothstep(15.0,16.6,q.x)); d-=0.55*m; }
      if(k==5) d-=0.5;
      d=d-lyFront(q);
    }
    else {
      float S=uPart==49?1.7:1.0; vec3 q=p/S;
      d=lyBack(q);
      int k=uPart-30;
      if(k==12) d=smin(d,sdEll(q,vec3(15.5,0.0,6.6),vec3(7.0,8.4,2.6)),2.4);
      if(k==14) d-=0.8+0.45*abs(sin(q.x*0.95));
      if(k==17) d-=0.12*sin(q.y*3.6);
      if(k==18) d=smin(d,sdEll(q,vec3(13.0,0.0,5.4),vec3(9.0,16.0,3.4))-0.2,1.6);
      if(k==3||k==8){ float m=(1.0-smoothstep(12.0,13.4,abs(q.y)))*smoothstep(-22.0,-20.0,q.x)*(1.0-smoothstep(15.0,16.6,q.x)); d-=0.55*m; }
      if(k==5) d-=0.5;
      if(k==20) d-=0.9*smoothstep(0.6,0.75,fbm(q.xy*0.42+3.1))+0.6;
      if(k==21){ d+=0.7; d+=0.5*smoothstep(0.3,0.9,sin(q.x*1.35))*smoothstep(4.0,9.0,abs(q.y))*smoothstep(-6.0,2.0,q.x)*smoothstep(16.0,10.0,q.x); }
      d=(d-lyRelief(q))*S;
    }
    return max(d,-p.z);
  }
  float map(vec3 p){
    if(uPart>=30) return lyMap(p);
    float d=body(p);
    if(uPart==12) d=smin(d,sdEll(p,vec3(-1.6,0.0,8.4),vec3(6.2,8.0,2.6)),2.0); // the hood bunched on the back
    if(uPart==14) d-=0.75+0.42*abs(sin(p.x*0.95)); // a puffer: fat baffles round the body
    if(uPart==17) d-=0.12*sin(p.y*3.6);             // knit ribs
    if(uPart==18) d=smin(d,sdEll(p,vec3(-0.6,0.0,4.2),vec3(8.6,15.6,4.4))-0.2,1.4); // the shawl over the shoulders
    if(uPart==3||uPart==8){ float m=smoothstep(2.0,3.4,abs(p.y))*(1.0-smoothstep(13.0,14.6,abs(p.y)))*(1.0-smoothstep(6.0,7.6,p.x)); d-=0.55*m; } // vest panels: a layer standing a little off the shirt
    if(uPart==5) d-=0.45; // a heavy turnout coat stands off the body
    return d-relief(p);
  }
  vec3 weave(vec3 c, vec3 p, float k){ float w=0.5+0.5*sin(p.x*11.0)*sin(p.y*11.0); return c*(1.0-k*0.5+k*w)*(0.86+0.28*fbm(p.xy*0.9+uSeed)); }
  vec3 grime(vec3 c, vec3 p, float amt){ float g=fbm(p.xy*0.32+vec2(7.0,3.0)+uSeed); return mix(c,vec3(0.24,0.18,0.13),clamp((g-0.52)*amt,0.0,0.75)); }
  vec3 blood(vec3 c, vec3 p, float amt){ float b=fbm(p.xy*0.45+vec2(-4.0,9.0)+uSeed*1.7); float m=clamp((b-0.62)*amt,0.0,1.0); return mix(c,mix(vec3(0.36,0.04,0.035),vec3(0.2,0.03,0.025),fbm(p.xy*2.0)),m); }
  vec3 skin(vec3 p){ vec3 c=hx(0x86907a)*(0.85+0.3*fbm(p.xy*1.4+uSeed)); float v=abs(sin(p.x*1.3+fbm(p.xy*0.8)*5.0+p.y*0.4)); return mix(c,hx(0x4e6a3a),smoothstep(0.96,1.0,v)*0.5); }
  vec3 plaid(vec3 base, vec3 band, vec3 line, vec3 p){ vec2 m=mod(p.xy+20.0+vec2(sin(p.y*0.3),sin(p.x*0.3))*0.6,7.0); vec3 c=base; if(m.y<3.0) c=mix(c,band,0.42); if(m.x<3.0) c=mix(c,band,0.36); if(abs(m.y-5.3)<0.25||abs(m.x-5.3)<0.25) c=mix(c,line,0.32); return c; } // a worn flannel check: faded, wavering where the cloth bunches
  vec3 pants(vec3 p){ /* neutral trouser cloth, tinted per zombie in the game: twill, seams, a dark belt */
    vec3 c=vec3(0.82,0.82,0.84)*(0.9+0.2*fbm(p.xy*0.8+uSeed));
    c*=0.93+0.07*sin((p.x+p.y)*4.2);
    if(uPart==62){ if(p.x>8.6&&p.x<12.4) c=vec3(0.3,0.22,0.16)*(0.85+0.3*fbm(p.xy*2.0)); if(abs(p.x-10.5)<1.7&&abs(p.y)<2.2) c=abs(p.x-10.5)<1.1&&abs(p.y)<1.6?vec3(0.4,0.38,0.33):vec3(0.62,0.6,0.52); if(abs(p.y)<0.28&&p.x<8.6&&p.x>-1.0) c*=0.72; float pk=abs((p.x-4.0)-(abs(p.y)-7.0)*0.9); if(pk<0.3&&abs(p.y)>5.0&&abs(p.y)<10.0) c*=0.8; }
    else if(uPart==60){ if(p.x>8.6&&p.x<12.4) c=vec3(0.3,0.22,0.16)*(0.85+0.3*fbm(p.xy*2.0)); if(p.x>8.6&&p.x<12.4&&abs(p.y)<1.6) c=vec3(0.5,0.46,0.4); vec2 pk=vec2(p.x+2.0,abs(p.y)-5.8); if(abs(max(abs(pk.x)-3.4,abs(pk.y)-2.9))<0.22) c*=1.12; if(abs(p.y)<0.25&&p.x<8.6) c*=0.72; }
    else { if(abs(p.y)>3.6) c*=0.82; if(p.x<-19.0) c*=0.86; if(abs(p.x-1.5)<1.2) c*=0.9; }
    return c;
  }
  vec3 lyAlb(vec3 p, vec3 n){
    vec3 c;
    if(uPart>=60&&uPart<70){ c=pants(p); c=grime(c,p,2.2); c=blood(c,p,2.4); c*=mix(0.6,1.0,smoothstep(0.0,2.4,p.z)); return c; }
    bool fr=uPart>=70; int k=fr?uPart-70:uPart-30; float S=k==19?1.7:1.0; vec3 q=p/S; float v=q.x, u=q.y, au=abs(u); bool cl=true;
    if(v>20.5&&au<3.9) return mix(hx(0x7e886e),hx(0x4a2420),0.45);
    if(k==0){ c=hx(0x56687a); if(abs(v-12.0)<0.3) c*=0.7; if(v>18.0&&au<7.0) c=hx(0x323e4a); }
    else if(k==1){ c=plaid(hx(0x34505a),hx(0x141e24),hx(0xb8c2ae),vec3(q.y,q.x,q.z)); if(v>18.5&&au<7.0) c=hx(0x243a42); }
    else if(k==2){ c=hx(0x948c74); if(abs(v-11.0)<0.35) c*=0.72; if(au<0.4&&v<11.0) c*=0.82; if(v>18.0&&au<7.0) c=hx(0x6a644e); }
    else if(k==3){ c=hx(0x24304a); if(au<12.6&&v>-21.0&&v<15.5){ c=hx(0x18202e); if(abs(v-6.5)<1.9&&au<8.4&&fract((u+8.4)*0.4)<0.64) c=hx(0xc9c6b6); } }
    else if(k==4){ c=hx(0x5a9a90); if(abs(v-13.0)<0.3) c*=0.75; if(v<-19.5) c*=0.84; }
    else if(k==5){ c=hx(0x8a6a38); float b=min(abs(v+15.0),abs(v-6.0)); if(b<1.9) c=b<0.65?hx(0xd8d8d0):hx(0xc8c048); if(abs(v-14.0)<1.8&&au<9.0&&fract((u+9.0)*0.36)<0.62) c=hx(0xc8c048); if(v>18.5&&au<8.0) c=hx(0x5a4424); }
    else if(k==6){ c=hx(0xe8701c); if(au>12.8&&v>9.0) c=hx(0x5a5a5c); if(abs(au-6.4)<0.95&&v>-13.0) c=hx(0xd8d8cc); if(abs(v+13.0)<0.95) c=hx(0xd8d8cc); }
    else if(k==7){ c=hx(0x3e5068); if(au<0.35&&v<-8.0) c*=0.6; if(abs(v-12.5)<0.25) c*=0.85; if(v>19.0&&au<6.0) c=hx(0xd6cbb0)*(0.85+0.3*fbm(q.xy*3.0)); }
    else if(k==8){ c=hx(0x1c1a1a); if(au<2.5) c=hx(0xc4c0b4); vec2 g=vec2(v-4.0,u); if(length(g)<4.2) c=hx(0x6a1e1a); if(abs(length(g)-7.8)<0.7&&g.x>-2.0) c=hx(0xd8d0c0); }
    else if(k==9){ c=hx(0x1f1f24); if(au<0.3&&v<-10.0) c*=1.5; if(v>19.5&&au<5.0) c=hx(0xe0ddd4); }
    else if(k==10){ c=hx(0xb8b0a0); if(v>18.5&&au<5.5) c=hx(0xece8de); c=grime(c,q,2.2); }
    else if(k==11){ c=hx(0x4c5a3e); if(abs(v-12.0)<0.3) c*=0.7; }
    else if(k==12){ c=hx(0x4a4c52); float hd=length(vec2((v-15.5)/7.0,u/8.4)); if(hd<1.0) c=hd<0.55?hx(0x232428):hx(0x3c3e44); if(v<-19.0) c*=0.8; }
    else if(k==13){ c=hx(0x56708e); if(abs(v-11.0)<0.3||(abs(au-6.0)<0.25&&v<11.0)) c*=0.62; if((abs(v-11.7)<0.14||(abs(au-6.7)<0.14&&v<11.0))&&fract((u+v)*0.7)<0.5) c=hx(0xd68c3c); if(v<-19.5) c*=0.8; if(v>18.5&&au<8.0) c=hx(0x7a5a3a)*(0.85+0.15*sin(u*3.0)); }
    else if(k==14){ c=hx(0x5e2a2c)*(0.8+0.4*abs(sin(q.x*0.95))); if(v>19.0&&au<6.0) c=hx(0x2c2c30); }
    else if(k==15){ c=hx(0x9caec4); float op=2.4+max(0.0,-v)*0.12; if(au<op&&v<17.0){ c=skin(q); cl=false; } if(abs(au-op)<0.55&&fract(v*0.11)<0.2&&v<17.0) c=hx(0xe6e8ec); if(v>18.5&&au<6.0) c=hx(0xe6e8ec); }
    else if(k==16){ if(au<(v>5.0?6.6:12.6)) c=hx(0xb4ae9c); else { c=skin(q); cl=false; } }
    else if(k==17){ c=hx(0x7a6a56)*(0.92+0.08*sin(u*3.6)); if(v<-19.0) c=hx(0x5e5040); }
    else if(k==18){ c=hx(0x2a2430); if(v>6.0+sin(u*0.5)*1.5) c=hx(0x5c5662)*(0.88+0.24*fbm(q.xy*2.5)); }
    else if(k==19){ c=plaid(hx(0x5a3a26),hx(0x2a1a12),hx(0xb08c5a),vec3(q.y,q.x,q.z)); if(fbm(q.xy*0.3+5.0)>0.64){ c=hx(0x70685a)*(0.85+0.3*fbm(q.xy*1.3)); cl=false; } }
    else if(k==20){ c=mix(hx(0x7c8a5e),hx(0x5a6a3c),fbm(q.xy*0.7)); float bo=smoothstep(0.6,0.75,fbm(q.xy*0.42+3.1)); c=mix(c,hx(0xc8b86a),bo*0.7); cl=false; }
    else { c=hx(0x9a94a0)*(0.85+0.25*fbm(q.xy*1.1)); c*=1.0-0.28*smoothstep(0.3,0.9,sin(q.x*1.35))*smoothstep(4.0,9.0,au)*smoothstep(-6.0,2.0,v)*smoothstep(16.0,10.0,v); if(fbm(q.xy*0.5+8.0)>0.6&&v<2.0){ c=hx(0x3a3430)*(0.8+0.4*fbm(q.xy*2.0)); } cl=false; }
    if(fr){ /* the front of the same clothes: the throat bare in the open collar, a button placket or a zip down the middle */
      if(v>16.0&&au<2.2+(v-16.0)*0.75&&k!=12&&k!=18){ c=skin(q); cl=false; }
      else if((k==0||k==1||k==2||k==7||k==13||k==17)&&v<16.0&&v>-21.0){ if(au<0.45) c*=0.78; if(au<0.75&&fract(v*0.3)<0.16) c=mix(c,hx(0xd8d4c8),0.7); }
      else if((k==4||k==6||k==9||k==11||k==14)&&au<0.35&&v<17.0) c=mix(c,hx(0x2a2a2a),0.6); }
    if(cl) c=weave(c,vec3(q.y,q.x,q.z),k==1||k==13||k==7?0.12:0.08);
    c=grime(c,q,2.0); c=blood(c,q,4.2);
    c*=mix(0.62,1.0,smoothstep(0.0,2.6,q.z)); /* the cloth darkens where it touches the ground */
    return c;
  }
  vec3 alb(vec3 p, vec3 n){
    if(uPart>=30) return lyAlb(p,n);
    float r=length(p.xy-vec2(3.4,0.0));
    if(r<2.7&&p.z>8.0) return mix(hx(0x7e886e),hx(0x4a2420),smoothstep(2.7,0.0,r)*0.55); // the neck stump under the head
    vec3 c=vec3(0.5); bool cl=true;
    int k=uPart;
    if(k==0){ c=hx(0x56687a); if(abs(p.y)<ZW*0.2) c*=1.08; if(r<4.6) c=hx(0x323e4a); }
    else if(k==1){ c=plaid(hx(0x34505a),hx(0x141e24),hx(0xb8c2ae),p); if(r<5.0) c=hx(0x243a42); }
    else if(k==2){ c=hx(0x948c74); if(abs(abs(p.y)-ZW*0.32)<0.35) c*=0.7; if(r<4.6) c=hx(0x6a644e); }
    else if(k==3){ c=hx(0x24304a); if(abs(p.y)>5.0&&abs(p.y)<13.4&&p.x<7.0) c=hx(0x18202e); vec2 b=p.xy-vec2(ZD*0.62,-ZW*0.38); if(length(b)<2.0) c=hx(0xc8b468); if(abs(p.x-ZD*0.3)<1.4&&abs(p.y-ZW*0.44)<1.4) c=hx(0x121212); if(r<4.8) c=hx(0x1a2232); }
    else if(k==4){ c=hx(0x5a9a90); if(abs(abs(p.y)-(ZD*0.95-p.x)*1.3)<0.45&&p.x>4.5) c*=0.6; if(abs(p.x-ZD*0.55)<1.1&&abs(p.y+ZW*0.5)<1.6) c=hx(0xe8e4dc); }
    else if(k==5){ c=hx(0x8a6a38); float bx=min(abs(p.x+ZD*0.62),abs(p.x-ZD*0.58)); if(bx<1.8) c=bx<0.6?hx(0xd8d8d0):hx(0xc8c048); if(r<5.6) c=hx(0x5a4424); }
    else if(k==6){ c=hx(0x5a5a5c); if(abs(p.y)>ZW*0.2&&abs(p.y)<ZW*0.72) c=hx(0xe8701c); if(abs(abs(p.y)-ZW*0.45)<0.9) c=hx(0xd8d8cc); if(p.x<-ZD*0.0&&abs(p.y)<ZW*0.2) c=hx(0xe8701c); }
    else if(k==7){ c=hx(0x3e5068); if(abs(abs(p.y)-ZW*0.52)<0.25) c=mix(c,hx(0xdcc896),0.4); if(r<5.8){ c=hx(0xd6cbb0)*(0.85+0.3*fbm(p.xy*3.0)); } }
    else if(k==8){ c=hx(0xc4c0b4); if(abs(p.y)>2.5&&abs(p.y)<ZW*0.86&&p.x<ZD*0.75) c=hx(0x1c1a1a); vec2 q=p.xy-vec2(-ZD*0.45,0.0); if(length(q)<3.6) c=hx(0x6a1e1a); if(abs(length(q)-7.5)<0.7&&q.x<0.0) c=hx(0xd8d0c0); }
    else if(k==9){ c=hx(0x1f1f24); if(p.x>3.0&&abs(p.y)<(p.x-3.0)*0.55) c=hx(0xe0ddd4); if(p.x>4.4&&abs(p.y)<(p.x-4.4)*0.2+0.3) c=hx(0x121214); if(abs(abs(p.y)-(ZD-p.x)*0.55-3.4)<0.3&&p.x>0.0) c*=1.6; }
    else if(k==10){ c=hx(0xb8b0a0); if(abs(r-5.0)<1.0) c=hx(0xece8de)*(0.9+0.2*sin(atan(p.y,p.x-3.4)*12.0)); c=grime(c,p,2.2); }
    else if(k==11){ c=hx(0x4c5a3e); if(abs(p.y)<0.25&&p.x>ZD*0.2) c*=0.5; if(abs(p.x-ZD*0.4)<1.3&&abs(p.y+ZW*0.55)<2.2) c=hx(0xd8d4c4); }
    else if(k==12){ c=hx(0x4a4c52); float hd=length((p.xy-vec2(-1.6,0.0))/vec2(6.2,8.0)); if(hd<1.0&&p.z>8.0) c=hd<0.62?hx(0x232428):hx(0x3c3e44); if(p.x>ZD*0.6&&abs(abs(p.y)-2.5)<0.3) c=hx(0xd8d4cc); }
    else if(k==13){ c=hx(0x56708e); if(abs(p.x+ZD*0.25+abs(p.y)*0.02)<0.35) c*=0.62; if(abs(p.x+ZD*0.45)<0.15&&fract(p.y*0.7)<0.5) c=hx(0xd68c3c); if(r<5.6) c=hx(0x7a5a3a)*(0.85+0.15*sin(atan(p.y,p.x-3.4)*20.0)); }
    else if(k==14){ c=hx(0x5e2a2c); c*=0.8+0.4*abs(sin(p.x*0.95)); if(r<5.0) c=hx(0x2c2c30); }
    else if(k==15){ c=hx(0x9caec4); if(abs(abs(p.y)-ZW*0.76)<0.25) c*=0.75; c=mix(c,hx(0x8a8050),clamp((0.6-length((p.xy-vec2(-ZD*0.3,0.0))/vec2(4.5,7.0)))*0.6,0.0,0.4)); if(r<4.4) c=hx(0xe6e8ec); if(p.x>ZD*0.62&&abs(p.y)<1.3+(p.x-ZD*0.62)*0.15) c=hx(0x5a1a20); }
    else if(k==16){ float t=abs(p.y)-(ZW*0.5+(p.x<ZD*0.5?0.0:1.0)); if(t<0.0&&p.x<ZD*0.5+abs(p.y)*0.05) c=hx(0xb4ae9c); else { c=skin(p); cl=false; } }
    else if(k==17){ c=hx(0x7a6a56); if(abs(p.x-ZD*0.62)<1.2) c=hx(0x5e5040); for(int i=0;i<4;i++){ float yy=-ZW*0.6+float(i)*ZW*0.4; if(length(p.xy-vec2(ZD*0.68,yy))<0.75) c=hx(0xd8ccb0); } }
    else if(k==18){ c=hx(0x2a2430); if(p.z>6.0||abs(p.y)>ZW*0.4) c=hx(0x5c5662)*(0.88+0.24*fbm(p.xy*2.5)); if(p.x<-ZD-0.5&&abs(p.y)<ZW*0.32) c=hx(0x5c5662); }
    if(cl) c=weave(c,p,k==1||k==13||k==7?0.12:0.08);
    c=grime(c,p,1.6); c=blood(c,p,3.2);
    return c;
  }`
  );
  for (let v = 0; v <= 18; v++) bakePart('z_torso' + v, 'zt', v, 14, v * 3.7 + 1);
  for (let v = 0; v <= 21; v++) bakePart('z_ly' + v, 'zt', 30 + v, v === 19 ? 22 : 13, v * 5.3 + 2); // the same people lying face down
  for (let v = 0; v <= 18; v++) bakePart('z_lu' + v, 'zt', 70 + v, 13, v * 5.3 + 2); // and on their backs
  bakePart('z_lhip', 'zt', 60, 9, 4.2);
  bakePart('z_lleg', 'zt', 61, 9, 7.7);
  bakePart('z_lhipu', 'zt', 62, 9, 4.2);
  bakeGroup(
    'zh',
    `
  int gPart;
  float skull(vec3 p){
    float d=sdEll(p,vec3(-0.4,0.0,0.0),vec3(6.8,5.7,6.0));
    d=smin(d,sdEll(p,vec3(4.1,0.0,-1.4),vec3(3.1,4.3,4.1)),1.6);           // brow, cheeks and jaw at the front
    d=smin(d,sdEll(p,vec3(6.9,0.0,-0.7),vec3(1.5,0.9,1.3)),0.6);           // the nose
    d=smin(d,sdEll(p,vec3(0.2,5.8,-0.6),vec3(1.5,0.8,2.0)),0.4); d=smin(d,sdEll(p,vec3(0.2,-5.8,-0.6),vec3(1.5,0.8,2.0)),0.4); // ears
    return d;
  }
  float hairCap(vec3 p, float vol, float line, float rough){ float h=sdEll(p,vec3(-1.0,0.0,0.4),vec3(6.8+vol,5.95+vol*0.8,6.2+vol))-(fbm(p.xy*1.4+uSeed)-0.5)*rough; return smax(h,p.x-line-fbm(p.yz*0.8)*0.8,0.6); }
  float map0(vec3 p){
    float d=skull(p); int k=gPart;
    if(k==0) d=min(d,hairCap(p,0.35,3.4,0.9));
    else if(k==1) d=min(d,smax(hairCap(p,0.1,1.0,0.5),3.0-abs(p.y)+p.x*0.2,0.5));
    else if(k==2) d=min(d,hairCap(p,0.55,3.9,0.7));
    else if(k==3){ d=min(d,sdEll(p,vec3(-0.6,0.0,3.6),vec3(7.4,7.0,3.0))); d=min(d,smax(sdEll(p,vec3(5.2,0.0,2.8),vec3(5.0,5.0,0.4)),4.0-p.x,0.5)); } // the crown and a curved peak
    else if(k==4){ d=min(d,hairCap(p,0.35,3.2,0.6)); d=smin(d,sdCap(p,vec3(-6.0,0.0,1.0),vec3(-11.0,0.6,-1.5),1.8,1.1)-(fbm(p.xy*2.0)-0.5)*0.4,0.8); }
    else if(k==5){ d=min(d,sdEll(p,vec3(-0.4,0.0,4.2),vec3(7.6,6.8,3.6))); d=min(d,sdEll(p,vec3(-2.6,0.0,2.4),vec3(12.0,8.8,0.7))); }
    else if(k==6){ d=min(d,sdEll(p,vec3(0.0,0.0,4.0),vec3(7.6,7.0,3.8))); d=min(d,sdEll(p,vec3(4.2,0.0,2.2),vec3(5.2,7.4,0.6))); d=min(d,sdBox(p,vec3(0.0,0.0,7.6),vec3(6.0,0.9,0.4),0.4)); }
    else if(k==7) d=min(d,sdEll(p,vec3(-0.6,0.0,1.2),vec3(7.2,6.4,5.6)));
    else if(k==8){ d=min(d,sdEll(p,vec3(-0.4,0.0,1.0),vec3(7.3,6.3,5.6))); d=smin(d,sdEll(p,vec3(-7.0,0.0,-0.4),vec3(2.2,2.6,1.4)),0.8); }
    else if(k==9) d=min(d,hairCap(p,0.25,2.6,0.5));
    else if(k==10){ d=min(d,hairCap(p,0.6,3.6,0.6)); d=smin(d,sdEll(p,vec3(-7.6,0.0,-1.6),vec3(5.2,6.4,1.6))-(fbm(p.xy*1.6)-0.5)*0.6,1.6); }
    else if(k==11){ d=min(d,sdEll(p,vec3(-0.4,0.0,4.0),vec3(7.2,6.8,3.0))); d=min(d,sdEll(p,vec3(-0.4,0.0,2.4),vec3(10.2,9.6,0.6))); }
    else if(k==12) d=d;
    else if(k==13) d=min(d,hairCap(p,0.2,3.3,0.4));
    else if(k==14){ d=min(d,hairCap(p,0.2,3.0,0.4)); d=smin(d,sdSph(p,vec3(-6.4,0.0,2.4),2.8)-(fbm(p.xy*3.0)-0.5)*0.3,0.6); }
    else if(k==15){ d=min(d,sdEll(p,vec3(-0.6,0.0,3.4),vec3(7.0,6.6,3.0))); d=min(d,sdEll(p,vec3(-8.0,0.0,2.2),vec3(3.6,4.4,0.35))); }
    else if(k==16){ d=min(d,smax(sdEll(p,vec3(-1.0,0.0,0.8),vec3(8.2,7.4,6.8)),-sdEll(p,vec3(6.4,0.0,-0.4),vec3(3.4,4.4,5.0)),0.8)); }
    else if(k==17){ float c=sdEll(p,vec3(-0.8,0.0,0.6),vec3(7.4,6.5,6.4)); c-=(vn(p.xy*2.6+uSeed)-0.5)*0.9; d=min(d,smax(c,p.x-3.6,0.6)); }
    else if(k==18){ d=sdEll(p,vec3(-0.2,0.0,0.0),vec3(7.2,6.2,6.2)); d=smin(d,sdEll(p,vec3(4.2,0.0,-1.4),vec3(3.3,4.6,4.2)),1.6); d=smin(d,sdEll(p,vec3(7.0,0.0,-0.7),vec3(1.5,0.9,1.3)),0.6); for(int i=0;i<7;i++){ vec2 q=vec2(h21(vec2(float(i),3.0))*10.0-5.0,h21(vec2(float(i),7.0))*9.0-4.5); d=smin(d,sdSph(p,vec3(q,4.6-length(q)*0.35),0.7),0.3); } }
    return d;
  }
  vec3 skinC(vec3 p, int base){ vec3 c=hx(base)*(0.84+0.3*fbm(p.xy*1.6+uSeed)); c=mix(c,hx(0x6a5a6a),clamp((fbm(p.xy*0.9+5.0)-0.58)*2.2,0.0,0.5)); float v=abs(sin(p.y*1.4+fbm(p.xy)*5.0+p.x*0.6)); return mix(c,hx(0x50663e),smoothstep(0.965,1.0,v)*0.45); }
  vec3 hairC(vec3 p, vec3 base, float shine){ float clump=fbm(p.xy*0.9+uSeed); float strand=sin(p.y*7.0+(clump-0.5)*9.0+p.x*0.6+vn(p.xy*2.0)*3.0); float s=0.82+0.1*strand*(0.4+0.6*vn(p.xy*4.0))+0.22*(clump-0.5); return base*s*(1.0+shine*smoothstep(4.0,6.5,p.z)*clump); } // strands that wander and clump, not stripes
  vec3 face(vec3 p, vec3 c){ // the face at the front: eye sockets, a dark mouth, a little blood on the chin
    for(int s=-1;s<=1;s+=2){ vec2 e=p.xy-vec2(5.2,float(s)*1.9); float r=length(e); if(r<1.05) c=mix(c,hx(0x1c1014),smoothstep(1.05,0.45,r)*0.85); if(r<0.36) c=mix(c,hx(0x7a2a22),0.8); } // sunken sockets, a dull red in each
    if(p.x>5.6&&abs(p.y)<1.8&&p.z<-1.4) c=mix(c,hx(0x2a0606),0.7);
    return c;
  }
  vec3 alb0(vec3 p, vec3 n){
    int k=gPart; float hs=skull(p); bool onSkull=hs<0.05;
    vec3 sk=skinC(p, k==1?0x9a907c:k==9?0xa49e90:k==10?0xa8a090:k==14?0xa29c8e:k==18?0x86906a:0x8e9880);
    vec3 c=sk; if(onSkull){ c=face(p,sk); if(k==0&&length(p.xy-vec2(-1.0,2.4))<1.6) c=mix(c,hx(0x4a0e0a),0.7); if(k==12){ c*=0.92+0.08*step(0.6,h21(floor(p.xy*4.0))); } if(k==18){ for(int i=0;i<7;i++){ vec2 q=vec2(h21(vec2(float(i),3.0))*10.0-5.0,h21(vec2(float(i),7.0))*9.0-4.5); if(length(p.xy-q)<0.75) c=mix(hx(0xb8b868),hx(0xe8e0a0),0.5); } } return c; }
    if(k==0) c=hairC(p,hx(0x2a2018),0.15);
    else if(k==1) c=hairC(p,hx(0xc8c4ba),0.1);
    else if(k==2) c=hairC(p,hx(0x3a2a1e),0.2);
    else if(k==3){ c=hx(0x1e2638)*(0.9+0.2*fbm(p.xy*4.0)); if(p.x>5.2&&p.z<3.8) c=hx(0x101218); if(length(p.xy-vec2(5.4,0.0))<1.3&&p.z>4.5) c=hx(0xc8b468); }
    else if(k==4){ c=hairC(p,hx(0x4a3020),0.2); if(abs(p.x+6.6)<0.5) c=hx(0x7a2a30); }
    else if(k==5){ c=hx(0x1e1c18)*(0.85+0.3*fbm(p.xy*2.0)); if(abs(length(p.xy-vec2(-0.4,0.0))-6.0)<0.7&&p.z>3.5) c=hx(0xc8c048); if(abs(p.x-6.4)<1.4&&abs(p.y)<2.2&&p.z>4.0) c=hx(0x8a6a38); }
    else if(k==6){ c=hx(0xd8b028)*(0.85+0.25*fbm(p.xy*2.2)); c=mix(c,hx(0x4a3e20),clamp((fbm(p.xy*0.7)-0.6)*2.0,0.0,0.5)); }
    else if(k==7){ c=hx(0xe8e4dc)*(0.88+0.15*fbm(p.xy*3.0)); if(length(p.xy-vec2(5.0,-1.0))<2.6) c=mix(c,hx(0x7a1e1c),0.75); }
    else if(k==8){ c=hx(0x26365a); if(fract(dot(floor(p.xy*1.2),vec2(0.37,0.61)))<0.18) c=mix(c,hx(0xdcdce6),0.6); }
    else if(k==9) c=hairC(p,hx(0x9a9690),0.15);
    else if(k==10){ c=hairC(p,hx(0x5a4632),0.15); if(length(p.xy-vec2(-1.0,-5.4))<1.4) c=hx(0x6a5a6a); }
    else if(k==11){ c=hx(0x3a4a34)*(0.85+0.3*fbm(p.xy*1.5)); float r=length(p.xy-vec2(-0.4,0.0)); if(abs(r-mod(r,1.3)-0.0)<0.1) c*=0.9; }
    else if(k==13) c=hairC(p,hx(0xa88c5a),0.2);
    else if(k==14) c=hairC(p,hx(0x8e8a84),0.12);
    else if(k==15){ c=uSeed>40.0?hx(0x5a1e1e):uSeed>30.0?hx(0x2c3a2a):hx(0x2a3448); c*=0.9+0.2*fbm(p.xy*3.0); if(length(p.xy-vec2(-0.6,0.0))<0.8&&p.z>6.0) c*=0.5; }
    else if(k==16){ c=hx(0x3c3e44)*(0.86+0.28*fbm(p.xy*2.2)); if(p.x>4.6) c*=0.35; }
    else if(k==17) c=hx(0x1c1612)*(0.75+0.5*vn(p.xy*2.6+uSeed));
    return c;
  }
  /* the same heads lying face up: the face looks at the sky, the crown points away from the body, the back of the skull rests on the ground */
  float map(vec3 p){ gPart=uPart; if(uPart>=40){ gPart=uPart-40; return max(map0(vec3(p.z-7.2,p.y,p.x)),-p.z); } return map0(p); }
  vec3 alb(vec3 p, vec3 n){ gPart=uPart; if(uPart>=40){ gPart=uPart-40; vec3 c=alb0(vec3(p.z-7.2,p.y,p.x),vec3(n.z,n.y,n.x)); return c*mix(0.7,1.0,smoothstep(0.0,3.0,p.z)); } return alb0(p,n); }
  `
  );
  for (let v = 0; v <= 17; v++) bakePart('z_head' + v, 'zh', v, 10, v * 4.3 + 11);
  bakePart('z_head_spit', 'zh', 18, 10, 77);
  for (let v = 0; v <= 17; v++) bakePart('z_headu' + v, 'zh', 40 + v, 16, v * 4.3 + 11); // face up
  bakeGroup(
    'zl',
    `
  float map(vec3 p){
    int k=uPart; float d;
    if(k==0){ d=sdCap(p,vec3(-8.6,0.0,0.0),vec3(6.4,0.0,0.0),4.2,3.5); d-=sin(p.x*1.6+sin(p.y*2.0)*0.6)*0.2*smoothstep(-4.0,4.0,p.x); d=smin(d,sdEll(p,vec3(7.6,0.0,0.0),vec3(2.4,3.0,2.4)),1.0); } // sleeve to a frayed cuff, the arm showing past it
    else if(k==1){ d=sdCap(p,vec3(-8.6,0.0,0.0),vec3(8.4,0.0,0.0),3.3,2.25); d=smin(d,sdEll(p,vec3(-5.2,0.0,0.6),vec3(3.8,2.9,2.4)),1.2); d-=(fbm(p.xy*1.8+uSeed)-0.5)*0.12; } // forearm: full at the elbow, thin at the wrist
    else if(k==2) d=sdEll(p,vec3(0.0),vec3(3.4,3.2,2.6));
    else if(k==3){ d=sdEll(p,vec3(-1.4,0.0,0.0),vec3(2.7,2.5,1.25)); for(int i=0;i<4;i++){ float y=-1.8+float(i)*1.2, l=(i==0||i==3)?2.1:2.6; d=smin(d,sdCap(p,vec3(0.8,y,0.15),vec3(0.8+l,y*1.08,-0.55),0.52,0.42),0.32); } d=smin(d,sdCap(p,vec3(-1.4,-2.1,0.0),vec3(0.4,-3.1,-0.35),0.58,0.46),0.4); }
    else { d=sdEll(p,vec3(-0.4,0.0,-0.6),vec3(5.4,3.0,2.1)); d=smin(d,sdEll(p,vec3(3.4,0.0,-0.9),vec3(2.6,2.8,1.5)),1.0); }
    return d;
  }
  vec3 alb(vec3 p, vec3 n){
    int k=uPart; float f=fbm(p.xy*1.3+uSeed);
    if(k==0){ vec3 c=vec3(0.9)*(0.86+0.24*f); if(p.x>5.6){ c=hx(0x9aa08c)*(0.9+0.2*f); } c*=0.94+0.06*sin(p.x*11.0)*sin(p.y*11.0); if(fbm(p.xy*0.6+3.0)>0.66) c*=vec3(0.75,0.62,0.55); return c; }
    if(k==1){ vec3 c=vec3(0.88)*(0.86+0.2*f); float t=abs(sin(p.y*2.4+p.x*0.15)); c*=1.0-smoothstep(0.92,1.0,t)*0.12; c=mix(c,vec3(0.62,0.5,0.66),clamp((fbm(p.xy*0.8+7.0)-0.6)*2.5,0.0,0.5)); if(length(p.xy-vec2(1.5,0.8))<1.5) c=mix(c,vec3(0.5,0.08,0.06),0.7); return c; }
    if(k==2) return vec3(0.86)*(0.88+0.2*f);
    if(k==3){ vec3 c=vec3(0.86)*(0.85+0.2*f); if(p.x>2.6) c*=0.8; if(p.x>3.0&&abs(fract(p.y*0.83+0.25)-0.5)<0.22) c=mix(c,vec3(0.28,0.24,0.26),0.7); return c; }
    vec3 c=hx(0x3a2c22)*(0.8+0.4*f); if(p.x<-3.6) c=hx(0x161210); if(abs(p.y)<1.1&&p.x>-2.5&&p.x<2.0&&fract(p.x*0.8)<0.4) c=hx(0x8a7a62); return c;
  }`
  );
  bakePart('z_upper', 'zl', 0, 6, 3);
  bakePart('z_fore', 'zl', 1, 5, 5);
  bakePart('z_elbow', 'zl', 2, 4, 7);
  bakePart('z_hand', 'zl', 3, 4, 9);
  bakePart('z_foot', 'zl', 4, 4, 13);
  bakeGroup(
    'zs',
    `
  float torsoB(vec3 p, float W, float D, float fat){ // a person's back and shoulders, scaled: W half width, D half depth
    float sx=D/9.5, sy=W/15.5;
    vec3 q=vec3(p.x/sx,p.y/sy,p.z);
    float d=sdEll(q,vec3(-0.9,0.0,0.0),vec3(8.4,13.2,7.0+fat));
    d=smin(d,sdCap(q,vec3(0.6,-11.4,3.4),vec3(0.6,11.4,3.4),4.3,4.3),3.2);
    d=smin(d,sdSph(q,vec3(0.9,-12.7,3.2),4.2),1.6); d=smin(d,sdSph(q,vec3(0.9,12.7,3.2),4.2),1.6);
    d=smin(d,sdEll(q,vec3(1.4,0.0,6.0+fat*0.5),vec3(5.2,7.6,3.4)),2.4);
    return d*min(sx,sy);
  }
  float pust(vec3 p, float seed, int n, vec2 ext, float zc, float r){ float d=1e3; for(int i=0;i<12;i++){ if(i>=n) break; vec2 q=(vec2(h21(vec2(float(i),seed)),h21(vec2(seed,float(i))))*2.0-1.0)*ext; d=min(d,sdSph(p,vec3(q,zc-length(q/ext)*2.5),r*(0.6+0.6*h21(vec2(float(i)*3.1,seed))))); } return d; }
  bool blShirt(vec3 p){ float gap=3.2+max(0.0,p.x+4.0)*0.62; return (abs(p.y)>gap||p.x<-4.0)&&p.x<13.0+sin(p.y*0.6)*1.5&&fbm(p.xy*0.45+11.0)<0.7; } /* the bloater's flannel shirt: buttons burst, split open down the belly, riding up off it */
  float map(vec3 p){
    int k=uPart; float d;
    if(k==0){ d=torsoB(p,15.5,9.5,0.8)-0.5; d=smin(d,pust(p,4.0,9,vec2(7.0,11.0),6.4,0.85),0.3); d=smin(d,sdCap(p,vec3(3.3,0.0,6.0),vec3(3.6,0.0,10.2),3.2,2.9),1.4); }
    else if(k==1){ d=torsoB(p,14.0,8.5,-1.2); for(int i=-3;i<=3;i++){ d-=0.22*exp(-pow(p.y-float(i)*2.6,2.0)*1.6)*smoothstep(-6.0,2.0,p.x)*(1.0-smoothstep(4.0,6.0,p.x)); } d=smin(d,sdCap(p,vec3(3.0,0.0,5.6),vec3(3.3,0.0,9.6),2.6,2.3),1.2); for(int s=-1;s<=1;s+=2) d=smin(d,sdCap(p,vec3(4.4,float(s)*1.6,6.2),vec3(3.0,float(s)*11.0,5.4),0.6,0.5),0.5); } // ribs ridged under thin skin, sharp collarbones
    else if(k==2){ d=sdEll(p,vec3(-0.4,0.0,0.0),vec3(6.8,5.8,6.0)); d=smin(d,sdEll(p,vec3(4.0,0.0,-1.4),vec3(3.1,4.2,4.0)),1.5); d=smax(d,-sdEll(p,vec3(7.6,0.0,-1.2),vec3(2.0,2.4,2.0)),0.4); float hair=sdEll(p,vec3(-5.0,0.0,1.0),vec3(9.0,10.5,4.6))-(fbm(p.xy*1.2)-0.5)*1.2; hair=smax(hair,p.x-4.2,0.8); d=min(d,hair); } // the screamer: wild hair fanned back, the mouth a hole
    else if(k==3){ d=sdEll(p,vec3(-0.4,0.0,0.0),vec3(8.0,7.0,6.8)); d=smin(d,sdEll(p,vec3(4.6,0.0,-1.4),vec3(3.6,5.0,4.4)),1.8); d=smin(d,sdEll(p,vec3(8.2,0.0,-0.6),vec3(1.7,1.1,1.4)),0.6); for(int s=-1;s<=1;s+=2) d=smin(d,sdEll(p,vec3(0.2,float(s)*7.0,-0.6),vec3(1.6,0.9,2.0)),0.4); for(int i=-1;i<=1;i++) d=smin(d,sdCap(p,vec3(-7.6,float(i)*2.6-2.0,-1.0),vec3(-7.6,float(i)*2.6+2.0,-1.0),1.2,1.2),1.2); } // the brute's shaved head, the fat folds at the back of the neck
    else if(k==4){ float sx=25.0/9.5, sy=33.5/15.5; vec3 q=vec3(p.x/sx,p.y/sy,p.z/1.9); float b=sdEll(q,vec3(-0.9,0.0,0.0),vec3(8.4,13.2*mix(1.0,0.72,smoothstep(2.0,-8.0,q.x)),7.0)); b=smin(b,sdCap(q,vec3(1.0,-11.4,3.6),vec3(1.0,11.4,3.6),4.5,4.5),3.0); b=smin(b,sdSph(q,vec3(1.2,-12.6,3.4),4.4),1.4); b=smin(b,sdSph(q,vec3(1.2,12.6,3.4),4.4),1.4); b=smin(b,sdEll(q,vec3(2.0,-5.0,6.4),vec3(5.0,5.4,3.0)),2.2); b=smin(b,sdEll(q,vec3(2.0,5.0,6.4),vec3(5.0,5.4,3.0)),2.2); d=b*min(sx,sy); d+=0.6*exp(-p.y*p.y/8.0)*smoothstep(4.0,-10.0,p.x); d-=(fbm(p.xy*0.4)-0.5)*0.8*clamp((p.z-3.0)/6.0,0.0,1.0); } // a huge man hunched forward: trapezius mounds either side of the neck, the back narrowing
    else if(k==5){ /* the bloater from above: heavy round shoulders, a hump of back fat, love handles, and a belly pushed far out in front of the chest */
      d=sdEll(p,vec3(-3.0,0.0,1.5),vec3(14.0,19.0,10.6));
      d=smin(d,sdCap(p,vec3(-4.0,-14.5,6.0),vec3(-4.0,14.5,6.0),6.4,6.4),4.0);
      d=smin(d,sdSph(p,vec3(-3.0,-18.6,4.4),6.0),3.0); d=smin(d,sdSph(p,vec3(-3.0,18.6,4.4),6.0),3.0);
      d=smin(d,sdEll(p,vec3(9.5,0.0,0.4),vec3(15.0,16.6,9.8)),5.0);
      d=smin(d,sdEll(p,vec3(2.0,-20.0,0.0),vec3(9.0,5.8,6.2)),4.0); d=smin(d,sdEll(p,vec3(2.0,20.0,0.0),vec3(9.0,5.8,6.2)),4.0);
      d=smin(d,sdEll(p,vec3(-11.5,0.0,4.6),vec3(8.0,13.5,6.6)),4.0);
      d=smin(d,sdCap(p,vec3(-3.0,0.0,10.0),vec3(-2.0,0.0,13.0),5.0,4.6),2.5);
      d+=0.95*exp(-pow(p.x-2.5+p.y*p.y*0.012,2.0)/1.8)*smoothstep(3.0,8.0,abs(p.y)+2.0)*smoothstep(2.0,5.0,p.z); /* the fold where the chest sags onto the belly */
      d+=0.55*(exp(-pow(p.x+14.5+sin(p.y*0.25),2.0)/1.2)+exp(-pow(p.x+19.0,2.0)/1.2))*smoothstep(3.0,8.0,p.z); /* rolls across the back */
      d+=0.9*exp(-(pow(p.x-21.0,2.0)+p.y*p.y)/1.5); /* the navel */
      d-=(fbm(p.xy*0.4)-0.5)*0.55; d=smin(d,pust(p-vec3(9.0,0.0,0.0),9.0,8,vec2(11.0,13.0),9.6,1.15),0.4);
      if(blShirt(p)) d-=0.3;
    }
    else if(k==6){ d=sdEll(p,vec3(9.0,0.0,0.0),vec3(10.5,7.6,6.6)); d=smin(d,sdEll(p,vec3(-9.0,0.0,0.0),vec3(11.0,5.6,5.6)),3.0); d=smin(d,sdEll(p,vec3(-1.0,0.0,0.0),vec3(6.0,4.6,5.0)),3.0); for(int i=-3;i<=3;i++) d-=0.25*exp(-pow(p.x-4.0-float(i)*1.8,2.0)*2.0)*smoothstep(3.0,6.0,abs(p.y)); d-=0.3*exp(-p.y*p.y*1.5)*-1.0; } // a starved dog: deep chest, tucked waist, ribs and spine showing
    else { d=sdEll(p,vec3(-1.0,0.0,0.0),vec3(4.6,3.8,3.6)); d=smin(d,sdCap(p,vec3(1.0,0.0,-0.6),vec3(9.6,0.0,-1.4),2.4,1.3),1.4); for(int s=-1;s<=1;s+=2) d=smin(d,sdCap(p,vec3(-2.4,float(s)*2.6,2.0),vec3(-7.6,float(s)*6.4,1.2),1.2,0.4),0.5); } // the dog's head: a long muzzle, ears laid flat back
    return d;
  }
  vec3 skinG(vec3 p, int base, float seed){ vec3 c=hx(base)*(0.82+0.32*fbm(p.xy*0.9+seed)); c=mix(c,hx(0x5a4a5a),clamp((fbm(p.xy*0.5+seed+5.0)-0.58)*2.0,0.0,0.45)); float v=abs(sin(p.x*0.9+fbm(p.xy*0.5)*6.0+p.y*0.4)); return mix(c,hx(0x48603a),smoothstep(0.965,1.0,v)*0.5); }
  vec3 bloodG(vec3 c, vec3 p, float amt){ float m=clamp((fbm(p.xy*0.4+vec2(-4.0,9.0)+uSeed)-0.62)*amt,0.0,1.0); return mix(c,vec3(0.32,0.035,0.03),m); }
  vec3 albB(vec3 p, vec3 n){
    int k=uPart; vec3 c;
    if(k==0){ c=skinG(p,0x7a8466,1.0); c=mix(c,hx(0x8caa28),clamp((fbm(p.xy*0.6+3.0)-0.6)*2.5,0.0,0.65)); if(pust(p,4.0,9,vec2(7.0,11.0),6.4,0.85)<0.1) c=mix(hx(0xb8b068),hx(0xe0d890),0.4); if(length(p.xy-vec2(3.3,0.0))<3.0&&p.z>8.5) c=hx(0x6e785a); return bloodG(c,p,3.0); }
    if(k==1){ c=skinG(p,0x7e7a86,2.0); if(p.x<-0.6&&abs(p.y)<(8.0+p.x*0.2)) { c=hx(0x3a2e3a)*(0.85+0.3*fbm(p.xy*2.0)); } if(length(p.xy-vec2(3.0,0.0))<2.6&&p.z>8.0) c=hx(0x5a5262); return bloodG(c,p,2.4); }
    if(k==2){ float hs=sdEll(p,vec3(-0.4,0.0,0.0),vec3(6.8,5.8,6.0)); if(hs<0.08||p.x>4.2){ c=skinG(p,0xa49cac,3.0); if(length(p.xy-vec2(7.4,0.0))<2.4) c=hx(0x1a0608); for(int s=-1;s<=1;s+=2){ if(length(p.xy-vec2(4.8,float(s)*1.9))<0.6) c=hx(0x7a2a22); } return c; } float cl=fbm(p.xy*0.8+3.0); float st=sin(p.y*3.2+(cl-0.5)*10.0+p.x*0.3); c=hx(0x1c181c)*(0.72+0.4*cl); c=mix(c,hx(0x6e6670),smoothstep(0.9,1.0,st)*0.22*cl); return c; } /* matted wild hair: clumps, a few grey strands */
    if(k==3){ c=skinG(p,0x93836f,4.0); c*=0.92+0.08*step(0.55,h21(floor(p.xy*4.0))); if(abs(sin(p.x*0.9+p.y*0.5))>0.985) c=mix(c,hx(0xb87a6a),0.5); for(int s=-1;s<=1;s+=2){ vec2 e=p.xy-vec2(5.8,float(s)*2.2); if(length(e)<1.1) c=mix(c,hx(0x1c1014),0.8); if(length(e)<0.4) c=hx(0x8a2a1a); } return c; }
    if(k==4){ c=skinG(p,0x5f564b,5.0); float tear=abs(p.y+ (p.x+8.0)*0.42 - 2.0*sin(p.x*0.4)) - (2.6+1.6*fbm(p.xy*0.6)); bool shirt=p.x<6.0&&tear>0.0&&length((p.xy-vec2(-8.0,20.0))/vec2(6.0,4.4))>1.0&&length(p.xy-vec2(9.0,0.0))>11.0; if(shirt){ vec2 m=mod(p.xy+vec2(sin(p.y*0.2),sin(p.x*0.2))+40.0,7.0); c=hx(0x3b3229); if(m.y<3.2) c=mix(c,hx(0x782418),0.42); if(m.x<3.2) c=mix(c,hx(0x782418),0.34); c*=0.86+0.28*fbm(p.xy*1.2); if(tear<0.6) c=mix(c,hx(0xc8b496),0.4); } return bloodG(c,p,2.6); }
    if(k==5){ /* swollen, decaying skin: grey-green, bruised purple, veins marbling through, stretch marks; the open shirt; strong form shading so the mass reads */
      c=mix(hx(0x9aa08a),hx(0x7a8a6a),fbm(p.xy*0.5+2.0)); c=mix(c,hx(0x7a6a8c),clamp((fbm(p.xy*0.3+6.0)-0.5)*2.0,0.0,0.5));
      float mb=abs(fbm(p.xy*0.22+3.0)*2.0-1.0+0.15*sin(p.x*0.8)); c=mix(c,hx(0x3a4a5a),smoothstep(0.08,0.0,mb)*0.6); /* marbling: dark veins branching under the skin */
      float sm=abs(sin(p.x*1.5+fbm(p.xy*0.5)*3.0)); c=mix(c,hx(0xc8a8a8),smoothstep(0.92,1.0,sm)*0.4*smoothstep(10.0,17.0,abs(p.y))*smoothstep(0.0,6.0,p.x)); /* stretch marks down the flanks */
      float sp=abs(p.y+sin(p.x*0.7)*1.2-2.0)-0.35; if(p.x>8.0&&p.x<18.0&&sp<0.0) c=mix(hx(0x3a1a12),hx(0x5a4a1a),fbm(p.xy*2.0)); /* where the skin has split */
      if(abs(length(p.xy-vec2(21.0,0.0))-0.8)<0.5) c*=0.55;
      if(pust(p-vec3(9.0,0.0,0.0),9.0,8,vec2(11.0,13.0),9.6,1.15)<0.12) c=mix(hx(0xd0c890),hx(0x9aa050),0.4);
      if(length(p.xy-vec2(-2.5,0.0))<5.4&&p.z>9.0) c=mix(hx(0x8a8a74),hx(0x6a5a5a),0.3);
      if(blShirt(p)){ vec2 m=mod(p.xy+vec2(sin(p.y*0.25),sin(p.x*0.25))*0.8+40.0,7.5); c=hx(0x485868); if(m.y<3.2) c=mix(c,hx(0x22282e),0.45); if(m.x<3.2) c=mix(c,hx(0x22282e),0.38); if(abs(m.y-5.6)<0.25||abs(m.x-5.6)<0.25) c=mix(c,hx(0xa89a70),0.3); c*=0.86+0.28*fbm(p.xy*1.1);
        c=mix(c,hx(0x5a4a2a),clamp((fbm(p.xy*0.4+4.0)-0.55)*1.8,0.0,0.55)); float gap=3.2+max(0.0,p.x+4.0)*0.62; if(abs(abs(p.y)-gap)<0.7&&p.x>-4.0) c*=0.7; if(abs(abs(p.y)-gap-1.1)<0.45&&fract(p.x*0.22)<0.22&&p.x>-2.0) c=hx(0xd8d0b8); }
      c=bloodG(c,p,1.6);
      c*=mix(0.5,1.0,smoothstep(-1.0,12.0,p.z))*(0.66+0.34*smoothstep(0.1,0.85,n.z)); return c; }
    if(k==6){ c=hx(0x8e7a62)*(0.8+0.36*fbm(p.xy*1.1+7.0)); c=mix(c,hx(0x5a4a3a),clamp((fbm(p.xy*0.5)-0.55)*2.0,0.0,0.6)); if(fbm(p.xy*0.7+2.0)>0.68) c=mix(c,hx(0x8a6a6a),0.5); return bloodG(c,p,2.4); }
    c=hx(0x8e7a62)*(0.82+0.3*fbm(p.xy*1.6)); if(p.x>8.0) c=hx(0x2a1e16); if(p.x<-2.4&&abs(p.y)>2.0) c=hx(0x2a1e16); for(int s=-1;s<=1;s+=2){ if(length(p.xy-vec2(3.0,float(s)*2.4))<0.7) c=hx(0x101010); } return c;
  }
  vec3 alb(vec3 p, vec3 n){ vec3 c=albB(p,n); if(uPart==0||uPart==1||uPart==4||uPart==6) c*=mix(0.6,1.0,smoothstep(-1.0,uBox.z*0.8,p.z))*(0.72+0.28*smoothstep(0.1,0.85,n.z)); return c; } /* body masses get stronger form shading so they read as round */`
  );
  bakePart('z_torso_spit', 'zs', 0, 14, 21);
  bakePart('z_scream', 'zs', 1, 14, 23);
  bakePart('z_shead', 'zs', 2, 10, 25);
  bakePart('z_bhead', 'zs', 3, 10, 27);
  bakePart('z_brute', 'zs', 4, 26, 29);
  bakePart('z_bloat', 'zs', 5, 24, 31);
  bakePart('z_hound', 'zs', 6, 10, 33);
  bakePart('z_hhead', 'zs', 7, 6, 35);
}
