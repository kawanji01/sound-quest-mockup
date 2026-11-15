// こどもの画面：ログイン → しまの ちず → ミッション（5だんかい）／テスト／きろく
import { store, save, cand, kidData, currentKid, addRecording, recordingsFor, recordings } from './state.js';
import {
  MISSIONS, AREAS, TEST_ITEMS, missionById, practiceTargets, STEP_NAMES,
  classByCode, classNameKid, nickOf, secretPicOf, SECRET_PICS, DEMO_KID, testScore,
} from './data.js';
import {
  speak, stopSpeaking, sfx, canRecord, startRecording, playUrl, canRecognize, recognize, matchWord,
  canCamera, cameraOn, cameraOff, cameraActive, attachCamera,
} from './audio.js';
import { icons, stars, star, say, candTag, confetti, toast } from './ui.js';
import { mimi } from './mimi.js';
import { esc, shuffle, fmtDateTime, pct } from './util.js';
import { go, refresh } from './nav.js';

const voice = (text) => { if (store.settings.voice) speak(text.replace(/<[^>]+>/g, ''), { lang: 'ja-JP' }); };
const STEP_EMO = ['👂', '🤔', '🗣️', '💬', '⭐'];
const SELF = { 3: ['😆', 'にてた！'], 2: ['🙂', 'すこし'], 1: ['🤔', 'もういちど'] };

function needSession() {
  const s = store.session;
  if (!s || !classByCode(s.code)) {
    if (s) { store.session = null; save(); }
    return { redirect: '/kid/login' };
  }
  return null;
}
const logout = () => { store.session = null; save(); go('/kid/login'); };
const pairName = (m) => `${m.words[0].w} / ${m.words[1].w}`;
const shortName = (m) => (m.type === 'pair' ? pairName(m) : m.label);

function topBar() {
  const k = currentKid();
  const c = classByCode(store.session.code);
  const total = Object.values(k.missions).reduce((a, m) => a + (m.stars || 0), 0);
  return `<header class="k-top">
    <a class="k-brand" href="#/kid/home" aria-label="ちずに もどる">${mimi('smile', { size: 46 })}<span>サウンドクエスト</span></a>
    <div class="k-top-right">
      <span class="k-who">${esc(classNameKid(c))}<br>${store.session.n}ばん ${esc(nickOf(c, store.session.n))}</span>
      <span class="k-chip" title="あつめた ほし">${star(true)}${total}</span>
      <span class="k-chip" title="あつめた スタンプ"><span class="emo">🏅</span>${k.stamps.length}</span>
      <a class="k-btn sm" href="#/kid/records">きろく</a>
      <button class="k-btn sm ghost" data-act="logout" aria-label="おわる">${icons.logout}</button>
    </div></header>`;
}

// ---------- ログイン ----------
export function entry() {
  return store.session && classByCode(store.session.code) ? { redirect: '/kid/home' } : { redirect: '/kid/login' };
}

const loginShell = (inner) => `<div class="k-screen"><div class="k-login"><div class="k-login-card">${inner}</div></div></div>`;

export function loginChoice() {
  const line = 'こんにちは！ ぼくは ミミ。<br>どっちで はいる？';
  return {
    mode: 'kid',
    title: 'ログイン',
    view: () => loginShell(`${say(line, { mood: 'happy', size: 112 })}
      <div class="k-choice">
        <a class="qr" href="#/kid/qr"><span class="emo">📷</span>QRコード<small>カードを カメラに うつす</small></a>
        <a class="num" href="#/kid/code"><span class="emo">🔢</span>ばんごう<small>クラスの ばんごうと<br>じぶんの ばんごう</small></a>
      </div>`),
    mount() { if (store.session) { store.session = null; save(); } voice(line); },
  };
}

export function qrScan() {
  const line = 'QRコードの カードを、カメラに うつしてね';
  return {
    mode: 'kid',
    title: 'QRコード',
    view: () => loginShell(`${say(line, { mood: 'listen', size: 100 })}
      <div class="k-scan">${icons.scan}<span class="line"></span><p>ここに カメラの えいぞうが うつるよ</p></div>
      <div class="k-yesno"><a class="k-btn sm" href="#/kid/login">${icons.back}もどる</a><button class="k-btn ok" data-act="fake">よみとった ことにする</button></div>
      <p class="k-demo-hint">デモでは、ボタンを押すと「1年2組 5番」のカードを読み取ったことにします。<br>本番はこの画面でカメラが起動します。タブレットのカメラアプリで読み取って開くこともできます。</p>`),
    actions: { fake: () => { sfx('correct'); go(`/q/${DEMO_KID.code}-${DEMO_KID.n}`); } },
    mount() { voice(line); },
  };
}

export function codeEntry() {
  let digits = '';
  let bad = false;
  let busy = false;
  let alive = true;
  const line = 'クラスの ばんごうを おしてね';
  const badLine = 'あれ？ ちがう ばんごう みたい。<br>もういちど おしてね';
  const view = () => loginShell(`${say(bad ? badLine : line, { mood: bad ? 'oops' : 'smile', size: 96 })}
    <div class="k-code ${bad ? 'bad' : ''}" role="img" aria-label="クラスの ばんごう ${digits}">${[0, 1, 2, 3].map((i) => `<span class="${i === digits.length ? 'cur' : ''}">${digits[i] || ''}</span>`).join('')}</div>
    <div class="k-keys">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => `<button class="k-key" data-act="key" data-arg="${d}">${d}</button>`).join('')}
      <button class="k-key fn" data-act="del">けす</button><button class="k-key" data-act="key" data-arg="0">0</button><button class="k-key enter" data-act="enter">OK</button></div>
    <p class="k-demo-hint">デモ用のクラスの番号：<b>4821</b>（1年2組）　<b>7350</b>（5年1組）</p>
    <div style="display:flex;justify-content:center;margin-top:14px"><a class="k-btn sm ghost" href="#/kid/login">${icons.back}もどる</a></div>`);
  function check() {
    if (!alive) return;
    if (classByCode(digits)) { sfx('correct'); go(`/kid/number/${digits}`); return; }
    bad = true;
    digits = '';
    sfx('oops');
    refresh();
    voice(badLine);
  }
  return {
    mode: 'kid',
    title: 'クラスの ばんごう',
    view,
    actions: {
      key(d) {
        if (busy || digits.length >= 4) return;
        digits += d;
        bad = false;
        sfx('tap');
        refresh();
        if (digits.length === 4) { busy = true; setTimeout(() => { busy = false; check(); }, 380); }
      },
      del() { if (busy) return; digits = digits.slice(0, -1); bad = false; refresh(); },
      enter() { if (!busy && digits.length === 4) check(); },
    },
    mount() { voice(line); },
    unmount() { alive = false; },
  };
}

