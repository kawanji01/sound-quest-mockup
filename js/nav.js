// 画面の描きなおしと移動（モジュールどうしの循環をさけるための仲介）
let painter = null;
export function setPainter(fn) { painter = fn; }
export function refresh() { if (painter) painter(); }
export function go(path) {
  const h = `#${path}`;
  if (location.hash === h) window.dispatchEvent(new HashChangeEvent('hashchange'));
  else location.hash = path;
}
