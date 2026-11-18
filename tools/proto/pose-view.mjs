/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// A test tool, not part of the game: looks at the 3D figures' poses from the side as well as from above, which the
// game's camera never does, to check how a body lies, kneels, crawls or falls. It stages zombies in the states listed
// below in the test build, poses them with the game's own code (fig3d.js), and draws each with the game's own mesh
// and skinning but a camera of its own: in a row, from the side (left) and from above (right), plain lit.
//   node tools/proto/pose-view.mjs [out.png]
import { writeFileSync } from 'node:fs';
import { browser, openGame } from '../../tests/lib/harness.mjs';
const OUT = process.argv[2] || '/tmp/pose-view.png';
const ONLY = process.argv.includes('--rise')
  ? 'rise'
  : process.argv.includes('--fall')
    ? 'fall'
    : process.argv.includes('--death')
      ? 'death'
      : null;
// each: a label and how to set the zombie up (e is a fresh ordinary zombie facing up the screen, standing still)
const STATES0 = [
  ['walk', 'e.vy = -40; e.stride = 0.2;'],
  ['reach close', 'e.aw = 3; e.pose = 0;'],
  ['lunge', 'e.lunge = 0.21;'],
  ['lost arm', 'e.lost = [true, false]; e.pose = 3;'],
  ['climbing out', 'e.emerge = 0.5;'],
  ['falling', 'e.dying = 0.22; e.fallA = Math.PI / 2; e.sup = false; e.apose = 0; e.keep = 99;'],
  ['dead, face down', 'e.dying = 1.5; e.fallA = Math.PI / 2; e.sup = false; e.apose = 0; e.keep = 99;'],
  ['dead, on back', 'e.dying = 1.5; e.fallA = Math.PI / 2; e.sup = true; e.apose = 3; e.keep = 99;'],
  [
    'dead, headless',
    'e.dying = 1.5; e.fallA = Math.PI / 2; e.apose = 1; e.headless = true; e.lost = [false, true]; e.keep = 99;',
  ],
  ['down 0.5', 'e.down = 1.55 - 0.5; e.fallA = Math.PI / 2;'],
  ['down 0.75 hands', 'e.down = 1.55 - 0.75; e.fallA = Math.PI / 2;'],
  ['down 0.95 knees', 'e.down = 1.55 - 0.95; e.fallA = Math.PI / 2;'],
  ['down 1.15 kneel', 'e.down = 1.55 - 1.15; e.fallA = Math.PI / 2;'],
  ['down 1.4 rising', 'e.down = 1.55 - 1.4; e.fallA = Math.PI / 2;'],
  ['back 0.95', 'e.down = 1.55 - 0.95; e.sup = true; e.fallA = Math.PI / 2;'],
  ['back 1.2', 'e.down = 1.55 - 1.2; e.sup = true; e.fallA = Math.PI / 2;'],
  ['crawl', 'e.crawl = true; e.cfall = 0; e.lyG = 1;'],
  ['half', 'e.half = true; e.lyG = 1;'],
  ['lying in wait', "e.lurk = 'lie'; e.down = 1.55 - 0.9; e.fallA = Math.PI / 2;"],
];
const STATES = ['--rise', '--fall', '--death'].some(f => process.argv.includes(f)) ? [] : STATES0;
if (ONLY === 'rise') {
  STATES.length = 0;
  for (let el = 0.4; el <= 1.56; el += 0.1)
    STATES.push([`down ${el.toFixed(1)}`, `e.down = 1.55 - ${el}; e.fallA = Math.PI / 2;`]);
  for (let el = 0.6; el <= 1.56; el += 0.16)
    STATES.push([`back ${el.toFixed(1)}`, `e.down = 1.55 - ${el}; e.sup = true; e.fallA = Math.PI / 2;`]);
} else if (ONLY === 'fall')
  for (const [sup, fa] of [
    [false, Math.PI / 2],
    [true, Math.PI / 2],
    [false, -Math.PI / 2],
    [false, 0],
  ]) {
    for (const t of [0.05, 0.15, 0.25, 0.35, 0.5])
      STATES.push([`fall ${t}`, `e.dying = ${t}; e.fallA = ${fa}; e.sup = ${sup}; e.apose = 0; e.keep = 99;`]);
  }
