/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
let fatalStopped = false, fatalShown = false;
function showFatalError(reason) {
  if (fatalShown) return;
  fatalShown = true; fatalStopped = true;
  const panel = document.createElement('div');
  panel.id = 'fatalGameError'; panel.setAttribute('role', 'alertdialog'); panel.setAttribute('aria-modal', 'true');
  Object.assign(panel.style, { position: 'fixed', inset: '0', zIndex: '10000', display: 'grid', placeItems: 'center', padding: '24px', background: 'rgba(9,12,15,.96)', color: '#f6f0e4', fontFamily: 'system-ui,sans-serif' });
  const card = document.createElement('div');
  Object.assign(card.style, { width: 'min(560px,100%)', boxSizing: 'border-box', padding: '28px', border: '1px solid #555b60', borderRadius: '16px', background: '#1c2228', boxShadow: '0 18px 70px #0009' });
  const heading = document.createElement('h1'); heading.textContent = 'The game stopped unexpectedly';
  Object.assign(heading.style, { margin: '0 0 12px', fontSize: 'clamp(24px,4vw,34px)', lineHeight: '1.1' });
  const message = document.createElement('p'); message.textContent = 'Reload the page to try again. Your saved scrap, unlocks, and settings should remain available; the current run may be lost.';
  Object.assign(message.style, { lineHeight: '1.55', color: '#c7cdd0' });
  const detail = document.createElement('p'); detail.textContent = 'Details: ' + String(reason || 'Unknown runtime error').slice(0, 220);
  Object.assign(detail.style, { font: '12px ui-monospace,monospace', overflowWrap: 'anywhere', color: '#e6b978' });
  const button = document.createElement('button'); button.type = 'button'; button.textContent = 'Reload game';
  Object.assign(button.style, { marginTop: '12px', padding: '12px 18px', border: '0', borderRadius: '8px', background: '#ff7a2f', color: '#171a1d', font: '700 15px system-ui,sans-serif', cursor: 'pointer' });
  button.addEventListener('click', () => location.reload());
  card.append(heading, message, detail, button); panel.append(card); document.body.append(panel); button.focus();
}
let inFrame = false, booted = false; // only an error that kills the game loop (or stops the game from starting) stops the game; a hiccup in a menu handler or a font that fails to load does not
addEventListener('error', e => { if (e && e.error && (inFrame || !booted)) { const l = document.getElementById('loading'); if (l) l.hidden = true; showFatalError(e.error.message || e.message || e.error); } });
addEventListener('unhandledrejection', e => { console.warn('Dead Acre: async failure', e && e.reason); if (!booted) { const l = document.getElementById('loading'); if (l) l.hidden = true; showFatalError((e && e.reason && e.reason.message) || String(e && e.reason)); } });
const $ = id => document.getElementById(id);
