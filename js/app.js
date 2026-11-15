// 画面の切り替え、クリックの受け付け、デモ操作パネル
import { store, save, resetAll, CANDIDATES, cand } from './state.js';
import { unlockAudio, stopSpeaking, speak, cameraOff } from './audio.js';
import { icons, openModal, closeModal, installModalHandlers, toast } from './ui.js';
import { esc } from './util.js';
import { setPainter, go } from './nav.js';
import { DEMO_KID } from './data.js';
import { guideScreen } from './guide.js';
import * as kid from './kid.js';
import * as teacher from './teacher.js';

const root = document.getElementById('app');
let current = null;

const ROUTES = [
  [/^\/$/, () => guideScreen()],
  [/^\/q\/(\d{4})-(\d{1,2})$/, (m) => kid.confirm(m[1], +m[2], { viaQr: true })],
  [/^\/demo\/(.+)$/, (m) => { store.session = { ...DEMO_KID }; save(); return { redirect: `/${m[1]}` }; }],
  [/^\/kid$/, () => kid.entry()],
  [/^\/kid\/login$/, () => kid.loginChoice()],
  [/^\/kid\/qr$/, () => kid.qrScan()],
  [/^\/kid\/code$/, () => kid.codeEntry()],
  [/^\/kid\/number\/(\d{4})$/, (m) => kid.numberSelect(m[1])],
  [/^\/kid\/confirm\/(\d{4})-(\d{1,2})$/, (m) => kid.confirm(m[1], +m[2])],
  [/^\/kid\/home$/, () => kid.home()],
  [/^\/kid\/test\/(pre|post)$/, (m) => kid.test(m[1])],
  [/^\/kid\/mission\/(\w+)$/, (m) => kid.mission(m[1])],
  [/^\/kid\/records$/, () => kid.records()],
  [/^\/teacher$/, () => teacher.classes()],
  [/^\/teacher\/class\/(\w+)$/, (m) => teacher.classDash(m[1])],
  [/^\/teacher\/class\/(\w+)\/student\/(\d+)$/, (m) => teacher.student(m[1], +m[2])],
  [/^\/teacher\/class\/(\w+)\/qr$/, (m) => teacher.qr(m[1])],
  [/^\/teacher\/data$/, () => teacher.data()],
];

function applyCandidates() {
  root.querySelectorAll('[data-cand]').forEach((el) => el.classList.toggle('cand-off', !cand(el.dataset.cand)));
  root.querySelectorAll('[data-cand-not]').forEach((el) => el.classList.toggle('cand-off', cand(el.dataset.candNot)));
  root.querySelectorAll('[data-cand-frame]').forEach((el) => el.classList.toggle('cand', cand(el.dataset.candFrame)));
}

const demoFab = () => `<button class="demo-fab" data-act="demo" aria-label="デモの操作をひらく">${icons.sliders}デモ操作</button>`;

function paint() {
  if (!current) return;
  root.innerHTML = current.view() + (current.mode === 'guide' ? '' : demoFab());
  applyCandidates();
  if (current.afterPaint) current.afterPaint(root);
}

function render() {
  try { if (current && current.unmount) current.unmount(); } catch (e) { console.error(e); }
  stopSpeaking();
  closeModal();
  const path = location.hash.replace(/^#/, '') || '/';
  let screen = null;
  for (const [re, fn] of ROUTES) {
    const m = path.match(re);
    if (m) { screen = fn(m); break; }
  }
  if (!screen) screen = { redirect: '/' };
  if (screen.redirect) { location.replace(`#${screen.redirect}`); return; }
  current = screen;
  document.body.dataset.mode = screen.mode || 'guide';
  document.title = `${screen.title ? `${screen.title} | ` : ''}Sound Quest モックアップ`;
  paint();
  window.scrollTo(0, 0);
  if (screen.mount) screen.mount(root);
}

// ---------- 全画面で使う操作 ----------
const GLOBAL = {
  say: (text) => speak(text, { lang: 'ja-JP' }),
  demo: () => openDemoPanel(),
  go: (p) => go(p),
};
const GLOBAL_CHANGE = {
  cand: (key, el) => setCand(key, el.checked),
};

function setCand(key, on) {
  store.settings.cand[key] = !!on;
  save();
  if (current && current.onCandChange) current.onCandChange();
  paint();
}

root.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || !root.contains(el)) return;
  if (el.getAttribute('aria-disabled') === 'true') { e.preventDefault(); return; }
  const act = el.dataset.act;
  const fn = (current && current.actions && current.actions[act]) || GLOBAL[act];
  if (fn) { e.preventDefault(); fn(el.dataset.arg, el, e); }
});
root.addEventListener('change', (e) => {
  const el = e.target.closest('[data-change]');
  if (!el) return;
  const fn = (current && current.changes && current.changes[el.dataset.change]) || GLOBAL_CHANGE[el.dataset.change];
  if (fn) fn(el.dataset.arg, el, e);
});
document.addEventListener('pointerdown', unlockAudio, { capture: true });

// ---------- デモ操作パネル ----------
function toggleRow({ key, name, note }, change, checked, green = false) {
  return `<label class="toggle"><span><b>${esc(name)}</b>${note ? `<small>${esc(note)}</small>` : ''}</span>` +
    `<span class="switch${green ? ' green' : ''}"><input type="checkbox" data-mchange="${change}" data-arg="${key}" ${checked ? 'checked' : ''}><span></span></span></label>`;
}

function openDemoPanel() {
  const html = `<h2>デモの操作</h2><p class="modal-sub">確認のための操作です。製品の画面には出ません。</p>
    <div class="demo-sec"><h3>画面を切り替える</h3><div class="demo-row">
      <button class="btn" data-mact="nav" data-arg="/">ガイドに戻る</button>
      <button class="btn" data-mact="nav" data-arg="/kid">こどもの画面</button>
      <button class="btn" data-mact="nav" data-arg="/teacher">先生の画面</button>
    </div></div>
    <div class="demo-sec"><h3>「候補」の機能を表示する</h3><div class="toggle-list">${CANDIDATES.map((c) => toggleRow(c, 'cand', cand(c.key))).join('')}</div></div>
    <div class="demo-sec"><h3>こどもの画面</h3><div class="toggle-list">${toggleRow({ key: 'voice', name: 'ミミの声で案内を読み上げる', note: '字が読めない子のために、画面が変わるたびに日本語で読み上げます' }, 'voice', store.settings.voice, true)}</div></div>
    <div class="demo-sec"><h3>データ</h3><div class="demo-row"><button class="btn" data-mact="reset">練習の記録を消して最初から</button></div>
      <p class="f-help" style="margin-top:8px">記録はこの端末のブラウザにだけ保存しています。録音はページを閉じると消えます。</p></div>`;
  openModal(html, {
    label: 'デモの操作',
    actions: {
      nav: (p) => { closeModal(); go(p); },
      reset: () => {
        if (!window.confirm('この端末に保存した練習の記録を消します。よろしいですか？')) return;
        resetAll();
        cameraOff();
        closeModal();
        toast('練習の記録を消しました');
        go('/');
      },
    },
    changes: {
      cand: (key, el) => setCand(key, el.checked),
      voice: (_, el) => { store.settings.voice = el.checked; save(); },
    },
  });
}

installModalHandlers();
setPainter(paint);
window.addEventListener('hashchange', render);
render();
