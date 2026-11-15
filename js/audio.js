// 音まわり：合成音声（おてほんの代わり）、効果音、録音、音声認識、カメラ。
// 本番では、おてほんは先生からいただく音声・動画に置き換える。

// ---------- 効果音（WebAudio で合成。音源ファイルは使わない） ----------
let ctx = null;
export function audioCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

let unlocked = false;
export function unlockAudio() {
  audioCtx();
  if (unlocked || !('speechSynthesis' in window)) return;
  unlocked = true;
  try { // iOS は さいしょの よみあげを タップの なかで する ひつようが ある
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    speechSynthesis.speak(u);
  } catch { /* なにもしない */ }
}

const SFX = {
  correct: { wave: 'sine', notes: [[880, 0], [1318.5, 0.1]], len: 0.32, vol: 0.16 },
  oops: { wave: 'triangle', notes: [[392, 0], [330, 0.13]], len: 0.3, vol: 0.13 },
  tap: { wave: 'sine', notes: [[740, 0]], len: 0.08, vol: 0.06 },
  fanfare: { wave: 'triangle', notes: [[523.25, 0], [659.25, 0.12], [783.99, 0.24], [1046.5, 0.38], [1318.5, 0.38]], len: 0.6, vol: 0.13 },
  stamp: { wave: 'square', notes: [[196, 0], [392, 0.05]], len: 0.16, vol: 0.05 },
  rec: { wave: 'sine', notes: [[660, 0], [990, 0.08]], len: 0.14, vol: 0.08 },
};
export function sfx(name) {
  const c = audioCtx();
  const s = SFX[name];
  if (!c || !s) return;
  const now = c.currentTime + 0.01;
  for (const [f, t] of s.notes) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = s.wave;
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, now + t);
    g.gain.exponentialRampToValueAtTime(s.vol, now + t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, now + t + s.len);
    o.connect(g).connect(c.destination);
    o.start(now + t);
    o.stop(now + t + s.len + 0.05);
  }
}

// ---------- 合成音声 ----------
const PREF = {
  'en-US': ['Samantha', 'Google US English', 'Microsoft Aria', 'Microsoft Jenny', 'Ava', 'Allison', 'Karen'],
  'ja-JP': ['Kyoko', 'O-ren', 'Google 日本語', 'Microsoft Nanami', 'Otoya'],
};
let voices = [];
function loadVoices() { try { voices = speechSynthesis.getVoices() || []; } catch { voices = []; } }
if ('speechSynthesis' in window) {
  loadVoices();
  if (speechSynthesis.addEventListener) speechSynthesis.addEventListener('voiceschanged', loadVoices);
}
// Mac・iPad の「おもしろ声」（Bubbles など）を おてほんに つかわない
const NOVELTY = /Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Good News|Jester|Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox|Junior|Ralph|Kathy|Fred|Grandma|Grandpa|Rocko|ささやき|オルガン|スーパースター|トリノイド|ベル|道化|震え/;
function pickVoice(lang) {
  if (!voices.length) loadVoices();
  const same = (v) => v.lang.replace('_', '-').startsWith(lang.slice(0, 2));
  for (const p of PREF[lang] || []) {
    const v = voices.find((x) => x.name.includes(p) && same(x));
    if (v) return v;
  }
  const ok = voices.filter((v) => same(v) && !NOVELTY.test(v.name));
  return ok.find((v) => v.lang.replace('_', '-') === lang) || ok[0] || null;
}
export const canSpeak = () => 'speechSynthesis' in window;

export function speak(text, { lang = 'en-US', rate, onend } = {}) {
  if (!canSpeak()) { onend && setTimeout(onend, 300); return false; }
  try { speechSynthesis.cancel(); } catch { /* なにもしない */ }
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  const v = pickVoice(lang);
  if (v) u.voice = v;
  u.rate = rate ?? (lang === 'en-US' ? 0.78 : 1.02);
  u.pitch = lang === 'ja-JP' ? 1.1 : 1;
  if (onend) {
    let done = false;
    const fin = () => { if (!done) { done = true; onend(); } };
    u.onend = fin;
    u.onerror = fin;
    setTimeout(fin, 1200 + text.length * 160); // onend が こない たんまつ むけ
  }
  speechSynthesis.speak(u);
  return true;
}
export function stopSpeaking() { try { if (canSpeak()) speechSynthesis.cancel(); } catch { /* なにもしない */ } }

