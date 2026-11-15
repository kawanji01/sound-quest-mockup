// 先生の画面：ダミーのクラスと、この端末で練習した記録をあわせて表示する
import { store, save } from './state.js';
import {
  allClasses, classById, className, students, nickOf, kidView, lastActive, testScore,
  TEST_ITEMS, MISSIONS, missionById, newClassCode, secretPicOf,
} from './data.js';
import { icons, qrSvg, kidLoginUrl, candTag, openModal, closeModal, toast, isLocalHost } from './ui.js';
import { speak } from './audio.js';
import { esc, pct, avg, fmtDate, fmtDateTime, relDay, daysLeft, DAY, startOfDay, csv, downloadText, fmtIso, hashStr } from './util.js';
import { go, refresh } from './nav.js';

const SELF = { 3: '😆', 2: '🙂', 1: '🤔' };
const fmtP = (r) => (r === null || r === undefined ? '—' : `${Math.round(r * 100)}%`);
const pairName = (m) => `${m.words[0].w}–${m.words[1].w}`;
const dash = '<span class="t-dash">—</span>';
const starDots = (n) => `<span class="t-st" aria-label="星${n}">${[0, 1, 2].map((i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span>`;

function layout({ active, cls, crumb, title, sub, actions = '', body }) {
  return `<div class="t-wrap"><aside class="t-side">
    <a class="t-brand" href="#/teacher"><span class="t-logo">${icons.wave}</span><span><b>Sound Quest</b><small>先生の画面</small></span></a>
    <nav class="t-nav" aria-label="先生の画面のメニュー">
      <a class="${active === 'classes' ? 'on' : ''}" href="#/teacher">${icons.users}クラス一覧</a>
      ${cls ? `<span class="t-nav-label">${esc(cls.school)} ${className(cls)}</span>
        <a class="${active === 'dash' || active === 'student' ? 'on' : ''}" href="#/teacher/class/${cls.id}">${icons.grid}ダッシュボード</a>
        <a class="${active === 'qr' ? 'on' : ''}" href="#/teacher/class/${cls.id}/qr">${icons.qr}ログイン用QRコード</a>` : ''}
      <a class="${active === 'data' ? 'on' : ''}" href="#/teacher/data">${icons.table}研究用データ</a>
    </nav>
    <div class="t-side-foot"><b>先生のアカウント</b>メールアドレスでログインする想定です（この試作では省略）。</div>
  </aside><main class="t-main">
    <header class="t-head"><div>${crumb ? `<p class="t-crumb">${crumb}</p>` : ''}<h1>${title}</h1>${sub ? `<p class="t-sub">${sub}</p>` : ''}</div>${actions ? `<div class="t-actions">${actions}</div>` : ''}</header>
    ${body}
  </main></div>`;
}

function classSummary(c, now = Date.now()) {
  const list = students(c).map((s) => ({ ...s, v: kidView(c, s.n, now) }));
  const weekly = list.filter((s) => { const t = lastActive(s.v); return t && now - t < 7 * DAY; }).length;
  const ratio = (t) => { const sc = testScore(t); return sc && sc.total ? sc.correct / sc.total : null; };
  const preR = list.map((s) => ratio(s.v.pre)).filter((x) => x !== null);
  const postR = list.map((s) => ratio(s.v.post)).filter((x) => x !== null);
  return { list, weekly, pre: preR.length ? avg(preR) : null, post: postR.length ? avg(postR) : null, preN: preR.length, postN: postR.length };
}

