// 教材（ステージ）とダミーのクラス。ステージの中身は Sound Quest の12項目を仮に使っている。
// 先生の「筋書き」と教材データを受け取ったら差し替える。
import { store, kidKey, recordingsFor } from './state.js';
import { mulberry32, hashStr, shuffle, clamp, DAY, startOfDay } from './util.js';

export const AREAS = [
  { id: 'sounds', name: 'おとの しま', emoji: '🏝️', desc: 'にている おとを ききわけよう' },
  { id: 'rhythm', name: 'リズムの しま', emoji: '🥁', desc: 'つよさ・リズム・あがりさがり' },
  { id: 'talk', name: 'かいわの まち', emoji: '🏘️', desc: 'じゅんびちゅう', soon: true },
];

const pair = (id, label, sq, ease, a, b) => ({
  id, area: 'sounds', type: 'pair', label, sq, ease,
  title: `${a.w} と ${b.w}`,
  words: [a, b],
  pics: [a.e, b.e],
  stamp: b.e,
});

export const MISSIONS = [
  pair('rl1', 'R と L', 'right–light（/r/–/l/）', -0.24,
    { w: 'right', e: '👉', ja: 'みぎ', say: 'Turn right.' }, { w: 'light', e: '💡', ja: 'あかり', say: 'Turn on the light.' }),
  pair('rl2', 'R と L', 'road–load', -0.26,
    { w: 'road', e: '🛣️', ja: 'みち', say: 'This is a long road.' }, { w: 'load', e: '📦', ja: 'にもつ', say: 'This is a heavy load.' }),
  pair('year', 'Y の おと', 'year–ear', -0.1,
    { w: 'year', e: '📅', ja: 'とし', say: 'Happy New Year!' }, { w: 'ear', e: '👂', ja: 'みみ', say: 'Touch your ear.' }),
  pair('ship', 'みじかい イ・ながい イー', 'ship–sheep', 0.12,
    { w: 'ship', e: '🚢', ja: 'ふね', say: 'I see a ship.' }, { w: 'sheep', e: '🐑', ja: 'ひつじ', say: 'I see a sheep.' }),
  pair('th', 'TH と F', 'three–free', -0.14,
    { w: 'three', e: '3️⃣', ja: 'さん', say: 'I have three cats.' }, { w: 'free', e: '🆓', ja: 'ただ', say: 'It is free.' }),
  pair('cap', 'ア の なかま', 'cap–cup', 0.02,
    { w: 'cap', e: '🧢', ja: 'ぼうし', say: 'I like my cap.' }, { w: 'cup', e: '☕', ja: 'カップ', say: 'I like my cup.' }),
  pair('luck', 'ア と オ', 'luck–lock', 0,
    { w: 'luck', e: '🍀', ja: 'うん', say: 'Good luck!' }, { w: 'lock', e: '🔒', ja: 'かぎ', say: 'Open the lock.' }),
  pair('heart', 'アー の なかま', 'heart–hurt', -0.12,
    { w: 'heart', e: '❤️', ja: 'ハート', say: 'I draw a heart.' }, { w: 'hurt', e: '🤕', ja: 'いたい', say: 'My leg hurts.' }),
  {
    id: 'stress', area: 'rhythm', type: 'stress', label: 'つよい ところ', sq: '語強勢',
    title: 'どこが つよい？', pics: ['🐘'], stamp: '🐘',
    items: [
      { w: 'banana', e: '🍌', syl: ['ba', 'na', 'na'], s: 1 },
      { w: 'elephant', e: '🐘', syl: ['el', 'e', 'phant'], s: 0 },
      { w: 'kangaroo', e: '🦘', syl: ['kan', 'ga', 'roo'], s: 2 },
      { w: 'tomato', e: '🍅', syl: ['to', 'ma', 'to'], s: 1 },
      { w: 'hamburger', e: '🍔', syl: ['ham', 'bur', 'ger'], s: 0 },
      { w: 'potato', e: '🥔', syl: ['po', 'ta', 'to'], s: 1 },
    ],
  },
  {
    id: 'rhythm', area: 'rhythm', type: 'rhythm', label: 'えいごの リズム', sq: 'リズム',
    title: 'えいご？ カタカナ？', pics: ['🍓'], stamp: '🍓',
    items: [
      { en: 'strawberry', ja: 'ストロベリー', e: '🍓', syl: ['straw', 'ber', 'ry'], s: 0, mora: 6 },
      { en: 'chocolate', ja: 'チョコレート', e: '🍫', syl: ['choc', 'late'], s: 0, mora: 5 },
      { en: 'Christmas', ja: 'クリスマス', e: '🎄', syl: ['christ', 'mas'], s: 0, mora: 5 },
      { en: 'basketball', ja: 'バスケットボール', e: '🏀', syl: ['bas', 'ket', 'ball'], s: 0, mora: 8 },
    ],
  },
  {
    id: 'into', area: 'rhythm', type: 'intonation', label: 'あがる・さがる', sq: 'イントネーション',
    title: 'きいてる？ いってる？', pics: ['❓'], stamp: '🎵',
    items: [
      { t: 'Ready', e: '🏃' },
      { t: 'Apple', e: '🍎' },
      { t: 'You like dogs', e: '🐶' },
      { t: 'It is raining', e: '☔' },
    ],
  },
];

