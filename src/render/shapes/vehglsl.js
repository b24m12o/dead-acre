/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The cars and trucks as SDF code: map, the shape; albB/alb, its colours; uPart picks which. tools/bake renders them
// into the pictures (shapes/vehicles.js); tools/mesh builds the 3D cars from them (tools/mesh/vehicles.mjs). dist
// leaves the code out (tools/lib/source.mjs).
export const CR_GLSL = `
  float sb(vec3 p, vec3 c, vec3 b, float r){ return sdBox(p,c,b-r,r); } /* a box whose half-size includes its rounding */
  float sdRR(vec2 p, vec2 b, float r){ vec2 q=abs(p)-b+r; return length(max(q,0.0))+min(max(q.x,q.y),0.0)-r; }
  float wheel(vec3 p, vec3 c, float r, float hw){ vec2 d=vec2(length(p.xz-c.xz)-r,abs(p.y-c.y)-hw); return min(max(d.x,d.y),0.0)+length(max(d,0.0))-0.6; } /* a tyre: a disc on its edge, axle across the car. Tucked under the body and its arches (a 65 cm tyre under a bonnet at 90): seen from above a real car shows next to none of them */
  float tyres(vec3 p, int k){ float d=1e3; if(k==2||k==4){ for(int i=0;i<6;i++){ float sx=i<2?48.0:i<4?-28.0:-42.0, sy=(i%2==0)?1.0:-1.0; d=min(d,wheel(p,vec3(sx,sy*18.0,6.0),5.6,1.6)); } } else { for(int i=0;i<4;i++){ float sx=i<2?23.5:-24.0, sy=(i%2==0)?1.0:-1.0; d=min(d,wheel(p,vec3(sx,sy*15.6,4.0),k==3?3.6:4.0,1.5)); } } return d; }
  float cabin(vec3 p, int k){ /* the glasshouse per body: 6 hatchback, 7 estate, 8 pickup (a two-door cab), 9 SUV (taller and squarer) */
    float zl=k==9?2.2:0.0; p.z-=zl; float tw=(k==9?14.4:13.2)+1.6*smoothstep(15.0,9.0,p.z);
    vec3 cc=k==6?vec3(-7.5,0.0,10.6):k==7?vec3(-10.0,0.0,10.6):k==8?vec3(5.5,0.0,10.6):k==9?vec3(-7.0,0.0,10.6):vec3(-4.0,0.0,10.6);
    vec3 cb=k==6?vec3(21.0,tw,3.8):k==7?vec3(25.5,tw,3.8):k==8?vec3(10.5,tw,3.8):k==9?vec3(23.5,tw,3.8):vec3(18.0,tw,3.8);
    float cab=sb(p,cc,cb,3.0);
    float fr=k==8?13.5:k==9?13.0:5.0, rr=k==6?-27.0:k==7?-34.0:k==8?-4.0:k==9?-29.0:-14.5, rk=k==6||k==7||k==9?2.2:k==8?6.0:0.75;
    cab=smax(cab,(p.z-14.6)+(p.x-fr)*(k==9?0.8:0.55),1.4); cab=smax(cab,(p.z-14.6)-(p.x-rr)*rk,1.4); return cab; } /* raked screen in front; behind it a boot's slope, a hatch, an estate's upright tail or a cab's back wall */ /* the glasshouse: narrower than the body, sides leaning in, raked screens front and back */
  float sedan(vec3 p, int k){ /* a mid-size saloon from above: front at +x, a tub with rounded corners, a cabin with raked glass, tyres in the arches, mirrors, bumpers */
    float w=(k==9?19.4:18.6)-(p.x>0.0?2.4:1.4)*smoothstep(22.0,39.0,abs(p.x)); /* a modern car's plan: the nose tapers to a rounded point, the tail a little */
    float hl=k==6?35.0:k==8?39.6:38.6, xo=k==6?3.6:k==8?-1.0:0.0, zc=k==9?6.2:5.2, zh=k==9?5.0:4.0; /* a hatchback is shorter at the back; an SUV rides higher */
    float body=smax(sdRR(p.xy-vec2(xo,0.0),vec2(hl,w),p.x>0.0?11.0:(k==8?4.0:9.0)),abs(p.z-zc)-zh,2.8); /* rounded nose and tail in plan, soft edges in section */
    if(k==8) body=smax(body,-sb(p,vec3(-22.0,0.0,10.4),vec3(16.0,15.6,4.6),0.8),0.6); /* the pickup's open bed, its walls left standing */
    body=smax(body,p.z-(k==9?11.4:9.4)+max(0.0,abs(p.x)-18.0)*(p.x>0.0?0.11:(k==8?0.0:0.07))-0.6*(1.0-abs(p.y)/19.0),1.6); /* bonnet and boot fall away toward the ends and the shoulders round off */
    float cab=cabin(p,k);
    if(k==3){ cab+=0.9*smoothstep(0.0,10.0,10.0-abs(p.x+3.0))*step(13.0,p.z); cab=smax(cab,-sb(p,vec3(-3.5,0.0,12.0),vec3(13.0,13.0,3.2),1.0),0.8); } /* burnt: the roof sags, the glass is gone */
    float d=smin(body,cab,2.2);
    d+=0.22*exp(-pow(p.x-21.5,2.0)/0.25)*step(8.0,p.z)+0.22*exp(-pow(p.x+23.5,2.0)/0.25)*step(8.0,p.z); /* bonnet and boot shut lines */
    d=min(d,tyres(p,k));
    if(k!=3) for(int s=-1;s<=1;s+=2) d=min(d,sb(p,vec3(8.5,float(s)*20.0,10.0),vec3(1.5,1.5,0.9),0.6));
    /* no separate bumpers: a modern car's are moulded into the body */
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
        if(p.x>(big?56.8:37.0)) c=abs(p.y)>(big?12.0:9.0)&&abs(p.y)<(big?17.0:15.0)&&p.z>3.0&&n.z<0.55?hx(0xe8e0c0):hx(0x2a2a2a);
      }
      if(p.x<(big?-57.5:-39.0)&&abs(p.y)>(big?14.0:11.0)&&p.z<7.0&&n.z<0.55) c=hx(0xa02020);
    } else if(k==2){
      c=hx(0xb4b2aa)*(0.9+0.12*fbm(p.xy*0.4+2.0)); if(p.x>27.5) c=hx(0xaeaca4)*(0.9+0.12*fbm(p.xy*0.5));
      if(p.x>27.5&&p.z>9.0&&(p.x>45.0||abs(p.y)>15.5)&&p.z<16.5) c=hx(0x1a2228)*(0.85+0.3*smoothstep(-1.0,1.0,p.y*0.1+p.x*0.05-3.0)); /* cab glass */
      if(p.z>23.0&&abs(fract((p.x+57.5)/6.4)*2.0-1.0)>0.86) c*=0.9; c=mix(c,hx(0x6a6258),clamp((fbm(p.xy*0.12+4.0)-0.55)*1.0,0.0,0.25)*step(22.0,p.z)); /* rain streaks on the roof */
      if(p.x>56.8) c=abs(p.y)>12.0&&abs(p.y)<17.0&&p.z>3.0&&n.z<0.55?hx(0xe8e0c0):hx(0x2a2a2a);
      if(p.x<-57.0&&abs(p.y)>16.0&&p.z<6.0&&n.z<0.55) c=hx(0xa02020); /* lamps in the faces front and back: from above, barely there */
    } else {
      c=hx(0xd8d8d8)*(0.92+0.1*fbm(p.xy*0.5+uSeed)); /* paint, tinted per car in the game */
      if(k==1){ c=hx(0x1c1c20); if(p.x<20.5&&p.x>-22.5&&!(p.z>13.6)) c=hx(0xe8e6e0); if(p.z>13.6) c=hx(0xe8e6e0); } /* black-and-white: dark bonnet and boot, white doors and roof */
      bool glass=cabin(p,k)<0.45&&p.z>9.0&&n.z<0.9; /* glass is every steep face of the glasshouse; the flat top is roof */
      if(glass) c=k==3?hx(0x0e0c0c):mix(hx(0x141c24),hx(0x5a6e7c),0.55*smoothstep(0.35,0.75,fract((p.x*0.7-p.y*0.9)*0.035+0.3))); /* dark glass with a streak of sky in it */
      if(k==8&&p.x<-5.5&&p.x>-38.0&&abs(p.y)<15.4&&p.z<9.6) c=hx(0x262626)*(0.8+0.3*step(0.5,fract(p.y*0.45))); /* the bed's ribbed black liner */
      if(k==0&&!glass&&n.z>0.9&&p.z>13.0&&abs(p.x+3.5)<14.5&&abs(p.y)<10.0) c=mix(hx(0x10161c),hx(0x46566a),0.5*smoothstep(0.4,0.8,fract((p.x*0.6-p.y*0.8)*0.03+0.2))); /* a panoramic glass roof */
      if(p.x>30.0&&n.z<0.55&&n.x>0.3&&abs(p.y)>5.5&&abs(p.y)<15.0&&p.z>5.2&&p.z<7.0) c=hx(0xeceae0); /* the headlamps: slim, set in the front face, so from above you barely see them */
      float tl=k==6?-30.0:k==8?-39.4:-37.0, tz=k==9?1.6:0.0;
      if(p.x<tl+6.0&&n.z<0.55&&n.x<-0.3&&abs(p.y)>6.0&&abs(p.y)<15.5&&p.z>6.0+tz&&p.z<7.6+tz) c=hx(0xb01818); /* the tail lamps, in the back face the same way */
      if(abs(p.y)>18.0&&abs(p.x-8.5)<2.0&&p.z>8.6) c=hx(0x202020);
      if(k==3){ c=mix(hx(0x2c2824),hx(0x18140f),fbm(p.xy*0.4+5.0)); c=mix(c,hx(0x5e3820),clamp((fbm(p.xy*0.18+9.0)-0.5)*1.5,0.0,0.6)); c=mix(c,hx(0x5a564e),clamp((fbm(p.xy*0.35+2.0)-0.68)*1.6,0.0,0.3)); if(glass) c=hx(0x0c0a08); } /* rust and bare primer where the paint burnt off, the glass gone */
    }
    if(tyres(p,k)<0.35&&p.z<2.6) c=k==3?hx(0x5a5650):hx(0x161616); /* only the bit of tyre down by the road: never a black patch painted on the body over it */ /* tyres where they show at the arches (burnt: bare rims) */
    if(k!=3){ c=mix(c,hx(0x3a3228),clamp((fbm(p.xy*0.3+7.0)-0.58)*1.3,0.0,0.4)*smoothstep(8.0,2.0,p.z)); } /* road grime low down */
    return c;
  }
  vec3 alb(vec3 p, vec3 n){ return albB(p,n)*mix(0.55,1.0,smoothstep(0.5,uBox.z*0.55,p.z))*(0.78+0.22*smoothstep(0.1,0.85,n.z)); }
  `;
