// デモの状態。この端末の localStorage にだけ保存し、どこにも送信しない。
// 録音は保存せず、ページを開いている間だけメモリに置く。
const KEY = 'sound-quest-mockup-v1';

export const CANDIDATES = [
  { key: 'face', name: '顔の映像（カメラ）', note: '「まねする」で、自分の口の形を鏡のように見ながら言う' },
  { key: 'stt', name: '発話の文字化（音声認識）', note: '言った英語を端末が聞き取り、「〇〇と聞こえたよ」と返す。「つたえる」ではミミが当てるゲームになる' },
  { key: 'marks', name: '強勢マーク・矢印', note: '強く言う音節を大きな丸で、上がる・下がるを矢印で示す' },
  { key: 'tongue', name: '舌の動きの動画', note: '「きく」に、舌や口の動きを見せる動画の枠を置く' },
  { key: 'autoscore', name: '明瞭さの自動評価（有料API）', note: '先生の画面で、録音ごとに明瞭さの点数を自動で出す。利用量に応じて費用がかかる' },
  { key: 'rating', name: '先生による録音の評価', note: '先生の画面で、録音を聞いて明瞭性などを5段階でつける' },
  { key: 'picpass', name: '絵のあいことば（ログイン）', note: '番号を選んだあと、自分の絵を選ぶ。ほかの子の番号で入るのを防ぐ' },
];

function defaults() {
  return {
    settings: {
      voice: true,
      cand: { face: true, stt: true, marks: true, tongue: true, autoscore: true, rating: true, picpass: false },
    },
    session: null, // { code, n }
    kids: {}, // `${code}-${n}` -> { missions: {id: {...}}, tests: {pre, post}, stamps: [] }
    extraClasses: [],
    ratings: {}, // recordingId -> { clarity, ease, accuracy }
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    const v = JSON.parse(raw);
    const d = defaults();
    return {
      ...d,
      ...v,
      settings: { ...d.settings, ...(v.settings || {}), cand: { ...d.settings.cand, ...((v.settings || {}).cand || {}) } },
    };
  } catch {
    return defaults();
  }
}

export const store = load();

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* プライベートモードなどでは保存しない */ }
}

export function resetAll() {
  const keepSettings = store.settings;
  const d = defaults();
  Object.keys(store).forEach((k) => delete store[k]);
  Object.assign(store, d, { settings: keepSettings });
  recordings.length = 0;
  save();
}

export const cand = (key) => !!store.settings.cand[key];

export function kidKey(code, n) { return `${code}-${n}`; }

export function kidData(code, n) {
  const k = kidKey(code, n);
  if (!store.kids[k]) store.kids[k] = { missions: {}, tests: {}, stamps: [] };
  return store.kids[k];
}

export function currentKid() {
  if (!store.session) return null;
  return kidData(store.session.code, store.session.n);
}

// 録音（メモリだけ）
export const recordings = [];
let recSeq = 0;
export function addRecording(r) {
  const rec = { id: `r${Date.now().toString(36)}${(recSeq++).toString(36)}`, at: Date.now(), ...r };
  recordings.unshift(rec);
  return rec;
}
export function recordingsFor(code, n) {
  return recordings.filter((r) => r.code === code && r.n === n);
}