export const TEST_ITEMS = MISSIONS.filter((m) => m.type === 'pair');
export const missionById = (id) => MISSIONS.find((m) => m.id === id);
export const STEP_NAMES = ['きく', 'ききわけ', 'まねする', 'つたえる', 'ふりかえり'];

// まねする・つたえる で えらべる ことば
export function practiceTargets(m) {
  if (m.type === 'pair') return m.words.map((w) => ({ text: w.w, e: w.e, sub: w.ja, say: w.say }));
  if (m.type === 'stress') return m.items.map((it) => ({ text: it.w, e: it.e, syl: it.syl, s: it.s }));
  if (m.type === 'rhythm') return m.items.map((it) => ({ text: it.en, e: it.e, syl: it.syl, s: it.s }));
  return m.items.map((it) => ({ text: `${it.t}?`, e: it.e, q: true }));
}

// ---------- クラス（ダミー） ----------
export const NICKS = ['あおい', 'ひなた', 'はる', 'りく', 'そら', 'めい', 'かい', 'こはる', 'ゆい', 'れん', 'みお', 'いつき', 'ひかり', 'あさひ', 'ことね', 'ゆうま', 'すず', 'たいが', 'のぞみ', 'けい', 'まひろ', 'つばさ', 'ほのか', 'りん', 'なぎ', 'しおん', 'あゆむ', 'ちひろ', 'かなた', 'みこと'];
export const SECRET_PICS = ['🐶', '🐱', '🐰', '🐻', '🐼', '🐸', '🐵', '🐧', '🦁'];

const BASE_CLASSES = [
  { id: 'c1', school: 'さくら小学校', grade: 1, kumi: 2, code: '4821', size: 28, offset: 0, seed: 11 },
  { id: 'c2', school: 'さくら小学校', grade: 5, kumi: 1, code: '7350', size: 30, offset: 13, seed: 29 },
];

export const DEMO_KID = { code: '4821', n: 5 };

export function allClasses() { return [...BASE_CLASSES, ...store.extraClasses]; }
export const classById = (id) => allClasses().find((c) => c.id === id);
export const classByCode = (code) => allClasses().find((c) => c.code === code);
export const className = (c) => `${c.grade}年${c.kumi}組`;
export const classNameKid = (c) => `${c.grade}ねん ${c.kumi}くみ`;
export function nickOf(c, n) {
  if (c.nicks) return c.nicks[n - 1] || '';
  return NICKS[(n - 1 + c.offset) % NICKS.length];
}
export const secretPicOf = (c, n) => SECRET_PICS[(n * 5 + c.seed) % SECRET_PICS.length];
export const students = (c) => Array.from({ length: c.size }, (_, i) => ({ n: i + 1, nick: nickOf(c, i + 1) }));

