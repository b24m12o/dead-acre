/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
/* eslint-disable no-undef */ // runs inside the test build, where the game's own names are in scope
// PROTOTYPE, not part of the game: the street's zombies drawn as 3D bodies instead of pictures, to measure what a
// crowd of them costs. Stand-in bodies (eleven jointed parts, about 8,400 triangles each, roughly what a real model
// built from the shapes would have), walking on each zombie's own stride and heading, written with depth into the
// same colour, glow and normal buffers as the game's pictures, with moon shadows. CROWD3D.on switches it.
(() => {
  const VS = `#version 300 es
layout(location=0) in vec3 aP; layout(location=1) in vec3 aN;
layout(location=2) in vec4 aM0; layout(location=3) in vec4 aM1; layout(location=4) in vec4 aM2; layout(location=5) in vec4 aCol;
uniform vec4 uCam; uniform int uMode; uniform vec2 uSun;
out vec3 vN; out vec3 vCol; out float vZ;
void main(){ vec4 p=vec4(aP,1.0); vec3 w=vec3(dot(aM0,p),dot(aM1,p),dot(aM2,p));
  vec3 n=vec3(dot(aM0.xyz,aN),dot(aM1.xyz,aN),dot(aM2.xyz,aN));
  vec2 g=uMode==1?w.xy+uSun*w.z:w.xy; vec2 s=(g-uCam.xy)/uCam.zw;
  gl_Position=vec4(s.x*2.0-1.0,1.0-s.y*2.0,uMode==1?0.0:clamp(-w.z/120.0,-1.0,1.0),1.0);
  vN=n; vCol=aCol.rgb; vZ=w.z; }`;
  const FS = `#version 300 es
precision highp float; precision highp int;
uniform int uMode; uniform float uShA;
in vec3 vN; in vec3 vCol; in float vZ;
layout(location=0) out vec4 o0; layout(location=1) out vec4 o1; layout(location=2) out vec4 o2;
void main(){
  if(uMode==1){ o0=vec4(uShA); o1=vec4(0.0); o2=vec4(0.0); return; }
  vec3 n=normalize(vN); float nz=max(n.z,0.0);
  float sh=(0.46+0.54*pow(nz,1.2))*mix(0.55,1.0,smoothstep(0.0,22.0,vZ));
  o0=vec4(vCol*sh,1.0); o1=vec4(vec3(0.5,0.64,0.82)*pow(1.0-nz,1.7)*0.42,1.0); o2=vec4(n.xy*0.5+0.5,0.1,1.0); }`;
  const P = program(VS, FS);
  // one unit sphere; every part is a sphere stretched into its shape
  const SEG = 24,
    RING = 16,
    pos = [],
    idx = [];
  for (let j = 0; j <= RING; j++)
    for (let i = 0; i <= SEG; i++) {
      const th = (j / RING) * Math.PI,
        ph = (i / SEG) * Math.PI * 2;
      pos.push(Math.sin(th) * Math.cos(ph), Math.sin(th) * Math.sin(ph), Math.cos(th));
    }
  for (let j = 0; j < RING; j++)
    for (let i = 0; i < SEG; i++) {
      const a = j * (SEG + 1) + i,
        b = a + SEG + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const NT = idx.length / 3;
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const vb = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vb);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pos), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0); // a unit sphere's normal is its position
  const ib = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
  const MAXI = 600 * 11,
    inst = new Float32Array(MAXI * 16),
    instB = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, instB);
  gl.bufferData(gl.ARRAY_BUFFER, inst.byteLength, gl.DYNAMIC_DRAW);
  for (let k = 0; k < 4; k++) {
    gl.enableVertexAttribArray(2 + k);
    gl.vertexAttribPointer(2 + k, 4, gl.FLOAT, false, 64, k * 16);
    gl.vertexAttribDivisor(2 + k, 1);
  }
  gl.bindVertexArray(null);
  // the body: [where the part sits (forward, right, up), its radii, its swing (which limb), its colour]
  const SKIN = [0.5, 0.47, 0.44],
    CLOTH = [
      [0.32, 0.3, 0.34],
      [0.36, 0.28, 0.22],
      [0.24, 0.3, 0.26],
      [0.4, 0.38, 0.33],
    ],
    PANTS = [0.2, 0.21, 0.26];
  let n = 0;
  const put = (e, c, s, lx, ly, lz, rx, ry, rz, pitch, col) => {
    // a part: its own pitch about the zombie's right axis, then onto the zombie (heading e.a), stretched to its radii
    const cp = Math.cos(pitch),
      sp = Math.sin(pitch),
      // part axes in zombie space: forward tipped by pitch, right, up tipped by pitch
      fx = cp,
      fz = -sp,
      ux = sp,
      uz = cp,
      // to world: x' = c*x - s*y, y' = s*x + c*y
      X = [c * fx * rx, s * fx * rx, fz * rx],
      Y = [-s * ry, c * ry, 0],
      Z = [c * ux * rz, s * ux * rz, uz * rz],
      ox = e.x + c * lx - s * ly,
      oy = e.y + s * lx + c * ly,
      o = n * 16;
    inst[o] = X[0];
    inst[o + 1] = Y[0];
    inst[o + 2] = Z[0];
    inst[o + 3] = ox;
    inst[o + 4] = X[1];
    inst[o + 5] = Y[1];
    inst[o + 6] = Z[1];
    inst[o + 7] = oy;
    inst[o + 8] = X[2];
    inst[o + 9] = Y[2];
    inst[o + 10] = Z[2];
    inst[o + 11] = lz;
    inst[o + 12] = col[0];
    inst[o + 13] = col[1];
    inst[o + 14] = col[2];
    inst[o + 15] = 1;
    n++;
  };
  function body(e) {
    const c = Math.cos(e.a),
      s = Math.sin(e.a),
      ph = (e.stride || 0) * Math.PI * 2,
      mv = Math.min(1, Math.hypot(e.vx || 0, e.vy || 0) / 40),
      sw = Math.sin(ph) * 0.55 * mv,
      bob = Math.abs(Math.cos(ph)) * 1.2 * mv,
      k = (e.sc || 1) * 1.05,
      cl = CLOTH[(e.id || 0) & 3];
    const P = (lx, ly, lz, rx, ry, rz, pitch, col) =>
      put(e, c, s, lx * k, ly * k, lz * k, rx * k, ry * k, rz * k, pitch, col);
    P(0, 0, 15 + bob, 5.5, 8.5, 5, 0, PANTS); // hips
    P(2.5, 0, 25 + bob, 6.5, 10.5, 8, 0.35, cl); // the torso, hunched forward
    P(8, 0, 34 + bob, 5.2, 4.6, 5, 0.2, SKIN); // the head, hanging forward
    for (const sd of [-1, 1]) {
      const a = sd * sw;
      P(8, sd * 11.5, 28 + bob, 7, 3, 3, 0.15 - a * 0.3, cl); // the upper arm, reaching
      P(18, sd * 10.5, 27 + bob, 6.5, 2.6, 2.6, 0.05 - a * 0.3, SKIN); // the forearm
      P(Math.sin(a) * 5, sd * 4.8, 9, 3, 3.3, 6.5, -a, PANTS); // the thigh
      P(Math.sin(a) * 10, sd * 5, 3.5, 4.5, 2.6, 3.5, -a * 0.5, SKIN); // the shin and foot
    }
  }
  const C = (window.CROWD3D = { on: false, list: [], tri: NT * 11 });
  C.collect = () => {
    C.list.length = 0;
    if (!C.on) return;
    for (const e of GS.enemies)
      if (
        !e.dead &&
        e.type === 'skitter' &&
        e.emerge >= 1 &&
        !(e.down > 0) &&
        Math.abs(e.x - GS.camX - viewW / 2) < viewW / 2 + 80 &&
        Math.abs(e.y - GS.camY - viewH / 2) < viewH / 2 + 80
      )
        C.list.push(e);
  };
  C.skip = e => C.on && C.list.includes(e);
  let depthRB = null,
    dW = 0,
    dH = 0;
  C.draw = () => {
    if (!C.list.length) return;
    flush();
    const mode = GS.SHMODE === 3 || GS.SHMODE === 4 ? 2 : GS.SHMODE ? 1 : 0;
    if (mode === 2) return; // lamp shadows: not drawn in this test
    n = 0;
    for (const e of C.list) if (n < MAXI - 11) body(e);
    const vp = gl.getParameter(gl.VIEWPORT);
    gl.useProgram(P.p);
    gl.uniform4f(P.u.uCam, GS.camX, GS.camY, viewW, viewH);
    gl.uniform1i(P.u.uMode, mode);
    gl.uniform2f(P.u.uSun, SUNV[0], SUNV[1]);
    gl.uniform1f(P.u.uShA, GS.SHS || 0.6);
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, instB);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, inst, 0, n * 16);
    if (!mode) {
      // depth, for the bodies among themselves: a depth buffer on the scene's own target
      if (!depthRB || dW !== vp[2] || dH !== vp[3]) {
        depthRB = depthRB || gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, depthRB);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, vp[2], vp[3]);
        dW = vp[2];
        dH = vp[3];
      }
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthRB);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LESS);
      gl.blendFunc(gl.ONE, gl.ZERO);
    }
    gl.drawElementsInstanced(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0, n);
    if (!mode) {
      gl.disable(gl.DEPTH_TEST);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, null);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    }
    gl.bindVertexArray(null);
    gl.useProgram(GS.curProg.p);
    C.drawn = n / 11;
  };
  const drawEnemy_0 = drawEnemy;
  drawEnemy = function (e) {
    if (C.skip(e)) return;
    if (e.__3d && window.ABOM3D) return window.ABOM3D.draw();
    return drawEnemy_0.apply(this, arguments);
  };
  return 'crowd ' + NT * 11 + ' triangles a body';
})();
