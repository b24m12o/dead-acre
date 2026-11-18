/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
/* eslint-disable no-undef */ // runs inside the test build, where the game's own names are in scope
// PROTOTYPE, not part of the game: the Abomination drawn live in 3D from its own shapes (shapes/bosses.js), posed by a
// skeleton, written into the same buffers as the game's pictures (colour, glow, normals) so the street's own lights,
// shadows and grade fall on it. Evaluated inside the test build's bundle scope by tools/proto/abom3d.mjs.
(() => {
  const GB = BAKE.groups.gb;
  if (!GB) throw new Error('no shape code in this build');
  const FS = `#version 300 es
precision highp float; precision highp int;
uniform vec4 uCam; uniform vec2 uRes; uniform int uMode; uniform vec2 uSun; uniform vec3 uLamp; uniform float uShA;
uniform vec4 uHole; uniform vec3 uEye; uniform float uT;
uniform mat3 uBodyR; uniform vec3 uBodyP; uniform mat3 uHeadR; uniform vec3 uHeadP;
uniform vec3 uNeck[2]; uniform vec3 uLeg[12]; uniform vec3 uArm[8]; uniform vec3 uTail[6]; uniform vec3 uBound;
layout(location=0) out vec4 o0; layout(location=1) out vec4 o1; layout(location=2) out vec4 o2;
vec3 uBox; int uPart; float uSeed;
${BAKE_LIB}
${GB}
float sdLimb(vec3 p, vec3 a, vec3 b, float ra, float rb){ return sdCap(p,a,b,ra,rb)-(fbm(p.xy*0.5+p.z*0.3)-0.5)*1.0; }
mat3 frameOf(vec3 a, vec3 b){ vec3 x=normalize(b-a); vec3 up=abs(x.z)<0.97?vec3(0.0,0.0,1.0):vec3(0.0,1.0,0.0); vec3 y=normalize(cross(up,x)); return mat3(x,y,cross(x,y)); }
// the whole creature: the fused mass, the neck and head, four dead arms for legs, two bladed arms, the tail
float scene(vec3 p, out int part, out vec3 lp){
  float d=1e3; part=-1; lp=p;
  { vec3 l=transpose(uBodyR)*(p-uBodyP); float b=length(l/vec3(70.0,64.0,40.0))-1.0;
    float db; if(b>0.3) db=b*40.0; else { uPart=9; db=map(l); }
    d=db; part=9; lp=l; }
  { float dn=sdLimb(p,uNeck[0],uNeck[1],18.0,14.0); if(dn<d+6.0){ float m=smin(d,dn,8.0); if(dn<d){ part=11; mat3 f=frameOf(uNeck[0],uNeck[1]); lp=transpose(f)*(p-(uNeck[0]+uNeck[1])*0.5)*vec3(0.6,1.0,1.0); } d=m; } }
  { vec3 l=transpose(uHeadR)*(p-uHeadP); float b=length(l/vec3(34.0,30.0,26.0))-1.0;
    float dh; if(b>0.3) dh=b*26.0; else { uPart=10; dh=map(l); }
    if(dh<d){ part=10; lp=l; } d=smin(d,dh,4.0); }
  for(int i=0;i<4;i++){ vec3 h=uLeg[i*3], k=uLeg[i*3+1], f=uLeg[i*3+2];
    float a=sdLimb(p,h,k,9.5,7.0), b=sdLimb(p,k,f,7.0,4.2); float dl=smin(a,b,3.0); dl=smin(dl,sdSph(p,f,5.5),2.0);
    if(dl<d){ part=11; mat3 fr=frameOf(a<b?h:k,a<b?k:f); lp=transpose(fr)*(p-((a<b?h+k:k+f)*0.5)); }
    d=smin(d,dl,a<b?6.0:1.0); }
  for(int i=0;i<2;i++){ vec3 s=uArm[i*4], e=uArm[i*4+1], h=uArm[i*4+2], t=uArm[i*4+3];
    float a=sdLimb(p,s,e,12.0,9.5), b=sdLimb(p,e,h,9.5,6.5); float da=smin(a,b,3.0);
    vec3 bl=t-h; float bt=clamp(dot(p-h,bl)/dot(bl,bl),0.0,1.0); vec3 q=p-(h+bl*bt);
    mat3 fr=frameOf(h,t); vec3 lq=transpose(fr)*q; float blade=length(lq*vec3(1.0,1.0,2.6))-mix(7.5,0.6,bt);
    if(da<d){ part=11; mat3 f2=frameOf(a<b?s:e,a<b?e:h); lp=transpose(f2)*(p-((a<b?s+e:e+h)*0.5)); }
    if(blade<min(d,da)){ part=13; lp=lq; }
    d=smin(d,da,7.0); d=min(d,blade); }
  for(int i=0;i<5;i++){ vec3 a=uTail[i], b=uTail[i+1]; mat3 fr=frameOf(b,a); vec3 l=transpose(fr)*(p-(a+b)*0.5)/(1.0-float(i)*0.07);
    float ds; if(length(l)>34.0) ds=(length(l)-26.0)*(1.0-float(i)*0.07); else { uPart=12; ds=map(l)*(1.0-float(i)*0.07); }
    if(ds<d){ part=12; lp=l; } d=smin(d,ds,3.0); }
  { vec3 m=uTail[5]; float dm=sdSph(p,m,12.0); dm=smax(dm,-sdSph(p,m+normalize(m-uTail[4])*11.0,7.0),2.0); if(dm<d){ part=14; lp=p-m; } d=smin(d,dm,3.0); }
  return d;
}
float sceneD(vec3 p){ int k; vec3 l; return scene(p,k,l); }
vec3 nrmS(vec3 p){ vec2 e=vec2(0.7,-0.7); return normalize(e.xyy*sceneD(p+e.xyy)+e.yyx*sceneD(p+e.yyx)+e.yxy*sceneD(p+e.yxy)+e.xxx*sceneD(p+e.xxx)); }
bool inHole(vec2 xy){ vec2 q=xy-uHole.xy; float an=atan(q.y,q.x); return length(q)<uHole.z*(1.0+0.13*(vn(vec2(an*2.6,1.7))-0.5)+0.06*sin(an*7.0)); }
vec3 worldOf(vec2 fc){ return vec3(uCam.x+fc.x/uRes.x*uCam.z, uCam.y+(1.0-fc.y/uRes.y)*uCam.w, 0.0); }
void main(){
  vec3 g=worldOf(gl_FragCoord.xy);
  if(uMode>0){ // its shadow on the street: the moon's (each unit up throws it SUNV further), or a lamp's
    if(inHole(g.xy)) discard;
    float sh=0.0;
    if(uMode==1){ float z=2.0; for(int i=0;i<60;i++){ vec3 q=vec3(g.xy-uSun*z,z); float dd=sceneD(q); if(dd<0.5){ sh=1.0; break; } z+=max(dd*0.6,1.5); if(z>uBound.z) break; } }
    else { vec3 L=vec3(uLamp.xy,uLamp.z), v=L-g; float len=length(v), s=2.0/len; for(int i=0;i<60;i++){ vec3 q=g+v*s; float dd=sceneD(q); if(dd<0.5){ sh=1.0; break; } s+=max(dd*0.6,1.5)/len; if(s>0.95||q.z>uBound.z) break; } }
    if(sh<0.5) discard;
    o0=vec4(uShA); o1=vec4(0.0); o2=vec4(0.0); return; }
  // straight down from a camera high over it: what stands higher is a little nearer, a little bigger
  vec3 ro=uEye, rd=normalize(g-uEye);
  float t=max(0.0,(uEye.z-uBound.z)/max(-rd.z,0.01)), dmin=1e3; vec3 pm=ro; bool hit=false; vec3 p=ro;
  float px=uCam.z/uRes.x;
  for(int i=0;i<110;i++){ p=ro+rd*t; float floorZ=inHole(p.xy)?-uHole.w:0.0; if(p.z<floorZ) break;
    float dd=sceneD(p); if(dd<dmin){ dmin=dd; pm=p; } if(dd<0.25){ hit=true; break; } t+=max(dd*0.8,0.35); }
  float cov=hit?1.0:smoothstep(1.4*px,0.0,dmin);
  if(cov<0.01) discard;
  if(!hit) p=pm;
  int k; vec3 lp; scene(p,k,lp); vec3 n=nrmS(p);
  vec3 c;
  if(k==13){ c=mix(vec3(0.84,0.8,0.72),vec3(0.42,0.36,0.3),smoothstep(0.3,0.8,fbm(lp.xy*0.4)))*0.9; }
  else if(k==14){ c=mix(vec3(0.3,0.04,0.03),vec3(0.55,0.42,0.36),smoothstep(5.0,11.0,length(lp+normalize(uTail[5]-uTail[4])*6.0))); }
  else { uPart=k; uSeed=k==9?87.9:k==10?91.0:k==11?94.1:97.2; uBox=k==9?vec3(190.0,156.0,34.0):k==10?vec3(86.0,76.0,22.0):k==11?vec3(40.0,14.0,8.0):vec3(42.0,38.0,15.0);
    c=alb(lp,n); }
  float ao=clamp(sceneD(p+n*4.0)/4.0,0.0,1.0)*0.5+clamp(sceneD(p+n*10.0)/10.0,0.0,1.0)*0.5;
  float sh=(0.46+0.54*pow(max(n.z,0.0),1.2))*mix(1.0,ao,0.6);
  if(p.z<0.0) sh*=mix(0.07,0.75,smoothstep(-uHole.w,0.0,p.z)); // down in the hole: in the dark
  vec3 em=vec3(0.5,0.64,0.82)*pow(1.0-max(n.z,0.0),1.7)*0.32*step(0.0,p.z);
  if(k==10){ for(int s=-1;s<=1;s+=2){ float e=length(lp-vec3(5.0,float(s)*12.0,13.0)); em+=vec3(1.4,0.25,0.12)*smoothstep(4.5,1.5,e)*(0.8+0.2*sin(uT*9.0)); } } // the eyes catch, and burn
  if(k==9){ float e=length(lp/1.22-vec3(-10.0,0.0,20.0)); em+=vec3(0.9,0.16,0.08)*smoothstep(13.0,4.0,e)*(0.55+0.45*sin(uT*2.4)); } // the raw core at its heart, pulsing
  o0=vec4(c*sh*cov,cov); o1=vec4(em*cov,cov); o2=vec4((n.xy*0.5+0.5)*cov,0.12*cov,cov);
}`;
  const P3 = program(FS_VS, FS);
  const VAO = gl.createVertexArray();
  // ------- the rig: a pose is the body's place and turn, the head's, and where each foot, hand and tail joint is -------
  const A = {
    add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
    sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
    mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k],
    dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    len: a => Math.hypot(a[0], a[1], a[2]),
    nrm: a => {
      const l = Math.hypot(a[0], a[1], a[2]) || 1;
      return [a[0] / l, a[1] / l, a[2] / l];
    },
    cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
  };
  // a turn: yaw round the up axis, then pitch (nose up), then roll; its columns are forward, right, up
  const rot = (yaw, pitch, roll = 0) => {
    const cy = Math.cos(yaw),
      sy = Math.sin(yaw),
      cp = Math.cos(pitch),
      sp = Math.sin(pitch),
      X = [cy * cp, sy * cp, sp],
      Y0 = [-sy, cy, 0],
      Z0 = A.cross(X, Y0),
      cr = Math.cos(roll),
      sr = Math.sin(roll),
      Y = A.add(A.mul(Y0, cr), A.mul(Z0, sr)),
      Z = A.cross(X, Y);
    return [X, Y, Z];
  };
  const xf = (R, P, l) => A.add(P, A.add(A.mul(R[0], l[0]), A.add(A.mul(R[1], l[1]), A.mul(R[2], l[2]))));
  function ik(h, f, L1, L2, pole) {
    let v = A.sub(f, h),
      d = A.len(v);
    const mx = L1 + L2 - 0.5;
    if (d > mx) {
      f = A.add(h, A.mul(v, mx / d));
      v = A.sub(f, h);
      d = mx;
    }
    const dir = A.mul(v, 1 / d),
      a = (L1 * L1 - L2 * L2 + d * d) / (2 * d),
      hh = Math.sqrt(Math.max(0, L1 * L1 - a * a)),
      pp = A.nrm(A.sub(pole, A.mul(dir, A.dot(pole, dir))));
    return [A.add(h, A.add(A.mul(dir, a), A.mul(pp, hh))), f];
  }
  window.ABOM3D = { P3, VAO, A, rot, xf, ik, pose: null, on: false };
  // draw it in place of the 2D boss, in whichever pass is running (the scene, the moon's shadows, a lamp's)
  const drawEnemy_0 = drawEnemy;
  drawEnemy = function (e) {
    if (!e.__3d || !window.ABOM3D.pose) return drawEnemy_0.apply(this, arguments);
    const S = window.ABOM3D.pose;
    flush();
    const vp = gl.getParameter(gl.VIEWPORT),
      W = vp[2],
      H = vp[3];
    gl.useProgram(P3.p);
    const u = P3.u;
    gl.uniform4f(u.uCam, GS.camX, GS.camY, viewW, viewH);
    gl.uniform2f(u.uRes, W, H);
    const mode = GS.SHMODE === 3 || GS.SHMODE === 4 ? 2 : GS.SHMODE ? 1 : 0;
    if (mode === 2 && !window.ABOM3D.lampOK) {
      gl.useProgram(GS.curProg.p);
      return;
    }
    gl.uniform1i(u.uMode, mode);
    gl.uniform2f(u.uSun, SUNV[0], SUNV[1]);
    gl.uniform3f(u.uLamp, LSX, LSY, LSH);
    gl.uniform1f(u.uShA, mode ? GS.SHS * (mode === 2 ? 0.8 : 1) : 1);
    gl.uniform4f(u.uHole, S.hole[0], S.hole[1], S.hole[2], S.hole[3]);
    gl.uniform3f(u.uEye, S.eye[0], S.eye[1], S.eye[2]);
    gl.uniform1f(u.uT, GS.time);
    gl.uniformMatrix3fv(u.uBodyR, false, S.bodyR.flat());
    gl.uniform3fv(u.uBodyP, S.bodyP);
    gl.uniformMatrix3fv(u.uHeadR, false, S.headR.flat());
    gl.uniform3fv(u.uHeadP, S.headP);
    gl.uniform3fv(u.uNeck, S.neck.flat());
    gl.uniform3fv(u.uLeg, S.legs.flat(2));
    gl.uniform3fv(u.uArm, S.arms.flat(2));
    gl.uniform3fv(u.uTail, S.tail.flat());
    gl.uniform3f(u.uBound, 0, 0, S.top);
    // only the screen round it (and round its shadow)
    const r = mode ? 360 : 260,
      sx = v => ((v - GS.camX) / viewW) * W,
      sy = v => (1 - (v - GS.camY) / viewH) * H,
      x0 = Math.max(0, Math.floor(sx(S.bodyP[0] - r))),
      x1 = Math.min(W, Math.ceil(sx(S.bodyP[0] + r))),
      y0 = Math.max(0, Math.floor(sy(S.bodyP[1] + r))),
      y1 = Math.min(H, Math.ceil(sy(S.bodyP[1] - r)));
    if (x1 > x0 && y1 > y0) {
      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(x0, y0, x1 - x0, y1 - y0);
      gl.bindVertexArray(VAO);
      if (!mode) gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.disable(gl.SCISSOR_TEST);
    }
    gl.useProgram(GS.curProg.p);
  };
  return 'ok';
})();
