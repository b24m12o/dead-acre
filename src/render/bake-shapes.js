/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
bakeGroup('zt', `
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
}`);
for (let v = 0; v <= 18; v++) bakePart('z_torso' + v, 'zt', v, 14, v * 3.7 + 1);
for (let v = 0; v <= 21; v++) bakePart('z_ly' + v, 'zt', 30 + v, v === 19 ? 22 : 13, v * 5.3 + 2); // the same people lying face down
for (let v = 0; v <= 18; v++) bakePart('z_lu' + v, 'zt', 70 + v, 13, v * 5.3 + 2); // and on their backs
bakePart('z_lhip', 'zt', 60, 9, 4.2); bakePart('z_lleg', 'zt', 61, 9, 7.7); bakePart('z_lhipu', 'zt', 62, 9, 4.2);
bakeGroup('zh', `
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
`);
for (let v = 0; v <= 17; v++) bakePart('z_head' + v, 'zh', v, 10, v * 4.3 + 11);
bakePart('z_head_spit', 'zh', 18, 10, 77);
for (let v = 0; v <= 17; v++) bakePart('z_headu' + v, 'zh', 40 + v, 16, v * 4.3 + 11); // face up
bakeGroup('zl', `
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
}`);
bakePart('z_upper', 'zl', 0, 6, 3); bakePart('z_fore', 'zl', 1, 5, 5); bakePart('z_elbow', 'zl', 2, 4, 7); bakePart('z_hand', 'zl', 3, 4, 9); bakePart('z_foot', 'zl', 4, 4, 13);
bakeGroup('zs', `
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
vec3 alb(vec3 p, vec3 n){ vec3 c=albB(p,n); if(uPart==0||uPart==1||uPart==4||uPart==6) c*=mix(0.6,1.0,smoothstep(-1.0,uBox.z*0.8,p.z))*(0.72+0.28*smoothstep(0.1,0.85,n.z)); return c; } /* body masses get stronger form shading so they read as round */`);
bakePart('z_torso_spit', 'zs', 0, 14, 21); bakePart('z_scream', 'zs', 1, 14, 23); bakePart('z_shead', 'zs', 2, 10, 25); bakePart('z_bhead', 'zs', 3, 10, 27);
bakePart('z_brute', 'zs', 4, 26, 29); bakePart('z_bloat', 'zs', 5, 24, 31); bakePart('z_hound', 'zs', 6, 10, 33); bakePart('z_hhead', 'zs', 7, 6, 35);
bakeGroup('gb', `
float gBody(vec3 p, float W, float D, float H){ /* a giant's back and shoulders from above, the walker's build scaled up: W half the shoulder span, D half the depth, H the height of the back */
  vec3 s=vec3(D/9.5,W/15.5,H/7.0), q=p/s;
  float d=sdEll(q,vec3(-0.9,0.0,0.0),vec3(8.4,13.2,7.0));
  d=smin(d,sdCap(q,vec3(0.6,-11.4,3.4),vec3(0.6,11.4,3.4),4.3,4.3),3.2);
  d=smin(d,sdSph(q,vec3(0.9,-12.7,3.2),4.2),1.6); d=smin(d,sdSph(q,vec3(0.9,12.7,3.2),4.2),1.6);
  d=smin(d,sdEll(q,vec3(1.2,-4.6,6.0),vec3(5.0,5.0,3.0)),2.2); d=smin(d,sdEll(q,vec3(1.2,4.6,6.0),vec3(5.0,5.0,3.0)),2.2);
  return d*min(s.x,min(s.y,s.z));
}
float cloth(vec3 p, float k){ return (sin(p.y*0.42+sin(p.x*0.3)*1.8)*0.5+sin(p.y*0.2-p.x*0.35)*0.4)*k*clamp((p.z-3.0)/8.0,0.0,1.0); }
float gHead(vec3 p, float r){ float d=sdEll(p,vec3(-0.5,0.0,0.0),vec3(r*1.12,r,r)); d=smin(d,sdEll(p,vec3(r*0.7,0.0,-r*0.25),vec3(r*0.5,r*0.66,r*0.62)),r*0.25); for(int s=-1;s<=1;s+=2) d=smin(d,sdEll(p,vec3(0.0,float(s)*r*0.98,-r*0.12),vec3(r*0.26,r*0.13,r*0.34)),r*0.07); return d; }
float pust(vec3 p, float seed, int n, vec2 ext, float zc, float r){ float d=1e3; for(int i=0;i<12;i++){ if(i>=n) break; vec2 q=(vec2(h21(vec2(float(i),seed)),h21(vec2(seed,float(i))))*2.0-1.0)*ext; d=min(d,sdSph(p,vec3(q,zc-length(q/ext)*2.5),r*(0.6+0.6*h21(vec2(float(i)*3.1,seed))))); } return d; }
float rkVest(vec3 p){ float m=(1.0-smoothstep(40.0,44.0,abs(p.y)))*smoothstep(-30.0,-26.0,p.x)*(1.0-smoothstep(24.0,28.0,p.x)); return m*step(fbm(p.xy*0.11+3.0),0.6); }
vec3 abLocal(vec3 p, int j){ float th=j==0?0.62:j==1?-0.62:j==2?1.92:j==3?-1.92:3.14159; vec2 c=vec2(-10.0,0.0)+vec2(cos(th),sin(th))*38.0, q=p.xy-c; float cs=cos(th), sn=sin(th); return vec3(q.x*cs+q.y*sn,-q.x*sn+q.y*cs,p.z); } /* one of the fused people, in its own frame: x out toward where its head was */
float map(vec3 p){
  int k=uPart; float d;
  if(k==0){ /* Roadkill: hunched, the left shoulder dropped, a hump of muscle over the back */
    vec3 q=p; q.z+=smoothstep(8.0,50.0,-p.y)*5.0; d=gBody(q,58.0,32.0,22.0);
    d=smin(d,sdEll(q,vec3(-9.0,0.0,20.0),vec3(20.0,30.0,9.0)),8.0);
    d-=cloth(p,1.1)*step(0.0,rkVest(p)); d+=0.5*rkVest(p);
  }
  else if(k==1){ /* the Gravekeeper: a tall gaunt frame in a long oilskin coat, a cape over the shoulders, the coat tails trailing behind */
    d=gBody(p,42.0,24.0,17.0);
    float cape=sdEll(p,vec3(-3.0,0.0,13.0),vec3(23.0,46.0,5.5)); cape=smax(cape,-p.z+9.0+fbm(p.xy*0.2)*2.0,2.0); d=smin(d,cape,3.0);
    { float tl=sdEll(p,vec3(-28.0,0.0,3.0),vec3(17.0,21.0-max(0.0,-p.x-26.0)*0.4,2.4))+(fbm(p.xy*0.3+3.0)-0.5)*2.8*smoothstep(-26.0,-44.0,p.x); d=smin(d,tl,7.0); } /* the coat hanging behind, frayed at the hem */
    d=smin(d,sdCap(p,vec3(8.0,-9.0,19.0),vec3(8.0,9.0,19.0),3.0,3.0),3.0);
    d-=cloth(p,1.3)+(fbm(p.xy*0.3)-0.5)*0.8;
  }
  else if(k==2){ /* the Fire Chief: broad, the heavy turnout coat standing off the body, the collar up */
    d=gBody(p,56.0,31.0,20.0)-1.5;
    d=smin(d,sdEll(p,vec3(-30.0,0.0,3.0),vec3(10.0,30.0,4.0)),6.0);
    d=smin(d,sdCap(p,vec3(9.0,-13.0,22.0),vec3(9.0,13.0,22.0),3.4,3.4),3.0);
    for(int s=-1;s<=1;s+=2){ float ys=float(s)*16.0; d=smin(d,sdCap(p,vec3(24.0,ys,10.0),vec3(-26.0,ys,14.0),2.0,2.0),1.5); }
    for(int i=0;i<3;i++){ float bx=-6.0-float(i)*10.0; d-=0.5*exp(-pow(p.x-bx,2.0)/2.0)*step(5.0,p.z); }
    d-=cloth(p,0.9);
  }
  else if(k==3){ /* Patient Zero: lopsided, the right side of the back swollen with growths, spine showing where the gown hangs open */
    d=gBody(p,56.0,32.0,20.0);
    d=smin(d,sdEll(p,vec3(-6.0,28.0,14.0),vec3(22.0,24.0,14.0)),8.0);
    d=smin(d,pust(p,5.0,10,vec2(18.0,16.0),20.0,4.0),3.0);
    float sp=abs(p.y+3.0); d-=0.9*exp(-sp*sp/6.0)*smoothstep(10.0,0.0,p.x)*smoothstep(-34.0,-24.0,p.x);
    for(int i=0;i<7;i++){ float vx=-24.0+float(i)*4.6; d=smin(d,sdSph(p,vec3(vx,-3.0,18.8),1.8),1.2); }
    d-=cloth(p,0.6);
  }
  else if(k==4){ /* Roadkill's head: bald, a bull neck, one ear torn away */
    d=gHead(p,15.0); d=smin(d,sdCap(p,vec3(-6.0,0.0,-6.0),vec3(-16.0,0.0,-10.0),11.0,12.0),5.0); d=smax(d,-sdSph(p,vec3(0.0,-15.5,-2.0),3.2),1.0);
    d-=(fbm(p.xy*0.8)-0.5)*0.4;
  }
  else if(k==5){ /* the Gravekeeper's hat: a wide battered brim, the crown pinched, a grey beard jutting past the front */
    float brim=sdEll(p,vec3(-1.0,0.0,6.0),vec3(23.0,21.0,1.4))+(fbm(p.xy*0.25)-0.5)*1.4; brim=smax(brim,-sdSph(p,vec3(-6.0,15.0,7.0),2.4),0.8);
    float crown=sdEll(p,vec3(-1.0,0.0,10.0),vec3(11.0,10.0,6.6)); crown=smax(crown,-sdEll(p,vec3(-1.0,0.0,17.4),vec3(8.0,1.6,3.0)),2.0);
    float beard=sdEll(p,vec3(18.0,0.0,2.0),vec3(9.0,6.6,3.6))-(fbm(p.xy*1.2)-0.5)*1.4; d=smin(brim,crown,2.0); d=min(d,beard);
    float hair=sdEll(p,vec3(-20.0,0.0,3.0),vec3(6.0,10.0,2.6))-(fbm(p.yx*1.4)-0.5)*1.2; d=min(d,hair);
  }
  else if(k==6){ /* Patient Zero's head: shaved, swollen, a growth pushing one side of the skull out, electrode pads stuck on */
    d=gHead(p,14.0); d=smin(d,sdEll(p,vec3(-3.0,8.0,4.0),vec3(10.0,9.0,9.0)),4.0);
    for(int i=0;i<3;i++){ vec2 e=vec2(-6.0+float(i)*6.0,-6.0+float(i)*2.5); d=smin(d,sdEll(p,vec3(e,12.4),vec3(2.4,2.4,0.6)),0.6); }
    d-=(fbm(p.xy*0.7)-0.5)*0.5;
  }
  else if(k==7){ /* the Fire Chief's helmet: a ribbed dome, the long duckbill tail behind, the leather shield at the front */
    float dome=sdEll(p,vec3(1.0,0.0,6.0),vec3(14.0,12.0,10.0)); for(int i=-1;i<=1;i++) dome=smin(dome,sdCap(p,vec3(13.0,float(i)*5.0,7.0),vec3(-12.0,float(i)*5.0,7.0),1.8,1.8),1.0);
    float brim=sdEll(p,vec3(-3.0,0.0,1.0),vec3(23.0,15.0,1.2)); brim=smin(brim,sdEll(p,vec3(-18.0,0.0,0.4),vec3(10.0,9.0,1.0)),4.0);
    float shield=sdBox(p,vec3(14.0,0.0,11.0),vec3(3.0,4.6,4.2),1.0);
    d=smin(dome,brim,2.0); d=smin(d,shield,1.0); d+=0.8*exp(-(pow(p.x+4.0,2.0)+pow(p.y-6.0,2.0))/8.0)*step(10.0,p.z);
  }
  else if(k==9){ /* the Abomination: five people grown into one mass, their backs fused radially round a raw core, heads sunk at the necks */
    p/=1.22; d=sdEll(p,vec3(-10.0,0.0,2.0),vec3(42.0,38.0,18.0));
    for(int j=0;j<5;j++){ vec3 l=abLocal(p,j); float bk=sdEll(l,vec3(0.0,0.0,6.0),vec3(21.0,15.5,10.0)); bk=smin(bk,sdCap(l,vec3(13.0,-15.0,6.5),vec3(13.0,15.0,6.5),6.4,6.4),5.0); bk=smin(bk,sdCap(l,vec3(19.0,0.0,8.0),vec3(25.0,0.0,6.0),4.2,3.8),2.5);
      bk-=0.7*exp(-pow(abs(l.y)-7.0,2.0)/5.0)*exp(-pow(l.x-6.0,2.0)/18.0); bk+=0.8*exp(-l.y*l.y/2.5)*smoothstep(16.0,8.0,l.x)*smoothstep(-20.0,-12.0,l.x); bk-=cloth(l,0.7)*0.6;
      d=smin(d,bk,9.0); }
    for(int j=0;j<2;j++){ vec3 l=abLocal(p,j); d=smin(d,sdEll(l,vec3(28.0,0.0,6.0),vec3(8.5,7.5,6.5)),3.0); }
    d=smax(d,-(sdEll(p,vec3(-10.0,0.0,22.0),vec3(13.0,10.0,6.0))+(fbm(p.xy*0.35)-0.5)*4.0),3.0);
    d=smin(d,pust(p-vec3(-10.0,0.0,0.0),13.0,8,vec2(30.0,26.0),19.0,2.6),1.5);
    d-=(fbm(p.xy*0.12)-0.5)*1.4; d*=1.22;
  }
  else if(k==10){ /* its head: one huge swollen human head, the scalp torn to the skull, the jaw split open sideways */
    d=sdEll(p,vec3(-2.0,0.0,0.0),vec3(27.0,24.0,19.0));
    for(int s=-1;s<=1;s+=2) d=smin(d,sdEll(p,vec3(-2.0,float(s)*24.0,-2.0),vec3(4.5,2.8,4.0)),1.5);
    d=smax(d,-sdEll(p,vec3(22.0,0.0,2.0),vec3(10.0,11.0,9.0)),3.0);
    for(int i=0;i<12;i++){ float t=float(i)/11.0, s=i<6?-1.0:1.0, tt=fract(t*2.0); d=min(d,sdCap(p,vec3(12.0+tt*15.0,s*(12.5-tt*6.0),3.0),vec3(12.0+tt*15.0,s*(10.0-tt*5.0),2.5),0.9,0.4)); }
    for(int s=-1;s<=1;s+=2) d=smax(d,-sdSph(p,vec3(5.0,float(s)*12.0,15.0),2.8),1.0);
    d=smax(d,-sdEll(p,vec3(-16.0,-5.0,17.0),vec3(6.5,5.0,2.5)),1.2);
    d-=(fbm(p.xy*0.3)-0.5)*0.8;
  }
  else if(k==11){ /* a long dead arm used as a leg: thick at the shoulder, wasting to the wrist, sinew showing */
    d=sdCap(p,vec3(-17.0,0.0,0.0),vec3(4.0,0.0,0.0),6.2,4.4); d=smin(d,sdCap(p,vec3(4.0,0.0,0.0),vec3(17.5,0.0,0.0),4.4,2.8),2.0);
    d-=(fbm(p.xy*0.5)-0.5)*0.9; d+=0.5*exp(-pow(p.x-3.5,2.0)/1.5);
  }
  else if(k==12){ /* a tail segment: a spine wrapped in flesh */
    d=sdEll(p,vec3(0.0),vec3(16.0,14.0,10.0)); d=smin(d,sdBox(p,vec3(0.0,0.0,10.0),vec3(6.0,3.2,2.0),1.2),2.0);
    for(int s=-1;s<=1;s+=2) d=smin(d,sdCap(p,vec3(-1.0,float(s)*3.0,10.0),vec3(-4.0,float(s)*10.5,6.0),1.4,0.7),1.0);
    d-=(fbm(p.xy*0.4)-0.5)*0.7;
  }
  else { /* a shoulder cap: the deltoid rounding over the arm root */
    d=sdEll(p,vec3(0.0),vec3(17.0,16.0,10.0)); d-=cloth(p,0.6)+(fbm(p.xy*0.4)-0.5)*0.5;
  }
  return d;
}
vec3 skinB(vec3 p, int base){ vec3 c=hx(base)*(0.82+0.32*fbm(p.xy*0.35+uSeed)); c=mix(c,hx(0x5a4a5a),clamp((fbm(p.xy*0.2+5.0)-0.58)*2.0,0.0,0.4)); float v=abs(sin(p.x*0.35+fbm(p.xy*0.2)*6.0+p.y*0.15)); return mix(c,hx(0x48603a),smoothstep(0.97,1.0,v)*0.45); }
vec3 bloodB(vec3 c, vec3 p, float amt){ float m=clamp((fbm(p.xy*0.16+vec2(-4.0,9.0)+uSeed)-0.62)*amt,0.0,1.0); return mix(c,vec3(0.3,0.035,0.03),m); }
vec3 albB(vec3 p, vec3 n){
  int k=uPart; vec3 c;
  if(k==0){ c=skinB(p,0x9a7a66);
    vec2 dir=normalize(vec2(0.45,1.0)); float v=dot(p.xy,dir), w=dot(p.xy,vec2(-dir.y,dir.x)); if(abs(w+4.0)<10.0&&p.x<10.0){ float ch=fract(v*0.16+abs(w+4.0)*0.07); c=mix(c,hx(0x4a2e3e),(ch<0.42?0.6:0.2)*smoothstep(10.0,6.0,abs(w+4.0))); } /* the tyre tread bruised across the back */
    if(p.y<-30.0&&p.x>-14.0) c=mix(c,hx(0x8a3a2e)*(0.8+0.4*fbm(p.xy*0.8)),0.75); /* the left side skinned raw on the asphalt */
    if(rkVest(p)>0.5){ c=hx(0xd8641c)*(0.82+0.3*fbm(p.xy*0.3)); for(int i=0;i<2;i++){ float bx=-8.0-float(i)*13.0; if(abs(p.x-bx)<2.4) c=abs(p.x-bx)<1.0?hx(0xd4d4c8):hx(0xd8c440); } if(abs(abs(p.y)-19.0)<2.2) c=abs(abs(p.y)-19.0)<0.9?hx(0xd4d4c8):hx(0xd8c440); c=mix(c,hx(0x4a3a2a),clamp((fbm(p.xy*0.15+8.0)-0.55)*1.8,0.0,0.6)); }
    if(fbm(p.xy*0.13+17.0)>0.69) c=mix(c,hx(0x121010),0.85); /* tar */
    return bloodB(c,p,2.0); }
  if(k==1){ c=hx(0x3c3a2a)*(0.8+0.3*fbm(p.xy*0.3)); c*=0.9+0.35*pow(max(n.z,0.0),6.0); float cape=sdEll(p,vec3(-3.0,0.0,13.0),vec3(23.0,46.0,5.5)); if(cape<0.6&&p.z>9.0) c=hx(0x2e2c20)*(0.82+0.3*fbm(p.xy*0.4)); if(p.x<-24.0) c=mix(c,hx(0x4a3a24),clamp((-24.0-p.x)/18.0,0.0,0.8)*fbm(p.xy*0.3+2.0)*1.4); if(p.x>4.0&&p.z>16.0) c=hx(0x262418); return c; }
  if(k==2){ c=hx(0x8a6a38)*(0.82+0.3*fbm(p.xy*0.3)); for(int i=0;i<3;i++){ float bx=-6.0-float(i)*10.0, b=abs(p.x-bx); if(b<2.4&&abs(p.y)<46.0) c=b<0.9?hx(0xd8d8d0):hx(0xc8c048); } if(abs(abs(p.y)-16.0)<2.2) c=hx(0x1c1a1c)*(0.8+0.3*fbm(p.xy)); if(abs(abs(p.y)-16.0)<2.6&&abs(fract(p.x*0.08)-0.5)<0.06) c=hx(0x8a8a80); if(p.x>4.0&&p.z>19.0) c=hx(0x3a2a18); float sc=fbm(p.xy*0.12+6.0); c=mix(c,hx(0x16120e),clamp((sc-0.52)*2.4,0.0,0.85)); return c; }
  if(k==3){ c=hx(0x9cb4b6)*(0.84+0.24*fbm(p.xy*0.3)); if(fract(p.x*0.15)<0.12&&fract(p.y*0.15)<0.12) c*=0.86; float op=abs(p.y+3.0+sin(p.x*0.12)*2.0)-(6.0+max(0.0,-p.x)*0.14+(fbm(p.xy*0.3)-0.5)*3.0); if(op<0.0&&p.x<12.0){ c=skinB(p,0x8c8a86); } if(abs(op)<0.8&&p.x<12.0) c*=0.72; if(abs(fract(p.x*0.06)-0.5)<0.05&&abs(p.y+3.0)<9.0&&p.x<10.0) c=hx(0xd8dcd8); if(p.y>12.0&&sdEll(p,vec3(-6.0,28.0,14.0),vec3(22.0,24.0,14.0))<1.5){ c=mix(skinB(p,0x8a6a7a),hx(0x6a4a5a),0.3); } if(pust(p,5.0,10,vec2(18.0,16.0),20.0,4.0)<0.4) c=mix(hx(0xb09a7a),hx(0x8a6a5a),fbm(p.xy*0.8)); if(p.x>6.0) c=mix(c,hx(0x8a9a2a),clamp((fbm(p.xy*0.2+9.0)-0.5)*2.0,0.0,0.6)); return bloodB(c,p,1.6); }
  if(k==4){ c=skinB(p,0x9a7a66); if(p.y<-6.0&&p.x>-6.0) c=mix(c,mix(hx(0x8a3a2e),hx(0xd8ccb0),step(0.72,fbm(p.xy*0.9))),0.7); if(p.x<-6.0) c*=0.9+0.1*step(0.5,h21(floor(p.xy*2.0))); if(fbm(p.xy*0.4+3.0)>0.7) c=hx(0x161212); for(int s=-1;s<=1;s+=2){ vec2 e=p.xy-vec2(10.0,float(s)*4.4); if(length(e)<1.6) c=hx(0x1c1014); } return c; }
  if(k==5){ float beard=sdEll(p,vec3(18.0,0.0,2.0),vec3(9.0,6.6,3.6)); if(beard<0.8&&p.x>12.0){ float st=sin(p.y*3.0+fbm(p.xy*1.2)*6.0); return hx(0x9a968c)*(0.75+0.3*fbm(p.xy*1.4))*(0.85+0.15*st); } if(p.x<-16.0&&p.z<5.5) return hx(0x8a8880)*(0.7+0.3*sin(p.y*2.2+fbm(p.yx)*5.0)); c=hx(0x3a2c20)*(0.8+0.3*fbm(p.xy*0.5)); if(p.z>11.0&&p.z<12.6) c=hx(0x1e1812); c=mix(c,hx(0x5a4a34),clamp((fbm(p.xy*0.3+6.0)-0.6)*1.6,0.0,0.5)); return c; }
  if(k==6){ c=skinB(p,0x8e8a84); if(p.y>2.0) c=mix(c,hx(0x8a6a7a),clamp((p.y-2.0)/10.0,0.0,0.45)); for(int i=0;i<3;i++){ vec2 e=vec2(-6.0+float(i)*6.0,-6.0+float(i)*2.5); if(length(p.xy-e)<2.5) c=length(p.xy-e)<0.8?hx(0x8a8a80):hx(0xe0ddd0); if(abs(p.y-e.y+(p.x-e.x)*0.4)<0.25&&p.x<e.x-2.0) c=hx(0x202020); } return bloodB(c,p,1.2); }
  if(k==7){ c=hx(0xe4e0d4)*(0.85+0.2*fbm(p.xy*0.5)); if(p.z<3.0) c*=0.86; if(sdBox(p,vec3(14.0,0.0,11.0),vec3(3.0,4.6,4.2),1.0)<0.4){ c=hx(0x6a2a1a)*(0.85+0.3*fbm(p.xy*1.2)); if(length(p.xy-vec2(14.5,0.0))<2.2) c=hx(0xc8a858); } c=mix(c,hx(0x1a1612),clamp((fbm(p.xy*0.2+3.0)-0.5)*2.2,0.0,0.75)); return c; }
  if(k==9||k==10||k==11||k==12){ /* dead flesh: grey-pink, bruised purple and green, veins, sores; bone where it shows */
    c=mix(hx(0x7c706c),hx(0x6a5e5a),fbm(p.xy*0.15+2.0))*(0.8+0.36*fbm(p.xy*0.5+uSeed)); c=mix(c,hx(0x5a3e58),clamp((fbm(p.xy*0.09+6.0)-0.46)*2.2,0.0,0.6)); c=mix(c,hx(0x5e6a44),clamp((fbm(p.xy*0.11+9.0)-0.56)*2.2,0.0,0.42)); c=mix(c,hx(0x3a2a2c),clamp((fbm(p.xy*0.32+12.0)-0.62)*2.6,0.0,0.45)); /* grey-mauve dead skin, bruised purple and green, patchy dark mottling: no smooth pink */
    float vv=abs(fbm(p.xy*(k==9?0.06:0.14)+3.0)*2.0-1.0); c=mix(c,hx(0x4a2a3a),smoothstep(0.06,0.0,vv)*0.55);
    if(k==9){ p/=1.22; int bj=-1; float bw=1e3; for(int j=0;j<5;j++){ vec3 l=abLocal(p,j); float e=length(l.xy/vec2(22.0,17.0)); if(e<bw){ bw=e; bj=j; } }
      if(bw<1.05){ vec3 l=abLocal(p,bj); vec3 cc=bj==0?hx(0x3a4458):bj==1?hx(0x5a5048):bj==2?hx(0x4a5a3a):bj==3?hx(0x6a6a6a):hx(0x6a2a24); if(fbm(l.xy*0.14+float(bj)*7.0)<0.56&&l.x<15.0&&l.x>-18.0){ c=cc*(0.75+0.3*fbm(l.xy*0.6)); c=mix(c,hx(0x3a2a1e),clamp((fbm(l.xy*0.2+3.0)-0.5)*1.6,0.0,0.6)); } if(abs(l.y)<1.2&&l.x<14.0&&l.x>-16.0) c*=0.82; }
      else c=mix(c,hx(0x7a2e2a),clamp((bw-1.05)*2.0,0.0,0.55)); /* raw flesh where the bodies run together */
      for(int j=0;j<2;j++){ vec3 l=abLocal(p,j); if(sdEll(l,vec3(28.0,0.0,6.0),vec3(8.5,7.5,6.5))<0.8){ c=mix(hx(0x8a8276),hx(0x6a6058),fbm(l.xy*1.2)); if(l.x<26.0&&p.z>9.0) c=mix(c,hx(0x2a2220)*(0.8+0.4*fbm(l.yx*2.0)),0.85); if(abs(l.y)<3.6&&abs(l.x-31.5)<0.3) c=hx(0x241818); } }
      if(sdEll(p,vec3(-10.0,0.0,22.0),vec3(13.0,10.0,6.0))<1.5) c=mix(hx(0x3a0a08),hx(0x7a2420),fbm(p.xy*0.5));
      float pq=pust(p-vec3(-10.0,0.0,0.0),13.0,8,vec2(30.0,26.0),19.0,2.6); if(pq<0.5) c=mix(hx(0x3a0a08),hx(0xa8924a),smoothstep(0.0,-1.2,pq));
      c*=0.85; }
    if(k==10){ if(sdEll(p,vec3(-16.0,-5.0,17.0),vec3(6.5,5.0,2.5))<1.0) c=mix(hx(0xcfc2a2),hx(0x6a1410),step(0.6,length((p.xy-vec2(-16.0,-5.0))/vec2(6.5,5.0)))); if(p.x>12.0&&sdEll(p,vec3(22.0,0.0,2.0),vec3(10.0,11.0,9.0))<1.2&&p.z<10.0) c=mix(hx(0x1a0406),hx(0x6e1418),fbm(p.xy*0.6)); for(int s=-1;s<=1;s+=2){ if(length(p.xy-vec2(5.0,float(s)*12.0))<3.0) c=hx(0x2a0a0a); } if(p.x>11.0&&abs(abs(p.y)-(12.5-(p.x-12.0)*0.4))<1.1&&p.z>1.0) c=hx(0xdcd2bc); }
    if(k==11){ c=mix(hx(0x867a78),hx(0x625654),fbm(p.xy*0.4)); c=mix(c,hx(0x40323a),clamp((fbm(p.xy*0.9+2.0)-0.6)*2.4,0.0,0.4)); c=mix(c,hx(0x5a4a5a),clamp((fbm(p.xy*0.25+6.0)-0.5)*2.0,0.0,0.5)); if(fbm(p.xy*0.45+4.0)>0.68) c=mix(hx(0x4a0e0c),hx(0x9a4a3e),fbm(p.xy*2.0)); }
    if(k==12){ if(p.z>9.0&&abs(p.y)<3.4) c=hx(0xe2d8c6); if(abs(p.y)>3.0&&p.z>7.0&&abs(p.x+2.5)<2.0) c=hx(0xd8ccb8); }
    return bloodB(c,p,1.4); }
  c=vec3(0.86)*(0.85+0.25*fbm(p.xy*0.5+uSeed)); return c;
}
vec3 alb(vec3 p, vec3 n){ vec3 c=albB(p,n); return c*mix(0.58,1.0,smoothstep(-1.0,uBox.z*0.8,p.z))*(0.7+0.3*smoothstep(0.1,0.85,n.z)); }
`); // the four giant bosses: bodies, heads and shoulder caps
[['rk_torso', 36], ['gk_torso', 26], ['cf_torso', 30], ['pz_torso', 32], ['rk_head', 18], ['gk_head', 19], ['pz_head', 17], ['cf_head', 18], null, ['ab_body', 34], ['ab_head', 22], ['ab_limb', 8], ['ab_seg', 15]].forEach((q, i) => { if (q) bakePart(q[0], 'gb', i, q[1], 60 + i * 3.1, /torso|ab_body|ab_head|ab_limb|ab_seg/.test(q[0])); }); // ab_head too: no painted glowing dot eyes over the 3D head
bakeGroup('hr', `
const float HW=18.5, HD=10.5;
float bodyH(vec3 p){ // the living: straighter shoulders than the dead, a fuller chest
  vec3 q=vec3(p.x/1.1,p.y/1.19,p.z);
  float d=sdEll(q,vec3(-0.6,0.0,0.0),vec3(8.6,13.2,7.6));
  d=smin(d,sdCap(q,vec3(0.2,-11.4,4.0),vec3(0.2,11.4,4.0),4.5,4.5),3.0);
  d=smin(d,sdSph(q,vec3(0.3,-12.8,3.8),4.3),1.5); d=smin(d,sdSph(q,vec3(0.3,12.8,3.8),4.3),1.5);
  d=smin(d,sdEll(q,vec3(0.8,0.0,6.6),vec3(5.0,7.4,3.2)),2.4);
  d=smin(d,sdCap(q,vec3(2.0,0.0,6.6),vec3(2.2,0.0,10.4),3.0,2.8),1.4);
  d*=1.08;
  float top=clamp((p.z-1.5)/4.0,0.0,1.0);
  d-=(sin(p.y*0.95+sin(p.x*0.6)*1.4)*0.4+sin(p.y*0.45-p.x*0.8)*0.3)*0.5*(1.0-exp(-abs(p.y)*0.22))*top;
  return d;
}
float headH(vec3 p){ float d=sdEll(p,vec3(-0.2,0.0,0.0),vec3(7.0,6.0,6.4)); d=smin(d,sdEll(p,vec3(4.4,0.0,-1.4),vec3(3.2,4.4,4.2)),1.6); d=smin(d,sdEll(p,vec3(7.3,0.0,-0.6),vec3(1.5,0.9,1.3)),0.6); for(int s=-1;s<=1;s+=2) d=smin(d,sdEll(p,vec3(0.4,float(s)*6.1,-0.6),vec3(1.6,0.8,2.1)),0.4); return d; }
float map(vec3 p){
  int k=uPart; float d;
  if(k<=2){ d=bodyH(p);
    if(k==0){ float pc=sdBox(p,vec3(-0.8,0.0,4.6),vec3(HD*0.5,HW*0.34,3.0),3.6); d=smin(d,pc,1.2); for(int i=0;i<4;i++){ float y=-6.0+float(i)*4.0; d=smin(d,sdBox(p,vec3(HD*0.62,y,7.0),vec3(1.6,1.7,1.5),0.5),0.3); } for(int s=-1;s<=1;s+=2) d=smin(d,sdCap(p,vec3(-HD*0.55,float(s)*HW*0.42,8.0),vec3(HD*0.55,float(s)*HW*0.42,8.0),1.5,1.5),0.6); } // the plate carrier: front and back plates, magazine pouches on the chest, shoulder straps
    if(k==1){ float m=smoothstep(4.0,5.6,abs(p.y))*(1.0-smoothstep(HW*0.6,HW*0.7,abs(p.y))); d-=0.6*m*(step(HD*0.25,p.x)+step(p.x,-HD*0.35)); for(int s=-1;s<=1;s+=2) d=smin(d,sdCap(p,vec3(-HD*0.5,float(s)*HW*0.78,8.6),vec3(HD*0.45,float(s)*HW*0.78,8.6),1.0,1.0),0.6); } // the deputy: leather vest panels, epaulettes
    if(k==2){ d-=0.2*sin(p.y*1.8)*clamp((p.z-2.0)/4.0,0.0,1.0); } // a loose flannel shirt
  }
  else if(k==3){ d=headH(p); d=min(d,sdEll(p,vec3(-0.6,0.0,2.0),vec3(7.9,7.1,6.0))); d=min(d,sdBox(p,vec3(6.2,0.0,5.2),vec3(1.1,1.7,1.0),0.4)); for(int s=-1;s<=1;s+=2) d=min(d,sdBox(p,vec3(-0.5,float(s)*6.6,1.6),vec3(2.4,0.6,1.2),0.3)); } // a combat helmet, night-vision mount at the front, rails at the sides
  else if(k==4){ d=headH(p); d=min(d,sdEll(p,vec3(-0.8,0.0,3.4),vec3(7.4,6.8,3.2))); d=min(d,smax(sdEll(p,vec3(5.6,0.0,2.6),vec3(6.6,6.0,0.45)),3.2-p.x,0.5)); } // the patrol cap: a six-panel crown and a stiff bill
  else if(k==5){ d=headH(p); float h=sdEll(p,vec3(-1.0,0.0,0.6),vec3(7.6,6.7,6.6))-(fbm(p.xy*1.3+uSeed)-0.5)*1.1; d=min(d,smax(h,p.x-4.6-fbm(p.yz*0.7)*1.0,0.6)); } // bare head, thick messy hair
  else if(k==6){ d=sdCap(p,vec3(-8.8,0.0,0.0),vec3(8.8,0.0,0.0),4.4,3.5); d-=sin(p.x*1.4+sin(p.y*2.0)*0.6)*0.22*smoothstep(0.0,8.0,p.x); d-=(fbm(p.xy*1.2+uSeed)-0.5)*0.2; } // sleeve over the biceps, bunching at the elbow
  else if(k==7){ d=sdCap(p,vec3(-8.8,0.0,0.0),vec3(7.0,0.0,0.0),3.6,2.8); d=smin(d,sdCap(p,vec3(6.0,0.0,0.0),vec3(8.8,0.0,0.0),3.2,3.1),0.4); } // forearm to the cuff
  else if(k==8) d=sdEll(p,vec3(0.0),vec3(3.8,3.6,2.8));
  else if(k>=9&&k<=11){ d=sdEll(p,vec3(-0.8,0.0,0.0),vec3(3.2,2.9,1.6)); for(int i=0;i<4;i++){ float y=-2.1+float(i)*1.4; d=smin(d,sdCap(p,vec3(2.0,y,0.2),vec3(4.4,y,-0.8),0.66,0.6),0.3); } d=smin(d,sdCap(p,vec3(-1.4,-2.8,-0.2),vec3(1.6,-3.6,-0.6),0.75,0.62),0.4); } // a hand closed round a grip: knuckles forward
  else if(k==12){ d=sdEll(p,vec3(-0.6,0.0,-0.6),vec3(7.6,4.0,2.6)); d=smin(d,sdEll(p,vec3(5.0,0.0,-0.9),vec3(3.2,4.0,1.9)),1.2); d=smin(d,sdEll(p,vec3(-6.0,0.0,0.4),vec3(2.2,3.2,2.6)),1.0); } // a boot: toe cap, laces, the collar at the heel
  else { d=sdBox(p,vec3(-3.4,0.0,0.0),vec3(5.0,10.0,4.0),3.6); d=smin(d,sdBox(p,vec3(-9.0,0.0,1.0),vec3(2.4,8.6,3.0),2.0),1.0); for(int s=-1;s<=1;s+=2) d=min(d,sdBox(p,vec3(-3.4,float(s)*6.0,4.2),vec3(5.4,0.8,0.5),0.3)); } // the daypack: body, lid, compression straps
  return d;
}
vec3 wv(vec3 c, vec3 p, float k){ float w=0.5+0.5*sin(p.x*11.0)*sin(p.y*11.0); return c*(1.0-k*0.5+k*w)*(0.88+0.24*fbm(p.xy*0.9+uSeed)); }
vec3 dirt(vec3 c, vec3 p){ return mix(c,vec3(0.26,0.2,0.14),clamp((fbm(p.xy*0.35+vec2(5.0,1.0)+uSeed)-0.6)*1.4,0.0,0.45)); }
vec3 skinH(vec3 p){ return hx(0xc4906c)*(0.9+0.16*fbm(p.xy*1.5+uSeed)); }
vec3 alb(vec3 p, vec3 n){
  int k=uPart; vec3 c=vec3(0.8);
  if(k==0){ c=hx(0x4a5034); float pc=sdBox(p,vec3(-0.8,0.0,4.6),vec3(HD*0.5,HW*0.34,3.0),3.6); if(pc<0.35){ c=hx(0x5e5440); if(abs(fract((p.y+20.0)/4.2)-0.5)<0.07&&p.x<-HD*0.3) c*=0.7; if(p.x<-HD*0.4&&abs(p.y)<HW*0.3&&abs(p.x+HD*0.6)<HD*0.3) c=hx(0x4e4634); } for(int i=0;i<4;i++){ float y=-6.0+float(i)*4.0; if(abs(p.x-HD*0.62)<1.7&&abs(p.y-y)<1.8&&p.z>7.6) c=hx(0x4a4232)*(abs(p.x-HD*0.62-1.5)<0.3?0.6:1.0); } if(abs(abs(p.y)-HW*0.45)<2.0&&p.z>8.6) c=hx(0x544a36); c=wv(c,p,0.1); }
  else if(k==1){ c=hx(0xb4a278); bool vest=(p.x>HD*0.25||p.x<-HD*0.35)&&abs(p.y)>4.8&&abs(p.y)<HW*0.64; if(vest) c=hx(0x5a3a22)*(0.85+0.3*fbm(p.xy*1.8)); if(abs(abs(p.y)-HW*0.78)<1.1&&p.z>8.0) c=hx(0x7a6a48); for(int s=-1;s<=1;s+=2){ if(length(p.xy-vec2(HD*0.4,float(s)*HW*0.78))<0.8) c=hx(0xc8b070); } vec2 st=p.xy-vec2(HD*0.62,-HW*0.38); float a=atan(st.y,st.x), r=length(st); if(r<1.6+0.9*cos(a*5.0)) c=hx(0xd8b860); if(abs(p.x+HD*0.5)<1.6&&abs(p.y-HW*0.24)<2.6) c=hx(0x2b2b27); c=wv(c,p,vest?0.04:0.08); }
  else if(k==2){ vec2 m=mod(p.xy+vec2(sin(p.y*0.3),sin(p.x*0.3))*0.5+30.0,7.0); c=hx(0x8a2a22); if(m.y<3.0) c=mix(c,hx(0x2a0c0a),0.42); if(m.x<3.0) c=mix(c,hx(0x2a0c0a),0.36); if(abs(m.y-5.3)<0.25||abs(m.x-5.3)<0.25) c=mix(c,hx(0xe6c878),0.3); if(length(p.xy-vec2(2.0,0.0))<4.6&&p.z>8.0) c=hx(0x5a5a58); if(abs(p.x-7.3)<0.5&&fract(p.y*0.29)<0.18) c=hx(0xd0b28a); if(p.x>1.4&&p.x<6.2&&p.y>-12.3&&p.y<-7.4) c*=0.72; c=wv(c,p,0.1); }
  else if(k==3){ float hs=headH(p); if(hs<0.05&&p.x>4.0) return skinH(p); c=hx(0x5a5e40)*(0.85+0.3*fbm(p.xy*1.0+3.0)); c=mix(c,hx(0x2e3222),clamp((fbm(p.xy*0.8)-0.55)*2.5,0.0,0.6)); if(abs(p.x-6.2)<1.3&&abs(p.y)<2.0&&p.z>5.0) c=hx(0x222420); if(abs(abs(p.y)-6.6)<0.8) c=hx(0x2e3022); }
  else if(k==4){ float hs=headH(p); if(hs<0.05){ if(p.x>4.6) return skinH(p); return hx(0x2e2016)*(0.8+0.4*fbm(p.xy*3.0)); } c=hx(0x4a3a26)*(0.88+0.24*fbm(p.xy*2.0)); if(p.x>3.6&&p.z<4.0) c=hx(0x3a2c1c)*(0.9+0.2*fbm(p.xy*2.0)); float a=atan(p.y,p.x+0.8); if(abs(fract(a/1.0472+0.5)-0.5)<0.03&&p.x<3.6) c*=0.75; if(length(p.xy-vec2(-0.8,0.0))<0.7&&p.z>6.0) c*=0.6; }
  else if(k==5){ float hs=headH(p); if(hs<0.05) return skinH(p); float cl=fbm(p.xy*0.9+uSeed); c=hx(0x2e2016)*(0.8+0.25*sin(p.y*6.5+(cl-0.5)*9.0+vn(p.xy*2.0)*3.0)*0.4+0.3*(cl-0.5)); }
  else if(k==6||k==7||k==8){ c=vec3(0.93)*(0.88+0.2*fbm(p.xy*1.2+uSeed)); if(k==7&&p.x>6.0) c*=0.78; c*=0.95+0.05*sin(p.x*11.0)*sin(p.y*11.0); }
  else if(k>=9&&k<=11){ vec3 base=k==9?hx(0x3a3a36):k==10?hx(0x8a5a34):hx(0xd4a07c); c=base*(0.85+0.25*fbm(p.xy*2.0)); if(p.x>2.2&&k!=11) c*=0.85; if(k==9&&p.x<-1.0&&abs(p.y)<1.2) c=hx(0x262624); }
  else if(k==12){ c=hx(0x3a2c1e)*(0.82+0.3*fbm(p.xy*1.6)); if(p.x>4.0) c=hx(0x2a2016); if(abs(p.y)<1.3&&p.x>-4.0&&p.x<2.5&&fract(p.x*0.6)<0.35) c=hx(0x8a7a62); if(p.x<-5.0) c=hx(0x1e160e); }
  else { c=mix(hx(0x30361e),hx(0x56603c),smoothstep(-10.0,3.0,p.x))*(0.85+0.25*fbm(p.xy*1.5)); if(p.x<-6.6) c=hx(0x5a5240); if(abs(abs(p.y)-6.0)<0.9&&p.z>5.0) c=hx(0x20241a); }
  return dirt(c,p);
}`);
bakeGroup('cr', `
float sb(vec3 p, vec3 c, vec3 b, float r){ return sdBox(p,c,b-r,r); } /* a box whose half-size includes its rounding */
float sdRR(vec2 p, vec2 b, float r){ vec2 q=abs(p)-b+r; return length(max(q,0.0))+min(max(q.x,q.y),0.0)-r; }
float wheel(vec3 p, vec3 c, float r, float hw){ vec2 d=vec2(length(p.xz-c.xz)-r,abs(p.y-c.y)-hw); return min(max(d.x,d.y),0.0)+length(max(d,0.0))-0.6; } /* a tyre: a disc on its edge, axle across the car */
float tyres(vec3 p, int k){ float d=1e3; if(k==2){ for(int i=0;i<6;i++){ float sx=i<2?48.0:i<4?-28.0:-42.0, sy=(i%2==0)?1.0:-1.0; d=min(d,wheel(p,vec3(sx,sy*19.6,6.0),5.6,1.6)); } } else { for(int i=0;i<4;i++){ float sx=i<2?24.5:-24.0, sy=(i%2==0)?1.0:-1.0; d=min(d,wheel(p,vec3(sx,sy*17.0,5.4),k==3?4.0:4.9,1.5)); } } return d; }
float cabin(vec3 p, int k){ float tw=13.2+1.6*smoothstep(15.0,9.0,p.z); float cab=sb(p,vec3(-4.0,0.0,10.6),vec3(18.0,tw,3.8),3.0);
  cab=smax(cab,(p.z-14.6)+(p.x-5.0)*0.55,1.4); cab=smax(cab,(p.z-14.6)-(p.x+14.5)*0.75,1.4); return cab; } /* the glasshouse: narrower than the body, sides leaning in, raked screens front and back */
float sedan(vec3 p, int k){ /* a mid-size saloon from above: front at +x, a tub with rounded corners, a cabin with raked glass, tyres in the arches, mirrors, bumpers */
  float w=18.6-1.6*smoothstep(26.0,39.0,abs(p.x));
  float body=smax(sdRR(p.xy,vec2(38.6,w),p.x>0.0?8.0:6.5),abs(p.z-5.2)-4.0,2.6); /* rounded nose and tail in plan, soft edges in section */
  body=smax(body,p.z-9.4+max(0.0,abs(p.x)-18.0)*(p.x>0.0?0.11:0.07)-0.6*(1.0-abs(p.y)/19.0),1.6); /* bonnet and boot fall away toward the ends and the shoulders round off */
  float cab=cabin(p,k);
  if(k==3){ cab+=0.9*smoothstep(0.0,10.0,10.0-abs(p.x+3.0))*step(13.0,p.z); cab=smax(cab,-sb(p,vec3(-3.5,0.0,12.0),vec3(13.0,13.0,3.2),1.0),0.8); } /* burnt: the roof sags, the glass is gone */
  float d=smin(body,cab,2.2);
  d+=0.22*exp(-pow(p.x-21.5,2.0)/0.25)*step(8.0,p.z)+0.22*exp(-pow(p.x+23.5,2.0)/0.25)*step(8.0,p.z); /* bonnet and boot shut lines */
  d=min(d,tyres(p,k));
  if(k!=3) for(int s=-1;s<=1;s+=2) d=min(d,sb(p,vec3(8.5,float(s)*20.0,10.0),vec3(1.5,1.5,0.9),0.6));
  d=min(d,sb(p,vec3(37.8,0.0,3.8),vec3(1.4,16.5,1.6),0.8)); d=min(d,sb(p,vec3(-37.8,0.0,3.8),vec3(1.4,16.5,1.6),0.8));
  if(k==1) d=min(d,sb(p,vec3(-2.0,0.0,15.6),vec3(2.4,10.0,0.9),0.5)); /* the light-bar mount */
  if(k==3) d-=(fbm(p.xy*0.35+3.0)-0.5)*1.1; /* fire-warped panels */
  return d;
}
float boxTruck(vec3 p){ /* a delivery truck: cab and bonnet at the front, a tall ribbed box behind */
  float box=sb(p,vec3(-15.0,0.0,13.0),vec3(42.5,21.2,11.5),1.2);
  box-=0.32*smoothstep(0.8,1.0,abs(fract((p.x+57.5)/6.4)*2.0-1.0))*step(23.0,p.z)*step(abs(p.y),19.0);
  float cab=sb(p,vec3(43.5,0.0,8.6),vec3(13.0,20.0,7.0),3.0); cab=smax(cab,(p.z-16.0)+(p.x-49.0)*0.9,1.0);
  float hood=sb(p,vec3(53.5,0.0,5.6),vec3(5.0,19.0,4.0),2.4);
  float d=min(box,smin(cab,hood,2.0));
  d=min(d,tyres(p,2));
  for(int s=-1;s<=1;s+=2) d=min(d,sb(p,vec3(41.0,float(s)*22.0,12.0),vec3(1.2,1.8,2.0),0.5));
  d=min(d,sb(p,vec3(58.0,0.0,3.6),vec3(1.4,18.5,1.8),0.8));
  return d;
}
float map(vec3 p){ int k=uPart; float d=k==2?boxTruck(p):sedan(p,k); return max(d,-p.z); }
vec3 albB(vec3 p, vec3 n){
  int k=uPart; vec3 c;
  if(k==2){
    c=hx(0xb4b2aa)*(0.9+0.12*fbm(p.xy*0.4+2.0)); if(p.x>27.5) c=hx(0xaeaca4)*(0.9+0.12*fbm(p.xy*0.5));
    if(p.x>27.5&&p.z>9.0&&(p.x>45.0||abs(p.y)>15.5)&&p.z<16.5) c=hx(0x1a2228)*(0.85+0.3*smoothstep(-1.0,1.0,p.y*0.1+p.x*0.05-3.0)); /* cab glass */
    if(p.z>23.0&&abs(fract((p.x+57.5)/6.4)*2.0-1.0)>0.86) c*=0.9; c=mix(c,hx(0x6a6258),clamp((fbm(p.xy*0.12+4.0)-0.55)*1.0,0.0,0.25)*step(22.0,p.z)); /* rain streaks on the roof */
    if(p.x>56.8) c=abs(p.y)>12.0&&abs(p.y)<17.0&&p.z>3.0?hx(0xe8e0c0):hx(0x2a2a2a);
    if(p.x<-57.0&&abs(p.y)>16.0&&p.z<6.0) c=hx(0xa02020);
  } else {
    c=hx(0xd8d8d8)*(0.92+0.1*fbm(p.xy*0.5+uSeed)); /* paint, tinted per car in the game */
    if(k==1){ c=hx(0x1c1c20); if(p.x<20.5&&p.x>-22.5&&!(p.z>13.6)) c=hx(0xe8e6e0); if(p.z>13.6) c=hx(0xe8e6e0); } /* black-and-white: dark bonnet and boot, white doors and roof */
    bool glass=cabin(p,k)<0.45&&p.z>9.0&&n.z<0.9; /* glass is every steep face of the glasshouse; the flat top is roof */
    if(glass) c=k==3?hx(0x0e0c0c):mix(hx(0x141c24),hx(0x5a6e7c),0.55*smoothstep(0.35,0.75,fract((p.x*0.7-p.y*0.9)*0.035+0.3))); /* dark glass with a streak of sky in it */
    if(p.x>37.0) c=abs(p.y)>9.0&&abs(p.y)<15.0&&p.z>3.0&&p.z<7.0?hx(0xe8e2c8):hx(0x262626);
    if(p.x<-37.0) c=abs(p.y)>10.0&&abs(p.y)<16.0&&p.z>3.4?hx(0xa82020):hx(0x262626);
    if(abs(p.y)>18.0&&abs(p.x-8.5)<2.0&&p.z>8.6) c=hx(0x202020);
    if(k==3){ c=mix(hx(0x2c2824),hx(0x18140f),fbm(p.xy*0.4+5.0)); c=mix(c,hx(0x5e3820),clamp((fbm(p.xy*0.18+9.0)-0.5)*1.5,0.0,0.6)); c=mix(c,hx(0x5a564e),clamp((fbm(p.xy*0.35+2.0)-0.68)*1.6,0.0,0.3)); if(glass) c=hx(0x0c0a08); } /* rust and bare primer where the paint burnt off, the glass gone */
  }
  if(tyres(p,k)<0.35) c=k==3?hx(0x5a5650):hx(0x161616); /* tyres where they show at the arches (burnt: bare rims) */
  if(k!=3){ c=mix(c,hx(0x3a3228),clamp((fbm(p.xy*0.3+7.0)-0.58)*1.3,0.0,0.4)*smoothstep(8.0,2.0,p.z)); } /* road grime low down */
  return c;
}
vec3 alb(vec3 p, vec3 n){ return albB(p,n)*mix(0.55,1.0,smoothstep(0.5,uBox.z*0.55,p.z))*(0.78+0.22*smoothstep(0.1,0.85,n.z)); }
`); // cars as real objects: the same 3D pictures as the characters
[['car', 16], ['police', 17], ['truck', 26], ['carburn', 16]].forEach(([n, z], i) => bakePart(n, 'cr', i, z, 120 + i * 3.3));
bakeGroup('hl', `
float sb(vec3 p, vec3 c, vec3 b, float r){ return sdBox(p,c,b-r,r); }
float hull(vec3 p){ /* the fuselage lofted along its length: a blunt rounded nose, a boxy cabin, the tail cone sweeping up into the boom */
  float x=p.x, hw, zc, hh;
  if(x>92.0){ float t=clamp((x-92.0)/34.0,0.0,1.0), e=sqrt(max(0.0,1.0-t*t)); hw=18.5*e; hh=15.5*sqrt(max(0.0,1.0-t*t*0.8)); zc=16.0-3.0*t; }
  else if(x>16.0){ hw=19.5-0.8*smoothstep(80.0,92.0,x); hh=16.0; zc=16.0; }
  else { float t=smoothstep(16.0,-28.0,x); hw=mix(19.5,7.5,t); hh=mix(16.0,7.5,t); zc=mix(16.0,24.0,t); }
  vec2 q=vec2(abs(p.y),p.z-zc), b=vec2(max(hw,0.5),max(hh,0.5)); float r=min(min(b.x,b.y)*0.62,9.0); vec2 dd=abs(q)-b+r;
  float sec=length(max(dd,0.0))+min(max(dd.x,dd.y),0.0)-r;
  return max(sec*0.8,max(x-126.0,-30.0-x));
}
float heli(vec3 p){
  float d=hull(p);
  d=smax(d,-sb(p,vec3(45.0,sign(p.y)*20.5,16.0),vec3(19.0,3.2,10.5),1.0),0.8); /* the sliding cabin doors, open */
  d=smin(d,sb(p,vec3(40.0,0.0,33.0),vec3(30.0,9.5,6.0),4.0),3.0); /* the doghouse over the transmission */
  for(int s=-1;s<=1;s+=2){ float y=float(s)*11.5; d=smin(d,sdCap(p,vec3(6.0,y,32.0),vec3(52.0,y,32.5),6.0,5.2),2.0); /* the two engines */
    d=min(d,sdCap(p,vec3(4.0,float(s)*13.0,32.0),vec3(-4.0,float(s)*19.0,31.0),3.6,3.2)); } /* exhausts, turned out to the sides */
  d=smin(d,sdCap(p,vec3(48.0,0.0,38.0),vec3(48.0,0.0,45.0),3.4,3.0),1.0); d=min(d,sdSph(p,vec3(48.0,0.0,46.5),5.5)); /* mast and rotor head */
  d=smin(d,sdCap(p,vec3(-22.0,0.0,24.0),vec3(-114.0,0.0,27.0),7.6,4.4),3.0); /* tail boom */
  d=smin(d,sb(p,vec3(-118.0,0.0,35.0),vec3(10.0,2.6,13.0),1.8),1.4); /* tail pylon */
  d=min(d,sb(p,vec3(-114.0,0.0,22.5),vec3(7.0,34.0,1.4),1.2)); /* the stabilator */
  { vec3 c=vec3(-118.0,6.4,37.0); vec2 w=vec2(length(p.xz-c.xz)-12.5,abs(p.y-c.y)-0.7); d=min(d,min(max(w.x,w.y),0.0)+length(max(w,0.0))-0.3); } /* tail rotor, a thin disc at the side of the pylon */
  for(int s=-1;s<=1;s+=2){ vec3 c=vec3(54.0,float(s)*24.5,5.2); vec2 w=vec2(length(p.xz-c.xz)-5.0,abs(p.y-c.y)-2.2); d=min(d,min(max(w.x,w.y),0.0)+length(max(w,0.0))-0.5); d=min(d,sb(p,vec3(54.0,float(s)*21.5,9.0),vec3(3.0,3.0,5.0),1.0)); } /* main wheels on short struts */
  d=min(d,sdSph(p,vec3(-96.0,0.0,4.0),3.6)); d=min(d,sdCap(p,vec3(-96.0,0.0,5.0),vec3(-92.0,0.0,16.0),1.4,1.4)); /* tail wheel */
  return d;
}
float map(vec3 p){ return max(heli(p),-p.z); }
vec3 alb(vec3 p, vec3 n){
  vec3 c=hx(0x4b5135)*(0.9+0.14*fbm(p.xy*0.11+uSeed)); c=mix(c,hx(0x5c5f45),clamp((fbm(p.xy*0.05+3.0)-0.55)*1.4,0.0,0.35)); /* olive drab, sun-faded in patches */
  float pl=step(abs(fract((p.x+4.0)/21.0)-0.5),0.016)*step(8.0,p.z)*step(-26.0,p.x); c*=1.0-0.2*pl; /* panel seams */
  if(p.x>96.0&&p.x<115.0&&p.z>17.0&&(n.z<0.97||abs(p.y)<15.0)) c=mix(hx(0x0e161b),hx(0x5a6e7a),0.5*smoothstep(0.3,0.8,fract((p.x*0.6-p.y*0.8)*0.03+0.2))); /* windscreen */
  if(p.x>80.0&&p.x<96.0&&p.z>28.0&&abs(p.y)<13.0) c=mix(hx(0x1a2620),hx(0x3e5248),0.35*fbm(p.xy*0.2)); /* overhead windows, green-tinted */
  if(p.x>=115.0&&p.z>11.0) c=hx(0x1c1d18); /* the anti-glare nose */
  if(abs(abs(p.y)-20.5)<3.4&&p.x>26.0&&p.x<64.0&&p.z>5.5&&p.z<26.5) c=hx(0x141619); /* the dark cabin through the open doors */
  if(p.z>27.0&&abs(p.y)<16.0&&p.x>0.0&&p.x<58.0) c*=0.9; float eng=0.0; for(int s=-1;s<=1;s+=2){ if(length(p.yz-vec2(float(s)*15.5,31.5))<4.0&&p.x<4.0&&p.x>-6.0) eng=1.0; } if(eng>0.5) c=mix(hx(0x2a2622),hx(0x0a0908),0.6); /* sooty exhausts */
  if(length(p.xy-vec2(48.0,0.0))<6.0&&p.z>40.0) c=hx(0x2c2e2c); /* rotor head */
  if(p.x<-112.0&&abs(p.y-6.4)<1.2) c=hx(0x222320); /* tail rotor */
  if(p.z<10.5&&(abs(abs(p.y)-24.5)<2.8||p.x<-90.0)) c=hx(0x141414); /* tyres */
  { vec2 cq=p.xy-vec2(-40.0,0.0); if(max(abs(cq.x),abs(cq.y))<7.0&&p.z>27.0){ c=hx(0xe8e4da); if(min(abs(cq.x),abs(cq.y))<1.8&&max(abs(cq.x),abs(cq.y))<5.4) c=hx(0xb02020); } } /* the medevac cross on the boom */
  c=mix(c,hx(0x2a261e),clamp((fbm(p.xy*0.25+7.0)-0.6)*1.2,0.0,0.3)*smoothstep(12.0,4.0,p.z)); /* grime low down */
  return c*mix(0.62,1.0,smoothstep(1.0,30.0,p.z))*(0.8+0.2*smoothstep(0.1,0.85,n.z));
}
`); // the evac helicopter: a UH-60-style medevac in olive drab, built like the cars
bakePart('heli', 'hl', 0, 52, 140);
bakeGroup('pk', `
float rounds(vec3 p, vec2 c0, vec2 step, int nx, int ny, float r, float zc){ float d=1e3; for(int j=0;j<4;j++){ if(j>=ny) break; for(int i=0;i<6;i++){ if(i>=nx) break; vec2 c=c0+vec2(float(i),float(j))*step; d=min(d,sdSph(p,vec3(c,zc),r)); } } return d; } /* rows of cartridges standing in an open box: their tips, seen from above */
float map(vec3 p){
  int k=uPart; float d;
  if(k==0){ /* a hard first-aid case: lid seam, two latches, a carry handle */
    d=sdBox(p,vec3(0.0,0.0,3.0),vec3(10.0,8.0,2.6),2.0); d=smin(d,sdCap(p,vec3(-4.5,-9.4,4.6),vec3(4.5,-9.4,4.6),1.1,1.1),1.0);
    for(int s=-1;s<=1;s+=2) d=min(d,sdBox(p,vec3(float(s)*6.0,8.6,3.4),vec3(1.6,0.7,1.2),0.3));
    d+=0.25*exp(-pow(p.z-3.2,2.0)*4.0)*step(9.0,abs(p.y)+abs(p.x)*0.0+1.0);
  }
  else if(k==1||k==4){ /* a steel ammo can: ribbed lid, folding handle, the lid latch */
    float L=k==4?13.0:10.0, Wd=k==4?6.8:5.6; d=sdBox(p,vec3(0.0,0.0,4.0),vec3(L,Wd,3.6),1.0);
    for(int i=-2;i<=2;i++) d=smin(d,sdBox(p,vec3(float(i)*L*0.38,0.0,7.7),vec3(L*0.12,Wd*0.86,0.3),0.3),0.4);
    d=min(d,sdCap(p,vec3(-L*0.4,0.0,8.6),vec3(L*0.4,0.0,8.6),0.8,0.8)); d=min(d,sdBox(p,vec3(L+0.8,0.0,5.0),vec3(0.9,2.4,2.0),0.3));
  }
  else if(k==2||k==3||k==5){ /* an open cardboard box of rounds: the flap folded back, the cartridges standing in rows */
    float L=k==3?9.0:k==5?8.0:8.4, Wd=k==3?6.4:6.0; d=sdBox(p,vec3(0.0,0.0,2.4),vec3(L,Wd,2.2),0.4);
    float inner=sdBox(p,vec3(0.0,0.0,3.6),vec3(L-1.0,Wd-1.0,2.0),0.2); d=smax(d,-inner,0.3);
    d=min(d,sdBox(p,vec3(-L-2.6,0.0,0.6),vec3(2.4,Wd,0.35),0.2));
    if(k==2) d=min(d,rounds(p,vec2(-L+2.4,-Wd+2.4),vec2(2.4,2.4),6,4,1.05,3.6));
    if(k==3){ d=min(d,rounds(p,vec2(-L+2.6,-Wd+2.6),vec2(3.2,3.6),5,3,1.5,3.4)); for(int s=0;s<2;s++){ vec3 c=vec3(-3.0+float(s)*7.0,9.6,1.4); d=min(d,sdCap(p,c-vec3(2.4,0.5*float(s*2-1),0.0),c+vec3(2.4,0.5*float(s*2-1),0.0),1.4,1.4)); } /* two loose shells beside the box */ }
    if(k==5) d=min(d,rounds(p,vec2(-L+2.2,-Wd+2.2),vec2(2.6,2.6),6,4,1.2,3.4));
  }
  else if(k==6){ /* a wooden case of 40 mm grenades, lid off, the rounds in their cradles */
    d=sdBox(p,vec3(0.0,0.0,3.0),vec3(12.5,8.0,2.8),0.6); d=smax(d,-sdBox(p,vec3(0.0,0.0,4.4),vec3(11.4,6.9,2.6),0.3),0.3);
    d=min(d,rounds(p,vec2(-8.4,-3.6),vec2(5.6,7.2),4,2,2.2,4.0));
  }
  else if(k==7){ /* a military supply drop: one olive-drab plywood crate on a pallet, steel corners, two cargo straps round it, a stencilled lid */
    d=sdBox(p,vec3(0.0,0.0,1.1),vec3(15.4,15.4,1.0),0.3); d+=0.35*smoothstep(0.55,0.95,abs(fract(p.x/5.0)*2.0-1.0))*step(p.z,2.4)*step(14.0,max(abs(p.x),abs(p.y))+1.0);
    float cr=sdBox(p,vec3(0.0,0.0,6.3),vec3(13.6,13.6,4.6),0.8); cr+=0.18*smoothstep(0.9,1.0,abs(fract((p.y+13.6)/9.07)*2.0-1.0))*step(10.3,p.z); d=min(d,cr); /* the lid in three long boards */
    for(int i=0;i<4;i++){ vec2 c=vec2(i<2?-12.5:12.5,(i==0||i==2)?-12.5:12.5); d=min(d,sdBox(p,vec3(c,6.3),vec3(1.6,1.6,4.75),0.3)); } /* steel corner caps */
    for(int s=-1;s<=1;s+=2){ float x=float(s)*8.2; d=min(d,sdBox(p,vec3(x,0.0,6.3),vec3(1.25,13.9,4.82),0.2)); d=min(d,sdBox(p,vec3(x,-6.0,11.15),vec3(1.7,1.1,0.25),0.2)); } /* two straps, each with its buckle */
  }
  else { /* a military rifle case: olive-drab moulded shell, ribbed lid round a flat label panel, four black latches, two handles, a pressure valve */
    d=sdBox(p,vec3(0.0,0.0,3.8),vec3(29.0,9.8,3.5),1.8);
    float rib=smoothstep(0.7,1.0,abs(fract((p.x+29.0)/7.25)*2.0-1.0))*step(6.0,p.z)*step(13.0,abs(p.x)); d-=0.32*rib;
    d+=0.22*(1.0-smoothstep(0.0,0.5,max(abs(p.x)-12.0,abs(p.y)-6.4)))*step(6.6,p.z); /* the recessed label panel */
    for(int i=0;i<4;i++){ float x=-21.0+float(i)*14.0; d=min(d,sdBox(p,vec3(x,10.1,4.0),vec3(1.9,0.9,1.7),0.35)); } /* latches */
    for(int s=-1;s<=1;s+=2) d=min(d,sdCap(p,vec3(float(s)*13.0-3.2,-10.6,4.2),vec3(float(s)*13.0+3.2,-10.6,4.2),0.9,0.9));
    d=min(d,sdCap(p,vec3(25.0,-6.0,7.0),vec3(25.0,-6.0,7.6),1.3,1.3)); /* pressure valve */
  }
  return d;
}
vec3 albB(vec3 p, vec3 n){
  int k=uPart; vec3 c;
  if(k==0){ c=hx(0x2a8a4c)*(0.85+0.2*fbm(p.xy*0.8)); if(p.z>5.0){ vec2 q=abs(p.xy); if((q.x<1.7&&q.y<5.2)||(q.x<5.2&&q.y<1.7)) c=hx(0xf2ede2); } if(abs(p.y)>8.2) c=hx(0x2a2a2c); if(p.z<1.2) c*=0.7; c=mix(c,hx(0x4a3a2a),clamp((fbm(p.xy*0.6+3.0)-0.62)*2.0,0.0,0.4)); return c; }
  if(k==1||k==4){ c=hx(k==4?0x4e5a34:0x56603a)*(0.82+0.25*fbm(p.xy*0.7)); if(p.z>7.4&&abs(p.y)<1.0) c=hx(0x2a2e20); float L=k==4?13.0:10.0; if(p.x>L) c=hx(0x3a3e2a); if(p.z>7.0&&abs(p.y+3.4)<0.5&&abs(p.x)<L*0.7) c=hx(0xd8c050); if(p.z>7.0&&abs(p.y+1.8)<0.4&&abs(p.x)<L*0.5) c=hx(0xd8c050); c=mix(c,hx(0x6a4a2a),clamp((fbm(p.xy*0.4+5.0)-0.6)*1.8,0.0,0.5)); return c; }
  if(k==2||k==3||k==5){ float L=k==3?9.0:k==5?8.0:8.4; vec3 box=k==2?hx(0xc8a050):k==3?hx(0xa8322a):hx(0x8a6a44); c=box*(0.85+0.2*fbm(p.xy*0.8)); if(p.x<-L) c=box*0.8; if(p.x<-L-1.0&&abs(p.y)<2.4) c=hx(0xe8e0c8); if(abs(p.x)<L&&p.z>4.4&&abs(p.y)<5.6){ c=k==3?hx(0xb08a3a):hx(0xc89a48); if(k==3&&length(fract((p.xy+vec2(9.0,6.4))/vec2(3.2,3.6))-0.5)<0.18) c=hx(0x6a4a1a); } if(k==3&&p.y>7.6){ float sx=p.x-(p.x>1.0?4.0:-3.0); c=sx<-1.4?hx(0xc89a48):hx(0xa8322a); } return c; }
  if(k==6){ c=hx(0x6a5a3a)*(0.8+0.3*fbm(vec2(p.x*0.2,p.y*2.0))); if(abs(p.x)<11.4&&abs(p.y)<6.9&&p.z<5.4) c=hx(0x3a3424); if(p.z>4.6){ c=hx(0x5a6038); if(p.z>5.6) c=hx(0xc8a040); } if(abs(p.x)>11.6&&p.z>5.0&&abs(p.y)<3.0) c=hx(0xd8d0b0); return c; }
  if(k==7){ c=hx(0x7a6444)*(0.8+0.3*fbm(vec2(p.x*0.3,p.y*1.5))); if(abs(fract(p.x/5.0)*2.0-1.0)>0.8&&p.z<2.4) c*=0.55; /* pallet */
    if(p.z>2.3){ c=hx(0x56603a)*(0.84+0.24*fbm(p.xy*0.5+2.0)); c=mix(c,hx(0x3e4628),clamp((fbm(p.xy*0.3+7.0)-0.55)*1.6,0.0,0.5)); if(abs(fract((p.y+13.6)/9.07)*2.0-1.0)>0.9&&p.z>10.2) c*=0.6;
      if(max(abs(p.x),abs(p.y))>11.0&&min(abs(abs(p.x)-12.5),abs(abs(p.y)-12.5))<1.8&&max(abs(abs(p.x)-12.5),abs(abs(p.y)-12.5))<1.8) c=hx(0x3a3c3a)*(0.85+0.3*fbm(p.xy*2.0)); /* corner caps */
      if(p.z>10.6&&abs(p.x)<6.4){ vec2 q=p.xy-vec2(0.0,1.0); if(abs(q.x)<5.0&&abs(q.y)<7.5&&fract(q.y*0.42)<0.45&&abs(q.x)<(fract(q.y*0.13)<0.5?4.6:3.0)) c=hx(0xd8d2b8); } /* stencilled lot markings */
      if(abs(abs(p.x)-8.2)<1.25) c=hx(0xb89c48)*(0.85+0.25*fbm(vec2(p.x*3.0,p.y*0.6))); if(abs(abs(p.x)-8.2)<1.7&&abs(p.y+6.0)<1.1&&p.z>11.0) c=hx(0x8a8c88); } /* straps, buckles */
    c=mix(c,hx(0x3a2e20),clamp((fbm(p.xy*0.35+2.0)-0.62)*1.4,0.0,0.3)); return c; }
  c=hx(0x5a6438)*(0.86+0.2*fbm(p.xy*0.6)); c=mix(c,hx(0x3e4628),clamp((fbm(p.xy*0.25+4.0)-0.55)*1.5,0.0,0.45)); /* olive-drab polymer, scuffed */
  if(abs(p.y)>9.7||p.z<1.6) c*=0.78; if(smoothstep(0.7,1.0,abs(fract((p.x+29.0)/7.25)*2.0-1.0))>0.5&&abs(p.x)>13.0&&p.z>6.0) c*=1.12;
  if(p.y>9.4&&abs(fract((p.x+21.0)/14.0+0.5)-0.5)*14.0<2.2) c=hx(0x1c1c1a); if(p.y<-9.6&&abs(abs(p.x)-13.0)<3.6) c=hx(0x202020); if(length(p.xy-vec2(25.0,-6.0))<1.4&&p.z>6.6) c=hx(0x2a2a28);
  if(p.z>6.4&&abs(p.x)<11.6&&abs(p.y)<6.0){ c=hx(0x4e5832)*(0.9+0.15*fbm(p.xy*1.2)); vec2 q=p.xy-vec2(-1.0,0.6); if(abs(q.y)<4.4&&fract(q.y*0.36)<0.42&&abs(q.x)<(fract(q.y*0.11+0.3)<0.5?9.0:6.2)&&fract(q.x*0.42)<0.8) c=hx(0xd8d2b8); } /* white stencilled lettering on the label panel */
  return c;
}
vec3 alb(vec3 p, vec3 n){ return albB(p,n)*mix(0.62,1.0,smoothstep(-0.5,uBox.z*0.75,p.z))*(0.74+0.26*smoothstep(0.1,0.85,n.z)); }
`); // pickups and supply drops as real objects
[['medkit', 8], ['ammo', 10], ['ammo_light', 6], ['ammo_shells', 6], ['ammo_rifle', 10], ['ammo_heavy', 6], ['ammo_gren', 8], ['crate', 12], ['wcase', 11]].forEach(([n, z], i) => { bakePart(n, 'pk', i, z, 90 + i * 2.7, true); BAKE.parts[n].sl = true; });
['hb0', 'hb1', 'hb2', 'hh0', 'hh1', 'hh2', 'h_upper', 'h_fore', 'h_elbow', 'h_glove', 'h_glove2', 'h_hand', 'h_foot', 'h_pack'].forEach((n, i) => bakePart(n, 'hr', i, i <= 2 ? 16 : i <= 5 ? 10 : i === 13 ? 12 : 6, 40 + i * 2.3));
