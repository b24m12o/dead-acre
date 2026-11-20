/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The cars and trucks as 3D meshes for tools/mesh/build.mjs: each on one bone, in the street's own units (20 to the
// metre: x forward, z up, the tyres on z = 0), at their true size (a saloon 3.9 m long and 1.35 m high, a box truck
// 2.7 m to the top of its box). Drawn as a modern car is: a lower body lofted along its length (a bonnet falling to
// a rounded nose, the boot deck, shoulders that roll in to the glass, a crease along its flanks, the sills tucked
// under), the wheels in their arches, and a glasshouse set in from the sides with raked screens and a crowned roof.
// The baked pictures from above (src/render/shapes/vehglsl.js) stay for the flat 2D look.
// Regions (fig3d.js colours them): 30 its paint (each car its own), 31 glass, 32 black trim, grille and bumpers,
// 33 tyres, 34 headlamps, 35 tail lamps (and a light bar's red), 36 white panels (a police car's doors and roof),
// 37 a pickup's bed liner, 38 aluminium (a tank, the wheels), 39 a fuel truck's red, 40 burnt-out metal,
// 41 a box truck's grey box, 44 a light bar's blue.
import { REGION } from './humanoid.mjs';

const BONES = [
  ['car', -1, [0, 0, 0], [20, 0, 0]],
  ...[...Array(13).keys()].map(i => ['x' + i, 0, [0, 0, 0], [0, 0, 1]]),
];
const f = v => (Number.isInteger(v) ? v.toFixed(1) : String(v));

