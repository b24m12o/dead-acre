/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The shape library: signed-distance shapes and noise, in GLSL. Shared by the bake (bake.js, which photographs the
// 3D shapes into the shipped pictures) and the live 3D bosses (boss3d.js, which draw them every frame).
export const SDF_LIB = `
float sdSph(vec3 p, vec3 c, float r){ return length(p-c)-r; }
float sdEll(vec3 p, vec3 c, vec3 r){ p-=c; float k0=length(p/r), k1=length(p/(r*r)); return k0*(k0-1.0)/max(k1,1e-5); }
float sdCap(vec3 p, vec3 a, vec3 b, float ra, float rb){ vec3 pa=p-a, ba=b-a; float t=clamp(dot(pa,ba)/dot(ba,ba),0.0,1.0); return length(pa-ba*t)-mix(ra,rb,t); }
float sdBox(vec3 p, vec3 c, vec3 b, float r){ vec3 q=abs(p-c)-b; return length(max(q,0.0))+min(max(q.x,max(q.y,q.z)),0.0)-r; }
float smin(float a, float b, float k){ float h=clamp(0.5+0.5*(b-a)/k,0.0,1.0); return mix(b,a,h)-k*h*(1.0-h); }
float smax(float a, float b, float k){ return -smin(-a,-b,k); }
float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float s=0.0, a=0.5; for(int i=0;i<4;i++){ s+=a*vn(p); p=p*2.03+vec2(17.1,9.2); a*=0.5; } return s; }
vec3 hx(int c){ return vec3(float((c>>16)&255),float((c>>8)&255),float(c&255))/255.0; }
`;