export function numberSelect(code) {
  const c = classByCode(code);
  if (!c) return { redirect: '/kid/code' };
  const line = `${classNameKid(c)}だね。<br>じぶんの ばんごうを おしてね`;
  return {
    mode: 'kid',
    title: 'じぶんの ばんごう',
    view: () => loginShell(`${say(line, { size: 96 })}
      <div class="k-nums">${Array.from({ length: c.size }, (_, i) => `<button class="k-num" data-act="pick" data-arg="${i + 1}">${i + 1}</button>`).join('')}</div>
      <div style="display:flex;justify-content:center;margin-top:18px"><a class="k-btn sm ghost" href="#/kid/code">${icons.back}もどる</a></div>`),
    actions: { pick: (n) => { sfx('tap'); go(`/kid/confirm/${code}-${n}`); } },
    mount() { voice(line); },
  };
}

export function confirm(code, n, { viaQr = false } = {}) {
  const c = classByCode(code);
  if (!c || !(n >= 1 && n <= c.size)) return { redirect: '/kid/login' };
  let stage = 'confirm';
  let miss = false;
  const nick = nickOf(c, n);
  const line = viaQr ? 'QRコードを よみとったよ。<br>これは きみかな？' : 'これは きみかな？';
  const picLine = 'ひみつの えは どれかな？';
  const missLine = 'ちがう みたい。<br>もういちど えらんでね';
  const view = () => {
    if (stage === 'pic') {
      return `<div class="k-screen"><div class="k-login"><div class="k-login-card" data-cand-frame="picpass" style="outline-offset:-12px">${candTag('picpass')}
        ${say(miss ? missLine : picLine, { mood: miss ? 'oops' : 'think', size: 96 })}
        <div class="k-pics">${SECRET_PICS.map((p) => `<button data-act="pic" data-arg="${p}">${p}</button>`).join('')}</div>
        <p class="k-demo-hint">デモ用：この子の「ひみつの え」は <b>${secretPicOf(c, n)}</b> です。ログイン用のQRカードにも印刷します。</p>
      </div></div></div>`;
    }
    return loginShell(`${say(line, { mood: 'think', size: 96 })}
      <div class="k-confirm"><span class="cls">${esc(classNameKid(c))}</span><span class="no"><span class="en">${n}</span> ばん</span>${nick ? `<span class="nick">${esc(nick)} さん</span>` : ''}</div>
      <div class="k-yesno"><button class="k-btn ok" data-act="yes">${icons.check}はい</button><a class="k-btn" href="${viaQr ? '#/kid/login' : `#/kid/number/${code}`}">ちがう</a></div>`);
  };
  function login() {
    store.session = { code, n };
    kidData(code, n);
    save();
    sfx('correct');
    go('/kid/home');
  }
  return {
    mode: 'kid',
    title: 'かくにん',
    view,
    actions: {
      yes() {
        if (!viaQr && cand('picpass')) { stage = 'pic'; miss = false; refresh(); voice(picLine); } else login();
      },
      pic(p) {
        if (p === secretPicOf(c, n)) { login(); return; }
        miss = true;
        sfx('oops');
        refresh();
        voice(missLine);
      },
    },
    mount() { voice(line); },
  };
}

// ---------- しまの ちず ----------
function recommended(k) {
  const pre = k.tests.pre;
  if (!pre) return [];
  const weak = TEST_ITEMS.filter((m) => pre.answers[m.id] === false && (k.missions[m.id]?.stars || 0) < 3);
  if (weak.length) return weak.slice(0, 3);
  return MISSIONS.filter((m) => !k.missions[m.id]).slice(0, 2);
}

function node(m, k, reco) {
  const p = k.missions[m.id];
  const isReco = reco.some((r) => r.id === m.id);
  return `<a class="k-node ${p ? 'done' : ''}" href="#/kid/mission/${m.id}" aria-label="${esc(m.type === 'pair' ? m.title : m.label)}">
    ${isReco ? '<span class="k-flag">おすすめ</span>' : ''}
    <span class="k-node-pic"><span class="pics ${m.pics.length === 1 ? 'one' : ''}">${m.pics.join('')}</span></span>
    <span class="k-node-label">${m.type === 'pair' ? `<span class="en">${pairName(m)}</span>` : esc(m.label)}</span>
    <span class="k-stars">${stars(p?.stars || 0)}</span></a>`;
}

function island(a, k, reco) {
  const head = `<div class="k-isle-head"><span class="emo">${a.emoji}</span><div><h2>${a.name}</h2><p>${a.desc}</p></div></div>`;
  if (a.soon) {
    return `<section class="k-island ${a.id}">${head}<div class="k-soon">${mimi('think', { size: 62 })}<p>ここは もうすぐ できるよ<small>会話の聞き取りと発話のステージは、先生とご相談してから作ります。</small></p></div></section>`;
  }
  return `<section class="k-island ${a.id}">${head}<div class="k-path">${MISSIONS.filter((m) => m.area === a.id).map((m) => node(m, k, reco)).join('')}</div></section>`;
}

function homeLine(k) {
  if (!k.tests.pre) return 'さいしょに<br>「はじめの テスト」に ちょうせんしよう！';
  const reco = recommended(k);
  if (!reco.length) return 'きょうは どこへ いく？';
  const r = reco[0];
  return `きょうは どこへ いく？<br>おすすめは「${r.type === 'pair' ? r.title : r.label}」だよ`;
}

export function home() {
  const g = needSession();
  if (g) return g;
  const view = () => {
    const k = currentKid();
    const reco = recommended(k);
    const actions = !k.tests.pre
      ? `<a class="k-btn go ready" href="#/kid/test/pre">${icons.play}はじめの テスト</a>`
      : `${reco[0] ? `<a class="k-btn go" href="#/kid/mission/${reco[0].id}">${icons.play}おすすめへ いく</a>` : ''}<a class="k-btn sea sm" href="#/kid/test/post">さいごの テスト</a>`;
    return `<div class="k-screen">${topBar()}<main class="k-home">
      <div class="k-hero">${say(homeLine(k), { mood: 'happy', size: 118 })}<div class="k-hero-actions">${actions}</div></div>
      ${AREAS.map((a) => island(a, k, reco)).join('')}
    </main></div>`;
  };
  return { mode: 'kid', title: 'しまの ちず', view, actions: { logout }, mount() { voice(homeLine(currentKid())); } };
}

// ---------- じぶんの きろく ----------
const scoreBar = (label, sc, post = false) =>
  `<div class="k-cbar ${post ? 'post' : ''}"><span>${label}</span><div class="track"><div class="fill" style="width:${pct(sc.correct, sc.total)}%"></div></div><span>${sc.correct}/${sc.total}</span></div>`;

function voiceRow(r, when = true) {
  return `<div class="k-myvoice"><button class="k-playmini" data-act="playrec" data-arg="${r.id}" aria-label="じぶんの こえを きく">${icons.play}</button><span class="pic">${r.e || ''}</span><span class="en">${esc(r.text)}</span><span class="when">${esc(r.kind)}${when ? `　${fmtDateTime(r.at)}` : ''}</span></div>`;
}
const playRec = (id) => { const r = recordings.find((x) => x.id === id); if (r && r.url) playUrl(r.url); };

export function records() {
  const g = needSession();
  if (g) return g;
  const line = 'がんばった きろくだよ！';
  const view = () => {
    const k = currentKid();
    const { code, n } = store.session;
    const recs = recordingsFor(code, n);
    const slots = MISSIONS.map((m) => {
      const got = k.stamps.includes(m.id);
      return `<div class="k-slot ${got ? 'got' : ''}"><span class="disc">${got ? m.stamp : '？'}</span>${m.type === 'pair' ? `<span class="en">${pairName(m)}</span>` : esc(m.label)}</div>`;
    }).join('');
    const pre = testScore(k.tests.pre);
    const post = testScore(k.tests.post);
    const tests = pre
      ? `<div class="k-compare-bars">${scoreBar('はじめ', pre)}${post ? scoreBar('さいご', post, true) : ''}</div>${post ? '' : '<p class="k-voice-note">「さいごの テスト」を やると、どれだけ のびたか わかるよ</p>'}`
      : '<div class="k-empty">「はじめの テスト」を やると、ここに けっかが でるよ</div>';
    const voices = recs.length
      ? `<div class="k-myvoices">${recs.map((r) => voiceRow(r)).join('')}</div><p class="k-voice-note">こえは 7にちで きえるよ</p>`
      : '<div class="k-empty">まだ こえが ないよ。ミッションで いってみよう！</div>';
    return `<div class="k-screen">${topBar()}<main class="k-records">
      <div class="k-hero">${say(line, { mood: 'happy', size: 96 })}<div class="k-hero-actions"><a class="k-btn go" href="#/kid/home">${icons.map}ちずに もどる</a></div></div>
      <section class="k-box"><h2>🏅 スタンプ　${k.stamps.length} / ${MISSIONS.length}</h2><div class="k-stampcard">${slots}</div></section>
      <section class="k-box"><h2>👂 ききわけ テスト</h2>${tests}</section>
      <section class="k-box"><h2>🎤 じぶんの こえ</h2>${voices}</section>
    </main></div>`;
  };
  return { mode: 'kid', title: 'きろく', view, actions: { logout, playrec: playRec }, mount() { voice(line); } };
}

// ---------- はじめ・さいごの テスト ----------
export function test(phase) {
  const g = needSession();
  if (g) return g;
  const k = currentKid();
  if (phase === 'post' && !k.tests.pre) return { redirect: '/kid/test/pre' };
  const label = phase === 'pre' ? 'はじめの テスト' : 'さいごの テスト';
  const S = { stage: 'intro', items: shuffle(TEST_ITEMS), idx: 0, answers: {}, target: 0, picked: null };
  const N = S.items.length;
  const introLine = `${label}だよ。<br>きこえた ほうの えを おしてね。ぜんぶで ${N}もん。`;
  let alive = true;

  const flashPlay = () => {
    const b = document.querySelector('.k-play');
    if (b) { b.classList.add('playing'); setTimeout(() => b.classList.remove('playing'), 1100); }
  };
  const playQ = () => { flashPlay(); speak(S.items[S.idx].words[S.target].w); };
  function nextQ() {
    S.target = Math.random() < 0.5 ? 0 : 1;
    S.picked = null;
    refresh();
    playQ();
  }
  function finish() {
    k.tests[phase] = { at: Date.now(), answers: { ...S.answers } };
    save();
    S.stage = 'done';
    refresh();
    sfx('fanfare');
    confetti();
    const sc = testScore(k.tests[phase]);
    if (phase === 'pre') voice(`おわり！ ${sc.correct}もん せいかい。おすすめの しまに いってみよう`);
    else {
      const d = sc.correct - testScore(k.tests.pre).correct;
      voice(d > 0 ? `はじめより ${d}もん ふえたよ！` : 'よく がんばったね！');
    }
  }

  const view = () => {
    const head = `<header class="k-mbar"><a class="k-btn sm" href="#/kid/home">${icons.back}ちず</a><h1 class="k-mtitle">${label}</h1></header>`;
    let body = '';
    if (S.stage === 'intro') {
      body = `<div class="k-test-intro">${say(introLine, { mood: 'listen', size: 120 })}<button class="k-btn go ready" data-act="start">${icons.play}はじめる</button></div>`;
    } else if (S.stage === 'q') {
      const m = S.items[S.idx];
      body = `<div class="k-quiz-top"><button class="k-play" data-act="play" aria-label="もういちど きく">${icons.speaker}</button><span class="k-qcount">${S.idx + 1} / ${N}</span></div>
        <div class="k-dots">${S.items.map((_, i) => `<i class="${i < S.idx ? 'fill' : i === S.idx ? 'now' : ''}"></i>`).join('')}</div>
        <div class="k-cards">${m.words.map((w, i) => `<button class="k-card ${S.picked === i ? 'sel' : S.picked !== null ? 'dim' : ''}" data-act="pick" data-arg="${i}" ${S.picked !== null ? 'aria-disabled="true"' : ''}><span class="pic">${w.e}</span><span class="word en">${w.w}</span></button>`).join('')}</div>
        <button class="k-skip" data-act="auto">デモ用：残りを自動で答えて結果を見る</button>`;
    } else {
      const sc = testScore(k.tests[phase]);
      if (phase === 'pre') {
        const reco = recommended(k);
        body = `<div class="k-test-result">${mimi('happy', { size: 130, cls: 'jump' })}<p class="k-score">${sc.correct}<small> / ${sc.total} もん せいかい</small></p>
          ${reco.length && TEST_ITEMS.some((m) => k.tests.pre.answers[m.id] === false)
            ? `<p class="k-mic-label">ここが にがて かも。いってみよう！</p><div class="k-recos">${reco.map((m) => `<a class="k-btn go sm" href="#/kid/mission/${m.id}"><span>${m.pics.join('')}</span><span class="en">${shortName(m)}</span></a>`).join('')}</div>`
            : '<p class="k-mic-label">ぜんぶ せいかい！ すごい！</p>'}
          <a class="k-btn" href="#/kid/home">${icons.map}ちずを みる</a></div>`;
      } else {
        const pre = testScore(k.tests.pre);
        const d = sc.correct - pre.correct;
        body = `<div class="k-test-result">${mimi('happy', { size: 130, cls: 'jump' })}<p class="k-score" style="font-size:clamp(28px,4vw,40px)">${d > 0 ? `はじめより ${d}もん ふえたよ！` : d === 0 ? 'はじめと おなじ。よく がんばったね！' : 'よく がんばったね！'}</p>
          <div class="k-compare-bars">${scoreBar('はじめ', pre)}${scoreBar('さいご', sc, true)}</div>
          <a class="k-btn go" href="#/kid/home">${icons.map}ちずに もどる</a></div>`;
      }
    }
    return `<div class="k-screen">${head}<main class="k-mbody">${body}</main></div>`;
  };

  return {
    mode: 'kid',
    title: label,
    view,
    actions: {
      start() { S.stage = 'q'; S.idx = 0; nextQ(); },
      play() { if (S.stage === 'q') playQ(); },
      pick(i) {
        if (S.stage !== 'q' || S.picked !== null) return;
        S.picked = +i;
        S.answers[S.items[S.idx].id] = +i === S.target;
        sfx('tap');
        refresh();
        setTimeout(() => {
          if (!alive || S.stage !== 'q') return;
          S.idx += 1;
          if (S.idx >= N) finish(); else nextQ();
        }, 520);
      },
      auto() {
        if (S.stage !== 'q') return;
        for (const m of S.items) if (!(m.id in S.answers)) S.answers[m.id] = Math.random() < 0.6;
        S.idx = N;
        finish();
      },
    },
    mount() { voice(introLine); },
    unmount() { alive = false; },
  };
}

// ---------- ミッション（5だんかい） ----------
const sylHtml = (syl, s) => `<span class="k-syl">${syl.map((x, i) => `<span class="${i === s ? 's' : ''}">${i === s ? x.toUpperCase() : x}</span>`).join('')}</span>`;
const beatsHtml = (count, s) => `<span class="k-beats">${Array.from({ length: count }, (_, i) => `<i class="${i === s ? 's' : ''}"></i>`).join('')}</span>`;
const moraHtml = (count) => `<span class="k-beats mora">${Array.from({ length: count }, () => '<i></i>').join('')}</span>`;
const patternHtml = (count, s) => `<span class="k-pattern">${Array.from({ length: count }, (_, i) => `<i class="${i === s ? 's' : ''}"></i>`).join('')}</span>`;
const frame = (key, inner) => `<div class="k-frame" data-cand-frame="${key}">${candTag(key)}${inner}</div>`;
const STT_ERRORS = {
  'not-allowed': 'マイクの使用が許可されていません',
  'service-not-allowed': 'この端末では音声認識が許可されていません',
  'no-speech': '声が聞き取れませんでした',
  'audio-capture': 'マイクが見つかりません',
  network: '音声認識のサービスにつながりません',
  aborted: '途中で止まりました',
  'start-failed': '音声認識を始められませんでした',
  'no-result': '結果が返ってきませんでした',
};
const sttErrorText = (code) => STT_ERRORS[code] || `うまく動きませんでした（${code || '不明'}）`;
const scrollToEl = (sel) => {
  const el = document.querySelector(sel);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

const LINES = {
  0: { pair: '2つの ことばを きいてみよう。えを おしてね', stress: 'えを おして きいてみよう。<br>どこを つよく いうかな？', rhythm: 'えいごと カタカナを きいて くらべてみよう', intonation: 'さいごが あがる？ さがる？ きいてみよう' },
  1: { pair: 'どっちが きこえたかな？ えを おしてね', stress: 'どこが つよかった？<br>おおきい まるを えらんでね', rhythm: 'えいご かな？ カタカナ かな？', intonation: 'きいてる？ それとも いってる？' },
  2: 'おてほんを きいて、まねして いってみよう',
  3: { pair: 'ミミに つたえよう！<br>どっちを いうか、こっそり えらんでね', other: 'ひとつ えらんで いってみよう。<br>せんせいに とどけるよ' },
};

export function mission(id) {
  const g = needSession();
  if (g) return g;
  const m = missionById(id);
  if (!m) return { redirect: '/kid/home' };
  const { code, n } = store.session;
  const k = currentKid();
  const targets = practiceTargets(m);
  let alive = true;
  let recorder = null;
  let recog = null;
  let timers = [];
  const later = (fn, ms) => { timers.push(setTimeout(() => { if (alive) fn(); }, ms)); };

  const fresh = () => ({
    step: 0,
    done: [false, false, false, false, false],
    heard: new Set(),
    quiz: { n: 0, correct: 0, q: null, answered: null, hist: [] },
    pr: { t: 0, state: 'idle', url: null, stt: null, self: null, recId: null },
    tell: { pick: null, state: 'choose', url: null, stt: null, mode: null },
    result: null,
    startedAt: Date.now(),
  });
  let S = fresh();

  function line(step = S.step) {
    if (step === 1 && S.quiz.n >= 5) return `${S.quiz.correct}もん せいかい！<br>つぎへ すすもう`;
    if (step === 2) return LINES[2];
    if (step === 3) return m.type === 'pair' ? LINES[3].pair : LINES[3].other;
    return (LINES[step] || {})[m.type] || '';
  }

  const flashPlay = () => {
    const b = document.querySelector('.k-play');
    if (b) { b.classList.add('playing'); later(() => b.classList.remove('playing'), 1100); }
  };
  const setLevel = (v) => {
    const b = document.querySelector('.k-mic.rec');
    if (b) b.style.setProperty('--lvl', v.toFixed(2));
  };

  // ---- きく ----
  function viewListen() {
    const badge = (key) => (S.heard.has(key) ? `<span class="k-badge">${icons.check}</span>` : '');
    let main;
    if (m.type === 'pair') {
      main = `<div class="k-cards">${m.words.map((w, i) => `<button class="k-card" data-act="hear" data-arg="${i}" aria-label="${w.w}">${badge(String(i))}<span class="speaker">${icons.speaker}</span><span class="pic">${w.e}</span><span class="word en">${w.w}</span><span class="ja">${w.ja}</span></button>`).join('')}</div>`;
    } else if (m.type === 'stress') {
      main = frame('marks', `<div class="k-words n${m.items.length}">${m.items.map((it, i) => `<button class="k-word" data-act="hear" data-arg="${i}">${badge(String(i))}<span class="pic">${it.e}</span><span class="word en" data-cand-not="marks">${it.w}</span><span data-cand="marks">${sylHtml(it.syl, it.s)}</span><span data-cand="marks">${beatsHtml(it.syl.length, it.s)}</span></button>`).join('')}</div>`);
    } else if (m.type === 'rhythm') {
      main = frame('marks', `<div class="k-words n${m.items.length}">${m.items.map((it, i) => `<div class="k-word"><span class="pic">${it.e}</span><div class="k-row2">
        <button class="k-mini ${S.heard.has(`${i}en`) ? 'heard' : ''}" data-act="hear" data-arg="${i}en"><span class="en">${it.en}</span><span data-cand="marks">${beatsHtml(it.syl.length, it.s)}</span></button>
        <button class="k-mini ${S.heard.has(`${i}ja`) ? 'heard' : ''}" data-act="hear" data-arg="${i}ja"><span class="kana">${it.ja}</span><span data-cand="marks">${moraHtml(it.mora)}</span></button></div></div>`).join('')}</div>`);
    } else {
      main = frame('marks', `<div class="k-words n${m.items.length}">${m.items.map((it, i) => `<div class="k-word"><span class="pic">${it.e}</span><div class="k-row2">
        <button class="k-mini ${S.heard.has(`${i}q`) ? 'heard' : ''}" data-act="hear" data-arg="${i}q"><span data-cand="marks">${icons.up}</span><span class="en">${it.t}?</span><span>きいてる</span></button>
        <button class="k-mini ${S.heard.has(`${i}s`) ? 'heard' : ''}" data-act="hear" data-arg="${i}s"><span data-cand="marks">${icons.down}</span><span class="en">${it.t}.</span><span>いってる</span></button></div></div>`).join('')}</div>`);
    }
    const mats = `<div class="k-materials">
      <div class="k-mat"><div class="k-mat-frame"><span><span class="big">🎬</span>おてほんの どうが</span></div><p class="k-mat-title">ネイティブの おてほん</p><p class="k-mat-note">12月にいただく先生の動画が入ります</p></div>
      <div class="k-mat cand" data-cand="tongue">${candTag('tongue')}<div class="k-mat-frame"><span><span class="big">👅</span>したの うごき</span></div><p class="k-mat-title">したと くちの うごき</p><p class="k-mat-note">発音しにくい音の、舌や口の動きを見せる動画</p></div>
    </div>`;
    return main + mats;
  }

  // ---- ききわけ ----
  function makeQ() {
    const r2 = () => (Math.random() < 0.5 ? 0 : 1);
    const pickOne = (arr) => arr[Math.floor(Math.random() * arr.length)];
    if (m.type === 'pair') {
      const t = r2();
      const play = () => speak(m.words[t].w);
      return { play, reveal: play, answer: t, options: m.words.map((w) => `<span class="pic">${w.e}</span><span class="word en">${w.w}</span>`) };
    }
    if (m.type === 'stress') {
      const it = pickOne(m.items);
      const play = () => speak(it.w);
      return { play, reveal: play, answer: it.s, three: true, prompt: `<span class="k-qpic">${it.e}</span>`, options: [0, 1, 2].map((s) => patternHtml(3, s)) };
    }
    if (m.type === 'rhythm') {
      const it = pickOne(m.items);
      const t = r2();
      const play = () => (t === 0 ? speak(it.en) : speak(it.ja, { lang: 'ja-JP', rate: 0.95 }));
      return { play, reveal: play, answer: t, prompt: `<span class="k-qpic">${it.e}</span>`, options: ['<span class="glyph en">ABC</span><span class="word">えいご</span>', '<span class="glyph">アイウ</span><span class="word">カタカナ</span>'] };
    }
    const it = pickOne(m.items);
    const t = r2();
    const play = () => speak(t === 0 ? `${it.t}?` : `${it.t}.`);
    return { play, reveal: play, answer: t, prompt: `<span class="k-qpic">${it.e}</span>`, options: [`<span class="pic">❓</span><span class="word">きいてる</span><span data-cand="marks">${icons.up}</span>`, `<span class="pic">💬</span><span class="word">いってる</span><span data-cand="marks">${icons.down}</span>`] };
  }

  function settleQuiz() {
    const Q = S.quiz;
    if (Q.answered === null) return;
    Q.n += 1;
    Q.answered = null;
    if (Q.n < 5) Q.q = makeQ(); else { Q.q = null; S.done[1] = true; }
  }

  function viewQuiz() {
    const Q = S.quiz;
    const dots = `<div class="k-dots">${Array.from({ length: 5 }, (_, i) => `<i class="${i < Q.hist.length ? (Q.hist[i] ? 'ok' : 'ng') : i === Q.n ? 'now' : ''}"></i>`).join('')}</div>`;
    if (Q.n >= 5) {
      return `<div class="k-result" style="padding-top:0"><div class="k-feedback ok">${mimi('happy', { size: 84 })}${Q.correct} / 5 もん せいかい！</div>${dots}
        <div class="k-result-actions"><button class="k-btn" data-act="quizagain">もういちど</button></div></div>`;
    }
    const q = Q.q;
    const ans = Q.answered;
    const cls = (i) => (ans === null ? '' : i === q.answer ? 'right' : i === ans ? 'wrong' : 'dim');
    let fb = '<div class="k-feedback"></div>';
    if (ans !== null) {
      fb = ans === q.answer
        ? `<div class="k-feedback ok">${mimi('happy', { size: 64 })}せいかい！</div>`
        : `<div class="k-feedback ng">${mimi('oops', { size: 64 })}おしい！ もういちど きいてみよう</div>`;
    }
    return `<div class="k-quiz-top"><button class="k-play" data-act="qplay" aria-label="もういちど きく">${icons.speaker}</button>${q.prompt || ''}<span class="k-qcount">${Q.n + 1} / 5</span></div>${dots}
      <div class="k-cards ${q.three ? 'three' : ''}">${q.options.map((o, i) => `<button class="k-card ${cls(i)}" data-act="qans" data-arg="${i}" ${ans !== null ? 'aria-disabled="true"' : ''}>${o}</button>`).join('')}</div>${fb}`;
  }

  // ---- ろくおん（まねする・つたえる きょうつう） ----
  function micHtml(state, act) {
    const rec = state === 'rec';
    const label = rec ? 'いいおわったら おしてね' : state === 'done' ? 'もういちど いう' : 'おして はなそう';
    return `<div class="k-micwrap"><button class="k-mic ${rec ? 'rec' : ''}" data-act="${act}" aria-label="${rec ? 'ろくおんを とめる' : 'ろくおんする'}" ${!canRecord() ? 'aria-disabled="true"' : ''}>${rec ? icons.stop : icons.mic}</button>
      <span class="k-mic-label">${label}</span>${!canRecord() ? '<span class="k-mic-note">この端末では録音できません</span>' : ''}</div>`;
  }

  function sttEval(res, words, target) {
    if (!cand('stt')) return null;
    if (!canRecognize() || (res && !res.supported)) return { unsupported: true };
    if (!res) return { error: 'no-result' };
    const mw = matchWord(res.alts, words);
    const heard = mw.word || mw.heard;
    if (!heard) return { error: res.error || 'no-speech' };
    return { heard, word: mw.word, ok: !!mw.word && mw.word.toLowerCase() === target.toLowerCase() };
  }

  function sttHtml(r) {
    if (!r) return '';
    let body;
    if (r.unsupported) body = '<span>この たんまつでは ミミの ききとりを ためせないよ</span><small>音声認識に対応したブラウザ（新しいChromeやSafari）で動きます。</small>';
    else if (!r.heard) body = `${mimi('think', { size: 54 })}<span>うまく きこえなかったみたい</span><small>音声認識：${esc(sttErrorText(r.error))}</small>`;
    else body = `${mimi(r.ok ? 'happy' : 'think', { size: 54 })}<span>ミミには「<span class="en">${esc(r.heard)}</span>」って きこえたよ${r.ok ? '！' : ''}</span>`;
    return `<div class="k-heard ${r.ok ? 'ok' : r.unsupported ? '' : 'ng'} cand" data-cand="stt">${candTag('stt')}${body}</div>`;
  }

  function stopRec() {
    if (recorder) { try { recorder.stop(); } catch { /* なにもしない */ } }
    if (recog) recog.stop();
  }

  async function toggleRec(which) {
    const st = which === 'pr' ? S.pr : S.tell;
    if (st.state === 'rec') { if (recorder) recorder.stop(); return; }
    if (!canRecord()) { toast('この端末では録音できません'); return; }
    if (recorder) return;
    stopSpeaking();
    const prevState = st.state;
    st.state = 'rec';
    st.stt = null;
    refresh();
    const maxMs = which === 'pr' ? 3500 : 5000;
    let rec;
    try {
      rec = await startRecording({ onLevel: setLevel, maxMs });
    } catch {
      st.state = prevState === 'done' ? 'done' : which === 'pr' ? 'idle' : 'ready';
      if (alive) refresh();
      toast('マイクが使えません。ブラウザの許可を確かめてください');
      return;
    }
    recorder = rec;
    if (!alive) { rec.stop(); recorder = null; return; }
    sfx('rec');
    recog = cand('stt') && canRecognize() ? recognize({ lang: 'en-US', timeoutMs: maxMs + 1500 }) : null;
    const blob = await rec.done;
    recorder = null;
    let res = null;
    if (recog) { const r = recog; recog = null; r.stop(); res = await r.promise; }
    if (!alive) return;
    onRecorded(which, st, blob, res);
  }

  function onRecorded(which, st, blob, res) {
    const url = URL.createObjectURL(blob);
    if (which === 'pr') {
      const t = targets[st.t];
      const bare = t.text.replace(/[?.!]/g, '');
      const words = m.type === 'pair' ? m.words.map((w) => w.w) : [bare];
      const stt = sttEval(res, words, bare);
      const rec = addRecording({ code, n, missionId: m.id, text: t.text, e: t.e, kind: 'まねする', url, stt });
      if (st !== S.pr) return;
      Object.assign(st, { url, state: 'done', stt, self: null, recId: rec.id });
      S.done[2] = true;
      refresh();
      scrollToEl('.k-compare');
      voice('おてほんと くらべて みよう');
      return;
    }
    const o = tellOptions()[st.pick];
    const bare = o.text.replace(/[?.!]/g, '');
    const words = m.type === 'pair' ? m.words.map((w) => w.w) : [bare];
    const stt = sttEval(res, words, bare);
    addRecording({ code, n, missionId: m.id, text: o.say, e: o.e, kind: 'つたえる', url, stt });
    if (st !== S.tell) return;
    // 音声認識そのものが動かなかったときは、こどもの せいに せず「せんせいに とどけた」に する
    const sysErr = !!(stt && !stt.heard && stt.error && stt.error !== 'no-speech');
    Object.assign(st, { url, stt, state: 'result', mode: m.type === 'pair' && stt && !stt.unsupported && !sysErr ? 'guess' : 'teacher' });
    S.done[3] = true;
    refresh();
    scrollToEl('.k-feedback');
    if (st.mode === 'guess') {
      if (stt.ok) { sfx('correct'); confetti(); voice('つたわったよ！'); } else { sfx('oops'); voice(stt.word ? 'ちがう ことばに きこえたよ。もういちど いってみよう' : 'うーん、わからなかった。もういちど いってみて'); }
    } else {
      sfx('correct');
      voice('すてきな こえ！ せんせいに とどけたよ');
    }
  }

  // ---- まねする ----
  function modelHtml(t) {
    if (t.syl) return `<span class="word en" data-cand-not="marks">${esc(t.text)}</span><span data-cand="marks">${sylHtml(t.syl, t.s)}</span>`;
    if (t.q) return `<span class="word en">${esc(t.text)}</span><span data-cand="marks" style="color:var(--coral-deep)">${icons.up}</span>`;
    return `<span class="word en">${esc(t.text)}</span>`;
  }

  function viewPractice() {
    const P = S.pr;
    const t = targets[P.t];
    const tabs = `<div class="k-tabs">${targets.map((x, i) => `<button class="k-tab ${i === P.t ? 'sel' : ''}" data-act="ptarget" data-arg="${i}"><span class="pic">${x.e}</span><span class="en">${esc(x.text)}</span></button>`).join('')}</div>`;
    const cam = `<div class="k-face-cam cand" data-cand="face">${candTag('face')}<div class="frame">${cameraActive() ? '<video data-cam playsinline muted autoplay></video>' : '<span><span class="big">🪞</span>じぶんの くちを<br>みながら いえるよ</span>'}</div>
      <button class="k-btn sm" data-act="cam" ${!canCamera() ? 'aria-disabled="true"' : ''}>${icons.camera}${cameraActive() ? 'カメラを とめる' : 'カメラを つける'}</button><span class="k-mic-note">映像は保存も送信もしません</span></div>`;
    const after = P.state === 'done'
      ? `<div class="k-compare"><button class="k-btn sea" data-act="pmodel">${icons.play}おてほん</button><button class="k-btn go" data-act="pmine">${icons.play}じぶんの こえ</button></div>
        ${sttHtml(P.stt)}
        <div class="k-faces"><p>おてほんと にてたかな？</p>${[3, 2, 1].map((v) => `<button class="k-face ${P.self === v ? 'sel' : ''}" data-act="pself" data-arg="${v}"><span>${SELF[v][0]}</span>${SELF[v][1]}</button>`).join('')}</div>`
      : '';
    return `${tabs}<div class="k-practice"><div class="k-model"><span class="pic">${t.e}</span>${modelHtml(t)}<button class="k-btn sm sea" data-act="pmodel">${icons.speaker}おてほん</button></div>${micHtml(P.state, 'prec')}${cam}</div>${after}`;
  }

  // ---- つたえる ----
  function tellOptions() {
    if (m.type === 'pair') return m.words.map((w) => ({ e: w.e, text: w.w, say: w.say }));
    return targets.map((t) => ({ e: t.e, text: t.text, say: t.text }));
  }

  function viewTell() {
    const T = S.tell;
    const opts = tellOptions();
    if (T.state === 'choose') {
      return `<div class="k-cards ${opts.length > 2 ? 'three' : ''}">${opts.map((o, i) => `<button class="k-card" data-act="tpick" data-arg="${i}"><span class="pic">${o.e}</span><span class="word en">${esc(o.text)}</span></button>`).join('')}</div>`;
    }
    const o = opts[T.pick];
    const sentence = `<div class="k-model" style="max-width:640px;width:100%;margin:0 auto"><span class="pic">${o.e}</span><span class="sentence en">${esc(o.say)}</span><button class="k-btn sm sea" data-act="tmodel">${icons.speaker}おてほん</button></div>`;
    if (T.state === 'ready' || T.state === 'rec') {
      const hint = m.type === 'pair' && cand('stt') ? '<p class="k-mic-note" style="margin:0 auto">ミミが どっちか あてるよ</p>' : '';
      return `${sentence}<div style="display:flex;justify-content:center">${micHtml(T.state, 'trec')}</div>${hint}`;
    }
    let body;
    if (T.mode === 'guess') {
      const r = T.stt;
      const inner = r.ok
        ? `<div class="k-feedback ok">${mimi('happy', { size: 96, cls: 'jump' })}<span>「<span class="en">${esc(r.word)}</span>」だね！<br>つたわったよ！</span></div>`
        : r.word
          ? `<div class="k-feedback ng">${mimi('think', { size: 96 })}<span>ミミには「<span class="en">${esc(r.word)}</span>」に きこえたよ。<br>もういちど いってみよう！</span></div>`
          : `<div class="k-feedback ng">${mimi('oops', { size: 96 })}<span>うーん、わからなかった。<br>もういちど いってみて！</span></div>`;
      body = `<div class="k-frame cand" data-cand="stt" style="padding:20px 12px 10px;border-radius:28px">${candTag('stt')}${inner}${r.heard ? `<p class="k-mic-note" style="margin:0 auto">音声認識の結果：${esc(r.heard)}</p>` : ''}</div>`;
    } else {
      body = `<div class="k-feedback ok">${mimi('happy', { size: 96, cls: 'jump' })}<span>すてきな こえ！<br>せんせいに とどけたよ 📮</span></div>${T.stt ? sttHtml(T.stt) : ''}`;
    }
    return `${sentence}${body}<div class="k-compare"><button class="k-btn go" data-act="tmine">${icons.play}じぶんの こえ</button><button class="k-btn" data-act="tagain">もういちど</button></div>`;
  }

  // ---- ふりかえり ----
  function finishMission() {
    const Q = S.quiz;
    const score = Q.n >= 5 ? Q.correct : null;
    const st = score === null ? 1 : score >= 5 ? 3 : score >= 4 ? 2 : 1;
    const prev = k.missions[m.id] || {};
    const newStamp = !k.stamps.includes(m.id);
    k.missions[m.id] = {
      stars: Math.max(prev.stars || 0, st),
      plays: (prev.plays || 0) + 1,
      lastAt: Date.now(),
      self: S.pr.self ?? prev.self ?? null,
      score: score ?? prev.score ?? null,
    };
    if (newStamp) k.stamps.push(m.id);
    save();
    S.result = { stars: st, newStamp };
    S.done[4] = true;
  }

  function viewResult() {
    const R = S.result;
    const mine = recordingsFor(code, n).filter((r) => r.missionId === m.id && r.at >= S.startedAt);
    return `<div class="k-result">${mimi('happy', { size: 150, cls: 'jump' })}
      <h2>${R.stars === 3 ? 'パーフェクト！ すごい！' : R.stars === 2 ? 'よく できたね！' : 'さいごまで がんばったね！'}</h2>
      <div class="k-bigstars">${[0, 1, 2].map((i) => star(i < R.stars)).join('')}</div>
      ${R.newStamp ? `<div class="k-stamp">${m.stamp}</div><p class="sub">スタンプ ゲット！</p>` : ''}
      ${mine.length ? `<div class="k-myvoices">${mine.map((r) => voiceRow(r, false)).join('')}</div>` : ''}
      <div class="k-result-actions"><button class="k-btn" data-act="again">もういちど</button><a class="k-btn go" href="#/kid/home">${icons.map}ちずに もどる</a></div></div>`;
  }

  // ---- だんかいの いどう ----
  function setStep(i) {
    i = Math.max(0, Math.min(4, i));
    timers.forEach(clearTimeout);
    timers = [];
    stopRec();
    stopSpeaking();
    settleQuiz();
    if (S.step === 2 && i !== 2) cameraOff();
    S.step = i;
    if (i === 1 && !S.quiz.q && S.quiz.n < 5) S.quiz.q = makeQ();
    let celebrate = false;
    if (i === 4 && !S.result) { finishMission(); celebrate = true; }
    refresh();
    window.scrollTo(0, 0);
    if (celebrate) { sfx('fanfare'); confetti(); }
    if (i === 1 && S.quiz.q) {
      const q = S.quiz.q;
      const play = () => { if (alive && S.step === 1 && S.quiz.q === q && S.quiz.answered === null) { flashPlay(); q.play(); } };
      if (store.settings.voice) speak(line(1).replace(/<[^>]+>/g, ''), { lang: 'ja-JP', onend: play }); else play();
    } else if (i < 4) voice(line(i));
    else voice(S.result.stars === 3 ? 'パーフェクト！ すごい！' : 'よく がんばったね！');
  }

  const titleHtml = m.type === 'pair' ? `<span class="en">${m.words[0].w}</span> と <span class="en">${m.words[1].w}</span>` : esc(m.title);

  const view = () => {
    const body = [viewListen, viewQuiz, viewPractice, viewTell, viewResult][S.step]();
    const mood = S.step === 0 ? 'listen' : S.step === 1 && S.quiz.n >= 5 ? 'happy' : 'smile';
    const steps = STEP_NAMES.map((nm, i) => {
      const on = i === S.step;
      const done = S.done[i] && !on;
      return `<button class="k-step ${on ? 'on' : ''} ${done ? 'done' : ''}" data-act="jump" data-arg="${i}" ${on ? 'aria-current="step"' : ''}><i>${done ? icons.check : STEP_EMO[i]}</i><b>${nm}</b></button>`;
    }).join('');
    const foot = S.step < 4
      ? `<footer class="k-mfoot">${S.step > 0 ? `<button class="k-btn sm" data-act="prev">${icons.back}もどる</button>` : ''}<span class="spacer"></span><button class="k-btn go ${S.done[S.step] ? 'ready' : ''}" data-act="next">${S.step === 3 ? 'おわる' : 'つぎへ'}${icons.next}</button></footer>`
      : '';
    return `<div class="k-screen k-mission"><header class="k-mbar"><a class="k-btn sm" href="#/kid/home">${icons.back}ちず</a><h1 class="k-mtitle">${titleHtml}</h1><nav class="k-steps" aria-label="すすみぐあい">${steps}</nav></header>
      <main class="k-mbody">${S.step < 4 ? say(line(), { mood, size: 92 }) : ''}${body}</main>${foot}</div>`;
  };

  return {
    mode: 'kid',
    title: m.type === 'pair' ? m.title : m.label,
    view,
    afterPaint: (root) => attachCamera(root),
    onCandChange() { if (!cand('face')) cameraOff(); },
    mount() { voice(line(0)); },
    unmount() { alive = false; timers.forEach(clearTimeout); stopRec(); cameraOff(); },
    actions: {
      next: () => setStep(S.step + 1),
      prev: () => setStep(S.step - 1),
      jump: (i) => setStep(+i),
      again() { timers.forEach(clearTimeout); stopRec(); S = fresh(); setStep(0); },
      playrec: playRec,
      // きく
      hear(arg) {
        if (m.type === 'pair') speak(m.words[+arg].w);
        else if (m.type === 'stress') speak(m.items[+arg].w);
        else if (m.type === 'rhythm') { const it = m.items[parseInt(arg, 10)]; if (arg.endsWith('ja')) speak(it.ja, { lang: 'ja-JP', rate: 0.95 }); else speak(it.en); }
        else { const it = m.items[parseInt(arg, 10)]; speak(arg.endsWith('q') ? `${it.t}?` : `${it.t}.`); }
        S.heard.add(String(arg));
        if (S.heard.size >= 2) S.done[0] = true;
        refresh();
        const el = document.querySelector(`[data-act="hear"][data-arg="${arg}"]`);
        if (el) el.classList.add('playing');
      },
      // ききわけ
      qplay() { if (S.quiz.q) { flashPlay(); S.quiz.q.play(); } },
      qans(i) {
        const Q = S.quiz;
        if (Q.answered !== null || Q.n >= 5 || !Q.q) return;
        Q.answered = +i;
        const ok = +i === Q.q.answer;
        Q.hist.push(ok);
        if (ok) Q.correct += 1;
        sfx(ok ? 'correct' : 'oops');
        refresh();
        if (!ok) later(() => Q.q && Q.q.reveal(), 700);
        later(() => {
          if (S.step !== 1) return;
          settleQuiz();
          refresh();
          if (Q.q) { flashPlay(); Q.q.play(); } else { sfx('fanfare'); voice(line(1)); }
        }, ok ? 1200 : 2400);
      },
      quizagain() { S.quiz = { n: 0, correct: 0, q: makeQ(), answered: null, hist: [] }; S.done[1] = false; refresh(); flashPlay(); S.quiz.q.play(); },
      // まねする
      ptarget(i) { stopRec(); S.pr = { t: +i, state: 'idle', url: null, stt: null, self: null, recId: null }; refresh(); speak(targets[+i].text); },
      pmodel() { speak(targets[S.pr.t].text); },
      pmine() { if (S.pr.url) playUrl(S.pr.url); },
      prec() { toggleRec('pr'); },
      pself(v) {
        S.pr.self = +v;
        const r = recordings.find((x) => x.id === S.pr.recId);
        if (r) r.self = +v;
        sfx('tap');
        refresh();
        voice(+v === 1 ? 'もういちど いってみよう！' : 'いいね！');
      },
      cam() {
        if (cameraActive()) { cameraOff(); refresh(); return; }
        cameraOn().then(() => { if (alive && S.step === 2) refresh(); else cameraOff(); }).catch(() => toast('カメラが使えません。ブラウザの許可を確かめてください'));
      },
      // つたえる
      tpick(i) { S.tell = { pick: +i, state: 'ready', url: null, stt: null, mode: null }; refresh(); speak(tellOptions()[+i].say); },
      tmodel() { if (S.tell.pick !== null) speak(tellOptions()[S.tell.pick].say); },
      trec() { toggleRec('tell'); },
      tmine() { if (S.tell.url) playUrl(S.tell.url); },
      tagain() { stopRec(); S.tell = { pick: null, state: 'choose', url: null, stt: null, mode: null }; refresh(); voice(line(3)); },
    },
  };
}
