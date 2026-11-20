/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Cars and the evac helicopter as 3D shapes. Each group is SDF code (map: the shape, alb: its colours) that tools/bake renders into
// the pictures the game ships; dist leaves the code out (see tools/lib/source.mjs).
import { bakeGroup, bakePart } from '../bake.js';
import { CR_GLSL } from './vehglsl.js';
export function shapeVehicles() {
  bakeGroup('cr', CR_GLSL); // cars as real objects: the same 3D pictures as the characters
  [
    ['car', 16],
    ['police', 17],
    ['truck', 26],
    ['carburn', 16],
    ['tanker', 31],
    ['fuelvan', 24],
    ['hatchback', 16],
    ['wagon', 16],
    ['pickup', 16],
    ['suv', 19],
  ].forEach(([n, z], i) => bakePart(n, 'cr', i, z, 120 + i * 3.3, true)); // no painted glow: a car's lamps sit in its faces, barely seen from above; their beams light the road
  bakeGroup(
    'hl',
    `
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
  `
  ); // the evac helicopter: a UH-60-style medevac in olive drab, built like the cars
  bakePart('heli', 'hl', 0, 52, 140);
}