export function newClassCode() {
  const used = new Set(allClasses().map((c) => c.code));
  let code;
  do { code = String(1000 + Math.floor(Math.random() * 9000)); } while (used.has(code));
  return code;
}

// 学習者ごとのデータ。この端末で実際に使った子は、その記録だけを使う。
function dummyKid(c, n, now) {
  const rnd = mulberry32(hashStr(`${c.id}:${n}`));
  const ability = 0.36 + rnd() * 0.4 + (c.grade >= 5 ? 0.08 : 0);
  const absent = rnd() < 0.07;
  const pre = absent ? null : { at: startOfDay(now) - (16 + Math.floor(rnd() * 4)) * DAY + 10.5 * 3600e3, answers: {} };
  const post = !absent && rnd() < 0.55 ? { at: startOfDay(now) - Math.floor(rnd() * 3) * DAY + 10.5 * 3600e3, answers: {} } : null;
  for (const m of TEST_ITEMS) {
    const p = clamp(ability + m.ease, 0.08, 0.95);
    if (pre) pre.answers[m.id] = rnd() < p;
    // 練習した子は のびやすい（ダミーの傾向）
    if (post) post.answers[m.id] = pre && pre.answers[m.id] ? rnd() < 0.93 : rnd() < clamp(p + 0.25, 0.1, 0.95);
  }
  const missions = {};
  const activity = [];
  const nPlayed = absent ? 0 : Math.floor(rnd() * 9);
  for (const m of shuffle(MISSIONS, rnd).slice(0, nPlayed)) {
    const last = startOfDay(now) - Math.floor(rnd() * 12) * DAY + (9 + rnd() * 6) * 3600e3;
    const plays = 1 + Math.floor(rnd() * 4);
    missions[m.id] = { stars: 1 + Math.floor(rnd() * 3), plays, lastAt: Math.min(last, now - 600e3), self: 1 + Math.floor(rnd() * 3), score: 2 + Math.floor(rnd() * 4) };
    for (let k = 0; k < plays; k++) activity.push(missions[m.id].lastAt - k * (1 + Math.floor(rnd() * 3)) * DAY);
  }
  const recs = [];
  for (const [id, mm] of Object.entries(missions)) {
    if (now - mm.lastAt > 7 * DAY) continue;
    const m = missionById(id);
    const t = practiceTargets(m)[Math.floor(rnd() * 2)];
    recs.push({ id: `d-${c.id}-${n}-${id}`, dummy: true, missionId: id, text: t.text, e: t.e, kind: 'まねする', at: mm.lastAt, self: mm.self, auto: 52 + Math.floor(rnd() * 42) });
  }
  recs.sort((a, b) => b.at - a.at);
  return { real: false, pre, post, missions, stamps: Object.keys(missions), activity, recs };
}

export function kidView(c, n, now = Date.now()) {
  const real = store.kids[kidKey(c.code, n)];
  if (!real && c.fresh) return { real: false, pre: null, post: null, missions: {}, stamps: [], activity: [], recs: [] };
  if (!real) return dummyKid(c, n, now);
  const recs = recordingsFor(c.code, n).map((r) => ({ ...r }));
  const activity = Object.values(real.missions).map((m) => m.lastAt);
  return { real: true, pre: real.tests.pre || null, post: real.tests.post || null, missions: real.missions, stamps: real.stamps, activity, recs };
}

export function lastActive(v) {
  const ts = [...v.activity, v.pre?.at || 0, v.post?.at || 0].filter(Boolean);
  return ts.length ? Math.max(...ts) : null;
}

export function testScore(t) {
  if (!t) return null;
  const vals = Object.values(t.answers);
  return { correct: vals.filter(Boolean).length, total: vals.length };
}