else if (ONLY === 'death') {
  for (const [nm, set] of [
    ['slump', 'e.rvx = 0; e.rvy = 200;'],
    ['thrown', 'e.rvx = 0; e.rvy = 440;'],
    ['headless', 'e.rvx = 0; e.rvy = 150; e.headless = true;'],
  ])
    for (const t of [0.06, 0.14, 0.24, 0.34, 0.5])
      STATES.push([`${nm} ${t}`, `${set} e.dying = ${t}; e.fallA = Math.PI / 2; e.apose = 1; e.keep = 99;`]);
  for (const [nm, d] of [
    ['hit front', '0, 1'],
    ['hit right side', '-1, 0'],
    ['hit left side', '1, 0'],
  ])
    STATES.push([nm, `e.flT = 0.15; [e.fdx, e.fdy] = [${d}]; e.flS = 1;`]);
}
if (ONLY) STATES.splice(0, ONLY === 'fall' ? STATES.length - 20 : 0);
const b = await browser();
try {
  const { pg, ev, errs } = await openGame(b, { noFrames: true });
  for (let i = 0; i < 40 && !(await ev('fig3dOn()')); i++) await pg.waitForTimeout(250);
  const png = await ev(`(() => {
    initAudio(); GS.meta.tutDone = true; begin(); GS.P.x = 99999; // you far away: nobody reaches for you
    const W = 200, H = 200, cv = document.createElement('canvas'); cv.width = W * 2 * ${STATES.length}; cv.height = H;
    const g2 = cv.getContext('webgl2'); if (!g2) return 'no webgl2';
    // the game's own vertex shader, with its camera swapped for this one
    const vs = VS(false).replace(/vec2 g;[\\s\\S]*?gl_Position=vec4\\(s\\.x\\*2\\.0-1\\.0,1\\.0-s\\.y\\*2\\.0,clamp\\(0\\.5-W\\.z\\/160\\.0,-1\\.0,1\\.0\\),1\\.0\\);/,
      'vec3 q=uV*(W-uC); gl_Position=vec4(q.x/34.0,q.y/34.0,-q.z/200.0,1.0);').replace('uniform vec4 uLight;', 'uniform vec4 uLight; uniform mat3 uV; uniform vec3 uC;');
    if (vs === VS(false)) return 'the camera did not swap';
    const fs = '#version 300 es\\nprecision highp float; in vec3 vC; in vec3 vN; in float vZ; out vec4 o; void main(){ vec3 n=normalize(vN); float l=0.35+0.65*max(dot(n,normalize(vec3(-0.3,0.5,0.8))),0.0); o=vec4(vC*l*(vZ<0.0?0.4:1.0),1.0); }';
    const prog = g2.createProgram();
    for (const [t, s] of [[g2.VERTEX_SHADER, vs], [g2.FRAGMENT_SHADER, fs]]) { const o = g2.createShader(t); g2.shaderSource(o, s); g2.compileShader(o); if (!g2.getShaderParameter(o, g2.COMPILE_STATUS)) return g2.getShaderInfoLog(o); g2.attachShader(prog, o); }
    g2.linkProgram(prog); if (!g2.getProgramParameter(prog, g2.LINK_STATUS)) return g2.getProgramInfoLog(prog);
    g2.useProgram(prog);
    // the mesh, from the game's copy of the file
    const b64 = atob(window.__DA_DATA.mesh), M = new Uint8Array(b64.length).map((_, i) => b64.charCodeAt(i)).buffer;
    const dv = new DataView(M), hl = dv.getUint32(0, true), head = JSON.parse(new TextDecoder().decode(new Uint8Array(M, 4, hl))), m = head.models.zombie, base = 4 + hl;
    const vao = g2.createVertexArray(); g2.bindVertexArray(vao);
    const vb = g2.createBuffer(); g2.bindBuffer(g2.ARRAY_BUFFER, vb); g2.bufferData(g2.ARRAY_BUFFER, new Uint8Array(M, base + m.vo, m.nv * 16), g2.STATIC_DRAW);
    g2.enableVertexAttribArray(0); g2.vertexAttribPointer(0, 3, g2.SHORT, false, 16, 0);
    g2.enableVertexAttribArray(1); g2.vertexAttribPointer(1, 2, g2.BYTE, true, 16, 6);
    g2.enableVertexAttribArray(2); g2.vertexAttribIPointer(2, 2, g2.UNSIGNED_BYTE, 16, 8);
    g2.enableVertexAttribArray(3); g2.vertexAttribPointer(3, 4, g2.UNSIGNED_BYTE, true, 16, 10);
    g2.vertexAttrib1f(4, 0);
    const ib = g2.createBuffer(); g2.bindBuffer(g2.ELEMENT_ARRAY_BUFFER, ib); g2.bufferData(g2.ELEMENT_ARRAY_BUFFER, new Uint16Array(M, base + m.io, m.ni), g2.STATIC_DRAW);
    const tex = g2.createTexture(); g2.activeTexture(g2.TEXTURE0); g2.bindTexture(g2.TEXTURE_2D, tex); g2.texStorage2D(g2.TEXTURE_2D, 1, g2.RGBA32F, FIG.tw, 1);
    g2.texParameteri(g2.TEXTURE_2D, g2.TEXTURE_MIN_FILTER, g2.NEAREST); g2.texParameteri(g2.TEXTURE_2D, g2.TEXTURE_MAG_FILTER, g2.NEAREST);
    g2.uniform1i(g2.getUniformLocation(prog, 'uBones'), 0);
    g2.enable(g2.DEPTH_TEST); g2.clearColor(0.17, 0.18, 0.2, 1); g2.clear(g2.COLOR_BUFFER_BIT | g2.DEPTH_BUFFER_BIT);
    // side: looking along +x (the zombie faces up the screen, -y); above: straight down. Rows of uV: screen x, screen y, toward the eye
    const side = [0, -1, 0, 0, 0, 1, -1, 0, 0], top = [1, 0, 0, 0, -1, 0, 0, 0, 1];
    const row = new Float32Array(FIG.tw * 4);
    ${JSON.stringify(STATES)}.forEach(([nm, setup], i) => {
      const e = makeEnemy('skitter', 1000, 1000); e.emerge = 1; e.trait = null; e.elite = false; e.shield = null; e.kind = null; e.a = -Math.PI / 2; e.vx = e.vy = 0; e.pose = 0;
      new Function('e', setup)(e);
      if (e.down > 0 || e.dying !== undefined) e.lyG = lyState(e).g;
      POSE(e, row, 0);
      g2.texSubImage2D(g2.TEXTURE_2D, 0, 0, 0, FIG.tw, 1, g2.RGBA, g2.FLOAT, row);
      for (const [j, V] of [[0, side], [1, top]]) {
        g2.viewport((i * 2 + j) * W, 0, W, H);
        g2.uniformMatrix3fv(g2.getUniformLocation(prog, 'uV'), true, V);
        g2.uniform3f(g2.getUniformLocation(prog, 'uC'), e.x, e.y - 4, j ? 0 : 22);
        g2.drawElements(g2.TRIANGLES, m.ni, g2.UNSIGNED_SHORT, 0);
      }
    });
    return cv.toDataURL('image/png');
  })()`);
  if (!png.startsWith('data:')) throw new Error(png);
  writeFileSync(OUT, Buffer.from(png.split(',')[1], 'base64'));
  console.log('wrote', OUT, STATES.map((s, i) => i + ': ' + s[0]).join(', '));
  if (errs.length) console.log('page errors:', errs.join(' | ').slice(0, 1500));
} finally {
  await b.close();
}
