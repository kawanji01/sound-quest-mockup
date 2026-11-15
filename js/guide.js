// ガイド：先生にお送りするURLの入口。何を見て、何を決めていただきたいかを並べる。
import { CANDIDATES, cand } from './state.js';
import { mimi } from './mimi.js';
import { qrSvg, kidLoginUrl, isLocalHost } from './ui.js';
import { esc } from './util.js';
import { classById, students, kidView, DEMO_KID } from './data.js';

const chart = `<svg viewBox="0 0 96 76" width="96" height="76" aria-hidden="true"><rect x="4" y="44" width="20" height="28" rx="5" fill="#8fcdb6"/><rect x="38" y="28" width="20" height="44" rx="5" fill="#c4e8d9"/><rect x="72" y="8" width="20" height="64" rx="5" fill="#fff"/></svg>`;

function sampleStudent() {
  const c = classById('c1');
  const s = students(c).find((x) => x.n !== DEMO_KID.n && kidView(c, x.n).recs.length);
  return s ? s.n : 1;
}

function link(href, label) {
  if (!href) return '<span></span>';
  if (href.startsWith('#/')) return `<a class="btn small" href="${href}">${esc(label)}</a>`;
  return `<button class="btn small" data-act="scrollto" data-arg="${esc(href.slice(1))}">${esc(label)}</button>`;
}

function view() {
  const checks = [
    ['1つのミッションの流れ', '「きく → ききわけ → まねする → つたえる → ふりかえり」の5段階です。1回10〜15分を想定しています。', '#/demo/kid/mission/ship', 'ship と sheep で試す'],
    ['ログインの方法', '先生が配るQRコード、または「クラスの番号（4けた）＋出席番号」で入ります。児童のメールアドレスは使いません。', '#/kid/login', 'ログインを試す'],
    ['はじめのテストとさいごのテスト', 'はじめのテストで聞き分けにくい音を見つけ、地図に「おすすめ」を出します。さいごのテストで変化を確かめます。', '#/demo/kid/test/pre', 'はじめのテストを試す'],
    ['「候補」の機能を入れるか', '顔の映像、発話の文字化、強勢マーク・矢印、舌の動きの動画、明瞭さの自動評価、先生による録音の評価、絵のあいことば。画面では紫の点線で囲んでいます。', '#cands', '一覧を見る'],
    ['発音の評価のしかた', '聞き分けは自動で採点します。発音は「自己評価と、先生が録音を聞く」「端末の音声認識で伝わったかを判定」「有料APIで点数化」のどれにするかを決めたいです。', `#/teacher/class/c1/student/${sampleStudent()}`, '先生の画面で見る'],
    ['先生の画面で見たい情報', 'クラスの進み具合、音ごとの正答率、児童ごとのテスト結果と録音を置きました。足りない情報や、要らない情報を教えてください。', '#/teacher/class/c1', 'ダッシュボードを見る'],
    ['Sound Questにあった機能', '「評価の手入力（0〜100点）」「CEFRの参考判定」「授業シミュレーション」は、この試作には入れていません。今回も必要かを教えてください。', '', ''],
    ['キャラクターと見た目', '大きな耳で音を聞く仮のキャラクター「ミミ」と、海と島の世界にしました。方向性へのご意見をください。', '#/demo/kid/home', '地図を見る'],
  ];
  const url = kidLoginUrl(DEMO_KID.code, DEMO_KID.n);
  return `
  <header class="g-hero"><div class="g-hero-inner">
    <div class="g-hero-mimi">${mimi('happy', { size: 150 })}</div>
    <div>
      <h1>Sound Quest 完成イメージ<br>（試作 v1）</h1>
      <p>11月11日のお打ち合わせと、先生にご共有いただいたSound Questをもとに作った、動く試作品です。こどもの画面と先生の画面を触っていただき、どの機能を入れるかを一緒に決めさせてください。</p>
      <p class="g-meta">株式会社BooQs　2026年11月</p>
    </div>
  </div></header>
  <main class="g-main">
    <div class="g-entries">
      <a class="g-entry kid" href="#/kid/login">
        <div><h2>こどもの画面</h2><p>小学1年生が一人で使えることを目指した練習画面です。iPadでのご確認をおすすめします。</p><span class="g-go">こどもの画面を開く</span></div>
        <div class="g-entry-art">${mimi('smile', { size: 92 })}</div>
      </a>
      <a class="g-entry teacher" href="#/teacher">
        <div><h2>先生の画面</h2><p>クラスの進み具合、はじめとさいごのテストの結果、録音を確かめる画面です。</p><span class="g-go">先生の画面を開く</span></div>
        <div class="g-entry-art">${chart}</div>
      </a>
    </div>
    <div class="g-cols">
      <section class="g-panel">
        <h2>見ていただきたいこと</h2>
        <p>お打ち合わせで決めきれなかった点を、画面で確かめられるようにしました。番号でご返信いただけると助かります。</p>
        <ol class="g-checks">${checks.map(([t, d, href, label]) => `<li><div><b>${esc(t)}</b><span>${esc(d)}</span></div>${link(href, label)}</li>`).join('')}</ol>
      </section>
      <div>
        <section class="g-panel">
          <h2>QRコードでログインを試す</h2>
          <div class="g-qr">${qrSvg(url)}<p>iPadのカメラでこのQRコードを読み取ると、「1年2組 5番」の児童としてログインする画面が開きます。</p></div>
          ${isLocalHost() ? '<p class="g-note">いまは確認用のパソコンの中だけで動いているため、iPadからは読み取れません。公開用のURLに置いたあとで読み取れるようになります。</p>' : ''}
        </section>
        <section class="g-panel" id="cands">
          <h2>「候補」の機能</h2>
          <p>入れるかどうかを決めていない機能です。オフにすると、その機能がない画面になります。</p>
          <div class="toggle-list" style="margin-top:12px">${CANDIDATES.map((c) => `<label class="toggle"><span><b>${esc(c.name)}</b><small>${esc(c.note)}</small></span><span class="switch"><input type="checkbox" data-change="cand" data-arg="${c.key}" ${cand(c.key) ? 'checked' : ''}><span></span></span></label>`).join('')}</div>
        </section>
        <section class="g-panel">
          <h2>この試作の前提</h2>
          <ul class="g-assume">
            <li>音声は端末の合成音声で代用しています。12月にいただく音声と動画に差し替えます。</li>
            <li>ステージの中身は、Sound Questの12の音項目を仮に使っています（/r/–/l/ は right–light と road–load にまとめました）。先生の筋書きに合わせて組み直します。</li>
            <li>「かいわの まち」は、会話の聞き取りと発話の中身をご相談してから作ります。</li>
            <li>練習の記録と録音はこの端末の中にだけ置き、弊社には送信しません。録音はページを閉じると消えます。ただし「発話の文字化」は端末やブラウザの音声認識を使うため、機種によっては音声がAppleやGoogleに送られます。</li>
            <li>先生の画面のクラスと児童はダミーです。先生はメールアドレスでログインする想定です（ログイン画面は省略）。</li>
          </ul>
        </section>
      </div>
    </div>
    <p class="g-foot">Sound Quest 試作 v1　株式会社BooQs</p>
  </main>`;
}

export function guideScreen() {
  return {
    mode: 'guide',
    title: 'ガイド',
    view,
    actions: {
      scrollto: (id) => { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); },
    },
  };
}
