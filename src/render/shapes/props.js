/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Street props as 3D shapes, seen at the game's angle so their fronts show. Each group is SDF code (map: the shape, alb: its colours) that tools/bake renders into
// the pictures the game ships; dist leaves the code out (see tools/lib/source.mjs).
import { O_SIZES, bakeGroup, bakePart } from '../bake.js';
export function shapeProps() {
  bakeGroup(
    'pr',
    `
  float cylZ(vec3 p, vec2 c, float r, float z0, float z1, float rr){ vec2 d=vec2(length(p.xy-c)-r+rr,abs(p.z-(z0+z1)*0.5)-(z1-z0)*0.5+rr); return min(max(d.x,d.y),0.0)+length(max(d,0.0))-rr; } /* an upright cylinder from z0 to z1, edges rounded by rr */
  /* each prop is modelled in its own units, then stretched to the size the game draws it (S) and, for the ones
     that sit at any angle, turned to one of its headings. +y is toward the viewer (down the screen), so fronts face +y */
  vec3 S;
  int K;
  vec3 frame(vec3 p){
    int k=uPart; K=k; S=vec3(1.0);
    if(k==0) S=vec3(1.15,1.15,0.87); else if(k==1) S=vec3(1.0,1.0,0.88); else if(k==2) S=vec3(1.35,1.35,0.82); else if(k==3) S=vec3(1.4,1.4,0.88); else if(k==10||k==11) S=vec3(1.15,1.15,1.0);
    if(k>=10){ int b=k>=30?30:k>=20?20:10; float a=float(k-b)*(b==10?3.14159265:0.78539816)+(b==20?3.14159265:0.0); /* the cart's handle is at its back, -x */ float c=cos(a), s=sin(a); p.xy=mat2(c,-s,s,c)*p.xy; K=b; }
    return p/S;
  }
  float hydrant(vec3 p){ /* flange, barrel, band, domed bonnet, operating nut; hose nozzles at the sides, the pumper nozzle to the front */
    float d=cylZ(p,vec2(0.0),5.4,0.0,1.6,0.5);
    d=smin(d,cylZ(p,vec2(0.0),4.1,0.0,10.6,0.4),0.8);
    d=min(d,cylZ(p,vec2(0.0),4.7,9.7,11.3,0.5));
    d=smin(d,max(sdEll(p,vec3(0.0,0.0,11.2),vec3(4.3,4.3,3.0)),10.8-p.z),0.5);
    d=min(d,cylZ(p,vec2(0.0),1.25,13.4,15.0,0.3));
    for(int s=-1;s<=1;s+=2){ float sx=float(s); d=smin(d,sdCap(p,vec3(sx*3.4,0.0,7.2),vec3(sx*5.6,0.0,7.2),1.45,1.45),0.5); d=min(d,sdCap(p,vec3(sx*5.5,0.0,7.2),vec3(sx*6.1,0.0,7.2),1.8,1.8)); }
    d=smin(d,sdCap(p,vec3(0.0,3.2,6.4),vec3(0.0,5.0,6.4),2.0,2.0),0.6); d=min(d,sdCap(p,vec3(0.0,5.0,6.4),vec3(0.0,5.6,6.4),2.4,2.4));
    return d;
  }
  float bin(vec3 p){ /* a galvanised street bin: corrugated sides, two pressed bands, a domed lid with a handle */
    float a=atan(p.y,p.x);
    float rib=0.22*smoothstep(0.2,0.9,abs(sin(a*14.0)))*step(1.5,p.z)*step(p.z,12.6);
    float band=0.4*(exp(-pow(p.z-3.6,2.0)*1.6)+exp(-pow(p.z-10.4,2.0)*1.6));
    float d=cylZ(p,vec2(0.0),7.25,0.0,13.4,0.6)-rib-band;
    d=min(d,cylZ(p,vec2(0.0),7.9,12.9,14.0,0.5));
    d=smin(d,max(sdEll(p,vec3(0.0,0.0,13.8),vec3(7.4,7.4,1.7)),13.6-p.z),0.4);
    d=min(d,sdCap(p,vec3(-2.6,0.0,16.4),vec3(2.6,0.0,16.4),0.75,0.75));
    for(int s=-1;s<=1;s+=2) d=min(d,sdCap(p,vec3(float(s)*2.6,0.0,15.0),vec3(float(s)*2.6,0.0,16.4),0.6,0.6));
    d+=0.25*(fbm(p.xy*0.5+p.z*0.3)-0.5)*step(p.z,13.0); /* knocks and dents */
    return d;
  }
  float drum(vec3 p, bool open){ /* a 55-gallon steel drum: rolling hoops, rims top and bottom, two bung caps; open: burnt out, lid gone, air holes punched round the foot */
    float d=cylZ(p,vec2(0.0),9.4,0.0,19.0,0.9);
    for(int i=0;i<2;i++){ float z=i==0?6.4:12.6; d=smin(d,cylZ(p,vec2(0.0),9.9,z-0.55,z+0.55,0.45),0.5); }
    d=min(d,cylZ(p,vec2(0.0),9.8,18.2,19.4,0.5)); d=min(d,cylZ(p,vec2(0.0),9.8,0.0,0.9,0.4));
    if(open){
      d=max(d,-cylZ(p,vec2(0.0),8.7,3.0,25.0,0.4));
      for(int i=0;i<7;i++){ float a=float(i)*0.8976+0.3; d=max(d,-sdSph(p,vec3(9.4*cos(a),9.4*sin(a),3.6),1.25)); }
      d+=0.35*(fbm(p.xy*0.4+p.z*0.5)-0.5);
    } else {
      d=max(d,-cylZ(p,vec2(0.0),8.6,18.9,20.0,0.3)); /* the lid sits a little inside the rim */
      d=min(d,cylZ(p,vec2(4.4,2.6),1.25,18.6,19.5,0.3)); d=min(d,cylZ(p,vec2(-5.0,-2.4),0.9,18.6,19.4,0.3));
    }
    return d;
  }
  float mailbox(vec3 p){ /* a blue collection box: arched top, pull-down chute, four short legs */
    float d=max(sdBox(p,vec3(0.0,0.0,10.75),vec3(5.4,4.8,7.4),0.4),length(vec2(p.x,p.z-11.0))-7.5);
    for(int i=0;i<4;i++){ vec2 c=vec2(i<2?-4.4:4.4,(i==0||i==2)?-3.8:3.8); d=min(d,sdBox(p,vec3(c,1.6),vec3(0.5,0.5,1.6),0.2)); }
    d=min(d,sdBox(p,vec3(0.0,5.1,14.2),vec3(3.0,0.6,1.2),0.3));
    return d;
  }
  float news(vec3 p){ /* a newspaper box on its post: a window on the front, the coin box on top */
    float d=sdBox(p,vec3(0.0,0.0,2.6),vec3(1.6,1.6,2.6),0.2);
    d=min(d,sdBox(p,vec3(0.0,0.0,0.3),vec3(2.8,2.8,0.2),0.2));
    float b=sdBox(p,vec3(0.0,0.0,10.8),vec3(4.2,3.7,5.4),0.5);
    b=max(b,-sdBox(p,vec3(0.0,4.6,11.0),vec3(3.0,0.6,2.6),0.2));
    b=min(b,sdBox(p,vec3(0.0,2.6,16.8),vec3(1.5,0.9,0.5),0.2));
    return min(d,b);
  }
  float bench(vec3 p){ /* a park bench: three seat slats, two back slats, cast iron ends with arm rests */
    float d=1e5;
    for(int i=0;i<3;i++) d=min(d,sdBox(p,vec3(0.0,-2.2+float(i)*2.3,6.2),vec3(16.6,0.9,0.4),0.3));
    for(int i=0;i<2;i++) d=min(d,sdBox(p,vec3(0.0,-4.2,9.0+float(i)*3.0),vec3(16.6,0.35,1.0),0.3));
    for(int s=-1;s<=1;s+=2){ float x=float(s)*14.0;
      d=min(d,sdBox(p,vec3(x,2.8,3.0),vec3(0.5,0.5,3.0),0.2));
      d=min(d,sdBox(p,vec3(x,-4.2,6.8),vec3(0.5,0.45,6.6),0.2));
      d=min(d,sdBox(p,vec3(x,-0.6,5.7),vec3(0.45,3.6,0.35),0.15));
      d=min(d,sdBox(p,vec3(x,-0.8,9.4),vec3(0.55,3.6,0.4),0.2)); }
    return d;
  }
  float cone(vec3 p){ /* a traffic cone on its square foot */
    float d=sdBox(p,vec3(0.0,0.0,0.4),vec3(5.0,5.0,0.3),0.6);
    return min(d,sdCap(p,vec3(0.0,0.0,0.8),vec3(0.0,0.0,11.6),3.7,0.8));
  }
  float tyre(vec3 p){ /* a car tyre lying flat, its tread cut in blocks */
    vec2 q=vec2(length(p.xy)-6.2,p.z-2.4);
    float d=length(max(abs(q)-vec2(2.0,1.7),0.0))+min(max(abs(q.x)-2.0,abs(q.y)-1.7),0.0)-0.6;
    return d+0.22*step(0.0,sin(atan(p.y,p.x)*24.0))*smoothstep(7.6,8.6,length(p.xy));
  }
  float dumpster(vec3 p){ /* a steel dumpster: ribbed front, two plastic lids, casters, fork pockets on the ends */
    float d=sdBox(p,vec3(0.0,0.0,10.2),vec3(17.6,9.5,7.6),0.7);
    for(int s=-1;s<=1;s+=2){ float sx=float(s);
      d=min(d,sdBox(p,vec3(sx*9.2,0.2,19.0),vec3(8.6,10.2,0.45),0.3));
      d=min(d,sdBox(p,vec3(sx*18.6,0.0,9.0),vec3(0.6,7.0,0.9),0.3));
      for(int t=-1;t<=1;t+=2) d=min(d,sdCap(p,vec3(sx*15.0,float(t)*7.5-0.4,1.0),vec3(sx*15.0,float(t)*7.5+0.4,1.0),1.0,1.0)); }
    for(int i=-2;i<=2;i++) d=min(d,sdBox(p,vec3(float(i)*7.0,10.2,10.0),vec3(0.45,0.4,6.8),0.2));
    return d;
  }
  float cart(vec3 p){ /* a shopping cart: a wire basket (its mesh carved through), a red handle, a frame on four casters */
    vec3 q=p-vec3(0.75,0.0,8.5);
    float d=max(sdBox(q,vec3(0.0),vec3(10.75,7.0,3.6),0.0),-sdBox(q,vec3(0.0,0.0,0.6),vec3(10.25,6.5,3.6),0.0));
    float hole=max(sdBox(mod(p,1.5)-0.75,vec3(0.0),vec3(0.53),0.0),p.z-11.3);
    d=max(d,-hole);
    d=min(d,sdCap(p,vec3(-11.0,-6.8,13.4),vec3(-11.0,6.8,13.4),0.7,0.7));
    for(int s=-1;s<=1;s+=2){ float y=float(s);
      d=min(d,sdCap(p,vec3(-9.75,y*6.75,12.0),vec3(-11.0,y*6.6,13.4),0.35,0.35));
      d=min(d,sdCap(p,vec3(-9.5,y*5.5,2.0),vec3(10.8,y*4.0,2.0),0.4,0.4));
      d=min(d,sdCap(p,vec3(-9.5,y*5.5,2.0),vec3(-9.5,y*6.4,5.0),0.35,0.35));
      d=min(d,sdCap(p,vec3(10.8,y*4.0,2.0),vec3(10.8,y*5.6,5.0),0.35,0.35));
      d=min(d,sdCap(p,vec3(-9.5,y*5.5-0.35,1.0),vec3(-9.5,y*5.5+0.35,1.0),1.0,1.0));
      d=min(d,sdCap(p,vec3(10.8,y*4.0-0.35,1.0),vec3(10.8,y*4.0+0.35,1.0),1.0,1.0)); }
    return d;
  }
  float cOut(vec2 p){ /* the coffin's outline: narrow at the head, widest at the shoulders, tapering to the feet */
    p.y=abs(p.y);
    float d=max(-17.0-p.x,p.x-17.0);
    d=max(d,dot(p-vec2(-17.0,4.6),normalize(vec2(-2.6,7.0))));
    return max(d,dot(p-vec2(-10.0,7.2),normalize(vec2(3.0,27.0))));
  }
  float coffin(vec3 p){ /* a dug-up coffin: the box, a lid a little proud of it, brass handles down the sides */
    float o=cOut(p.xy);
    float d=max(o+0.3,abs(p.z-3.2)-3.0)-0.3;
    d=min(d,max(o+0.1,abs(p.z-6.9)-0.6)-0.3);
    for(int s=-1;s<=1;s+=2) for(int i=0;i<3;i++){ float x=-6.0+float(i)*7.0, w=7.2-(x+10.0)*0.111+0.5;
      d=min(d,sdCap(p,vec3(x-1.8,float(s)*w,3.4),vec3(x+1.8,float(s)*w,3.4),0.45,0.45)); }
    return d;
  }
  float map(vec3 p){
    vec3 q=frame(p); float d;
    if(K==0) d=hydrant(q); else if(K==1) d=bin(q); else if(K==2) d=drum(q,false); else if(K==3) d=drum(q,true);
    else if(K==4) d=mailbox(q); else if(K==5) d=news(q); else if(K==6) d=bench(q); else if(K==7) d=cone(q); else if(K==8) d=tyre(q);
    else if(K==10) d=dumpster(q); else if(K==20) d=cart(q); else d=coffin(q);
    return max(d*min(S.x,S.z),-p.z);
  }
  vec3 alb(vec3 p0, vec3 n){
    vec3 p=frame(p0); vec3 c; float w=fbm(p.xy*0.6+p.z*0.4+uSeed), lo=smoothstep(7.0,0.0,p.z), r=length(p.xy);
    if(K==0){
      c=mix(hx(0xc8402e),hx(0x8a2218),smoothstep(10.0,1.0,p.z)*0.55); /* red paint, dirtier toward the pavement */
      c=mix(c,hx(0x5a3a2a),clamp((w-0.62)*2.2,0.0,0.6)*smoothstep(6.0,0.0,p.z));
      if(p.z>13.3||(r<1.6&&p.z>13.0)) c=hx(0xd6b83a);
      if(abs(p.x)>5.4||p.y>5.0) c*=0.82;
    } else if(K==1){
      c=mix(hx(0x8e9094),hx(0x6a6c70),w); if(abs(sin(atan(p.y,p.x)*14.0))>0.8) c*=0.9;
      c=mix(c,hx(0x4a4438),clamp((fbm(p.xy*0.3+5.0)-0.55)*1.6,0.0,0.5)*smoothstep(8.0,0.0,p.z));
      if(p.z>12.9) c=mix(hx(0x9a9ca0),hx(0x7a7c80),w)*1.02;
      if(p.z>15.0) c=hx(0x3a3c40);
    } else if(K==2){
      c=mix(hx(0xa4482e),hx(0x7e3222),w);
      c=mix(c,hx(0x3c2418),clamp((fbm(p.xy*0.9+p.z*0.7+3.0)-0.6)*2.4,0.0,0.75)); /* chipped to bare steel */
      if(abs(p.z-6.4)<0.7||abs(p.z-12.6)<0.7) c*=0.86;
      if(p.y>6.0&&abs(p.x)+abs(p.z-9.5)<2.9&&abs(p.z-6.4)>0.8&&abs(p.z-12.6)>0.8) c=abs(p.x)+abs(p.z-9.5)<2.2?hx(0xd8c8a0):hx(0x2a1a14); /* a flammable diamond */
      if(p.z>18.9&&r<8.7) c=mix(hx(0x8a3a26),hx(0x5a2a1c),w);
    } else if(K==3){
      c=mix(hx(0x5a2c1c),hx(0x2a1810),w); c=mix(c,hx(0x141010),smoothstep(12.0,19.0,p.z)*0.7); /* rust, sooted black toward the rim */
      if(r<9.15&&p.z<6.0) c=mix(hx(0xffa040),hx(0xc83a10),w)*1.4; /* embers, glowing through the air holes */
      else if(r<8.9) c=hx(0x161210);
    } else if(K==4){
      c=mix(hx(0x34559e),hx(0x22397a),w*0.7); c=mix(c,hx(0x3a3830),lo*0.35);
      if(p.z<3.1) c=hx(0x1a1a1e);
      if(p.y>4.9&&p.z>12.6&&abs(p.x)<3.6) c=hx(0x223a70);
      if(p.y>4.6&&abs(p.x)<2.8&&p.z>7.0&&p.z<9.8) c=p.z<7.6?hx(0xb83a30):hx(0xe0dcd0); /* the white label with its red band */
    } else if(K==5){
      c=mix(hx(0xdcb43a),hx(0xa88014),w); c=mix(c,hx(0x4a3c28),lo*0.4);
      if(p.z<5.2) c=hx(0x2a2a2c);
      if(p.y>3.9&&abs(p.x)<3.3&&abs(p.z-11.0)<2.9){ c=mix(hx(0x56606a),hx(0xb8b4a8),0.55); if(fract(p.z*1.4)<0.3&&abs(p.x)<2.4) c*=0.75; } /* the papers behind dirty glass */
      if(p.z>16.2&&p.y>1.2) c=hx(0x3a3a3c);
    } else if(K==6){
      bool iron=abs(abs(p.x)-14.0)<0.75||p.z<5.5;
      float g=sin(p.x*1.7+fbm(p.xy*0.7)*5.0)*0.5+0.5;
      c=iron?hx(0x1c1c1e):mix(hx(0x8a6040),hx(0x5a3a24),g*0.6+w*0.4);
    } else if(K==7){
      c=p.z<0.95?hx(0x222224):mix(hx(0xec6a1e),hx(0xc04a10),w*0.6);
      if((p.z>4.4&&p.z<6.2)||(p.z>8.0&&p.z<9.2)) c=hx(0xe8e6e0);
      c=mix(c,hx(0x3a3228),lo*0.3*step(0.95,p.z));
    } else if(K==8){
      c=r>7.6?hx(0x141416):hx(0x222226); if(r<5.0) c=hx(0x0e0e10);
    } else if(K==10){
      c=mix(hx(0x3a6a3a),hx(0x22442a),w); c=mix(c,hx(0x5a3a24),clamp((fbm(p.xy*0.4+p.z*0.6+9.0)-0.58)*2.4,0.0,0.7)); /* rust where the paint has gone */
      if(p.z>18.4) c=mix(hx(0x1c1d1f),hx(0x2a2b2e),w);
      if(p.z<2.0) c=hx(0x111112);
      c=mix(c,hx(0x2a2620),lo*0.3);
    } else if(K==20){
      c=mix(hx(0xb4b6ba),hx(0x7a7c80),w);
      if(p.x<-10.4&&p.z>12.7) c=hx(0xc03a2a);
      if(p.z<2.05&&abs(abs(p.y)-5.0)<1.5) c=hx(0x1a1a1a);
    } else {
      float g=sin(p.x*1.3+fbm(p.xy*0.6)*6.0)*0.5+0.5;
      c=mix(hx(0x6a4a30),hx(0x3a2414),g*0.5+w*0.5); c=mix(c,hx(0x4a3a2a),lo*0.4*step(p.z,5.0)); /* grave dirt on the box */
      if(p.z>3.2&&p.z<3.95&&abs(p.y)>4.0) c=hx(0xc8b060);
      if(p.z>7.3&&((abs(p.y)<0.55&&abs(p.x+9.5)<4.2)||(abs(p.x+11.0)<0.55&&abs(p.y)<2.6))) c=hx(0xc8b060); /* a brass cross on the lid */
    }
    return c*(0.8+0.2*smoothstep(0.1,0.9,n.z));
  }
  `
  ); // street props as real objects, seen at the game's angle so their fronts show
  for (const [n, id] of Object.entries({
    o_hydrant: 0,
    o_bin: 1,
    o_drum: 2,
    o_burn: 3,
    o_mailbox: 4,
    o_news: 5,
    o_bench: 6,
    o_cone: 7,
    o_tyre: 8,
  }))
    bakePart(n, 'pr', id, O_SIZES[n][2], 151 + id * 2, true, true);
  for (let i = 0; i < 2; i++) bakePart('o_dump' + i, 'pr', 10 + i, O_SIZES.o_dump0[2], 171, true, true); // facing either way
  for (let i = 0; i < 8; i++) {
    bakePart('o_cart' + i, 'pr', 20 + i, O_SIZES.o_cart0[2], 173, true, true); // eight headings
    bakePart('o_coffin' + i, 'pr', 30 + i, O_SIZES.o_coffin0[2], 175, true, true);
  }
}