// ---------- クラス一覧 ----------
function openNewClass() {
  const grades = [1, 2, 3, 4, 5, 6].map((g) => `<option value="${g}" ${g === 3 ? 'selected' : ''}>${g}年</option>`).join('');
  openModal(`<h2>クラスを作る</h2>
    <p class="modal-sub">児童の名前やメールアドレスは要りません。人数分の出席番号と「クラスの番号」ができ、ログイン用のQRコードを印刷できます。</p>
    <div class="f-grid">
      <div class="f-field f-full"><label for="nc-school">学校名</label><input id="nc-school" value="さくら小学校" autocomplete="off"></div>
      <div class="f-field"><label for="nc-grade">学年</label><select id="nc-grade">${grades}</select></div>
      <div class="f-field"><label for="nc-kumi">組</label><input id="nc-kumi" type="number" inputmode="numeric" min="1" max="20" value="1"></div>
      <div class="f-field f-full"><label for="nc-size">人数</label><input id="nc-size" type="number" inputmode="numeric" min="1" max="40" value="30"><span class="f-help">1クラス最大30人程度を想定しています。ニックネームはあとから任意で登録できます。</span></div>
    </div>
    <div class="modal-actions"><button class="btn" data-mact="close">やめる</button><button class="btn primary" data-mact="create">クラスを作る</button></div>`, {
    label: 'クラスを作る',
    actions: {
      create() {
        const school = document.getElementById('nc-school').value.trim();
        const grade = +document.getElementById('nc-grade').value;
        const kumi = Math.round(+document.getElementById('nc-kumi').value);
        const size = Math.round(+document.getElementById('nc-size').value);
        if (!school) { toast('学校名を入れてください'); return; }
        if (!(kumi >= 1 && kumi <= 20)) { toast('組は1〜20の数で入れてください'); return; }
        if (!(size >= 1 && size <= 40)) { toast('人数は1〜40人で入れてください'); return; }
        const c = { id: `x${Date.now().toString(36)}`, school, grade, kumi, code: newClassCode(), size, offset: 0, seed: Math.floor(Math.random() * 997), nicks: Array(size).fill(''), fresh: true };
        store.extraClasses.push(c);
        save();
        closeModal();
        toast(`${className(c)}を作りました。クラスの番号は ${c.code} です`);
        go(`/teacher/class/${c.id}/qr`);
      },
    },
  });
}

export function classes() {
  const view = () => {
    const cards = allClasses().map((c) => {
      const sm = classSummary(c);
      return `<article class="t-class"><div><p class="school">${esc(c.school)}</p><h2>${className(c)}</h2></div>
        <div class="kv"><div><span>児童</span><b>${c.size}人</b></div><div><span>この1週間に練習</span><b>${sm.weekly}人</b></div><div><span>テストの正答率</span><b>${fmtP(sm.pre)}→${fmtP(sm.post)}</b></div></div>
        <div class="row"><a class="btn primary small" href="#/teacher/class/${c.id}">ダッシュボード</a><a class="btn small" href="#/teacher/class/${c.id}/qr">${icons.qr}ログイン用QRコード</a><span style="margin-left:auto" class="t-code" title="クラスの番号">${c.code}</span></div></article>`;
    }).join('');
    return layout({
      active: 'classes',
      title: 'クラス一覧',
      sub: '担当するクラスごとに、児童の練習のようすを確かめます。クラスを作ると、児童がログインに使う「クラスの番号」とQRコードができます。',
      actions: `<button class="btn primary" data-act="newclass">${icons.plus}クラスを作る</button>`,
      body: `<div class="t-classes">${cards}</div>`,
    });
  };
  return { mode: 'teacher', title: 'クラス一覧', view, actions: { newclass: openNewClass } };
}

