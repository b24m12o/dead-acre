/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The giant bosses as 3D shapes: bodies, heads and shoulder caps. Each group is SDF code (map: the shape, alb: its colours) that tools/bake renders into
// the pictures the game ships; dist leaves the code out (see tools/lib/source.mjs).
import { bakeGroup, bakePart } from '../bake.js';
export function shapeBosses() {
  bakeGroup(
    'gb',
    `
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
  `
  ); // the four giant bosses: bodies, heads and shoulder caps
  [
    ['rk_torso', 36],
    ['gk_torso', 26],
    ['cf_torso', 30],
    ['pz_torso', 32],
    ['rk_head', 18],
    ['gk_head', 19],
    ['pz_head', 17],
    ['cf_head', 18],
    null,
    ['ab_body', 34],
    ['ab_head', 22],
    ['ab_limb', 8],
    ['ab_seg', 15],
  ].forEach((q, i) => {
    if (q) bakePart(q[0], 'gb', i, q[1], 60 + i * 3.1, /torso|ab_body|ab_head|ab_limb|ab_seg/.test(q[0]));
  }); // ab_head too: no painted glowing dot eyes over the 3D head
}
