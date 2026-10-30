/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Cars and the evac helicopter as 3D shapes. Each group is SDF code (map: the shape, alb: its colours) that tools/bake renders into
// the pictures the game ships; dist leaves the code out (see tools/lib/source.mjs).
import { bakeGroup, bakePart } from '../bake.js';
export function shapeVehicles() {
  bakeGroup(
    'cr',
    `
  float sb(vec3 p, vec3 c, vec3 b, float r){ return sdBox(p,c,b-r,r); } /* a box whose half-size includes its rounding */
  float sdRR(vec2 p, vec2 b, float r){ vec2 q=abs(p)-b+r; return length(max(q,0.0))+min(max(q.x,q.y),0.0)-r; }
  float wheel(vec3 p, vec3 c, float r, float hw){ vec2 d=vec2(length(p.xz-c.xz)-r,abs(p.y-c.y)-hw); return min(max(d.x,d.y),0.0)+length(max(d,0.0))-0.6; } /* a tyre: a disc on its edge, axle across the car */
  float tyres(vec3 p, int k){ float d=1e3; if(k==2||k==4){ for(int i=0;i<6;i++){ float sx=i<2?48.0:i<4?-28.0:-42.0, sy=(i%2==0)?1.0:-1.0; d=min(d,wheel(p,vec3(sx,sy*19.6,6.0),5.6,1.6)); } } else { for(int i=0;i<4;i++){ float sx=i<2?24.5:-24.0, sy=(i%2==0)?1.0:-1.0; d=min(d,wheel(p,vec3(sx,sy*17.0,5.4),k==3?4.0:4.9,1.5)); } } return d; }
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
  float tankB(vec3 p, float x0, float x1, float ry, float rz, float zc){ /* an oval fuel tank lying along the chassis, rounded at both ends, banded */
    float e=(length(vec2(p.y/ry,(p.z-zc)/rz))-1.0)*min(ry,rz);
    float d=smax(e,abs(p.x-(x0+x1)*0.5)-(x1-x0)*0.5,4.0);
    d+=0.3*step(abs(fract((p.x-x0)/13.0)-0.5),0.035)*step(x0+3.0,p.x)*step(p.x,x1-3.0); /* the bands, a shallow groove each */
    return d;
  }
  float hatch(vec3 p, vec3 c, float r){ vec2 w=vec2(length(p.xy-c.xy)-r,abs(p.z-c.z)-1.2); return min(max(w.x,w.y),0.0)+length(max(w,0.0))-0.4; }
  float tanker(vec3 p){ /* a fuel tanker: a short cab, and behind it a long oval tank with a catwalk and three hatches on top */
    float d=tankB(p,-57.0,28.0,19.5,12.0,17.5);
    d=min(d,sb(p,vec3(-14.0,0.0,6.5),vec3(42.0,13.0,2.8),1.0)); /* chassis rails under it */
    float cab=sb(p,vec3(43.5,0.0,8.6),vec3(13.0,20.0,7.0),3.0); cab=smax(cab,(p.z-16.0)+(p.x-49.0)*0.9,1.0);
    float hood=sb(p,vec3(53.5,0.0,5.6),vec3(5.0,19.0,4.0),2.4);
    d=min(d,smin(cab,hood,2.0));
    d=min(d,sb(p,vec3(-14.5,0.0,29.8),vec3(37.0,3.0,0.5),0.3)); /* catwalk */
    for(int i=0;i<3;i++) d=min(d,hatch(p,vec3(-42.0+float(i)*21.0,0.0,29.6),4.4));
    d=min(d,tyres(p,4));
    for(int s=-1;s<=1;s+=2) d=min(d,sb(p,vec3(41.0,float(s)*22.0,12.0),vec3(1.2,1.8,2.0),0.5));
    d=min(d,sb(p,vec3(58.0,0.0,3.6),vec3(1.4,18.5,1.8),0.8)); d=min(d,sb(p,vec3(-58.5,0.0,4.2),vec3(1.2,17.0,1.6),0.6));
    return d;
  }
  float fuelvan(vec3 p){ /* a small fuel truck the size of a car: a cab up front, a short tank on the back */
    float d=tankB(p,-38.5,8.0,15.5,9.0,13.5);
    d=min(d,sb(p,vec3(-15.0,0.0,5.0),vec3(23.0,15.0,2.4),1.0));
    float cab=sb(p,vec3(24.0,0.0,9.0),vec3(14.0,17.5,6.4),3.0); cab=smax(cab,(p.z-14.5)+(p.x-29.0)*0.8,1.0);
    float hood=sb(p,vec3(33.0,0.0,5.6),vec3(5.5,17.0,3.8),2.2);
    d=min(d,smin(cab,hood,2.0));
    d=min(d,sb(p,vec3(-15.0,0.0,22.8),vec3(19.0,2.2,0.4),0.3));
    d=min(d,hatch(p,vec3(-15.0,0.0,22.6),3.4));
    d=min(d,tyres(p,5));
    d=min(d,sb(p,vec3(38.0,0.0,3.6),vec3(1.4,16.0,1.6),0.8));
    return d;
  }
  float map(vec3 p){ int k=uPart; float d=k==2?boxTruck(p):k==4?tanker(p):k==5?fuelvan(p):sedan(p,k); return max(d,-p.z); }
  vec3 albB(vec3 p, vec3 n){
    int k=uPart; vec3 c;
    if(k==4||k==5){ /* the fuel trucks: weathered aluminium tank, a faded red stripe, a placard; a tired red cab */
      bool big=k==4; float xc=big?28.0:8.0;
      if(p.x<xc&&p.z>(big?8.6:7.0)){
        c=hx(0xa3a8ab)*(0.84+0.2*fbm(p.xy*vec2(0.05,0.6)+3.0)); /* brushed, streaked along its length */
        c=mix(c,hx(0x6a6258),clamp((fbm(p.xy*0.14+9.0)-0.5)*1.1,0.0,0.4)); /* road film */
        c=mix(c,hx(0x5a3a22),clamp((fbm(p.xy*0.3+2.0)-0.66)*1.4,0.0,0.3)*step(abs(p.y),big?14.0:11.0)); /* rust weeping from the hatches */
        if(abs(abs(p.y)-(big?16.8:13.2))<(big?1.1:0.9)) c=mix(c,hx(0x8a2a1c),0.75*(0.7+0.3*fbm(p.xy*0.8))); /* the red stripe down each side, faded */
        if(step(abs(fract((p.x-(big?-57.0:-38.5))/13.0)-0.5),0.035)>0.5) c*=0.78; /* bands */
        if(abs(p.y)<(big?3.0:2.2)&&p.z>(big?29.0:22.2)) c=hx(0x2a2a28)*(0.8+0.3*fract(p.x*0.5)); /* catwalk grating */
        vec2 q=p.xy-vec2(big?-50.0:-33.0,0.0); float dm=abs(q.x)+abs(q.y);
        if(dm<(big?5.2:3.8)) c=dm<(big?4.2:3.0)?hx(0xa8281e)*(0.85+0.15*fbm(p.xy*2.0)):hx(0xd8d4c8); /* the flammable placard */
      } else {
        c=hx(0x5e1c16)*(0.85+0.2*fbm(p.xy*0.5+1.0)); c=mix(c,hx(0x2e2a26),clamp((fbm(p.xy*0.3+4.0)-0.55)*1.2,0.0,0.35));
        if(big){ if(p.x>27.5&&p.z>9.0&&(p.x>45.0||abs(p.y)>15.5)&&p.z<16.5) c=hx(0x1a2228)*(0.85+0.3*smoothstep(-1.0,1.0,p.y*0.1+p.x*0.05-3.0)); }
        else if(p.x>10.0&&p.z>10.0&&n.z<0.9) c=mix(hx(0x141c24),hx(0x5a6e7c),0.4*smoothstep(0.35,0.75,fract((p.x*0.7-p.y*0.9)*0.035+0.3))); /* cab glass */
        if(p.x>(big?56.8:37.0)) c=abs(p.y)>(big?12.0:9.0)&&abs(p.y)<(big?17.0:15.0)&&p.z>3.0?hx(0xe8e0c0):hx(0x2a2a2a);
      }
      if(p.x<(big?-57.5:-39.0)&&abs(p.y)>(big?14.0:11.0)&&p.z<7.0) c=hx(0xa02020);
    } else if(k==2){
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
  `
  ); // cars as real objects: the same 3D pictures as the characters
  [
    ['car', 16],
    ['police', 17],
    ['truck', 26],
    ['carburn', 16],
    ['tanker', 31],
    ['fuelvan', 24],
  ].forEach(([n, z], i) => bakePart(n, 'cr', i, z, 120 + i * 3.3));
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