// ---------- ダッシュボード ----------
export function classDash(id) {
  const c = classById(id);
  if (!c) return { redirect: '/teacher' };
  const view = () => {
    const now = Date.now();
    const sm = classSummary(c, now);
    const diff = sm.pre !== null && sm.post !== null ? Math.round((sm.post - sm.pre) * 100) : null;
    const stats = `<div class="t-stats">
      <div class="t-stat"><p class="lbl">児童</p><p class="val">${c.size}<small>人</small></p><p class="note">クラスの番号 ${c.code}</p></div>
      <div class="t-stat"><p class="lbl">この1週間に練習した児童</p><p class="val">${sm.weekly}<small>人</small></p><p class="note">クラスの${pct(sm.weekly, c.size)}%</p></div>
      <div class="t-stat"><p class="lbl">はじめのテストの正答率</p><p class="val">${fmtP(sm.pre)}</p><p class="note">${sm.preN}人が受けた</p></div>
      <div class="t-stat"><p class="lbl">さいごのテストの正答率</p><p class="val">${fmtP(sm.post)}</p><p class="note">${sm.postN}人が受けた${diff !== null ? `　はじめより${diff >= 0 ? '+' : ''}${diff}ポイント` : ''}</p></div>
    </div>`;

    const items = TEST_ITEMS.map((m) => {
      const pre = sm.list.filter((s) => s.v.pre && m.id in s.v.pre.answers).map((s) => (s.v.pre.answers[m.id] ? 1 : 0));
      const post = sm.list.filter((s) => s.v.post && m.id in s.v.post.answers).map((s) => (s.v.post.answers[m.id] ? 1 : 0));
      return { m, pre: pre.length ? avg(pre) : null, post: post.length ? avg(post) : null };
    }).sort((a, b) => (a.pre ?? 2) - (b.pre ?? 2));
    const itemsHtml = items.map((x) => `<div class="t-item"><span class="name">${pairName(x.m)}<small>${esc(x.m.label)}</small></span>
      <span class="t-bars"><span class="t-bar"><i style="width:${Math.round((x.pre ?? 0) * 100)}%"></i></span><span class="t-bar post"><i style="width:${Math.round((x.post ?? 0) * 100)}%"></i></span></span>
      <span class="nums">${fmtP(x.pre)} → <b>${fmtP(x.post)}</b></span></div>`).join('');

    const days = Array.from({ length: 7 }, (_, i) => startOfDay(now) - (6 - i) * DAY);
    const counts = days.map((d) => sm.list.filter((s) => [...s.v.activity, s.v.pre?.at, s.v.post?.at].some((t) => t && t >= d && t < d + DAY)).length);
    const max = Math.max(1, ...counts);
    const week = `<div class="t-week">${days.map((d, i) => `<div><b>${counts[i]}</b><i style="height:${Math.max(3, Math.round((counts[i] / max) * 96))}px"></i><span>${fmtDate(d)}</span></div>`).join('')}</div>`;

    const rows = sm.list.map((s) => {
      const v = s.v;
      const pre = testScore(v.pre);
      const post = testScore(v.post);
      const la = lastActive(v);
      return `<tr class="click ${v.real ? 'me' : ''}" data-act="open" data-arg="${s.n}">
        <td class="r">${s.n}</td>
        <td>${s.nick ? esc(s.nick) : dash}${v.real ? ' <span class="t-pill green">この端末で練習</span>' : ''}</td>
        <td class="r">${pre ? `${pre.correct}/${pre.total}` : dash}</td>
        <td class="r">${post ? `${post.correct}/${post.total}` : dash}</td>
        ${MISSIONS.map((m) => { const p = v.missions[m.id]; return `<td class="c">${p ? starDots(p.stars) : '<span class="t-dash">·</span>'}</td>`; }).join('')}
        <td>${la ? relDay(la, now) : dash}</td>
        <td class="r">${v.recs.length ? v.recs.length : '<span class="t-dash">0</span>'}</td></tr>`;
    }).join('');
    const table = `<div class="t-tablewrap"><table class="t-table"><thead><tr><th>番号</th><th>ニックネーム</th><th>はじめ</th><th>さいご</th>
      ${MISSIONS.map((m) => `<th class="m" title="${esc(m.sq)}">${m.type === 'pair' ? `${m.words[0].w}<br>${m.words[1].w}` : esc(m.sq)}</th>`).join('')}
      <th>最後の練習</th><th>録音</th></tr></thead><tbody>${rows}</tbody></table></div>`;

    const body = `${stats}
      <div class="t-grid">
        <section class="t-card"><h2>音ごとの聞き分けの正答率</h2><p class="t-card-sub">はじめのテストで低い順に並べています。</p>
          <div class="t-legend"><span><i style="background:#b4bfc9"></i>はじめ</span><span><i style="background:var(--t-green-2)"></i>さいご</span></div>
          <div class="t-items">${itemsHtml}</div></section>
        <section class="t-card"><h2>この1週間の練習</h2><p class="t-card-sub">その日に練習した児童の人数</p>${week}</section>
      </div>
      <section class="t-card"><h2>児童ごとの進み具合</h2><p class="t-card-sub">星はミッションの出来（聞き分け5問の正答数から）。行を押すと、テストの結果と録音を確かめられます。</p>
        <div style="margin-top:14px">${table}</div></section>`;
    return layout({
      active: 'dash',
      cls: c,
      crumb: `<a href="#/teacher">クラス一覧</a>　／　${esc(c.school)}`,
      title: `${className(c)}のダッシュボード`,
      actions: `<a class="btn" href="#/teacher/class/${c.id}/qr">${icons.qr}ログイン用QRコード</a><a class="btn" href="#/teacher/data">${icons.download}研究用データ</a>`,
      body,
    });
  };
  return { mode: 'teacher', title: `${className(c)}のダッシュボード`, view, actions: { open: (n) => go(`/teacher/class/${c.id}/student/${n}`) } };
}

