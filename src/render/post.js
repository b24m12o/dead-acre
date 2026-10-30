/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
export const COMP_FS = `#version 300 es
precision highp float;
uniform sampler2D uAlb; uniform sampler2D uEmi; uniform sampler2D uLight; uniform sampler2D uNrm; uniform sampler2D uShadow;
uniform vec3 uSun; uniform vec3 uSky; uniform vec3 uL; uniform float uCav;
in vec2 vUv; out vec4 o;
vec3 unpackN(vec4 q){ vec2 xy=q.a>0.004?(q.rg/q.a)*2.0-1.0:vec2(0.0); return vec3(xy,sqrt(max(0.0,1.0-dot(xy,xy)))); }
void main(){
  vec3 a=texture(uAlb,vUv).rgb; vec3 e=texture(uEmi,vUv).rgb; vec3 l=texture(uLight,vUv).rgb;
  vec4 nb=texture(uNrm,vUv); vec3 N=unpackN(nb); float sp=nb.a>0.004?clamp(nb.b/nb.a,0.0,1.0):0.0;
  float cavity=0.0;
  if(uCav>0.5){ vec2 px=1.0/vec2(textureSize(uNrm,0));
  vec3 nL=unpackN(texture(uNrm,vUv-vec2(px.x,0.0))), nR=unpackN(texture(uNrm,vUv+vec2(px.x,0.0)));
  vec3 nU=unpackN(texture(uNrm,vUv-vec2(0.0,px.y))), nD=unpackN(texture(uNrm,vUv+vec2(0.0,px.y)));
  float curvature=(max(0.0,1.0-dot(N,nL))+max(0.0,1.0-dot(N,nR))+max(0.0,1.0-dot(N,nU))+max(0.0,1.0-dot(N,nD)))*0.25;
  cavity=clamp((curvature-0.035)*0.48,0.0,0.18); }
  float sh=texture(uShadow,vUv).r; float lit=1.0-sh*0.93;
  float ndl=max(dot(N,uL),0.0);
  vec3 H=normalize(uL+vec3(0.0,0.0,1.0));
  float gloss=mix(12.0,78.0,sp); float spec=pow(max(dot(N,H),0.0),gloss)*sp*lit;
  float rim=pow(1.0-clamp(N.z,0.0,1.0),2.6)*0.30;
  float fresnel=pow(1.0-clamp(N.z,0.0,1.0),5.0)*0.12;
  float ls=texture(uLight,vUv).a; vec3 lc=l/max(max(l.r,max(l.g,l.b)),0.25);
  vec3 ambient=uSky*(0.58+0.42*clamp(N.z,0.0,1.0))*(1.0-cavity);
  vec3 diffuse=uSun*ndl*lit;
  vec3 c=a*(ambient+diffuse+uSky*(rim+fresnel)+l*0.82)*(1.0-cavity*0.5)+uSun*spec*1.48+lc*ls*0.92+e;
  c+=uSky*smoothstep(0.86,0.97,sp)*0.55; // standing water holds a little of the night sky
  float moon=pow(clamp(dot(N.xy,vec2(-0.53,-0.85)),0.0,1.0),1.4)*(1.0-0.7*N.z);
  c+=uSky*moon*0.9; // the moon behind: a cold edge on whatever stands up off the ground, so a dark figure still has an outline
  o=vec4(c,1.0);
}`;
export const DOWN_FS = `#version 300 es
precision highp float;
uniform sampler2D uSrc; uniform vec2 uTexel; uniform float uThresh;
in vec2 vUv; out vec4 o;
void main(){ vec3 c=texture(uSrc,vUv+uTexel*vec2(-1.0,-1.0)).rgb+texture(uSrc,vUv+uTexel*vec2(1.0,-1.0)).rgb+texture(uSrc,vUv+uTexel*vec2(-1.0,1.0)).rgb+texture(uSrc,vUv+uTexel*vec2(1.0,1.0)).rgb; c*=0.25;
  if(uThresh>0.0){ float b=max(c.r,max(c.g,c.b)); c*=max(b-uThresh,0.0)/max(b,0.0001); c=min(c,vec3(20.0)); }
  o=vec4(c,1.0); }`;
