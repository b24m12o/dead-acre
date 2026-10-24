/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Pitched roofs as 3D shapes, in pieces laid side by side over each house (see drawHouseRoofs in decor.js). Each group
// is SDF code (map: the shape, alb: its colours) that tools/bake renders into the pictures the game ships; dist leaves
// the code out (see tools/lib/source.mjs).
import { RF_SIZES, WB_SIZES, bakeGroup, bakePart } from '../bake.js';
export function shapeRoofs() {
  bakeGroup(
    'rf',
    `
  /* pitched roofs, cut into pieces the game lays side by side. KIND 0/1: the front/back slope of a roof whose
     ridge runs across the screen (one piece per 40 px column: left end, middle, right end); KIND 2: a roof whose ridge
     runs up the screen (one piece per 40 px row: middle, front end with its gable wall, back end). D is the roof's
     depth across the ridge, eaves included; everything along the ridge repeats every 40 px so the pieces meet */
  int KIND, PIECE; float D, RISE;
  void setup(){
    int k=uPart;
    KIND=k<10?0:k<20?1:2; if(k>=20) k-=20; else if(k>=10) k-=10;
    int sz=k/3; PIECE=k-sz*3;
    D=KIND==2?float(sz+4)*40.0+12.0:float(sz+4)*40.0+16.0;
    RISE=D*0.12;
  }
  float slopeZ(float s){ return RISE*(1.0-s/(D*0.5)); }
  /* the shingled skin: courses down the slope, each one lapping the next; a slot between tabs, staggered by course */
  float shell(float s, float u, float z){
    float k=RISE/(D*0.5), nz=inversesqrt(1.0+k*k);
    float course=floor(s/3.2), ts=fract(s/3.2);
    float tab=abs(fract((u+2.0*mod(course,2.0))/4.0)-0.5);
    float zt=slopeZ(s)+0.45*smoothstep(0.0,0.9,ts)*(1.0-smoothstep(0.9,1.0,ts))-(tab<0.05?0.2:0.0);
    float dt=(z-zt)*nz;
    return max(max(dt,-(dt+2.2)),s-D*0.5);
  }
  float trim(float s, float z){ /* fascia board and gutter along an eave */
    float f=max(abs(s-(D*0.5-0.5))-0.5,abs(z+1.3)-1.9);
    return min(f,length(vec2(s-(D*0.5+1.3),z+1.7))-1.3);
  }
  float barge(float s, float z, float e){ /* the verge board up a gable edge; e: distance from the edge plane */
    return max(max(abs(e)-0.6,max(z-(slopeZ(s)+0.9),slopeZ(s)-2.8-z)),s-D*0.5-0.2);
  }
  /* the roof's own coordinates: X across, Y toward the viewer (+), Z up from the eaves */
  vec3 rp(vec3 p){
    if(KIND==0) return vec3(p.x+(PIECE==1?-2.0:PIECE==2?2.0:0.0),p.y+D*0.25,p.z);
    if(KIND==1) return vec3(p.x+(PIECE==1?-2.0:PIECE==2?2.0:0.0),p.y-D*0.25,p.z);
    return vec3(p.x,p.y+(PIECE==1?3.0:PIECE==2?-3.0:0.0),p.z); /* the pieces reach 2 px past their 40 px slot, so neighbours overlap and no seam shows */
  }
  float map(vec3 p0){
    setup(); vec3 p=rp(p0); float d;
    if(KIND<2){
      float s=abs(p.y);
      d=min(shell(s,p.x,p.z),trim(s,p.z));
      d=min(d,length(vec2(p.y,p.z-RISE-0.4))-1.9); /* the ridge cap */
      if(PIECE==1){ d=max(d,-26.0-p.x); d=min(d,barge(s,p.z,p.x+25.4)); }
      if(PIECE==2){ d=max(d,p.x-26.0); d=min(d,barge(s,p.z,p.x-25.4)); }
      d=KIND==0?max(d,-p.y-2.5):max(d,p.y-0.2);
    } else {
      float s=abs(p.x);
      d=min(shell(s,p.y,p.z),trim(s,p.z));
      d=min(d,length(vec2(p.x,p.z-RISE-0.4))-1.9);
      if(PIECE==1){
        d=max(d,p.y-28.0); d=min(d,barge(s,p.z,p.y-27.4));
        float w=max(abs(p.y-19.4)-0.6,max(p.z-(slopeZ(s)-1.0),max(-p.z-0.2,s-(D*0.5-6.0)))); /* the gable wall */
        w=max(w,-sdBox(vec3(p.x,p.y-20.0,p.z-RISE*0.45),vec3(0.0),vec3(3.0,0.5,RISE*0.12),0.1)); /* its attic vent, set in */
        d=min(d,w);
      }
      if(PIECE==2){ d=max(d,-28.0-p.y); d=min(d,barge(s,p.z,p.y+27.4)); }
    }
    return max(d,-p0.z-4.0);
  }
  vec3 alb(vec3 p0, vec3 n){
    setup(); vec3 p=rp(p0);
    float s=KIND<2?abs(p.y):abs(p.x), u=KIND<2?p.x:p.y, T=6.2831853/40.0;
    float course=floor(s/3.2), tab=floor((u+2.0*mod(course,2.0))/4.0);
    vec3 c=mix(hx(0x77716a),hx(0x55514c),h21(vec2(mod(tab,10.0),course)));
    float w=0.5+0.22*sin(u*T*2.0+course*0.7)+0.18*sin(u*T*3.0+s*0.21)+0.1*sin(u*T*5.0-s*0.4); /* streaks and patches, repeating every 40 px along the ridge so the pieces meet */
    c*=0.86+0.24*w;
    c=mix(c,hx(0x48503a),0.45*smoothstep(0.62,0.85,w)*smoothstep(D*0.5-26.0,D*0.5-4.0,s)); /* moss where the eaves stay damp */
    if(abs(p.z-slopeZ(s))>1.6||s>D*0.5-0.2){ c=s>D*0.5+0.4?hx(0x7a7c7e):hx(0xb0a898); } /* fascia and gutter */
    if((KIND<2?length(vec2(p.y,p.z-RISE-0.4)):length(vec2(p.x,p.z-RISE-0.4)))<2.0) c=hx(0x3e3b38); /* ridge cap */
    if(KIND==2&&PIECE==1&&p.y>18.6&&p.y<20.4&&p.z<slopeZ(s)-0.8){
      c=mix(hx(0xb4ac9e),hx(0x8a847a),fbm(vec2(p.x*0.3,p.z*0.2)))*(fract(p.z/2.4)<0.14?0.62:1.0); /* clapboard on the gable, paint worn */
      if(abs(p.x)<3.2&&abs(p.z-RISE*0.45)<RISE*0.13+0.2) c=fract(p.z*1.1)<0.4?hx(0x1e1c1a):hx(0x5a5650);
    }
    if((PIECE==1||PIECE==2)&&abs((KIND<2?p.x:p.y)+(PIECE==1?(KIND<2?25.4:-27.4):(KIND<2?-25.4:27.4)))<0.7) c=hx(0xb0a898);
    return c*(0.82+0.18*smoothstep(0.1,0.9,n.z));
  }
  `
  ); // roofs: shingled slopes with their ridge cap, fascia and gutters, verge boards, and the gable over a house that faces you
  for (const n in RF_SIZES) {
    const m = /^rf_([fbs])(\d)_(\d)$/.exec(n),
      id = (m[1] === 'f' ? 0 : m[1] === 'b' ? 10 : 20) + (+m[2] - 4) * 3 + +m[3];
    bakePart(n, 'rf', id, RF_SIZES[n][2], 201 + id, true, true);
  }
  bakeGroup(
    'wb',
    `
  /* a wall block: one 40 px tile of wall, its top and the face toward you. Pieces reach 2 px past the tile so
     neighbours overlap, and the brick bond repeats every 40 px so a run of them reads as one wall */
  int K, V; float HT; bool CONC;
  void setup(){
    K=uPart; CONC=K>=11; HT=K<=6?28.0:K<=8?21.0:K<=10?14.0:30.0; V=K;
  }
  float jag(vec3 p){ /* the broken top of a low ruined wall: bricks knocked off a course or two at a time */
    if(K<7||CONC) return 0.0;
    float T=6.2831853/40.0, k=float(K);
    return clamp(3.2+2.8*sin(p.x*T*2.0+p.y*0.11+k*1.7)+1.2*sin(p.x*T*3.0-p.y*0.07+k),0.0,7.0); /* smooth, so the shape stays a true distance field; repeats every 40 px along the wall */
  }
  float win(vec3 p, vec3 c, vec3 b){ return sdBox(p,c,b,0.2); }
  float map(vec3 p){
    setup();
    float top=HT-jag(p);
    float d=sdBox(p,vec3(0.0,0.0,top*0.5),vec3(22.0,21.0,top*0.5),0.0);
    if(!CONC){
      float row=floor(p.z/3.5), off=mod(row,2.0)*4.0;
      float gx=abs(fract((p.x+off)/8.0)-0.5)*8.0, gz=abs(fract(p.z/3.5)-0.5)*3.5;
      d+=0.3*(1.0-smoothstep(0.0,0.45,min(gx,gz)))*step(20.2,p.y); /* raked mortar joints on the face */
      if(V==2||V==3||V==4){
        d=max(d,-win(p,vec3(0.0,21.0,13.5),vec3(8.5,4.2,7.0)));
        d=min(d,sdBox(p,vec3(0.0,17.2,13.5),vec3(8.6,0.4,7.1),0.0));
        d=min(d,sdBox(p,vec3(0.0,17.9,13.5),vec3(0.45,0.5,7.0),0.0)); d=min(d,sdBox(p,vec3(0.0,17.9,13.5),vec3(8.5,0.5,0.45),0.0)); /* frame and glazing bars */
        d=min(d,sdBox(p,vec3(0.0,21.6,5.9),vec3(10.0,1.5,0.55),0.2)); /* the sill */
        d=min(d,sdBox(p,vec3(0.0,20.8,21.4),vec3(10.4,0.9,0.8),0.1)); /* the lintel */
        if(V==4) for(int i=0;i<3;i++){ float z=8.5+float(i)*5.0, a=0.12*float(i-1); vec3 q=p-vec3(0.0,21.8,z); q.xz=mat2(cos(a),-sin(a),sin(a),cos(a))*q.xz; d=min(d,sdBox(q,vec3(0.0),vec3(10.6,0.45,1.6),0.2)); } /* boarded up */
      }
      if(V==6) d+=0.5*smoothstep(0.35,0.0,abs(p.x*0.6+sin(p.z*0.8)*2.0-p.z*0.3+3.0))*step(20.0,p.y); /* a crack through the bricks */
    } else {
      d+=0.35*(1.0-smoothstep(0.0,0.4,abs(fract((p.x+22.0)/22.0)-0.5)*22.0))*step(20.2,p.y); /* panel joints */
      if(V==12){
        d=max(d,-win(p,vec3(0.0,21.0,13.8),vec3(16.5,4.0,10.6)));
        d=min(d,sdBox(p,vec3(0.0,17.4,13.8),vec3(16.6,0.4,10.7),0.0));
        for(int i=-1;i<=1;i++) d=min(d,sdBox(p,vec3(float(i)*8.3,18.0,13.8),vec3(0.5,0.6,10.6),0.0));
        d=min(d,sdBox(p,vec3(0.0,21.2,2.8),vec3(17.4,1.2,0.6),0.2));
      }
    }
    return d;
  }
  vec3 alb(vec3 p, vec3 n){
    setup(); vec3 c;
    float top=HT-jag(p); bool face=p.y>19.8&&p.z<top-0.3;
    if(!CONC){
      float row=floor(p.z/3.5), off=mod(row,2.0)*4.0, bx=floor((p.x+off+22.0)/8.0);
      vec2 u=face?vec2(p.x+off,p.z):vec2(p.x+mod(floor((p.y+22.0)/4.0),2.0)*4.0,p.y); /* bond on the face, headers on top */
      float br=face?bx:floor((u.x+22.0)/8.0), rw=face?row:floor((p.y+22.0)/4.0);
      c=mix(hx(0x7a4434),hx(0x5c3226),h21(vec2(mod(br,5.0),rw+float(V)*3.1)));
      if(h21(vec2(mod(br,5.0)+11.0,rw))>0.86) c=mix(c,hx(0x8a5a40),0.6);
      float gx=abs(fract((u.x)/8.0)-0.5)*8.0, gz=abs(fract((face?u.y:u.y)/(face?3.5:4.0))-0.5)*(face?3.5:4.0);
      if(min(gx,gz)<0.45) c=hx(0x7c766c);
      c=mix(c,hx(0x2a2420),0.45*smoothstep(10.0,0.0,p.z)*(0.6+0.4*sin(p.x*0.157+1.0))); /* grime splashed up from the ground */
      if(!face) c*=0.92;
      if(V==2||V==3||V==4){
        if(abs(p.x)<8.6&&abs(p.z-13.5)<7.1&&p.y<19.0){ c=V==2?hx(0x5a3a1c):hx(0x14181c); if(abs(p.x)<0.5||abs(p.z-13.5)<0.5||abs(abs(p.x)-8.4)<0.4||abs(abs(p.z-13.5)-6.9)<0.4) c=hx(0x4a3a2a); } /* glass, lamplight behind it or dark */
        if(p.z<6.6&&p.z>5.2&&p.y>20.0&&abs(p.x)<10.2) c=hx(0x8a847a);
        if(p.z>20.5&&p.z<22.3&&p.y>19.8&&abs(p.x)<10.5) c=hx(0x8a847a);
        if(V==4&&p.y>21.2) c=mix(hx(0x6e5a40),hx(0x4a3c2c),fbm(p.xz*vec2(0.4,1.6)));
      }
      if(V==5&&face&&abs(p.x-4.0)<6.0&&abs(p.z-13.0)<7.5){ c=mix(hx(0xc8bc9c),hx(0x9a8e72),fbm(p.xz*0.5)); if(abs(p.z-17.0)<1.6) c=hx(0xa83a2a); if(abs(p.z-9.5)<0.6&&abs(p.x-4.0)<4.5) c=hx(0x3a3a3a); } /* a poster, sun-faded */
      if(V==6&&face&&abs(p.x*0.6+sin(p.z*0.8)*2.0-p.z*0.3+3.0)<0.4) c=hx(0x1a1612);
    } else {
      c=mix(hx(0x8e8a82),hx(0x6c6862),fbm(vec2(p.x*0.15+3.0,p.z*0.2)));
      c=mix(c,hx(0x3a3632),0.4*smoothstep(12.0,0.0,p.z));
      if(abs(fract((p.x+22.0)/22.0)-0.5)*22.0<0.5&&face) c*=0.7;
      if(V==12&&abs(p.x)<16.6&&abs(p.z-13.8)<10.7&&p.y<19.0){ c=hx(0x2a3a44); if(abs(abs(p.x)-8.3)<0.5||abs(p.x)<0.5||abs(abs(p.x)-16.4)<0.4||abs(abs(p.z-13.8)-10.5)<0.4) c=hx(0x3a3c40); } /* the shop window */
      if(!face) c=mix(hx(0x6a6862),hx(0x4e4c48),fbm(p.xy*0.2))*0.95; /* the roof edge: tar and gravel */
    }
    return c*(face?1.5:0.84+0.16*smoothstep(0.1,0.9,n.z)); /* a face turned toward you gets little moonlight from above: painted lighter so it still reads */
  }
  `
  ); // wall blocks: brick with raked joints, windows with frames, sills and lintels, boarded, cracked, a poster; low ruined walls with broken tops; shopfront concrete
  Object.keys(WB_SIZES).forEach((n, id) =>
    bakePart(n, 'wb', id, WB_SIZES[n][2], 231 + id, id !== 2 && id !== 12, true)
  ); // lit windows keep their painted glow
}