// ---------- 録音 ----------
export const canRecord = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);

export async function startRecording({ onLevel, maxMs = 4000, onAutoStop } = {}) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
  let mime = '';
  for (const m of ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm']) {
    if (window.MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) { mime = m; break; }
  }
  const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };

  let raf = 0;
  let src = null;
  const c = audioCtx();
  if (c && onLevel) {
    try {
      src = c.createMediaStreamSource(stream);
      const an = c.createAnalyser();
      an.fftSize = 512;
      src.connect(an);
      const buf = new Uint8Array(an.fftSize);
      const tick = () => {
        an.getByteTimeDomainData(buf);
        let peak = 0;
        for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i] - 128));
        onLevel(Math.min(1, peak / 70));
        raf = requestAnimationFrame(tick);
      };
      tick();
    } catch { /* メーターなしで つづける */ }
  }

  let stopped = false;
  const done = new Promise((resolve) => {
    rec.onstop = () => {
      cancelAnimationFrame(raf);
      try { src && src.disconnect(); } catch { /* なにもしない */ }
      stream.getTracks().forEach((t) => t.stop());
      onLevel && onLevel(0);
      resolve(new Blob(chunks, { type: rec.mimeType || mime || 'audio/mp4' }));
    };
  });
  rec.start();
  const timer = setTimeout(() => {
    if (!stopped) { stopped = true; rec.stop(); onAutoStop && onAutoStop(); }
  }, maxMs);
  return {
    done,
    stop() {
      if (!stopped) { stopped = true; clearTimeout(timer); rec.stop(); }
      return done;
    },
  };
}

let player = null;
export function playUrl(url) {
  try {
    if (player) player.pause();
    player = new Audio(url);
    player.play().catch(() => {});
  } catch { /* なにもしない */ }
}

// ---------- 音声認識（候補） ----------
const SR = () => window.SpeechRecognition || window.webkitSpeechRecognition;
export const canRecognize = () => !!SR();

export function recognize({ lang = 'en-US', timeoutMs = 7000 } = {}) {
  const Ctor = SR();
  if (!Ctor) return { promise: Promise.resolve({ supported: false, alts: [] }), stop() {} };
  const r = new Ctor();
  r.lang = lang;
  r.interimResults = false;
  r.continuous = false;
  r.maxAlternatives = 5;
  let alts = [];
  let error = null;
  let settled = false;
  let timer = 0;
  const promise = new Promise((resolve) => {
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ supported: true, alts, error });
    };
    r.onresult = (e) => {
      const res = e.results[0];
      alts = Array.from(res).map((a) => a.transcript);
    };
    r.onerror = (e) => { error = e.error || 'error'; finish(); };
    r.onend = finish;
    timer = setTimeout(() => { try { r.stop(); } catch { /* なにもしない */ } setTimeout(finish, 800); }, timeoutMs);
    try { r.start(); } catch { error = 'start-failed'; finish(); }
  });
  return { promise, stop() { try { r.stop(); } catch { /* なにもしない */ } } };
}

// ことばの どちらに きこえたか
export function matchWord(alts, words) {
  const norm = (s) => ` ${String(s).toLowerCase().replace(/[^a-z' ]/g, ' ').replace(/\s+/g, ' ').trim()} `;
  for (const a of alts) {
    const n = norm(a);
    const hits = words.filter((w) => {
      const x = w.toLowerCase();
      return n.includes(` ${x} `) || n.includes(` ${x}s `) || n.includes(` ${x}'s `);
    });
    if (hits.length === 1) return { word: hits[0], heard: a.trim() };
  }
  return { word: null, heard: (alts[0] || '').trim() };
}

// ---------- カメラ（候補） ----------
let camStream = null;
export const canCamera = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
export async function cameraOn() {
  if (camStream) return camStream;
  camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
  return camStream;
}
export function cameraOff() {
  if (camStream) camStream.getTracks().forEach((t) => t.stop());
  camStream = null;
}
export const cameraActive = () => !!camStream;
export function attachCamera(root) {
  const v = root.querySelector('video[data-cam]');
  if (v && camStream && v.srcObject !== camStream) {
    v.srcObject = camStream;
    v.play && v.play().catch(() => {});
  }
}