export const UP_FS = `#version 300 es
precision highp float;
uniform sampler2D uSrc; uniform vec2 uTexel;
in vec2 vUv; out vec4 o;
void main(){ vec3 c=texture(uSrc,vUv).rgb*4.0;
  c+=(texture(uSrc,vUv+vec2(uTexel.x,0.0)).rgb+texture(uSrc,vUv-vec2(uTexel.x,0.0)).rgb+texture(uSrc,vUv+vec2(0.0,uTexel.y)).rgb+texture(uSrc,vUv-vec2(0.0,uTexel.y)).rgb)*2.0;
  c+=texture(uSrc,vUv+uTexel).rgb+texture(uSrc,vUv-uTexel).rgb+texture(uSrc,vUv+vec2(uTexel.x,-uTexel.y)).rgb+texture(uSrc,vUv+vec2(-uTexel.x,uTexel.y)).rgb;
  o=vec4(c/16.0,1.0); }`;
export const FINAL_FS = `#version 300 es
precision highp float;
uniform sampler2D uScene; uniform sampler2D uBloom; uniform vec4 uWaves[8]; uniform int uWaveN; uniform vec4 uHaze[6]; uniform int uHazeN;
uniform float uAspect; uniform float uChroma; uniform float uHurt; uniform float uBloomK; uniform float uTime; uniform float uGrain;
uniform vec2 uTexel; uniform float uSharpen;
uniform sampler2D uVis; uniform float uVisOn; uniform vec4 uWx; uniform vec2 uVisTx;
in vec2 vUv; out vec4 o;
vec3 tm(vec3 c){ const float k=0.74; vec3 over=max(c-k,0.0); return min(c,vec3(k))+(1.0-k)*(1.0-exp(-over/(1.0-k))); }
void main(){
  vec2 uv=vUv;
  for(int i=0;i<8;i++){ if(i>=uWaveN) break; vec4 w=uWaves[i]; vec2 d=uv-w.xy; d.x*=uAspect; float L=length(d); float x=L-w.z; float k=w.w*exp(-x*x*700.0); if(L>0.0001){ vec2 n=d/L; n.x/=uAspect; uv-=n*k; } }
  for(int i=0;i<6;i++){ if(i>=uHazeN) break; vec4 h=uHaze[i]; vec2 d=vUv-h.xy; d.x*=uAspect; d.y=d.y*0.55; float f=exp(-dot(d,d)/(h.z*h.z))*h.w; uv.x+=sin(vUv.y*260.0-uTime*9.0+h.x*40.0)*0.0008*f; uv.y+=sin(vUv.x*180.0+uTime*6.0)*0.00055*f; }
  vec2 cd=vUv-0.5;
  // A restrained unsharp mask restores fine edges after the soft shadow/light and bloom passes.
  vec3 raw=texture(uScene,uv).rgb;
  vec3 detail=vec3(0.0);
  if(uSharpen>0.001){ vec3 blur4=(texture(uScene,uv+vec2(uTexel.x,0.0)).rgb+texture(uScene,uv-vec2(uTexel.x,0.0)).rgb+texture(uScene,uv+vec2(0.0,uTexel.y)).rgb+texture(uScene,uv-vec2(0.0,uTexel.y)).rgb)*0.25; detail=clamp(raw-blur4,vec3(-0.18),vec3(0.18)); }
  vec3 c; c.r=texture(uScene,uv+cd*uChroma).r; c.g=raw.g; c.b=texture(uScene,uv-cd*uChroma).b;
  c+=detail*uSharpen;
  // Warm the emissive halo very slightly; the scene itself keeps its natural lamp/fire colours.
  vec3 bloom=texture(uBloom,uv).rgb; float bloomLum=dot(bloom,vec3(0.299,0.587,0.114));
  bloom*=mix(vec3(1.0),vec3(1.08,1.015,0.92),0.22*smoothstep(0.03,0.8,bloomLum));
  c+=bloom*uBloomK;
  if(uVisOn>0.0){ float vm=(texture(uVis,vUv).r*2.0+texture(uVis,vUv+vec2(uVisTx.x,0.0)).r+texture(uVis,vUv-vec2(uVisTx.x,0.0)).r+texture(uVis,vUv+vec2(0.0,uVisTx.y)).r+texture(uVis,vUv-vec2(0.0,uVisTx.y)).r)/6.0; float v=mix(1.0,vm,uVisOn); float lum=dot(c,vec3(0.299,0.587,0.114)); c=mix(mix(vec3(lum),c,0.6)*vec3(0.8,0.85,0.95)*0.66,c,v); } // out of sight: dim, cold and colourless
  c=max(c,vec3(0.0));
  // highlights roll off by brightness and keep their hue: concrete under a sodium lamp stays warm grey-orange instead of clipping to white
  { float L0=max(c.r,max(c.g,c.b)); vec3 hue=c/max(L0,0.0001); float Lt=L0<0.62?L0:0.62+0.38*(1.0-exp(-(L0-0.62)/0.38)); c=mix(hue*Lt,vec3(Lt),smoothstep(1.8,4.5,L0)*0.45); }
  float l=dot(c,vec3(0.299,0.587,0.114)); c=mix(vec3(l),c,0.88); // a touch less saturated: closer to a photographed night than a comic
  // horror grade: cold teal shadows, warm sodium highlights, gentle S-curve
  c=mix(c*vec3(0.82,0.96,1.10), c*vec3(1.10,1.00,0.84), smoothstep(0.07,0.62,l));
  c=c*c*(3.0-2.0*c)*0.26+c*0.74;
  c=pow(max(c,vec3(0.0)),vec3(0.97));
  float gr=fract(sin(dot(gl_FragCoord.xy+fract(uTime*7.13)*vec2(311.7,183.3),vec2(12.9898,78.233)))*43758.5453);
  c+=(gr-0.5)*uGrain*(1.2-l);
  // A cinematic lens falloff keeps attention in the lit play area without crushing the centre.
  vec2 vd=cd*vec2(uAspect,1.0); float edge=length(vd); float vignette=smoothstep(0.30,1.08,edge);
  c*=1.0-(0.31+0.08*uWx.z)*vignette;
  // weather grade: x fog (flat, grey, the far edges swallowed), y blood moon (red cast that deepens toward the edges), z storm (cold and wet), w night depth
  if(uWx.x>0.001){ float lf=dot(c,vec3(0.299,0.587,0.114)); vec3 g=mix(vec3(lf),c,0.5)*0.86+vec3(0.035,0.04,0.05); c=mix(c,g,uWx.x*0.75); c=mix(c,vec3(0.11,0.12,0.14),uWx.x*smoothstep(0.22,0.95,edge)*0.6); }
  if(uWx.y>0.001){ float lb=dot(c,vec3(0.299,0.587,0.114)); c=mix(c,mix(vec3(lb),c,0.7)*vec3(1.04,0.9,0.9),uWx.y); c=mix(c,c*vec3(0.95,0.6,0.58),uWx.y*vignette*0.75); }
  if(uWx.z>0.001){ float lz=dot(c,vec3(0.299,0.587,0.114)); c=mix(c,mix(vec3(lz),c,0.78)*vec3(0.9,0.97,1.08),uWx.z*0.7); }
  if(uWx.w>0.001){ c*=1.0-uWx.w*(1.0-smoothstep(0.02,0.3,l))*0.3; }
  // Cool shadow tint and gently compressed highlights help the street lights stand apart from darkness.
  float shadowTint=(1.0-smoothstep(0.06,0.38,l))*0.055;
  c*=mix(vec3(1.0),vec3(0.90,0.98,1.08),shadowTint);
  if(uHurt>0.0){ float e=smoothstep(0.35,0.95,length(vd)); c=mix(c,vec3(0.75,0.05,0.12),e*uHurt); }
  o=vec4(c,1.0); }`;
