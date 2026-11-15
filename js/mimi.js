// キャラクター「ミミ」：おおきな みみで おとを きく いきもの。（この試作のための仮のキャラクター）
const INK = '#24324a';
const BODY = '#6fd1ae';
const BODY_DEEP = '#4cbf98';

const sparkle = (x, y, s = 1, fill = '#ffc93c') =>
  `<path transform="translate(${x} ${y}) scale(${s})" d="M0 -7 L1.9 -1.9 L7 0 L1.9 1.9 L0 7 L-1.9 1.9 L-7 0 L-1.9 -1.9 Z" fill="${fill}"/>`;

export function mimi(mood = 'smile', { size = 120, cls = '' } = {}) {
  const tilt = { happy: [-24, 24], listen: [-10, 32], oops: [-4, 4], think: [-16, 6] }[mood] || [-12, 12];
  const ear = (cx, rot) =>
    `<g transform="rotate(${rot} ${cx} 62)"><ellipse cx="${cx}" cy="33" rx="12.5" ry="30" fill="${BODY}"/><ellipse cx="${cx}" cy="36" rx="6.5" ry="20" fill="#ffd3dc"/></g>`;
  const openEyes = (dy = 0) =>
    `<ellipse cx="45" cy="${80 + dy}" rx="6" ry="7.5" fill="${INK}"/><ellipse cx="75" cy="${80 + dy}" rx="6" ry="7.5" fill="${INK}"/>` +
    `<circle cx="47.4" cy="${76.8 + dy}" r="2.4" fill="#fff"/><circle cx="77.4" cy="${76.8 + dy}" r="2.4" fill="#fff"/>`;
  const smile = `<path d="M54 92 q6 6.5 12 0" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;

  let eyes = openEyes();
  let mouth = smile;
  let extra = '';
  if (mood === 'happy') {
    eyes = `<path d="M38.5 82 q6.5 -9 13 0" fill="none" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/>` +
      `<path d="M68.5 82 q6.5 -9 13 0" fill="none" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/>`;
    mouth = `<path d="M51 89 q9 14 18 0 z" fill="#d94b66"/><path d="M55 95.5 q5 4.5 10 0 q-5 -3 -10 0z" fill="#ff8fa6"/>`;
    extra = sparkle(12, 46, 1.1) + sparkle(108, 40, 0.9) + sparkle(100, 10, 0.7, '#ff9db3');
  } else if (mood === 'oops') {
    mouth = `<ellipse cx="60" cy="93" rx="4.2" ry="5" fill="#d94b66"/>`;
    extra = `<path d="M100 60 c0 0 6 8 6 11.5 a6 6 0 0 1 -12 0 c0 -3.5 6 -11.5 6 -11.5z" fill="#9ad7ff"/>`;
  } else if (mood === 'listen') {
    extra = `<path d="M103 20 q8 8 0 16" fill="none" stroke="${BODY_DEEP}" stroke-width="3.4" stroke-linecap="round"/>` +
      `<path d="M110 13 q13 15 0 30" fill="none" stroke="${BODY_DEEP}" stroke-width="3.4" stroke-linecap="round" opacity=".6"/>`;
  } else if (mood === 'think') {
    eyes = openEyes(-2);
    mouth = `<path d="M55 93 h10" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
    extra = `<circle cx="104" cy="44" r="3" fill="#c9d8e4"/><circle cx="111" cy="34" r="4.5" fill="#c9d8e4"/>`;
  }

  const h = Math.round((size * 130) / 120);
  return `<svg class="mimi ${cls}" viewBox="0 0 120 130" width="${size}" height="${h}" aria-hidden="true" focusable="false">` +
    `<g class="mimi-body">` +
    ear(44, tilt[0]) + ear(76, tilt[1]) +
    `<ellipse cx="44" cy="125" rx="11" ry="5" fill="${BODY_DEEP}"/><ellipse cx="76" cy="125" rx="11" ry="5" fill="${BODY_DEEP}"/>` +
    `<ellipse cx="60" cy="88" rx="47" ry="39" fill="${BODY}"/>` +
    `<path d="M55 51 q4 -10 10 -4" fill="none" stroke="${BODY_DEEP}" stroke-width="3" stroke-linecap="round"/>` +
    `<ellipse cx="60" cy="97" rx="20" ry="13.5" fill="#fff6e3"/>` +
    eyes +
    `<ellipse cx="32" cy="94" rx="7" ry="4.5" fill="#ff9db3" opacity=".75"/><ellipse cx="88" cy="94" rx="7" ry="4.5" fill="#ff9db3" opacity=".75"/>` +
    mouth +
    `</g>` + extra + `</svg>`;
}
