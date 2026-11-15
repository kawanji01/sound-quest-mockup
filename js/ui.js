// 画面の部品：アイコン、ふきだし、星、候補のしるし、モーダル、トースト、紙ふぶき、QRコード
import { esc } from './util.js';
import { CANDIDATES } from './state.js';
import { mimi } from './mimi.js';

const S = (body, { vb = '0 0 24 24', sw = 2.2, cls = '' } = {}) =>
  `<svg viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"${cls ? ` class="${cls}"` : ''}>${body}</svg>`;

export const icons = {
  speaker: S('<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6"/><path d="M18.2 6.5a7.6 7.6 0 0 1 0 11"/>'),
  play: S('<path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none"/>'),
  mic: S('<rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0"/><path d="M12 17.5V21"/>'),
  stop: S('<rect x="6.5" y="6.5" width="11" height="11" rx="2.5" fill="currentColor" stroke="none"/>'),
  back: S('<path d="M15 5l-7 7 7 7"/>', { sw: 2.8 }),
  next: S('<path d="M9 5l7 7-7 7"/>', { sw: 2.8 }),
  check: S('<path d="M5 12.5l4.5 4.5L19 7.5"/>', { sw: 3 }),
  map: S('<path d="M3 6.5l6-2.5 6 2.5 6-2.5v13.5l-6 2.5-6-2.5-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>'),
  sliders: S('<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>'),
  print: S('<path d="M7 8V3.5h10V8"/><rect x="3" y="8" width="18" height="9" rx="2"/><path d="M7 14h10v6.5H7z"/>'),
  download: S('<path d="M12 4v11"/><path d="M7 10.5l5 5 5-5"/><path d="M5 20h14"/>'),
  users: S('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7"/><path d="M18 14.2a6 6 0 0 1 3.5 5.8"/>'),
  grid: S('<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>'),
  qr: S('<rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1"/><rect x="14" y="3.5" width="6.5" height="6.5" rx="1"/><rect x="3.5" y="14" width="6.5" height="6.5" rx="1"/><path d="M14 14h3v3h-3zM17.5 17.5h3v3h-3zM20.5 14v1.5M14 20.5h1.5"/>'),
  table: S('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 10v10"/>'),
  wave: S('<path d="M2.5 12c2.4-6 4.8-6 7.2 0s4.8 6 7.2 0c1.3-3.3 2.8-4.3 4.6-3"/>', { sw: 2.6 }),
  camera: S('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>'),
  logout: S('<path d="M14 4h5v16h-5"/><path d="M10 8l-4 4 4 4"/><path d="M6 12h10"/>'),
  plus: S('<path d="M12 5v14M5 12h14"/>'),
  close: S('<path d="M6 6l12 12M18 6L6 18"/>'),
  up: S('<path d="M4 22 Q 22 22 34 7"/><path d="M23.5 5.5h11.5v11.5"/>', { vb: '0 0 40 28', sw: 4.5, cls: 'arrow' }),
  down: S('<path d="M4 6 Q 22 6 34 21"/><path d="M35 11v11.5H23.5"/>', { vb: '0 0 40 28', sw: 4.5, cls: 'arrow' }),
  scan: S('<path d="M3 26V8a5 5 0 0 1 5-5h18M74 3h18a5 5 0 0 1 5 5v18M97 74v18a5 5 0 0 1-5 5H74M26 97H8a5 5 0 0 1-5-5V74"/>', { vb: '0 0 100 100', sw: 6, cls: 'corners' }),
};
export const icon = (name) => icons[name] || '';

export function star(on) {
  return `<svg viewBox="0 0 24 24" class="${on ? 'on' : ''}" aria-hidden="true"><path d="M12 2.6l2.85 5.95 6.45.8-4.75 4.45 1.2 6.45L12 17.15l-5.75 3.1 1.2-6.45L2.7 9.35l6.45-.8z" fill="${on ? '#ffc93c' : '#dfe7ee'}" stroke="${on ? '#e0a100' : '#c9d5df'}" stroke-width="1.2" stroke-linejoin="round"/></svg>`;
}
export const stars = (n, max = 3) => Array.from({ length: max }, (_, i) => star(i < n)).join('');

