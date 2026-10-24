/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
import { GS } from './gs.js';
import { $, fatalStopped } from './errors.js';
import { clamp } from './util.js';
import { saveMeta } from './settings.js';
import { gl, glc } from '../render/gl.js';
import { BAKE, assetsPrep, bakePrep } from '../render/bake.js';
import { resize } from '../render/sprites.js';
import { atlA, atlE, atlN, genNormals } from '../render/atlas.js';
import { paintAtlas } from '../render/atlas-paint.js';
import { texMapA } from '../world/map.js';
import { texFromCanvas } from '../world/nav.js';
import { setMuted } from '../audio/music.js';
import { WHEEL, wheelTick } from '../game/state.js';
import { syncOpts, updateHint } from '../ui/settings-ui.js';
import { HPV, copyPreview, renderHeroes } from '../ui/hangar.js';
import { setPause, showMenuRec } from '../ui/screens.js';
import { runLater } from './later.js';
import { update } from './update.js';
import { updateCamera } from '../render/camera.js';
import { PREG } from '../render/draw-props.js';
import { render } from '../render/render.js';
import { updateHud } from '../ui/hud.js';
import { tickWorld } from '../world/tick.js';
import { menuInit, menuUpdate } from '../ui/menu.js';
let last = performance.now(),
  perfAcc = 0,
  perfN = 0,
  slow = 0;
export let FPSV = 60;
function frame(now) {
  if (fatalStopped || GS.glDead) return;
  GS.inFrame = true;
  const raw = (now - last) / 1000;
  last = now;
  const dt = Math.min(0.05, raw);
  if (raw > 0 && raw < 1) FPSV += (1 / raw - FPSV) * 0.05;
  if (GS.mipDirty && now - GS.mipT > 500) {
    GS.mipDirty = false;
    GS.mipT = now;
    gl.bindTexture(gl.TEXTURE_2D, texMapA);
    gl.generateMipmap(gl.TEXTURE_2D);
  }
  {
    const ds = WHEEL.open ? 'wheel' : GS.state;
    if (document.body.dataset.st !== ds) document.body.dataset.st = ds;
  } // CSS hides the banner and callouts behind pause, cards and end screens
  wheelTick();
  const sdt = WHEEL.open ? dt * 0.1 : GS.slowmo > 0 ? dt * 0.3 : dt;
  if (GS.slowmo > 0 && !WHEEL.open) GS.slowmo -= dt;
  if (GS.state === 'play') {
    if (GS.hitstop > 0) GS.hitstop -= dt;
    else {
      const n = Math.min(3, Math.ceil(sdt / 0.0084));
      for (let i = 0; i < n && GS.state === 'play'; i++)
        update(
          sdt / n
        ); /* at most three steps a frame: a slow machine doesn't do more work each frame the slower it gets */
    }
    tickWorld(sdt);
    updateCamera(dt);
    if (GS.state === 'play') updateHud();
  } else if (GS.state === 'menu') {
    menuUpdate(dt);
    tickWorld(dt);
  } else if (GS.state === 'over') {
    GS.time += sdt;
    runLater(sdt);
    tickWorld(sdt);
  } else tickWorld(0);
  if ((GS.state === 'play' || GS.state === 'menu') && raw < 0.1) {
    perfAcc += raw;
    perfN++;
    if (perfN >= 90) {
      const avg = perfAcc / perfN;
      perfAcc = 0;
      perfN = 0; // a hitch (tab switch, GC) is not a slow GPU: frames over 100 ms don't count
      if (avg > 1 / 42 && GS.rsCap > 0.7) {
        GS.rsUp = 0;
        if (++slow >= 2) {
          GS.rsCap = Math.max(0.7, GS.rsCap - 0.25);
          slow = 0;
          GS.rsDropT = now;
          resize();
        }
      } else {
        slow = 0;
        if (avg < 1 / 56 && GS.rsCap < GS.RS_MAX && now - GS.rsDropT > 20000) {
          if (++GS.rsUp >= 3) {
            GS.rsUp = 0;
            GS.rsCap = Math.min(GS.RS_MAX, GS.rsCap + 0.25);
            resize();
          }
        } else GS.rsUp = 0;
      }
    }
  } // and it comes back up once there is headroom again
  HPV.on = GS.state === 'menu' && !$('hangar').hidden;
  if (!window.__nr) {
    render();
    if (HPV.on) copyPreview();
  }
  GS.inFrame = false;
  requestAnimationFrame(frame);
}
async function boot() {
  glc.addEventListener('webglcontextlost', ev => {
    // the GPU driver reset or ran out of memory: say so plainly instead of leaving a black screen
    ev.preventDefault();
    if (GS.state === 'play') setPause(true);
    GS.glDead = true;
    saveMeta();
    for (const o of document.querySelectorAll('.overlay')) if (o.id !== 'glLost') o.hidden = true;
    $('loading').hidden = true; // nothing else stays on screen under the message
    if (!$('glLost')) {
      const d = document.createElement('div');
      d.className = 'overlay';
      d.id = 'glLost';
      d.style.zIndex = 99;
      d.innerHTML =
        '<div class="panel"><div class="eyebrow">Graphics reset</div><h2>The screen went dark</h2><p class="lede">Your browser reset the graphics card, so the game can\'t draw any more. Reload the page to keep playing. Your scrap, unlocks and settings are saved; the current run is lost.</p><div class="btns"><button class="btn" type="button" id="glReload">Reload</button></div></div>';
      document.body.appendChild(d);
      $('glReload').addEventListener('click', () => location.reload());
    }
  });
  try {
    await assetsPrep();
    await bakePrep();
  } catch (err) {
    BAKE.ok = false;
    BAKE.diag.why = 'setup error';
    console.warn('Dead Acre: 3D setup failed', err);
  }
  paintAtlas();
  GS.PARTREG = PREG();
  {
    const D = BAKE.diag;
    let gpu = '';
    try {
      const x = gl.getExtension('WEBGL_debug_renderer_info');
      gpu = x ? gl.getParameter(x.UNMASKED_RENDERER_WEBGL) : '';
    } catch (e) {}
    D.gpu = gpu;
    console.info('Dead Acre characters:', JSON.stringify(D), 'bad groups:', JSON.stringify(BAKE.bad));
  }
  GS.texAtlA = texFromCanvas(atlA, true);
  GS.texAtlE = texFromCanvas(atlE, true);
  {
    const fc = document.createElement('canvas');
    fc.width = fc.height = 1;
    const fx = fc.getContext('2d');
    fx.fillStyle = 'rgb(128,128,0)';
    fx.fillRect(0, 0, 1, 1);
    GS.texAtlN = texFromCanvas(fc, false);
  } // flat until the relief is ready
  genNormals(() => {
    const old = GS.texAtlN;
    GS.texAtlN = texFromCanvas(atlN, true);
    gl.deleteTexture(old);
    atlN.width = 1;
  });
  atlA.width = atlE.width = 1;
  resize();
  addEventListener('resize', () => {
    clearTimeout(GS.rzT);
    GS.rzT = setTimeout(resize, 150);
  });
  setMuted(GS.muted);
  syncOpts();
  updateHint();
  showMenuRec();
  renderHeroes();
  menuInit();
  $('loading').hidden = true;
  $('menu').hidden = !!$('glLost'); // a reset during loading keeps its message up alone
  GS.booted = true;
  requestAnimationFrame(t => {
    last = t;
    requestAnimationFrame(frame);
  });
}
function fitOverlays() {
  // every menu screen is scaled to fit the window: nothing hangs off a short laptop screen, and a big monitor doesn't get a postage stamp
  for (const o of document.querySelectorAll('.overlay')) {
    if (o.hidden) continue;
    const pn = o.firstElementChild;
    if (!pn) continue;
    pn.style.zoom = '';
    const h = pn.scrollHeight,
      w = pn.offsetWidth;
    if (!h || !w) continue;
    const up = innerHeight >= 1250 && innerWidth >= 1500 ? Math.min(1.35, innerHeight / 1080) : 1,
      browse = ['hangar', 'chal', 'settings', 'practice'].includes(o.id),
      z = clamp(
        Math.min(browse ? Math.max((innerHeight - 56) / h, 0.94) : (innerHeight - 56) / h, (innerWidth - 24) / w, up),
        0.62,
        1.35
      );
    /* a long list you browse scrolls rather than shrinking its text; a screen with a decision on it still fits whole */ if (
      Math.abs(z - 1) > 0.004
    )
      pn.style.zoom = z.toFixed(3);
  }
}
let fontsReady;
// touch-only phones and tablets get a notice instead of the game: it needs a keyboard and mouse
// (Samsung phones report their touchscreen as a fine pointer, so pointer media queries alone can't be trusted: check for a phone or tablet directly)
let UA, TOUCH_ONLY;
function start() {
  if (!TOUCH_ONLY) {
    boot();
    return;
  }
  $('loading').hidden = true;
  $('deskOnly').hidden = false;
  let go = false,
    touched = -1e9,
    mx = null,
    md = 0;
  const launch = () => {
    if (go) return;
    go = true;
    $('deskOnly').hidden = true;
    $('loading').hidden = false;
    setTimeout(boot, 30);
  };
  // a real mouse (a tablet in desktop mode, say) also unlocks it: only mouse-type pointer moves, and never after a touch
  addEventListener(
    'touchstart',
    () => {
      touched = performance.now();
    },
    { passive: true, capture: true }
  );
  addEventListener('pointermove', e => {
    if (performance.now() - touched < 700 || e.pointerType !== 'mouse') return;
    if (mx) md += Math.hypot(e.clientX - mx[0], e.clientY - mx[1]);
    mx = [e.clientX, e.clientY];
    if (md > 120) launch();
  });
}