// ---------- 児童の詳細 ----------
function recItem(r, now) {
  const rating = store.ratings[r.id] || {};
  const seg = (dim) => `<span class="t-seg" role="group">${[1, 2, 3, 4, 5].map((x) => `<button class="${rating[dim] === x ? 'on' : ''}" data-act="rate" data-arg="${r.id}|${dim}|${x}" aria-pressed="${rating[dim] === x}">${x}</button>`).join('')}</span>`;
  const auto = r.auto ?? 55 + (hashStr(r.id) % 40);
  const m = missionById(r.missionId);
  const player = r.dummy
    ? `<div class="t-rec-head"><button class="btn small" data-act="tts" data-arg="${esc(r.text)}">${icons.play}合成音声で代用して聞く</button><span class="t-pill">ダミーの録音</span></div>`
    : `<audio controls preload="metadata" src="${r.url}"></audio>`;
  const stt = r.stt && r.stt.heard ? `<p class="t-rec-note">音声認識の結果：「${esc(r.stt.heard)}」${r.stt.ok ? '（ねらいの語と一致）' : ''}</p>` : '';
  return `<div class="t-rec">
    <div class="t-rec-head"><span style="font-size:22px">${r.e || ''}</span><span class="w">${esc(r.text)}</span><span class="t-pill">${esc(r.kind)}</span>
      <span class="meta">${esc(m ? m.sq : '')}　${fmtDateTime(r.at)}</span><span class="push t-pill warn">あと${daysLeft(r.at, 7, now)}日で削除</span></div>
    ${player}${stt}${r.self ? `<p class="t-rec-note">児童の自己評価：${SELF[r.self]}</p>` : ''}
    <div class="t-rate cand" data-cand="rating">${candTag('rating')}${[['clarity', '明瞭性'], ['ease', '理解しやすさ'], ['accuracy', '正確さ']].map(([k, l]) => `<div class="t-rate-row"><span>${l}</span>${seg(k)}</div>`).join('')}</div>
    <div class="t-auto cand" data-cand="autoscore">${candTag('autoscore')}<span>明瞭さ（自動）</span><b>${auto}</b><span>点　表示の例です。APIにつなぐと実際の値が入ります。</span></div>
  </div>`;
}

