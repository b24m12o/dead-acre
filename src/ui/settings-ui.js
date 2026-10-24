/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
let hintTO = 0;
function updateHint() { const ht = 'WASD move · hold click to fire · R reload · Space roll · E ability · 1–9 swap · hold Q wheel'; if (typeof RUN !== 'undefined' && RUN && RUN.tut && RUN.tut.i >= 0) tutHint(); else { $('hint').textContent = ht; $('hint').classList.remove('tut'); } $('pauseHint').textContent = ht + ' · Esc resume'; { const lk = $('luKeys'); if (lk) { const rr = rerolls > 0 && pickSource !== 'weapon' && pickSource !== 'job', nk = `Keys 1–${Math.max(1, picks.length || 3)} pick`; lk.textContent = rr ? nk + ' · R rerolls' : nk; } } }
function syncOpts() {
  const mark = (el, on) => { el.classList.toggle('on', !!on); el.setAttribute('aria-pressed', on ? 'true' : 'false'); };
  for (const [id, on] of [['leanBtn', opt.lean], ['shakeBtn', opt.shake], ['flashBtn', opt.flash], ['goreBtn', opt.gore], ['grainBtn', opt.grain], ['losBtn', opt.los], ['chLine', meta.ch.line]]) mark($(id), on);
  mark($('musicBtn'), opt.music); mark($('muteBtn'), !muted); mark($('tutBtn'), !!(meta && meta.tutForce));
  $('volMaster').value = Math.round(meta.vol.master * 100); $('volMusic').value = Math.round(meta.vol.music / 0.6 * 100); $('volSfx').value = Math.round(meta.vol.sfx / 0.8 * 100);
  for (const b of $('diffSeg').children) mark(b, b.dataset.d === meta.diff); { const dd = $('diffDesc'); if (dd) dd.textContent = DIFF_DESC[meta.diff] || DIFF_DESC.normal; }
  for (const b of $('gfxSeg').children) if (b.dataset.g) mark(b, b.dataset.g === meta.hud.gfx); mark($('fpsBtn'), meta.hud.fps);
  for (const b of $('chCol').children) mark(b, b.dataset.c === meta.ch.col);
  for (const b of $('chSize').children) if (b.dataset.s) mark(b, +b.dataset.s === meta.ch.size);
  for (const b of $('hudSize').children) mark(b, b.dataset.h === meta.hud.size);
  for (const b of $('hudOp').children) mark(b, +b.dataset.o === meta.hud.op);
  for (const b of $('hudTs').children) mark(b, +b.dataset.t === TSU()); document.documentElement.style.setProperty('--ts', TS());
}
$('leanBtn').addEventListener('click', () => { opt.lean = !opt.lean; store.set('rr_lean', opt.lean ? '1' : '0'); syncOpts(); });
$('grainBtn').addEventListener('click', () => { opt.grain = !opt.grain; store.set('rr_grain', opt.grain ? '1' : '0'); syncOpts(); });
$('losBtn').addEventListener('click', () => { opt.los = !opt.los; store.set('rr_los', opt.los ? '1' : '0'); syncOpts(); });
$('goreBtn').addEventListener('click', () => { opt.gore = !opt.gore; store.set('rr_gore', opt.gore ? '1' : '0'); syncOpts(); });
$('shakeBtn').addEventListener('click', () => { opt.shake = !opt.shake; store.set('rr_shake', opt.shake ? '1' : '0'); if (!opt.shake) trauma = 0; syncOpts(); });
$('musicBtn').addEventListener('click', () => { initAudio(); setMusic(!opt.music); });
$('practiceBtn').addEventListener('click', () => openPractice('settings'));
$('practiceBack').addEventListener('click', () => { $('practice').hidden = true; $(PRACTICE_FROM === 'settings' ? 'settings' : 'menu').hidden = false; });
$('flashBtn').addEventListener('click', () => { opt.flash = !opt.flash; store.set('rr_flash', opt.flash ? '1' : '0'); syncOpts(); });
$('volMaster').addEventListener('input', e => { meta.vol.master = e.target.value / 100; applyVol(); saveMeta(); });
$('volMusic').addEventListener('input', e => { meta.vol.music = e.target.value / 100 * 0.6; applyVol(); saveMeta(); });
$('volSfx').addEventListener('input', e => { initAudio(); meta.vol.sfx = e.target.value / 100 * 0.8; applyVol(); saveMeta(); playS('dry', 0.4, 1.6, 0, 0); });
for (const b of $('chCol').children) b.addEventListener('click', () => { meta.ch.col = b.dataset.c; saveMeta(); syncOpts(); });
for (const b of $('chSize').children) if (b.dataset.s) b.addEventListener('click', () => { meta.ch.size = +b.dataset.s; saveMeta(); syncOpts(); });
$('chLine').addEventListener('click', () => { meta.ch.line = !meta.ch.line; saveMeta(); syncOpts(); });
for (const b of $('hudSize').children) b.addEventListener('click', () => { meta.hud.size = b.dataset.h; saveMeta(); syncOpts(); });
for (const b of $('hudTs').children) b.addEventListener('click', () => { meta.hud.ts = +b.dataset.t; saveMeta(); syncOpts(); for (const id of ['gauge', 'wavePlate', 'scorePlate', 'bossBox', 'radio']) $(id).dataset.hf = ''; });
for (const b of $('hudOp').children) b.addEventListener('click', () => { meta.hud.op = +b.dataset.o; saveMeta(); syncOpts(); for (const id of ['gauge', 'wavePlate', 'scorePlate', 'bossBox', 'radio']) $(id).dataset.hf = ''; });
for (const b of $('diffSeg').children) b.addEventListener('click', () => { meta.diff = b.dataset.d; saveMeta(); syncOpts(); });
for (const b of $('gfxSeg').children) if (b.dataset.g) b.addEventListener('click', () => { if (meta.hud.gfx === b.dataset.g) return; meta.hud.gfx = b.dataset.g; saveMeta(); syncOpts(); RS_MAX = Math.min(DEVICE_RENDER_CAP, gfxPreset().dpr); rsCap = RS_MAX; rsDropT = 0; resize(); });
$('fpsBtn').addEventListener('click', () => { meta.hud.fps = !meta.hud.fps; saveMeta(); syncOpts(); });
/* live crosshair preview in Settings: a patch of night street, a shambler drifting under the reticle, a shot every so often */
let chPrevRaf = 0;
function chPreview() {
  const cv = $('chPrev'); if (!cv || $('settings').hidden || !cv.offsetWidth) { chPrevRaf = 0; return; }
  const dpr = Math.min(2, window.devicePixelRatio || 1), W = cv.offsetWidth, H = cv.offsetHeight;
  if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const c = cv.getContext('2d'), t = performance.now() / 1000; c.setTransform(dpr, 0, 0, dpr, 0, 0);
  // asphalt, a lane mark and a puddle of lamp light
  c.fillStyle = '#1b1f24'; c.fillRect(0, 0, W, H);
  const g = c.createRadialGradient(W * 0.72, H * 0.2, 4, W * 0.72, H * 0.2, W * 0.7); g.addColorStop(0, 'rgba(255,190,110,0.16)'); g.addColorStop(1, 'rgba(255,190,110,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.fillStyle = 'rgba(214,170,60,0.35)'; for (let x = -10; x < W; x += 30) c.fillRect(x, H * 0.62, 16, 3);
  for (let i = 0; i < 40; i++) { const x = (i * 73.13) % W, y = (i * 41.7) % H; c.fillStyle = i % 3 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.25)'; c.fillRect(x, y, 2, 2); }
  // a zombie shuffling across; the reticle turns hot when it is over him
  const zx = W * 0.5 + Math.sin(t * 0.55) * W * 0.36, zy = H * 0.5 + Math.sin(t * 1.1) * 4, mx = W * 0.5, my = H * 0.5;
  c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(zx + 3, zy + 5, 11, 7, 0, 0, TAU); c.fill();
  c.fillStyle = '#4c5446'; c.beginPath(); c.ellipse(zx, zy, 8, 10.5, 0, 0, TAU); c.fill();
  c.strokeStyle = '#6f7a62'; c.lineWidth = 4; c.lineCap = 'round'; for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(zx + sd * 6, zy - 3); c.lineTo(zx + sd * 5 - 9, zy + sd * 1 - 4); c.stroke(); }
  c.fillStyle = '#8a8f74'; c.beginPath(); c.arc(zx + 3, zy, 5, 0, TAU); c.fill();
  const hot = Math.abs(zx - mx) < 14 ? 1 : 0; chPrevSt.hot = (chPrevSt.hot || 0) + (hot - (chPrevSt.hot || 0)) * 0.3;
  const ch = meta.ch, col = CH_COLS[ch.col] || CH_COLS.lime, k = ch.size * 0.72, kick = Math.max(0, 1 - (t % 1.4) / 0.18);
  if (ch.line) { const px = 10, py = H - 8, L = Math.hypot(mx - px, my - py); c.save(); c.setLineDash([3, 9]); c.lineDashOffset = -t * 40; c.lineCap = 'round'; c.strokeStyle = 'rgba(20,24,29,0.45)'; c.lineWidth = 4; c.beginPath(); c.moveTo(px, py); c.lineTo(mx - (mx - px) / L * 22 * k, my - (my - py) / L * 22 * k); c.stroke(); c.strokeStyle = col; c.globalAlpha = 0.55; c.lineWidth = 1.6; c.stroke(); c.restore(); }
  paintCH(c, mx, my, k, chPrevSt.hot > 0.5 ? '#ffffff' : col, (11 + kick * 7) * k - chPrevSt.hot * 3 * k, chPrevSt.hot, false);
  chPrevRaf = requestAnimationFrame(chPreview);
}
const chPrevSt = { hot: 0 };
let settingsFrom = 'menu';
function openSettings(from) { settingsFrom = from; for (const el of document.querySelectorAll('.pracRow')) el.hidden = from !== 'menu'; $(from).hidden = true; syncOpts(); $('settings').hidden = false; if (!chPrevRaf) chPrevRaf = requestAnimationFrame(chPreview); }
$('settingsBtn').addEventListener('click', () => openSettings('menu'));
$('settingsBtn2').addEventListener('click', () => openSettings('pause'));
$('settingsBack').addEventListener('click', () => {
  $('settings').hidden = true;
  if (state === 'pause' || state === 'menu') $(settingsFrom).hidden = false;
  const returnId = settingsFrom === 'pause' ? 'settingsBtn2' : 'settingsBtn';
  const returnTarget = $(returnId);
  if (returnTarget && !returnTarget.hidden) returnTarget.focus({ preventScroll: true });
});

/* ---------- Profile export/import ---------- */