// runs once, in order with every other part's init, when the game starts (see src/index.js)
export function init() {
  {
    let fq = 0;
    const fitSoon = () => {
      if (fq) return;
      fq = requestAnimationFrame(() => {
        fq = 0;
        fitOverlays();
      });
    };
    addEventListener('resize', fitSoon);
    const mo = new MutationObserver(fitSoon);
    for (const o of document.querySelectorAll('.overlay'))
      mo.observe(o, { attributes: true, attributeFilter: ['hidden'], childList: true, subtree: true });
  }
  fontsReady =
    document.fonts && document.fonts.load
      ? Promise.race([
          Promise.all(
            [
              'italic 800 34px Kanit',
              'italic 700 20px Kanit',
              '900 20px Kanit',
              '400 14px Barlow',
              '600 14px Barlow',
              '400 12px "JetBrains Mono"',
              '600 12px "JetBrains Mono"',
            ].map(f => document.fonts.load(f).catch(() => 0))
          ),
          new Promise(r => setTimeout(r, 1500)),
        ])
      : Promise.resolve();
  UA = navigator.userAgent || '';
  TOUCH_ONLY = !!(
    (navigator.userAgentData && navigator.userAgentData.mobile) ||
    /Android|iPhone|iPad|iPod|Mobi|Silk|Kindle|Opera Mini|IEMobile/i.test(UA) ||
    (/Macintosh/.test(UA) && navigator.maxTouchPoints > 1) ||
    (matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches)
  );
  fontsReady.then(
    () => setTimeout(start, 30),
    () => setTimeout(start, 30)
  );
}