export function student(id, n) {
  const c = classById(id);
  if (!c || !(n >= 1 && n <= c.size)) return { redirect: '/teacher' };
  const view = () => {
    const now = Date.now();
    const v = kidView(c, n, now);
    const nick = nickOf(c, n);
    const cell = (x) => (x === undefined ? dash : x ? '<span class="t-ok">○</span>' : '<span class="t-ng">×</span>');
    const ps = testScore(v.pre);
    const qs = testScore(v.post);
    const testRows = TEST_ITEMS.map((m) => `<tr><td><span class="en" style="font-weight:700">${pairName(m)}</span></td><td class="c">${cell(v.pre ? v.pre.answers[m.id] : undefined)}</td><td class="c">${cell(v.post ? v.post.answers[m.id] : undefined)}</td></tr>`).join('');
    const testsCard = `<section class="t-card"><h2>聞き分けテスト</h2><p class="t-card-sub">${v.pre ? `はじめ ${fmtDate(v.pre.at)}` : 'はじめのテストはまだ受けていません'}${v.post ? `　さいご ${fmtDate(v.post.at)}` : ''}</p>
      <div class="t-tablewrap" style="margin-top:12px"><table class="t-table"><thead><tr><th>音</th><th class="c">はじめ</th><th class="c">さいご</th></tr></thead>
      <tbody>${testRows}<tr><td><b>合計</b></td><td class="c"><b>${ps ? `${ps.correct}/${ps.total}` : '—'}</b></td><td class="c"><b>${qs ? `${qs.correct}/${qs.total}` : '—'}</b></td></tr></tbody></table></div></section>`;
    const mrows = MISSIONS.map((m) => {
      const p = v.missions[m.id];
      return `<tr><td>${m.type === 'pair' ? `<span class="en" style="font-weight:700">${pairName(m)}</span>` : esc(m.sq)}</td><td class="c">${p ? starDots(p.stars) : dash}</td><td class="r">${p ? `${p.plays}回` : ''}</td><td class="c">${p && p.self ? SELF[p.self] : ''}</td><td>${p ? relDay(p.lastAt, now) : ''}</td></tr>`;
    }).join('');
    const missionsCard = `<section class="t-card"><h2>ミッション</h2><p class="t-card-sub">星・回数・児童の自己評価・最後に練習した日</p>
      <div class="t-tablewrap" style="margin-top:12px"><table class="t-table"><thead><tr><th>ステージ</th><th class="c">星</th><th class="r">回数</th><th class="c">自己評価</th><th>最後</th></tr></thead><tbody>${mrows}</tbody></table></div></section>`;
    const recCard = `<section class="t-card"><h2>録音</h2><p class="t-card-sub">録音は7日たつと自動で削除します。聞けるのは担当の先生だけにする案です。</p>
      <div class="t-recs">${v.recs.length ? v.recs.map((r) => recItem(r, now)).join('') : '<div class="t-empty">この7日間の録音はありません。こどもの画面の「まねする」「つたえる」で録音すると、ここで聞けます。</div>'}</div></section>`;
    const nav = `${n > 1 ? `<a class="btn" href="#/teacher/class/${c.id}/student/${n - 1}">${icons.back}${n - 1}番</a>` : ''}${n < c.size ? `<a class="btn" href="#/teacher/class/${c.id}/student/${n + 1}">${n + 1}番${icons.next}</a>` : ''}`;
    return layout({
      active: 'student',
      cls: c,
      crumb: `<a href="#/teacher">クラス一覧</a>　／　<a href="#/teacher/class/${c.id}">${className(c)}</a>`,
      title: `${n}番${nick ? `　${esc(nick)}` : ''}`,
      sub: v.real ? 'この端末で練習した記録を表示しています。' : '表示しているのはダミーのデータです。',
      actions: nav,
      body: `<div class="t-detail"><div>${testsCard}${missionsCard}</div><div>${recCard}</div></div>`,
    });
  };
  return {
    mode: 'teacher',
    title: `${className(c)} ${n}番`,
    view,
    actions: {
      tts: (text) => speak(text),
      rate(arg) {
        const [rid, dim, x] = arg.split('|');
        store.ratings[rid] = { ...(store.ratings[rid] || {}), [dim]: +x };
        save();
        refresh();
      },
    },
  };
}

// ---------- ログイン用QRコード ----------
export function qr(id) {
  const c = classById(id);
  if (!c) return { redirect: '/teacher' };
  const view = () => {
    const cards = students(c).map((s) => `<div class="t-qrcard"><span class="cls">${esc(c.school)} ${className(c)}</span><span class="no">${s.n}</span><span class="nick">${esc(s.nick)}</span>
      ${qrSvg(kidLoginUrl(c.code, s.n))}<span class="code">クラスの番号 ${c.code}</span><span class="pic" data-cand="picpass">ひみつの絵 <span>${secretPicOf(c, s.n)}</span></span></div>`).join('');
    const howto = `<div class="t-howto">
      <div><b>1. 印刷して配る</b>カードを切り分けて、児童に1枚ずつ配ります。</div>
      <div><b>2. カメラで読み取る</b>児童がタブレットのカメラでQRコードを読み取ると、ログインの画面が開きます。</div>
      <div><b>3. 「はい」を押す</b>自分の番号と名前を確かめて「はい」を押すと、練習を始められます。</div></div>`;
    const note = isLocalHost() ? '<p class="g-note t-noprint" style="margin:0 0 16px">いまは確認用のパソコンの中だけで動いているため、このQRコードはiPadから読み取れません。公開用のURLに置くと読み取れるようになります。</p>' : '';
    return layout({
      active: 'qr',
      cls: c,
      crumb: `<a href="#/teacher">クラス一覧</a>　／　<a href="#/teacher/class/${c.id}">${className(c)}</a>`,
      title: 'ログイン用QRコード',
      sub: `QRコードを使わない場合は、クラスの番号「${c.code}」と出席番号で入れます。`,
      actions: `<button class="btn primary" data-act="print">${icons.print}印刷する</button>`,
      body: `${howto}${note}<div class="t-qrgrid">${cards}</div>`,
    });
  };
  return { mode: 'teacher', title: 'ログイン用QRコード', view, actions: { print: () => window.print() } };
}

