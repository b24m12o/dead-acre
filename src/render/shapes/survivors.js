/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The survivors as 3D shapes: bodies, heads, arms, gloves, boots, the pack. Each group is SDF code (map: the shape, alb: its colours) that tools/bake renders into
// the pictures the game ships; dist leaves the code out (see tools/lib/source.mjs).
import { bakeGroup, bakePart } from '../bake.js';
export function shapeSurvivors() {
  bakeGroup(
    'hr',
    `
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
  }`
  );
  [
    'hb0',
    'hb1',
    'hb2',
    'hh0',
    'hh1',
    'hh2',
    'h_upper',
    'h_fore',
    'h_elbow',
    'h_glove',
    'h_glove2',
    'h_hand',
    'h_foot',
    'h_pack',
  ].forEach((n, i) => bakePart(n, 'hr', i, i <= 2 ? 16 : i <= 5 ? 10 : i === 13 ? 12 : 6, 40 + i * 2.3));
}
