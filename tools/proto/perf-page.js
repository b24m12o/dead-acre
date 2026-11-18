/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
/* eslint-disable no-undef */ // runs inside the test build, where the game's own names are in scope
// PROTOTYPE, not part of the game: the measuring page. A town street at night, you unhurt, a crowd of the game's own
// zombies round you (their own AI), and switches: zombies as today's pictures or as 3D bodies (crowd3d-page.js), the
// live 3D boss climbing out of a hole on a loop (abom3d-page.js, abom3d-clip.js), how many zombies. It shows the
// frame rate, the frame time (average and worst), the graphics card's own time per frame where the browser gives it,
// the size it draws at and the card's name. "Run all" measures every combination for 8 s each and lists them.
(() => {
  initAudio();
  GS.meta.tutDone = true;
  begin();
  GS.RUN.tut = null;
  GS.state = 'play';
  GS.wave = 3;
  GS.queue.length = 0;
  for (const e of GS.enemies) e.dead = true;
  GS.enemies.length = 0;
  GS.interT = 99;
  let spot = null;
  for (let k = 0; k < 20000 && !spot; k++) {
    const x = 600 + Math.random() * (WW - 1200),
      y = 600 + Math.random() * (WH - 1200);
    if (freeAround(x, y, 120) && freeAround(x, y - 260, 110)) spot = [x, y];
  }
  const P = GS.P;
  P.x = spot[0];
  P.y = spot[1];
  const HX = spot[0],
    HY = spot[1] - 260;
  const PERF = (window.PERF = { n: 300, boss: false, d3: false, ft: [], gpu: [], log: [] });
  // the crowd: kept at its number, coming in round you
  function topUp() {
    const live = GS.enemies.filter(e => !e.dead && e.type === 'skitter');
    for (let i = live.length; i < PERF.n; i++) {
      for (let k = 0; k < 20; k++) {
        const a = rand(0, TAU),
          r = rand(240, 640),
          x = P.x + Math.cos(a) * r,
          y = P.y + Math.sin(a) * r;
        if (blockPt(x, y) || !reachPt(x, y)) continue;
        const e = makeEnemy('skitter', x, y);
        e.emerge = 1;
        GS.enemies.push(e);
        break;
      }
    }
    for (let i = PERF.n; i < live.length; i++) live[i].dead = true;
  }
  // the boss, on a loop
  let bossT0 = 0;
  const bossLoop = 7.6;
  // the graphics card's own clock, where the browser offers it
  const tq = gl.getExtension('EXT_disjoint_timer_query_webgl2'),
    pend = [];
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  PERF.card = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  let last = performance.now();
  const render_0 = render;
  render = function () {
    GS.queue.length = 0;
    GS.interT = 99;
    GS.P.hp = S.maxHp;
    GS.P.inv = 1; // you can't be hurt here
    if (GS.rsCap !== GS.RS_MAX) {
      GS.rsCap = GS.RS_MAX;
      resize();
    } // measured at full quality: the game's own easing-off on a slow machine is held off here
    const now = performance.now();
    PERF.ft.push(now - last);
    last = now;
    if (PERF.ft.length > 240) PERF.ft.shift();
    if (PERF.boss) {
      const C = ABOM3D.C;
      let t = (now / 1000 - bossT0) % bossLoop;
      if (t < (C.lastT ?? 0)) {
        C.setup(HX, HY, Math.PI / 2);
        C.lastT = 0;
      } // round again: from the top
      C.clip(t);
      C.events(C.lastT ?? 0, t, ABOM3D.fx);
      C.lastT = t;
    }
    CROWD3D.on = PERF.d3;
    CROWD3D.collect();
    let q = null;
    if (tq && pend.length < 4) {
      q = gl.createQuery();
      gl.beginQuery(tq.TIME_ELAPSED_EXT, q);
    }
    render_0.apply(this, arguments);
    if (q) {
      gl.endQuery(tq.TIME_ELAPSED_EXT);
      pend.push(q);
    }
    while (pend.length && gl.getQueryParameter(pend[0], gl.QUERY_RESULT_AVAILABLE)) {
      const r = gl.getQueryParameter(pend[0], gl.QUERY_RESULT);
      if (!gl.getParameter(tq.GPU_DISJOINT_EXT)) {
        PERF.gpu.push(r / 1e6);
        if (PERF.gpu.length > 240) PERF.gpu.shift();
      }
      gl.deleteQuery(pend.shift());
    }
  };
  const drawRanger_0 = drawRanger;
  drawRanger = function (p) {
    if (p === GS.P) {
      if (PERF.boss) ABOM3D.draw();
      CROWD3D.draw();
    } // the 3D things go into each pass (the scene, the shadows) as you are drawn
    return drawRanger_0.apply(this, arguments);
  };
  ABOM3D.C.setup(HX, HY, Math.PI / 2);
  ABOM3D.lampOK = true;
  const H = [HX, HY];
  ABOM3D.fx = {
    crack: k => {
      decal(R.hole, H[0] + rand(-6, 6), H[1] + rand(-6, 6), 0.8 + 2.6 * k, [1, 1, 1, 0.35 + 0.45 * k], [0, 0, 0], 120);
      dust(H[0], H[1], 2 + ((k * 4) | 0), 40 + 40 * k, 1, 1, [0.28, 0.27, 0.25]);
      chips(H[0], H[1], 2 + ((k * 6) | 0), null, 4, 80 + 120 * k);
    },
    burst: () => {
      decal(R.hole, H[0], H[1], 3.6, [1, 1, 1, 0.95], [0, 0, 0], 200);
      chips(H[0], H[1], 18, null, 4, 300);
      dust(H[0], H[1], 16, 110, 1.6, 1.6, [0.24, 0.23, 0.21]);
    },
    stab: p => chips(p[0], p[1], 10, null, 4, 200),
    grip: p => chips(p[0], p[1], 7, null, 4, 150),
    step: p => dust(p[0], p[1], 3, 40, 0.9, 0.8, [0.3, 0.28, 0.26]),
    haul: () => dust(H[0], H[1], 10, 90, 1.4, 1.3, [0.26, 0.25, 0.23]),
    roar: () => {},
  };
  // the panel
  const css = `#perfP{position:fixed;left:12px;top:12px;z-index:99999;background:rgba(10,12,16,.88);color:#e8e4dc;font:13px/1.45 ui-monospace,Menlo,monospace;padding:12px 14px;border-radius:8px;width:360px;pointer-events:auto}
#perfP button{font:inherit;margin:2px 4px 2px 0;padding:3px 8px;border-radius:5px;border:1px solid #556;background:#1c2028;color:#e8e4dc;cursor:pointer}
#streak,#banner,#radio,#ticker,#hint{display:none!important}
#perfP button.on{background:#c8a24a;color:#111;border-color:#c8a24a}#perfP b{color:#ffd08a}#perfP pre{margin:6px 0 0;white-space:pre-wrap}`;
  const st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);
  const box = document.createElement('div');
  box.id = 'perfP';
  box.innerHTML = `<div><b>Dead Acre · 3D measuring page</b> (not the game)</div>
<div>Zombies: <button data-k="d3" data-v="0">pictures (today)</button><button data-k="d3" data-v="1">3D bodies</button></div>
<div>Live 3D boss: <button data-k="boss" data-v="0">off</button><button data-k="boss" data-v="1">on</button></div>
<div>How many: <button data-k="n" data-v="0">0</button><button data-k="n" data-v="100">100</button><button data-k="n" data-v="300">300</button><button data-k="n" data-v="500">500</button></div>
<div><button id="perfAll">Run all (about 2 min)</button></div>
<pre id="perfR"></pre><pre id="perfT"></pre>`;
  document.body.appendChild(box);
  const sync = () => {
    for (const b of box.querySelectorAll('button[data-k]')) {
      const k = b.dataset.k,
        v = +b.dataset.v;
      b.classList.toggle('on', k === 'n' ? PERF.n === v : !!PERF[k] === !!v);
    }
  };
  box.addEventListener('click', ev => {
    const b = ev.target.closest('button[data-k]');
    if (!b) return;
    const k = b.dataset.k,
      v = +b.dataset.v;
    if (k === 'n') PERF.n = v;
    else PERF[k] = !!v;
    if (k === 'boss' && v) bossT0 = performance.now() / 1000;
    PERF.ft.length = 0;
    PERF.gpu.length = 0;
    sync();
  });
  for (const t of ['keydown', 'mousedown', 'pointerdown']) box.addEventListener(t, ev => ev.stopPropagation(), true); // the panel's clicks don't reach the game
  sync();
  const stat = a => {
    if (!a.length) return null;
    const s = a.slice().sort((x, y) => x - y),
      avg = a.reduce((x, y) => x + y, 0) / a.length;
    return { avg, worst: s[Math.floor(s.length * 0.99)] || s[s.length - 1] };
  };
  const line = () => {
    const f = stat(PERF.ft.slice(-120)),
      g = stat(PERF.gpu.slice(-120));
    return {
      fps: f ? 1000 / f.avg : 0,
      ms: f ? f.avg : 0,
      worst: f ? f.worst : 0,
      gpu: g ? g.avg : null,
    };
  };
  setInterval(() => {
    const L = line(),
      cv = $('gl');
    $('perfR').textContent =
      `${L.fps.toFixed(0)} fps · ${L.ms.toFixed(1)} ms a frame (worst ${L.worst.toFixed(1)})\n` +
      `graphics card: ${L.gpu === null ? 'not reported by this browser' : L.gpu.toFixed(1) + ' ms a frame'}\n` +
      `zombies on screen: ${GS.enemies.filter(e => !e.dead).length}${PERF.d3 ? `, as 3D: ${CROWD3D.drawn | 0} (${(((CROWD3D.drawn | 0) * CROWD3D.tri) / 1e6).toFixed(1)} M triangles)` : ''}\n` +
      `drawing at ${cv.width}×${cv.height}\n${PERF.card}`;
  }, 500);
  // run all: each combination for 8 s (2 s to settle, 6 s measured)
  const wait = ms => new Promise(r => setTimeout(r, ms));
  $('perfAll').onclick = async () => {
    const rows = [];
    $('perfT').textContent = 'measuring…';
    for (const n of [0, 300]) {
      for (const d3 of [false, true]) {
        if (n === 0 && d3) continue;
        for (const boss of [false, true]) {
          PERF.n = n;
          PERF.d3 = d3;
          PERF.boss = boss;
          if (boss) bossT0 = performance.now() / 1000;
          sync();
          await wait(2000);
          PERF.ft.length = 0;
          PERF.gpu.length = 0;
          await wait(6000);
          const L = line();
          rows.push(
            `${String(n).padStart(3)} ${d3 ? '3D ' : '2D '}${boss ? '+boss' : '     '}  ${L.fps.toFixed(0).padStart(3)} fps  ${L.ms.toFixed(1).padStart(5)} ms  worst ${L.worst.toFixed(1).padStart(5)}${L.gpu === null ? '' : `  card ${L.gpu.toFixed(1)} ms`}`
          );
          $('perfT').textContent = rows.join('\n') + '\nmeasuring…';
        }
      }
    }
    $('perfT').textContent = rows.join('\n') + `\n${$('gl').width}×${$('gl').height} · ${PERF.card}`;
  };
  topUp();
  setInterval(topUp, 400);
  return 'perf ready';
})();