// ---------- 研究用データ ----------
function csvTests() {
  const rows = [['class_code', 'grade', 'class', 'student_id', 'phase', 'item', 'correct', 'answered_at']];
  for (const c of allClasses()) {
    for (const s of students(c)) {
      const v = kidView(c, s.n);
      for (const [ph, t] of [['pre', v.pre], ['post', v.post]]) {
        if (!t) continue;
        for (const m of TEST_ITEMS) if (m.id in t.answers) rows.push([c.code, c.grade, c.kumi, `${c.code}-${String(s.n).padStart(2, '0')}`, ph, pairName(m), t.answers[m.id] ? 1 : 0, fmtIso(t.at)]);
      }
    }
  }
  downloadText(csv(rows), 'sound-quest_listening-tests.csv');
  toast(`聞き分けテストの結果を書き出しました（${rows.length - 1}行）`);
}

function csvPractice() {
  const rows = [['class_code', 'grade', 'class', 'student_id', 'mission', 'stars', 'plays', 'self_eval', 'last_practiced_at']];
  for (const c of allClasses()) {
    for (const s of students(c)) {
      const v = kidView(c, s.n);
      for (const m of MISSIONS) {
        const p = v.missions[m.id];
        if (p) rows.push([c.code, c.grade, c.kumi, `${c.code}-${String(s.n).padStart(2, '0')}`, m.type === 'pair' ? pairName(m) : m.sq, p.stars, p.plays, p.self ?? '', fmtIso(p.lastAt)]);
      }
    }
  }
  downloadText(csv(rows), 'sound-quest_practice.csv');
  toast(`練習の記録を書き出しました（${rows.length - 1}行）`);
}

export function data() {
  const view = () => layout({
    active: 'data',
    title: '研究用データ',
    sub: '学習ログを研究に使えるよう、書き出す形と保存のルールをまとめました。11月11日のお打ち合わせで「7日で削除」とした録音の扱いも、ここで確かめられます。',
    body: `<section class="t-card"><h2>データを書き出す</h2><p class="t-card-sub">児童は「クラスの番号-出席番号」の記号で書き出します。名前とメールアドレスは含めません。</p>
        <div class="t-actions" style="margin-top:14px"><button class="btn primary" data-act="csvTests">${icons.download}聞き分けテストの結果（CSV）</button><button class="btn" data-act="csvPractice">${icons.download}練習の記録（CSV）</button></div></section>
      <section class="t-card"><h2>記録する項目<span class="t-proposal">案</span></h2><ul class="t-list">
        <li>聞き分けテスト：はじめ／さいごの別、音の組、正誤、日時</li>
        <li>ミッション：聞き分け5問の正誤、星の数、児童の自己評価、回数、日時</li>
        <li>録音：音の組、「まねする」「つたえる」の別、日時（音声そのものは7日で削除）</li>
        <li data-cand="stt">音声認識の結果（発話の文字化を入れる場合）</li>
        <li data-cand="rating">先生による録音の評価（入れる場合）</li>
      </ul></section>
      <section class="t-card"><h2>録音と個人情報の扱い<span class="t-proposal">案</span></h2><dl class="t-kv">
        <dt>録音の保存期間</dt><dd>クラウドに保存し、7日で自動削除</dd>
        <dt>録音を聞ける人</dt><dd>そのクラスを担当する先生だけ</dd>
        <dt>児童について持つ情報</dt><dd>学校・学年・組・出席番号・ニックネーム（任意）。名前とメールアドレスは持たない</dd>
        <dt>先生について持つ情報</dt><dd>メールアドレス（ログイン用）</dd>
        <dt>カメラの映像</dt><dd>保存も送信もしない（顔の映像を入れる場合）</dd>
      </dl></section>`,
  });
  return { mode: 'teacher', title: '研究用データ', view, actions: { csvTests, csvPractice } };
}
