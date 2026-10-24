/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
/* =====================================================================
   WebGL
   ===================================================================== */
const glc = $('gl'),
  uic = $('ui'),
  ui = uic.getContext('2d');
const gl = glc.getContext('webgl2', {
  antialias: false,
  alpha: false,
  depth: false,
  stencil: false,
  premultipliedAlpha: false,
  powerPreference: 'high-performance',
});
if (!gl) {
  $('nogl').hidden = false;
  $('loading').hidden = true;
  return;
}
const hasCBF = !!gl.getExtension('EXT_color_buffer_float');
function compile(type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}
function program(vs, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  return progFinish(p);
}
function progFinish(p) {
  const u = {};
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) {
    const info = gl.getActiveUniform(p, i);
    u[info.name.replace(/\[0\]$/, '')] = gl.getUniformLocation(p, info.name);
  }
  return { p, u };
}
const SPRITE_VS = `#version 300 es
layout(location=0) in vec2 aPos; layout(location=1) in vec2 aUv; layout(location=2) in vec4 aTint; layout(location=3) in vec4 aEmit; layout(location=4) in vec4 aRot;
uniform vec4 uCam; out vec2 vUv; out vec4 vTint; out vec4 vEmit; out vec4 vRot;
void main(){ vec2 p=(aPos-uCam.xy)/uCam.zw; gl_Position=vec4(p.x*2.0-1.0,1.0-p.y*2.0,0.0,1.0); vUv=aUv; vTint=aTint; vEmit=aEmit; vRot=aRot; }`;
const SPRITE_FS = `#version 300 es
precision highp float;
uniform sampler2D uAlb; uniform sampler2D uEmi; uniform sampler2D uNrm; uniform float uAdd;
in vec2 vUv; in vec4 vTint; in vec4 vEmit; in vec4 vRot;
layout(location=0) out vec4 o0; layout(location=1) out vec4 o1; layout(location=2) out vec4 o2;
void main(){
  vec4 a=texture(uAlb,vUv); vec4 e=texture(uEmi,vUv); float al=a.a*vTint.a;
  vec3 col=mix(a.rgb*vTint.rgb, vec3(a.a), clamp(vEmit.a,0.0,1.0));
  o0=vec4(col*vTint.a, al);
  o1=vec4(e.rgb*vEmit.rgb*vTint.a + vec3(a.a)*vEmit.a*0.5*vTint.a, al);
  if(uAdd>0.5){ o2=vec4(0.0); return; }
  vec4 nm=texture(uNrm,vUv);
  vec2 ln=nm.a>0.004 ? (nm.rg/nm.a)*2.0-1.0 : vec2(0.0);
  ln*=vRot.zw;
  vec2 wn=vec2(vRot.x*ln.x-vRot.y*ln.y, vRot.y*ln.x+vRot.x*ln.y);
  float sp=nm.a>0.004 ? nm.b/nm.a : 0.0;
  o2=vec4((wn*0.5+0.5)*al, sp*al, al);
}`;
const SHADOW_FS = `#version 300 es
precision highp float;
uniform sampler2D uAlb; in vec2 vUv; in vec4 vTint; in vec4 vEmit; in vec4 vRot; out vec4 o;
void main(){ float a=texture(uAlb,vUv).a*vTint.a; o=vec4(a,a,a,a); }`;
const LIGHT_VS = `#version 300 es
layout(location=0) in vec2 aCorner; layout(location=1) in vec4 aL0; layout(location=2) in vec4 aL1;
uniform vec4 uCam; out vec2 vW; flat out vec4 L0; flat out vec4 L1;
void main(){ vec2 w=aL0.xy+aCorner*aL0.z; vW=w; L0=aL0; L1=aL1; vec2 p=(w-uCam.xy)/uCam.zw; gl_Position=vec4(p.x*2.0-1.0,1.0-p.y*2.0,0.0,1.0); }`;
const LIGHT_FS = `#version 300 es
precision highp float;
uniform sampler2D uNrm; uniform sampler2D uFsh; uniform vec2 uRes; uniform vec2 uFL; uniform float uWet;
in vec2 vW; flat in vec4 L0; flat in vec4 L1; out vec4 o;
void main(){ float d=length(vW-L0.xy)/L0.z; float att=clamp(1.0-d,0.0,1.0); att*= L1.w>0.0 ? 1.0 : att;
  if(L1.w>0.0){ vec2 dv=vW-L0.xy; float dl=length(dv); float cd=dot(dv/max(dl,0.001),vec2(cos(L0.w),sin(L0.w))); att*=smoothstep(L1.w,L1.w+0.1,cd)*smoothstep(0.0,40.0,dl); if(length(L0.xy-uFL)<3.0) att*=1.0-texture(uFsh,gl_FragCoord.xy/uRes).r*0.92; }
  if(att<0.002) discard;
  vec4 nb=texture(uNrm,gl_FragCoord.xy/uRes); vec2 n2=nb.a>0.004?(nb.rg/nb.a)*2.0-1.0:vec2(0.0);
  vec3 N=vec3(n2,sqrt(max(0.0,1.0-dot(n2,n2)))); vec3 Ld=normalize(vec3(L0.xy-vW,70.0));
  float sp0=nb.a>0.004?clamp(nb.b/nb.a,0.0,1.0):0.0; float sp=max(sp0,uWet*0.52*step(0.004,nb.a)); float lum=max(L1.r,max(L1.g,L1.b)); // roughness-aware response: painted cloth stays soft, metal catches a sharper point highlight
  vec3 Hh=normalize(Ld+vec3(0.0,0.0,1.0)); float gloss=mix(13.0,74.0,sp0); float spc=pow(max(dot(N,Hh),0.0),gloss)*att*(sp0*0.55+uWet*0.24);
  if(L1.w<=0.0){ vec2 dv=(vW-L0.xy)/L0.z; vec2 q=vec2(dv.x*4.0,(dv.y-0.24)*1.05); float rp=0.62+0.38*sin(vW.y*0.21+vW.x*0.05); float reflected=pow(clamp(1.0-length(q),0.0,1.0),1.75); spc+=reflected*sp*uWet*1.5*rp; } // elongated lamp reflections broken by surface roughness
  spc=min(spc*smoothstep(50.0,145.0,L0.z),0.86);
  o=vec4(L1.rgb*att*(0.3+max(dot(N,Ld),0.0)*1.1),spc*min(lum,1.2)); }`;
