/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Pickups and supply drops as 3D shapes. Each group is SDF code (map: the shape, alb: its colours) that tools/bake renders into
// the pictures the game ships; dist leaves the code out (see tools/lib/source.mjs).
import { BAKE, bakeGroup, bakePart } from '../bake.js';
export function shapePickups() {
  bakeGroup(
    'pk',
    `
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
  `
  ); // pickups and supply drops as real objects
  [
    ['medkit', 8],
    ['ammo', 10],
    ['ammo_light', 6],
    ['ammo_shells', 6],
    ['ammo_rifle', 10],
    ['ammo_heavy', 6],
    ['ammo_gren', 8],
    ['crate', 12],
    ['wcase', 11],
  ].forEach(([n, z], i) => {
    bakePart(n, 'pk', i, z, 90 + i * 2.7, true);
    BAKE.parts[n].sl = true;
  });
}