// the shared body: lower body, glasshouse, wheels, mirrors, seams. C: the body's numbers (see SALOON); X: GLSL for
// what else it carries (a truck's box or tank: float extra(vec3 p), and int extraReg(vec3 p, vec3 n) or -1)
function vehicle(C, X = {}) {
  const consts = Object.entries(C)
    .map(([k, v]) => `const float ${k}=${f(v)};`)
    .join(' ');
  const axles = C.AX.map(a => `t=min(t,tyre(p,${f(a)}));`).join(' ');
  const GLSL = `
int gPart; int gReg; float gU;
${consts.replace(/const float AX=[^;]*;/, '')}
float sbx(vec3 p, vec3 c, vec3 b, float r){ return sdBox(p,c,b-r,r); }
float rr2(vec2 p, vec2 b, float r){ vec2 q=abs(p)-b+r; return length(max(q,0.0))+min(max(q.x,q.y),0.0)-r; }
// the top line of the lower body along its length: the bonnet falling away to the nose, the waist, the boot deck
float zTop(float x){
  if(x>XF0){ float t=clamp((x-XF0)/(XO+L-XF0),0.0,1.0); return BELT-0.5-(BELT-0.5-NOSE)*t*t; }
  if(x<XD){ float t=clamp((XD-x)/(XD-(XO-L)),0.0,1.0); return BELT+0.4-(BELT+0.4-TAIL)*pow(t,2.2); }
  return BELT-0.5+0.9*clamp((XF0-x)/(XF0-XD+0.01),0.0,1.0); }
float body(vec3 p){
  float ax=abs(p.x-XO);
  float w=W-(p.x>XO?2.4:1.5)*smoothstep(L-15.0,L,ax); // the nose and tail rounded in, more at the front
  w-=SHO*smoothstep(BELT-6.0,BELT,p.z)+0.9*smoothstep(CLR+4.0,CLR,p.z); // the shoulders rolling in, the sills tucked under
  float zb=CLR+1.6*smoothstep(L-9.0,L,ax); // the overhangs lifting off the road
  float b=smax(rr2(p.xy-vec2(XO,0.0),vec2(L,w),p.x>XO?NR:TR),max(zb-p.z,p.z-zTop(p.x)),2.6);
  for(int i=0;i<2;i++){ float cx=i==0?WF:WB; b=smax(b,-max(length(vec2(p.x-cx,p.z-WR))-(WR+1.15),(W-7.0)-abs(p.y)),0.5); } // the arches
  float sd=step(W-3.6,abs(p.y))*step(CLR+2.0,p.z)*step(p.z,BELT+0.4);
  b+=0.2*sd*(exp(-pow(p.x-DS0,2.0)/0.15)+exp(-pow(p.x-DS1,2.0)/0.15)+exp(-pow(p.x-DS2,2.0)/0.15)); // the doors' shut lines
  b-=0.16*exp(-pow(p.z-(BELT-4.2),2.0)/0.35)*step(W-3.4,abs(p.y))*step(XO-L+5.0,p.x)*step(p.x,XO+L-5.0); // the crease along the flank
  return b; }
// the glasshouse, set in from the sides at the waist and leaning in more to the roof, its screens raked
float green(vec3 p){
  float H=ROOF-BELT, z=p.z-BELT, wb=W-GW0, wr=W-GW1;
  float ff=((p.x-XF0)*H+z*(XF0-XF1))/sqrt(H*H+(XF0-XF1)*(XF0-XF1));
  float fr=((XR0-p.x)*H+z*(XR1-XR0))/sqrt(H*H+(XR1-XR0)*(XR1-XR0));
  float fs=((abs(p.y)-wb)*H+z*(wb-wr))/sqrt(H*H+(wb-wr)*(wb-wr));
  float roof=ROOF-0.011*p.y*p.y-0.0025*pow(p.x-(XF1+XR1)*0.5,2.0)${C.BURNT ? '-1.4*smoothstep(12.0,0.0,abs(p.x-(XF1+XR1)*0.5))' : ''};
  float g=smax(smax(max(ff,fr),fs,1.8),p.z-roof,2.2);
  return smax(g,BELT-1.8-p.z,0.4); }
// a tyre on its rim, the rim's dish set into its outer face
float tyre(vec3 p, float cx){ float cy=W-TY-1.0, r=length(vec2(p.x-cx,p.z-WR));
  vec2 q=vec2(r-(WR-1.0),abs(abs(p.y)-cy)-(TY-1.0)); float t=min(max(q.x,q.y),0.0)+length(max(q,0.0))-1.0;
  return smax(t,-max(r-(WR-2.0),(cy+TY-0.4)-abs(p.y)),0.3); }
float tyres(vec3 p){ float t=1e3; ${axles} return t; }
${X.glsl || 'float extra(vec3 p){ return 1e3; } int extraReg(vec3 p, vec3 n){ return -1; }'}
float shell(vec3 p){
  float d=smin(body(p),green(p),1.3);
  ${C.BED ? 'd=smax(d,-sbx(p,vec3((XO-L+1.8+XR0-1.4)*0.5,0.0,BELT+3.0),vec3((XR0-1.4-(XO-L+1.8))*0.5,W-3.1,BELT+3.0-CLR-5.2),0.8),0.4); // the open bed, its walls left standing' : ''}
  ${C.BURNT ? 'd-=(fbm(p.xy*0.35+3.0)-0.5)*1.1; // fire-warped panels' : ''}
  return d; }
float model(vec3 p){
  float d=shell(p);
  ${C.BURNT ? '' : 'for(int s=-1;s<=1;s+=2) d=min(d,sbx(p,vec3(XF0-2.4,float(s)*(W-0.2),BELT+1.7),vec3(1.5,1.6,1.05),0.6)); // the mirrors'}
  ${C.POL ? 'd=min(d,sbx(p,vec3((XF1+XR1)*0.5+1.0,0.0,ROOF+0.7),vec3(2.0,9.6,0.95),0.6)); // the light bar' : ''}
  d=min(d,tyres(p)); d=min(d,extra(p));
  return max(d,-p.z); }
void attrs(vec3 p){ gPart=0; gU=0.5; vec2 e=vec2(0.05,0.0);
  vec3 n=normalize(vec3(model(p+e.xyy)-model(p-e.xyy),model(p+e.yxy)-model(p-e.yxy),model(p+e.yyx)-model(p-e.yyx)));
  float ay=abs(p.y); int r=${C.PAINT || 30};
  bool gh=green(p)<body(p)-0.1&&p.z>BELT-1.0;
  if(gh){ float roof=ROOF-0.011*p.y*p.y-0.0025*pow(p.x-(XF1+XR1)*0.5,2.0);
    if(p.z>BELT+0.5&&p.z<roof-1.4) r=abs(p.x-XB)<1.0&&n.z<0.6?32:31; // the glass, the pillar between the doors black
    ${C.POL ? 'else if(p.z>=roof-1.4) r=36;' : ''} }
  else {
    if(p.z<CLR+2.3) r=32; // the sills and the valances under the bumpers
    if(n.x>0.45&&p.x>XO+L-7.0&&ay<W*0.42&&p.z>CLR+2.6&&p.z<NOSE-2.4) r=32; // the grille
    if(n.x>0.2&&p.x>XO+L-8.0&&ay>W*0.48&&ay<W-1.3&&p.z>NOSE-3.0&&p.z<NOSE-0.6) r=34; // the headlamps
    if(n.x<-0.2&&p.x<XO-L+7.0&&ay>W*0.38&&p.z>TAIL-3.6&&p.z<TAIL-0.7) r=35; // the tail lamps
    ${C.POL ? 'if(ay>W-4.5&&p.x>DS2&&p.x<DS0&&p.z>CLR+2.3&&p.z<BELT+0.3) r=36; // the white doors' : ''}
    ${C.BED ? 'if(p.x<XR0-1.0&&p.x>XO-L+1.2&&ay<W-2.4&&p.z<BELT+0.3&&n.z<0.98) r=37; if(p.x<XR0-1.0&&ay<W-2.4&&n.z>0.9&&p.z<BELT-1.0) r=37; /* the bed liner */' : ''} }
  ${C.POL ? 'if(sbx(p,vec3((XF1+XR1)*0.5+1.0,0.0,ROOF+0.7),vec3(2.0,9.6,0.95),0.6)<0.3) r=abs(p.y)<1.6?32:p.y>0.0?35:44;' : ''}
  if(tyres(p)<0.3){ r=33; float cy=W-TY-1.0; for(int i=0;i<${C.AX.length};i++){ float cx=float[${C.AX.length}](${C.AX.map(f).join(',')})[i]; if(length(vec2(p.x-cx,p.z-WR))<WR-2.1&&ay>cy+0.6) r=38; } } // the rims
  int xr=extraReg(p,n); if(xr>=0&&extra(p)<shell(p)&&extra(p)<0.4) r=xr;
  ${C.BURNT ? 'r=r==33?40:r==31?32:40;' : ''}
  gReg=r; }
`;
  return GLSL;
}
// a mid-size saloon; the others are its numbers changed. L/XO half its length and its middle, W half its width, CLR its
// ground clearance, WR the wheels' radius, WF/WB the axles, AX every axle, TY half a tyre's width, BELT the waist,
// ROOF, NOSE and TAIL the heights at its ends, NR/TR their rounding in plan, SHO how far the shoulders roll in;
// the glasshouse: XF0→XF1 the windscreen from its foot to the roof, XR1→XR0 the back glass, GW0/GW1 how far in it
// sits; XD where the boot deck starts to fall, XB the pillar between the doors, DS0..2 the doors' shut lines
const SALOON = {
  L: 38.6,
  XO: 0,
  W: 17.8,
  CLR: 2.2,
  WR: 5.4,
  WF: 24.0,
  WB: -24.5,
  AX: [24.0, -24.5],
  TY: 2.3,
  BELT: 15.0,
  ROOF: 26.8,
  NOSE: 11.6,
  TAIL: 13.6,
  NR: 9.0,
  TR: 7.0,
  SHO: 1.0,
  XF0: 12.5,
  XF1: 2.0,
  XR1: -12.5,
  XR0: -24.0,
  GW0: 2.0,
  GW1: 4.6,
  XD: -24.0,
  XB: -3.5,
  DS0: 16.5,
  DS1: -3.5,
  DS2: -17.5,
};
const S = SALOON;
const BODIES = {
  v_car: S,
  v_police: { ...S, POL: 1 },
  v_burnt: { ...S, BURNT: 1 },
  v_hatch: {
    ...S,
    L: 35.2,
    XO: 3.4,
    WB: -20.5,
    AX: [24.0, -20.5],
    XR1: -19.0,
    XR0: -27.5,
    XD: -27.5,
    TAIL: 15.0,
    DS2: -14.0,
  },
  v_wagon: { ...S, XR1: -30.5, XR0: -35.0, XD: -35.0, TAIL: 15.0, ROOF: 27.2 },
  v_suv: {
    ...S,
    L: 39.0,
    W: 18.6,
    CLR: 3.6,
    WR: 6.4,
    WF: 24.5,
    WB: -24.5,
    AX: [24.5, -24.5],
    TY: 2.6,
    BELT: 18.4,
    ROOF: 32.0,
    NOSE: 14.6,
    TAIL: 16.8,
    XF0: 14.5,
    XF1: 4.5,
    XR1: -30.0,
    XR0: -34.0,
    XD: -34.0,
    NR: 8.0,
    TR: 5.0,
    GW0: 1.8,
    GW1: 3.6,
  },
  v_pickup: {
    ...S,
    L: 40.0,
    XO: -0.5,
    W: 18.4,
    CLR: 3.4,
    WR: 6.2,
    WF: 25.5,
    WB: -25.5,
    AX: [25.5, -25.5],
    TY: 2.6,
    BELT: 17.4,
    ROOF: 30.0,
    NOSE: 14.2,
    TAIL: 16.6,
    XF0: 15.0,
    XF1: 5.5,
    XR1: -6.5,
    XR0: -8.0,
    XD: -38.5,
    XB: -8.0,
    DS0: 18.0,
    DS1: -7.6,
    DS2: -7.6,
    TR: 3.0,
    BED: 1,
    GW0: 1.8,
    GW1: 3.6,
  },
};
// the trucks: a cab with its own bonnet and glass at the front, and behind it a box, or a tank
const CAB = {
  L: 13.6,
  XO: 47.4,
  W: 19.8,
  CLR: 3.6,
  WR: 6.4,
  WF: 46.0,
  WB: -40.0,
  TY: 2.8,
  BELT: 20.0,
  ROOF: 36.0,
  NOSE: 15.5,
  TAIL: 20.0,
  NR: 6.0,
  TR: 2.0,
  SHO: 0.8,
  XF0: 56.5,
  XF1: 52.0,
  XR1: 34.6,
  XR0: 34.0,
  GW0: 1.6,
  GW1: 3.0,
  XD: 33.0,
  XB: 34.0,
  DS0: 56.0,
  DS1: 35.0,
  DS2: 35.0,
};
const rails = (x, l, w) => `d=min(d,sbx(p,vec3(${f(x)},0.0,8.4),vec3(${f(l)},${f(w)},2.6),0.6)); // the chassis rails`;
const TRUCKS = {
  v_truck: vehicle(
    { ...CAB, AX: [46.0, -28.0, -40.0], PAINT: 30 },
    {
      glsl: `float extra(vec3 p){ float d=sbx(p,vec3(-14.5,0.0,34.0),vec3(46.5,21.6,20.5),1.0); // the box
  d+=0.3*smoothstep(0.75,1.0,abs(fract((p.x+61.0)/6.4)*2.0-1.0))*step(abs(p.y),20.6)*step(53.5,p.z); // ribs across its roof
  d+=0.25*exp(-pow(p.y,2.0)/0.12)*step(p.x,-60.0); // the seam between its back doors
  ${rails(-6.0, 52.0, 12.0)}
  d=min(d,sbx(p,vec3(61.0,0.0,6.2),vec3(1.5,19.0,2.4),0.8)); // the bumper
  return d; }
int extraReg(vec3 p, vec3 n){ if(p.z<13.6) return 32; if(n.x<-0.5&&p.z<16.5&&abs(p.y)>17.0) return 35; return p.x>60.0?32:41; }`,
    }
  ),
  v_tanker: vehicle(
    { ...CAB, AX: [46.0, -28.0, -40.0], PAINT: 39 },
    {
      glsl: `float tank(vec3 p){ float e=(length(vec2(p.y/19.6,(p.z-29.0)/15.0))-1.0)*15.0; float d=smax(e,abs(p.x+14.0)-44.0,5.0);
  return d+0.3*step(abs(fract((p.x+58.0)/13.0)-0.5),0.035)*step(-55.0,p.x)*step(p.x,27.0); } // banded
float extra(vec3 p){ float d=tank(p);
  ${rails(-6.0, 52.0, 12.0)}
  d=min(d,sbx(p,vec3(-14.5,0.0,44.6),vec3(37.0,3.0,0.5),0.3)); // the catwalk
  for(int i=0;i<3;i++){ vec2 w=vec2(length(p.xy-vec2(-42.0+float(i)*21.0,0.0))-4.4,abs(p.z-44.4)-1.2); d=min(d,min(max(w.x,w.y),0.0)+length(max(w,0.0))-0.4); } // the hatches
  d=min(d,sbx(p,vec3(61.0,0.0,6.2),vec3(1.5,19.0,2.4),0.8)); d=min(d,sbx(p,vec3(-59.0,0.0,6.0),vec3(1.2,17.0,2.0),0.6));
  return d; }
int extraReg(vec3 p, vec3 n){ if(tank(p)<0.4&&p.z>13.0) return abs(p.z-27.5)<1.3&&n.z<0.6?39:38; if(p.z<13.0||p.z>43.6) return 32; if(tank(p)<0.4) return abs(p.z-27.5)<1.3&&n.z<0.6?39:38; if(n.x<-0.5&&abs(p.y)>14.0) return 35; return 32; }`,
    }
  ),
  v_fuelvan: vehicle(
    {
      ...CAB,
      L: 13.6,
      XO: 26.8,
      W: 17.6,
      CLR: 3.0,
      WR: 5.6,
      WF: 27.5,
      WB: -26.0,
      AX: [27.5, -26.0],
      TY: 2.4,
      BELT: 17.0,
      ROOF: 31.0,
      NOSE: 13.6,
      TAIL: 17.0,
      XF0: 35.8,
      XF1: 31.5,
      XR1: 13.8,
      XR0: 13.2,
      XD: 12.6,
      XB: 13.2,
      DS0: 35.5,
      DS1: 14.0,
      DS2: 14.0,
      PAINT: 39,
    },
    {
      glsl: `float tank(vec3 p){ float e=(length(vec2(p.y/15.6,(p.z-22.6)/10.4))-1.0)*10.4; return smax(e,abs(p.x+15.5)-24.0,4.0); }
float extra(vec3 p){ float d=tank(p);
  ${rails(-12.0, 26.0, 10.0)}
  d=min(d,sbx(p,vec3(-15.5,0.0,33.4),vec3(19.0,2.2,0.4),0.3)); // the catwalk
  { vec2 w=vec2(length(p.xy-vec2(-15.5,0.0))-3.4,abs(p.z-33.2)-1.1); d=min(d,min(max(w.x,w.y),0.0)+length(max(w,0.0))-0.4); } // the hatch
  d=min(d,sbx(p,vec3(40.6,0.0,5.6),vec3(1.4,16.5,2.0),0.8));
  return d; }
int extraReg(vec3 p, vec3 n){ if(tank(p)<0.4&&p.z>11.6) return abs(p.z-21.5)<1.1&&n.z<0.6?39:38; if(p.z<11.6||p.z>32.6) return 32; if(tank(p)<0.4) return abs(p.z-21.5)<1.1&&n.z<0.6?39:38; if(n.x<-0.5) return 35; return 32; }`,
    }
  ),
};
const model = (GLSL, B, mres = 0.7) => ({
  BONES,
  BOUNDS: B,
  GLSL,
  REGION,
  SCALE: 1,
  RIGID: true,
  MRES: mres, // fine enough for their seams, lamps and the dish of a wheel; a coarser one far off
});
const CARB = [
  [-42, -21.5, -0.5],
  [42, 21.5, 34],
];
const TRUCKB = [
  [-63, -23.5, -0.5],
  [63, 23.5, 57],
];
export const VEHICLES = {
  ...Object.fromEntries(Object.entries(BODIES).map(([n, C]) => [n, model(vehicle(C), CARB)])),
  v_truck: model(TRUCKS.v_truck, TRUCKB, 1.05),
  v_tanker: model(TRUCKS.v_tanker, TRUCKB, 1.05),
  v_fuelvan: model(
    TRUCKS.v_fuelvan,
    [
      [-42, -21.5, -0.5],
      [42, 21.5, 38],
    ],
    0.85
  ),
};