// ミミの ふきだし（🔊で よみあげ）
export function say(text, { mood = 'smile', size = 104, cls = '' } = {}) {
  const plain = text.replace(/<[^>]+>/g, '');
  return `<div class="k-say ${cls}">${mimi(mood, { size })}<div class="k-bubble"><p>${text}</p>` +
    `<button class="k-voice" data-act="say" data-arg="${esc(plain)}" aria-label="よみあげる">${icons.speaker}</button></div></div>`;
}

// 候補（採否未定）の しるし
export function candName(key) { return (CANDIDATES.find((c) => c.key === key) || {}).name || key; }
export function candTag(key, label) { return `<span class="cand-tag">候補：${esc(label || candName(key))}</span>`; }

// ---------- モーダル ----------
const overlay = () => document.getElementById('overlay');
let modalActions = {};
let modalChanges = {};
export function openModal(html, { actions = {}, changes = {}, label = '' } = {}) {
  const o = overlay();
  o.innerHTML = `<div class="modal-backdrop" data-mact="close"></div><div class="modal" role="dialog" aria-modal="true" aria-label="${esc(label)}">` +
    `<button class="modal-close" data-mact="close" aria-label="とじる">${icons.close}</button>${html}</div>`;
  o.classList.add('open');
  modalActions = actions;
  modalChanges = changes;
  const first = o.querySelector('input, select, button:not(.modal-close)');
  if (first) setTimeout(() => first.focus({ preventScroll: true }), 30);
}
export function closeModal() {
  const o = overlay();
  o.classList.remove('open');
  o.innerHTML = '';
  modalActions = {};
  modalChanges = {};
}
export function installModalHandlers() {
  const o = overlay();
  o.addEventListener('click', (e) => {
    const el = e.target.closest('[data-mact]');
    if (!el) return;
    const a = el.dataset.mact;
    if (a === 'close') { closeModal(); return; }
    const fn = modalActions[a];
    if (fn) { e.preventDefault(); fn(el.dataset.arg, el, e); }
  });
  o.addEventListener('change', (e) => {
    const el = e.target.closest('[data-mchange]');
    if (!el) return;
    const fn = modalChanges[el.dataset.mchange];
    if (fn) fn(el.dataset.arg, el, e);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && o.classList.contains('open')) closeModal(); });
}

// ---------- トースト ----------
let toastTimer = 0;
export function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

// ---------- 紙ふぶき ----------
export function confetti() {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const wrap = document.createElement('div');
  wrap.className = 'confetti';
  const colors = ['#ffc93c', '#ff7a6b', '#6fd1ae', '#8c7ae6', '#4fb3d9', '#ff9db3'];
  for (let i = 0; i < 70; i++) {
    const p = document.createElement('i');
    p.style.left = `${Math.random() * 100}%`;
    p.style.background = colors[i % colors.length];
    p.style.animationDelay = `${Math.random() * 0.5}s`;
    p.style.animationDuration = `${1.8 + Math.random() * 1.4}s`;
    p.style.width = `${7 + Math.random() * 7}px`;
    wrap.appendChild(p);
  }
  document.body.appendChild(wrap);
  setTimeout(() => wrap.remove(), 4000);
}

// ---------- QRコード ----------
export function qrSvg(text) {
  if (!window.qrcode) return '<div class="qr" style="display:grid;place-items:center;background:#f1f4f6;border-radius:8px;font-size:12px;color:#5a6675">QR</div>';
  const q = window.qrcode(0, 'M');
  q.addData(text);
  q.make();
  const n = q.getModuleCount();
  let d = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
  return `<svg class="qr" viewBox="-2 -2 ${n + 4} ${n + 4}" shape-rendering="crispEdges" role="img" aria-label="ログイン用QRコード"><rect x="-2" y="-2" width="${n + 4}" height="${n + 4}" fill="#fff"/><path d="${d}" fill="#14202c"/></svg>`;
}
export function kidLoginUrl(code, n) {
  return `${location.origin}${location.pathname}#/q/${code}-${n}`;
}
export const isLocalHost = () => /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
