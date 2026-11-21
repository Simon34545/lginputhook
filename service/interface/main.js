import 'whatwg-fetch';

/* LG Input Hook - modern UI. Served by the Input Hook service itself (port 1842), so it runs both
 * on the TV (the app opens http://127.0.0.1:1842/) and in a PC browser (http://<tv-ip>:1842/).
 * Uses only the service's own endpoints: /config/<file>, /apps.json, /logs/<file>, /ip/, /password/, /reboot.
 * Written for webOS 5 Chromium 68: no ?. ?? flat() fromEntries() replaceAll(). */
(function () {
'use strict';

// ---------------------------------------------------------------- data
var KEYNAMES = {
  2: '1', 3: '2', 4: '3', 5: '4', 6: '5', 7: '6', 8: '7', 9: '8', 10: '9', 11: '0',
  771: 'List', 787: 'List (MR21)', 994: '••• (AD/SAP)', 1021: 'Set-top box power', 115: 'Volume +', 114: 'Volume −', 402: 'Channel +', 403: 'Channel −', 113: 'Mute',
  773: 'Home', 428: 'Voice (mic)', 241: 'Input', 139: 'Settings', 103: 'Up', 108: 'Down', 105: 'Left', 106: 'Right',
  272: 'Wheel click (OK)', 28: 'Enter', 412: 'Back', 398: 'Red', 399: 'Green', 400: 'Yellow', 401: 'Blue',
  1037: 'Netflix', 1038: 'Prime Video', 1042: 'Disney+', 1044: 'Rakuten TV', 1117: 'Google Assistant', 1086: 'Alexa',
  362: 'Guide', 1083: 'Movies',
  164: 'Play/Pause', 207: 'Play', 119: 'Pause', 128: 'Stop', 168: 'Rewind', 208: 'Fast-forward',
  163: 'Next track', 165: 'Previous track', 167: 'Record', 358: 'Info', 370: 'Subtitles', 392: 'Audio track',
  174: 'Exit', 1: 'Escape', 116: 'Power'
};
var REPLACE_GROUPS = [
  ['Navigation', [103, 108, 105, 106, 272, 28, 412, 773, 174, 771, 994]],
  ['Media', [164, 207, 119, 128, 168, 208, 163, 165, 167]],
  ['TV', [115, 114, 113, 402, 403, 241, 139, 362, 787, 358, 370, 392]],
  ['Colour', [398, 399, 400, 401]],
  ['Digits', [2, 3, 4, 5, 6, 7, 8, 9, 10, 11]],
  ['App buttons', [1037, 1038, 1042, 1044, 1083, 428]]
];
var LAUNCH_PICKS = [
  { id: 'com.webos.app.hdmi1', title: 'HDMI 1' }, { id: 'com.webos.app.hdmi2', title: 'HDMI 2' },
  { id: 'com.webos.app.hdmi3', title: 'HDMI 3' }, { id: 'com.webos.app.hdmi4', title: 'HDMI 4' },
  { id: 'com.webos.app.livetv', title: 'Live TV' }, { id: 'webos.screen.off', title: 'Screen off' }
];
var EXEC_PRESETS = [
  { title: 'Show a message on the TV', command: 'luna-send -n 1 luna://com.webos.notification/createToast \'{"sourceId":"org.webosbrew.inputhook","message":"Hello from the remote"}\'' },
  { title: 'Turn the screen off (sound keeps playing)', command: 'luna-send -n 1 luna://com.webos.service.tvpower/power/turnOffScreen \'{}\'' },
  { title: 'Switch to HDMI 1', command: 'luna-send -n 1 luna://com.webos.applicationManager/launch \'{"id":"com.webos.app.hdmi1"}\'' }
];

var WHEEL_NOTE = 'Only pressing the wheel can be changed. Scrolling it is not a button press, so Input Hook never sees it and it cannot be remapped.';
// LG Magic Remote MR20GA (part AKB75855501, US layout, ships with the CX) in a 300 x 1000 box.
// Positions follow LG's product photo. code null = not known yet (use Learn); guess = unconfirmed code.
function L(o) { return o; }
var LAYOUT = [
  L({ id: 'power', label: 'Power', icon: '@power', code: 116, shape: 'round', x: 88, y: 64, r: 20, locked: true }),
  L({ id: 'stb', label: 'Set-top box power', icon: '@stb', code: 1021, shape: 'round', x: 212, y: 64, r: 17 })
];
[1, 2, 3, 4, 5, 6, 7, 8, 9].forEach(function (n, i) {
  LAYOUT.push({ id: 'd' + n, label: String(n), code: n + 1, shape: 'pill', x: 86 + (i % 3) * 64, y: 126 + Math.floor(i / 3) * 46, w: 56, h: 32 });
});
LAYOUT = LAYOUT.concat([
  { id: 'list', label: 'List ( − / ≡ )', icon: '@list', code: 771, shape: 'pill', x: 86, y: 264, w: 56, h: 32 },
  { id: 'd0', label: '0 (hold: Quick Access)', icon: '0', code: 11, shape: 'pill', x: 150, y: 264, w: 56, h: 32 },
  { id: 'more', label: '••• (AD/SAP)', icon: '•••', code: 994, shape: 'pill', x: 214, y: 264, w: 56, h: 32 },
  { id: 'volup', label: 'Volume +', icon: '+', code: 115, shape: 'rock', x: 76, y: 345, w: 46, h: 62, part: 'top' },
  { id: 'voldn', label: 'Volume −', icon: '−', code: 114, shape: 'rock', x: 76, y: 407, w: 46, h: 62, part: 'bottom' },
  { id: 'chup', label: 'Channel +', icon: '@chup', code: 402, shape: 'rock', x: 224, y: 345, w: 46, h: 62, part: 'top' },
  { id: 'chdn', label: 'Channel −', icon: '@chdn', code: 403, shape: 'rock', x: 224, y: 407, w: 46, h: 62, part: 'bottom' },
  { id: 'mute', label: 'Mute', icon: '@mute', code: 113, shape: 'round', x: 150, y: 326, r: 17 },
  { id: 'voice', label: 'Voice (mic)', icon: '@mic', code: 428, shape: 'round', x: 150, y: 400, r: 22 },
  { id: 'home', label: 'Home', icon: '@home', code: 773, shape: 'round', x: 80, y: 478, r: 18 },
  { id: 'settings', label: 'Settings', icon: '@gear', code: 139, shape: 'round', x: 220, y: 478, r: 18 },
  { id: 'up', label: 'Up', code: 103, shape: 'ring', x: 150, y: 584, dir: 0 },
  { id: 'right', label: 'Right', code: 106, shape: 'ring', x: 150, y: 584, dir: 90 },
  { id: 'down', label: 'Down', code: 108, shape: 'ring', x: 150, y: 584, dir: 180 },
  { id: 'left', label: 'Left', code: 105, shape: 'ring', x: 150, y: 584, dir: 270 },
  { id: 'ok', label: 'OK / wheel', icon: 'OK', code: 272, shape: 'round', x: 150, y: 584, r: 34, note: WHEEL_NOTE },
  { id: 'back', label: 'Back', icon: '@back', code: 412, shape: 'pill', x: 86, y: 692, w: 54, h: 28 },
  { id: 'guide', label: 'Guide', icon: 'GUIDE', code: 362, shape: 'pill', x: 214, y: 692, w: 54, h: 28 },
  { id: 'netflix', label: 'Netflix', icon: 'NETFLIX', code: 1037, shape: 'pill', x: 82, y: 746, w: 64, h: 30, fill: '#f1f1f1', ink: '#c4111b' },
  { id: 'input', label: 'Input', icon: '@input', code: 241, shape: 'round', x: 150, y: 746, r: 17 },
  { id: 'prime', label: 'Prime Video', icon: 'prime', code: 1038, shape: 'pill', x: 218, y: 746, w: 64, h: 30, fill: '#f1f1f1', ink: '#1a98d5' },
  { id: 'red', label: 'Red', code: 398, shape: 'pill', x: 78, y: 800, w: 44, h: 22, fill: '#d0343b' },
  { id: 'green', label: 'Green', code: 399, shape: 'pill', x: 126, y: 800, w: 44, h: 22, fill: '#22a35a' },
  { id: 'yellow', label: 'Yellow', code: 400, shape: 'pill', x: 174, y: 800, w: 44, h: 22, fill: '#e3b81f' },
  { id: 'blue', label: 'Blue', code: 401, shape: 'pill', x: 222, y: 800, w: 44, h: 22, fill: '#3654c4' },
  { id: 'movies', label: 'Movies', icon: 'MOVIES', code: 1083, shape: 'pill', x: 82, y: 852, w: 64, h: 30, fill: '#f1f1f1', ink: '#c4111b', },
  { id: 'play', label: 'Play', icon: '@play', code: 207, shape: 'pill', x: 150, y: 852, w: 50, h: 28 },
  { id: 'pause', label: 'Pause', icon: '@pause', code: 119, shape: 'pill', x: 218, y: 852, w: 50, h: 28 }
]);

var LAYOUTS = { mr20ga: { name: 'MR20GA (2020)', sub: 'CX, GX, BX, NANO 2020 (US layout, AKB75855501)', buttons: LAYOUT } };

// MR21GA / MR22GA family (2021-2022). Codes from the upstream MR21GC list; app buttons differ by region (use Learn).
(function () {
  var b = [{ id: 'power', label: 'Power', icon: '@power', code: 116, shape: 'round', x: 88, y: 64, r: 20, locked: true }];
  [1, 2, 3, 4, 5, 6, 7, 8, 9].forEach(function (n, i) {
    b.push({ id: 'd' + n, label: String(n), code: n + 1, shape: 'pill', x: 86 + (i % 3) * 64, y: 126 + Math.floor(i / 3) * 46, w: 56, h: 32 });
  });
  LAYOUTS.mr21 = { name: 'MR21GA / MR22GA (2021-2022)', sub: 'C1, G1, C2, G2 and other 2021-2022 models', buttons: b.concat([
    { id: 'list', label: 'List / Guide', icon: '@list', code: 787, shape: 'pill', x: 86, y: 264, w: 56, h: 32 },
    { id: 'd0', label: '0 (hold: Quick Access)', icon: '0', code: 11, shape: 'pill', x: 150, y: 264, w: 56, h: 32 },
    { id: 'more', label: '••• (AD/SAP)', icon: '•••', code: 994, shape: 'pill', x: 214, y: 264, w: 56, h: 32 },
    { id: 'volup', label: 'Volume +', icon: '+', code: 115, shape: 'rock', x: 76, y: 345, w: 46, h: 62, part: 'top' },
    { id: 'voldn', label: 'Volume −', icon: '−', code: 114, shape: 'rock', x: 76, y: 407, w: 46, h: 62, part: 'bottom' },
    { id: 'chup', label: 'Channel +', icon: '@chup', code: 402, shape: 'rock', x: 224, y: 345, w: 46, h: 62, part: 'top' },
    { id: 'chdn', label: 'Channel −', icon: '@chdn', code: 403, shape: 'rock', x: 224, y: 407, w: 46, h: 62, part: 'bottom' },
    { id: 'mute', label: 'Mute', icon: '@mute', code: 113, shape: 'round', x: 150, y: 326, r: 17 },
    { id: 'voice', label: 'Voice (mic)', icon: '@mic', code: 428, shape: 'round', x: 150, y: 400, r: 22 },
    { id: 'home', label: 'Home', icon: '@home', code: 773, shape: 'round', x: 80, y: 478, r: 18 },
    { id: 'input', label: 'Input', icon: '@input', code: 241, shape: 'round', x: 220, y: 478, r: 18 },
    { id: 'up', label: 'Up', code: 103, shape: 'ring', x: 150, y: 584, dir: 0 },
    { id: 'right', label: 'Right', code: 106, shape: 'ring', x: 150, y: 584, dir: 90 },
    { id: 'down', label: 'Down', code: 108, shape: 'ring', x: 150, y: 584, dir: 180 },
    { id: 'left', label: 'Left', code: 105, shape: 'ring', x: 150, y: 584, dir: 270 },
    { id: 'ok', label: 'OK / wheel', icon: 'OK', code: 272, shape: 'round', x: 150, y: 584, r: 34, note: WHEEL_NOTE },
    { id: 'back', label: 'Back', icon: '@back', code: 412, shape: 'round', x: 80, y: 690, r: 18 },
    { id: 'settings', label: 'Settings', icon: '@gear', code: 139, shape: 'round', x: 220, y: 690, r: 18 },
    { id: 'red', label: 'Red', code: 398, shape: 'pill', x: 78, y: 744, w: 44, h: 22, fill: '#d0343b' },
    { id: 'green', label: 'Green', code: 399, shape: 'pill', x: 126, y: 744, w: 44, h: 22, fill: '#22a35a' },
    { id: 'yellow', label: 'Yellow', code: 400, shape: 'pill', x: 174, y: 744, w: 44, h: 22, fill: '#e3b81f' },
    { id: 'blue', label: 'Blue', code: 401, shape: 'pill', x: 222, y: 744, w: 44, h: 22, fill: '#3654c4' },
    { id: 'netflix', label: 'Netflix', icon: 'NETFLIX', code: 1037, shape: 'pill', x: 100, y: 798, w: 88, h: 32, fill: '#f1f1f1', ink: '#c4111b' },
    { id: 'prime', label: 'Prime Video', icon: 'prime', code: 1038, shape: 'pill', x: 200, y: 798, w: 88, h: 32, fill: '#f1f1f1', ink: '#1a98d5' },
    { id: 'app3', label: 'App button 3 (Disney+ in most regions)', icon: 'Disney+', code: 1042, shape: 'pill', x: 100, y: 846, w: 88, h: 32, fill: '#f1f1f1', ink: '#113ccf' },
    { id: 'app4', label: 'App button 4 (Rakuten TV / LG Channels)', icon: 'App 4', code: 1044, shape: 'pill', x: 200, y: 846, w: 88, h: 32, fill: '#f1f1f1', ink: '#3a3c48' },
    { id: 'google', label: 'Google Assistant', icon: 'Google', code: 1117, shape: 'pill', x: 100, y: 894, w: 88, h: 30 },
    { id: 'alexa', label: 'Alexa', icon: 'alexa', code: 1086, shape: 'pill', x: 200, y: 894, w: 88, h: 30 }
  ]) };
})();

// Notes for this particular TV (empty in the upstream copy).
var LOCAL_NOTES = {};
Object.keys(LAYOUTS).forEach(function (m) { LAYOUTS[m].buttons.forEach(function (l) { if (LOCAL_NOTES[l.id] && !l.note) l.note = LOCAL_NOTES[l.id]; }); });


// 24x24 stroke icons (the TV's fonts lack most symbol glyphs)
var ICONS = {
  power: 'M12 3v8 M6.3 6.8a8 8 0 1 0 11.4 0',
  input: 'M3 12h11 M10 8l4 4-4 4 M19 5v14',
  list: 'M5 7h14 M5 12h14 M5 17h14',
  chup: 'M6 15l6-6 6 6', chdn: 'M6 9l6 6 6-6',
  mic: 'M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3z M6 11a6 6 0 0 0 12 0 M12 17v4',
  home: 'M4 11l8-7 8 7 M6 9.5V19h12V9.5',
  mute: 'M4 9h4l5-4v14l-5-4H4z M16 9l5 6 M21 9l-5 6',
  gear: 'M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6z M12 2.5v3 M12 18.5v3 M2.5 12h3 M18.5 12h3 M5.3 5.3l2.1 2.1 M16.6 16.6l2.1 2.1 M5.3 18.7l2.1-2.1 M16.6 7.4l2.1-2.1',
  back: 'M9 6L4 11l5 5 M4 11h10a5 5 0 0 1 0 10h-2',
  guide: 'M4 5h16v14H4z M4 10h16 M10 10v9',
  pass: 'M12 4a8 8 0 1 0 0 16a8 8 0 1 0 0-16z',
  play: 'M7 5l12 7-12 7z',
  swap: 'M4 8h14 M14 4l4 4-4 4 M20 16H6 M10 12l-4 4 4 4',
  term: 'M4 5h16v14H4z M7 10l3 2-3 2 M12 15h5',
  off: 'M12 4a8 8 0 1 0 0 16a8 8 0 1 0 0-16z M6.4 6.4l11.2 11.2',
  stb: 'M12 3v6 M8.5 5.2a5 5 0 1 0 7 0 M4 15h16v5H4z',
  pause: 'M9 5v14 M15 5v14',
  target: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8z M12 1v4 M12 19v4 M1 12h4 M19 12h4'
};
function icoHTML(name, size) {
  var d = ICONS[String(name).replace('@', '')] || '';
  return '<svg class="ico" viewBox="0 0 24 24" width="' + (size || '1.4em') + '" height="' + (size || '1.4em') + '"><path d="' + d + '"/></svg>';
}

var ACTIONS = [
  { a: 'pass', ic: '@pass', t: 'Default', d: 'Button does what LG made it do' },
  { a: 'launch', ic: '@play', t: 'Open app or input', d: 'Launch an app, HDMI input, Live TV…' },
  { a: 'replace', ic: '@swap', t: 'Act as another key', d: 'Send a different button instead' },
  { a: 'exec', ic: '@term', t: 'Run a command', d: 'Shell command as root on the TV' },
  { a: 'ignore', ic: '@off', t: 'Disable', d: 'Button does nothing' }
];

// ---------------------------------------------------------------- state
var S = {
  orig: {}, cfg: {}, apps: [], appsById: {}, meta: { codes: {}, names: {} },
  sel: null,            // { layoutId } or { code }
  learning: null,       // layoutId waiting for a key press
  appFilter: '', showHidden: false,
  logLen: { lginput2: -1, micomservice: -1 }, live: [], online: false
};
var isTV = /Web0S|webOS/i.test(navigator.userAgent);
if (isTV) document.documentElement.className += ' tv';

// ---------------------------------------------------------------- helpers
function $(id) { return document.getElementById(id); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function clone(o) { return JSON.parse(JSON.stringify(o)); }
function keyName(code) {
  if (code == null) return 'Unknown';
  if (S.meta.names[code]) return S.meta.names[code];
  var l = layoutByCode(code); if (l) return l.label;
  return KEYNAMES[code] || ('Key ' + code);
}
function learned() { var m = S.meta.model; if (!S.meta.codes[m]) S.meta.codes[m] = {}; return S.meta.codes[m]; }
function codeOf(l) { var v = learned()[l.id]; if (v === -1) return null; return v != null ? v : l.code; }
function layoutById(id) { for (var i = 0; i < LAYOUT.length; i++) if (LAYOUT[i].id === id) return LAYOUT[i]; return null; }
function layoutByCode(code) { for (var i = 0; i < LAYOUT.length; i++) if (codeOf(LAYOUT[i]) === code) return LAYOUT[i]; return null; }
function selCode() { if (!S.sel) return null; if (S.sel.layoutId) return codeOf(layoutById(S.sel.layoutId)); return S.sel.code; }
function bindOf(code) { return code != null ? S.cfg[String(code)] : null; }
function actOf(code) { var b = bindOf(code); return b ? b.action : 'pass'; }
function appTitle(id) { var a = S.appsById[id]; if (a) return a.title; for (var i = 0; i < LAUNCH_PICKS.length; i++) if (LAUNCH_PICKS[i].id === id) return LAUNCH_PICKS[i].title; return id; }
function describe(b) {
  if (!b) return 'Default';
  if (b.action === 'ignore') return 'Disabled';
  if (b.action === 'replace') return 'Acts as ' + keyName(b.keycode);
  if (b.action === 'launch') return 'Opens ' + appTitle(b.id);
  if (b.action === 'exec') { var p = presetFor(b.command); return p ? p.title : 'Runs: ' + b.command; }
  return b.action;
}
function shortTag(b) {
  if (!b) return '';
  if (b.action === 'ignore') return 'off';
  if (b.action === 'replace') return '→ ' + keyName(b.keycode);
  if (b.action === 'launch') return appTitle(b.id);
  if (b.action === 'exec') return 'cmd';
  return '';
}
function presetFor(cmd) { for (var i = 0; i < EXEC_PRESETS.length; i++) if (EXEC_PRESETS[i].command === cmd) return EXEC_PRESETS[i]; return null; }
function trunc(s, n) { s = String(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
function dirty() { return JSON.stringify(sortKeys(S.cfg)) !== JSON.stringify(sortKeys(S.orig)); }
function sortKeys(o) { var r = {}; Object.keys(o).sort().forEach(function (k) { r[k] = o[k]; }); return r; }

function api(path, opts) {
  opts = opts || {};
  return fetch(path, { method: opts.method || 'GET', body: opts.body, cache: 'no-store', credentials: 'same-origin' }).then(function (r) {
    return r.text().then(function (t) { if (!r.ok) throw new Error(r.status + ' ' + t); return t; });
  });
}
function getJSON(path, fallback) { return api(path).then(function (t) { try { return JSON.parse(t); } catch (e) { return fallback; } }); }
function putJSON(path, obj) { return api(path, { method: 'POST', body: JSON.stringify(obj) }); }

var toastTimer;
function toast(msg, kind) {
  var t = $('toast'); t.textContent = msg; t.className = 'toast ' + (kind || '');
  clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.className = 'toast hidden'; }, 3800);
}

// ---------------------------------------------------------------- remote svg
var NS = 'http://www.w3.org/2000/svg';
function el(tag, attrs, parent) {
  var e = document.createElementNS(NS, tag);
  for (var k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
function arcSeg(cx, cy, r1, r2, a0, a1) {
  function p(r, a) { var t = (a - 90) * Math.PI / 180; return [cx + r * Math.cos(t), cy + r * Math.sin(t)]; }
  var A = p(r2, a0), B = p(r2, a1), C = p(r1, a1), D = p(r1, a0);
  return 'M' + A + ' A' + r2 + ',' + r2 + ' 0 0 1 ' + B + ' L' + C + ' A' + r1 + ',' + r1 + ' 0 0 0 ' + D + ' Z';
}
function rockPath(x, y, w, h, part) {
  var r = w / 2, l = x - w / 2, rt = x + w / 2, top = y - h / 2, bot = y + h / 2;
  if (part === 'top') return 'M' + l + ',' + bot + ' L' + l + ',' + (top + r) + ' A' + r + ',' + r + ' 0 0 1 ' + rt + ',' + (top + r) + ' L' + rt + ',' + bot + ' Z';
  return 'M' + l + ',' + top + ' L' + rt + ',' + top + ' L' + rt + ',' + (bot - r) + ' A' + r + ',' + r + ' 0 0 1 ' + l + ',' + (bot - r) + ' Z';
}
function drawRemote() {
  var svg = $('remote'); svg.innerHTML = '';
  var defs = el('defs', {}, svg);
  var g = el('linearGradient', { id: 'bodyGrad', x1: 0, y1: 0, x2: 1, y2: 1 }, defs);
  el('stop', { offset: 0, 'stop-color': '#1d2029' }, g); el('stop', { offset: 1, 'stop-color': '#121419' }, g);
  el('path', { 'class': 'body', d: 'M150,6 C230,6 272,30 272,110 L264,930 C262,972 232,994 150,994 C68,994 38,972 36,930 L28,110 C28,30 70,6 150,6 Z' }, svg);
  el('circle', { cx: 150, cy: 584, r: 76, fill: '#1a1d25', stroke: '#2e3240' }, svg);
  el('text', { x: 150, y: 935, 'text-anchor': 'middle', fill: '#3c4150', 'font-size': 13, 'font-weight': 700, 'letter-spacing': 3 }, svg).textContent = 'LG';

  LAYOUT.forEach(function (l) {
    var code = codeOf(l), b = bindOf(code), act = b ? b.action : 'pass';
    var grp = el('g', { 'class': 'rk a-' + act + (l.locked ? ' locked' : '') + (S.sel && S.sel.layoutId === l.id ? ' sel' : ''), tabindex: l.locked ? -1 : 0, 'data-id': l.id }, svg);
    var title = el('title', {}, grp); title.textContent = l.label + (code != null ? ' (' + code + ')' : '') + ': ' + describe(b);
    var face, ring, gx = l.x, gy = l.y, tagY = null;
    if (l.shape === 'round') {
      face = el('circle', { 'class': 'face', cx: l.x, cy: l.y, r: l.r }, grp);
      ring = el('circle', { 'class': 'ring', cx: l.x, cy: l.y, r: l.r + 3 }, grp);
      if (l.id !== 'ok' && l.id !== 'voice' && l.id !== 'home') tagY = l.y + l.r + 11;
    } else if (l.shape === 'pill' || l.shape === 'rock') {
      var d = l.shape === 'rock' ? rockPath(l.x, l.y, l.w, l.h, l.part) : null;
      if (d) { face = el('path', { 'class': 'face', d: d }, grp); ring = el('path', { 'class': 'ring', d: d }, grp); }
      else {
        var rr = Math.min(l.h / 2, 12);
        face = el('rect', { 'class': 'face', x: l.x - l.w / 2, y: l.y - l.h / 2, width: l.w, height: l.h, rx: rr }, grp);
        ring = el('rect', { 'class': 'ring', x: l.x - l.w / 2 - 2.5, y: l.y - l.h / 2 - 2.5, width: l.w + 5, height: l.h + 5, rx: rr + 2 }, grp);
        tagY = l.y + l.h / 2 + 10;
      }
      if (l.fill) face.setAttribute('style', 'fill:' + l.fill);
      if (l.ink) grp.setAttribute('data-ink', l.ink);
    } else if (l.shape === 'ring') {
      var a0 = l.dir - 44, a1 = l.dir + 44;
      face = el('path', { 'class': 'face', d: arcSeg(l.x, l.y, 39, 72, a0, a1) }, grp);
      ring = el('path', { 'class': 'ring', d: arcSeg(l.x, l.y, 39, 72, a0, a1) }, grp);
      var t = (l.dir - 90) * Math.PI / 180; gx = l.x + 56 * Math.cos(t); gy = l.y + 56 * Math.sin(t);
    }
    var gl = l.shape === 'ring' ? ['▲', '▶', '▼', '◀'][l.dir / 90] : (l.icon || l.label);
    if (/^(red|green|yellow|blue)$/.test(l.id)) gl = '';
    if (String(gl).charAt(0) === '@') {
      var sz = l.shape === 'round' ? l.r * 1.05 : Math.min(l.h, l.w) * 0.58, sc = sz / 24;
      el('path', { 'class': 'gico', d: ICONS[gl.slice(1)], transform: 'translate(' + (gx - sz / 2) + ',' + (gy - sz / 2) + ') scale(' + sc + ')', 'stroke-width': 2 }, grp);
    } else {
      var txt = el('text', { 'class': 'glyph' + (String(gl).length > 3 ? ' sm' : ''), x: gx, y: gy }, grp);
      txt.textContent = gl;
      if (l.ink) txt.setAttribute('style', 'fill:' + l.ink + ';font-weight:800');
      if (l.shape === 'ring') txt.setAttribute('font-size', 11);
    }
    if (b && tagY != null) {
      var tg = el('text', { 'class': 'tag', x: l.x, y: tagY }, grp); tg.textContent = trunc(shortTag(b), 14);
    }
    grp.addEventListener('click', function () { if (!l.locked) select({ layoutId: l.id }); else toast('Power cannot be remapped by Input Hook.'); });
  });
}
function flash(code) {
  LAYOUT.forEach(function (l) {
    if (codeOf(l) !== code) return;
    var g = document.querySelector('.rk[data-id="' + l.id + '"]'); if (!g) return;
    g.classList.add('pressed'); setTimeout(function () { g.classList.remove('pressed'); }, 260);
  });
}

// ---------------------------------------------------------------- panel
function select(sel) { S.sel = sel; S.learning = null; S.appFilter = ''; renderAll(); }
function setBind(code, b) {
  if (code == null) return;
  if (!b) delete S.cfg[String(code)]; else S.cfg[String(code)] = b;
  renderAll();
}
function renderPanel() {
  var p = $('panel');
  if (!S.sel) {
    p.innerHTML = '<div class="empty"><div class="big">' + icoHTML('@target') + '</div><h2>Pick a button</h2><p>Select any button on the remote to see what it does and change it.<br>Or just press a button on the real remote.</p></div>';
    return;
  }
  var l = S.sel.layoutId ? layoutById(S.sel.layoutId) : null;
  var code = selCode(), b = bindOf(code), act = b ? b.action : 'pass';
  var h = '';
  h += '<div class="head-row"><div class="grow"><h2>' + esc(l ? l.label : keyName(code)) + '</h2>';
  h += '<div class="sub">Key code <span class="code-pill">' + (code == null ? '?' : code) + '</span>';
  if (l && learned()[l.id] != null) h += ' <span class="muted small">(learned)</span>';
  h += '</div></div>';
  if (l) h += '<button id="learn" class="ghost">' + (S.learning ? 'Press the button now… (Cancel)' : 'Learn code') + '</button>';
  h += '</div>';
  if (code == null) {
    h += '<div class="warnbox">This button\'s key code is not known yet. Press <b>Learn code</b>, then press this button on the real remote.</div>';
    p.innerHTML = h; wirePanel(); return;
  }
  if (l && l.note) h += '<div class="warnbox">' + esc(l.note) + '' + '</div>';
  h += '<div class="now"><span class="chip ' + act + '">' + esc(ACTIONS.filter(function (x) { return x.a === act; })[0].t) + '</span><span style="flex:1">' + esc(describe(b)) + '</span>' +
    ((act === 'launch' || act === 'exec') && S.status ? '<button id="try" class="ghost">Try it now</button>' : '') + '</div>';
  h += '<div class="section-label">Choose a function</div><div class="actions">';
  ACTIONS.forEach(function (x) {
    h += '<button class="act ' + x.a + (x.a === act ? ' on' : '') + '" data-act="' + x.a + '"><span class="ic">' + icoHTML(x.ic) + '</span><b>' + x.t + '</b><small>' + x.d + '</small></button>';
  });
  h += '</div>';
  if (act === 'replace') h += replaceEditor(b);
  if (act === 'launch') h += launchEditor(b);
  if (act === 'exec') h += execEditor(b);
  p.innerHTML = h;
  wirePanel();
}
function replaceEditor(b) {
  var h = '<div class="section-label">Send this key instead</div>';
  REPLACE_GROUPS.forEach(function (g) {
    h += '<div class="muted small" style="margin:.4rem 0 .3rem">' + g[0] + '</div><div class="chips">';
    g[1].forEach(function (c) { h += '<button data-rep="' + c + '"' + (b.keycode === c ? ' class="on"' : '') + '>' + esc(KEYNAMES[c] || c) + '</button>'; });
    h += '</div>';
  });
  h += '<div class="field"><span class="muted small">Other code</span><input type="number" id="rep-custom" min="0" value="' + b.keycode + '" style="width:7rem"><button id="rep-set">Use code</button></div>';
  return h;
}
function launchEditor(b) {
  var h = '<div class="launch"><div class="section-label">Inputs and shortcuts</div><div class="chips">';
  LAUNCH_PICKS.forEach(function (q) { h += '<button data-app="' + esc(q.id) + '"' + (b.id === q.id ? ' class="on"' : '') + '>' + esc(q.title) + '</button>'; });
  h += '</div><div class="section-label">Apps on this TV</div>';
  h += '<div class="field"><input type="search" id="app-q" placeholder="Search apps" value="' + esc(S.appFilter) + '" style="flex:1">';
  h += '<label class="check"><input type="checkbox" id="app-hidden"' + (S.showHidden ? ' checked' : '') + '>Show system apps</label></div>';
  h += '<div class="applist" id="applist">' + appRows(b) + '</div></div>';
  return h;
}
function appRows(b) {
  var q = S.appFilter.toLowerCase();
  var list = S.apps.filter(function (a) {
    if (!S.showHidden && a.hidden && a.id !== b.id) return false;
    return !q || a.title.toLowerCase().indexOf(q) >= 0 || a.id.toLowerCase().indexOf(q) >= 0;
  });
  if (!list.length) return '<div class="muted" style="padding:1rem">No apps match.</div>';
  return list.map(function (a) {
    return '<button class="app' + (a.id === b.id ? ' on' : '') + '" data-app="' + esc(a.id) + '"><span class="ttl">' + esc(a.title) + '</span><span class="id">' + esc(a.id) + '</span></button>';
  }).join('');
}
function execEditor(b) {
  var h = '<div class="section-label">Ready-made commands</div>';
  EXEC_PRESETS.forEach(function (x, i) { h += '<button class="preset" data-preset="' + i + '"><b>' + esc(x.title) + '</b><code>' + esc(x.command) + '</code></button>'; });
  h += '<div class="section-label">Command (runs as root when the button is pressed)</div>';
  h += '<textarea id="cmd" spellcheck="false">' + esc(b.command) + '</textarea>';
  h += '<div class="field"><button id="cmd-set">Save command</button><span class="muted small">Tip: luna-send works here; the command runs in the background.</span></div>';
  return h;
}
function wirePanel() {
  var code = selCode(), p = $('panel');
  if ($('try')) $('try').onclick = function () {
    api('/run', { method: 'POST', body: JSON.stringify(bindOf(code)) })
      .then(function () { toast('Done. Check the TV.', 'ok'); })
      .catch(function (e) { toast('Could not run it: ' + e.message, 'err'); });
  };
  var learn = $('learn');
  if (learn) learn.onclick = function () { S.learning = S.learning ? null : S.sel.layoutId; renderPanel(); focusSoon('learn'); };
  each(p.querySelectorAll('[data-act]'), function (btn) {
    btn.onclick = function () {
      var a = btn.getAttribute('data-act'), cur = bindOf(code);
      if (cur && cur.action === a) return;
      if (a === 'pass') setBind(code, null);
      else if (a === 'ignore') setBind(code, { action: 'ignore' });
      else if (a === 'replace') setBind(code, { action: 'replace', keycode: 272 });
      else if (a === 'launch') setBind(code, { action: 'launch', id: 'com.webos.app.hdmi1' });
      else if (a === 'exec') setBind(code, { action: 'exec', command: EXEC_PRESETS[0].command });
      focusSoon(null, '[data-act="' + a + '"]');
    };
  });
  each(p.querySelectorAll('[data-rep]'), function (btn) {
    btn.onclick = function () { var c = +btn.getAttribute('data-rep'); setBind(code, { action: 'replace', keycode: c }); focusSoon(null, '[data-rep="' + c + '"]'); };
  });
  if ($('rep-set')) $('rep-set').onclick = function () { var v = parseInt($('rep-custom').value, 10); if (v >= 0) setBind(code, { action: 'replace', keycode: v }); };
  wireApps(code);
  if ($('app-q')) $('app-q').oninput = function () { S.appFilter = this.value; $('applist').innerHTML = appRows(bindOf(code)); wireApps(code); };
  if ($('app-hidden')) $('app-hidden').onchange = function () { S.showHidden = this.checked; $('applist').innerHTML = appRows(bindOf(code)); wireApps(code); };
  each(p.querySelectorAll('[data-preset]'), function (btn) {
    btn.onclick = function () { setBind(code, { action: 'exec', command: EXEC_PRESETS[+btn.getAttribute('data-preset')].command }); };
  });
  if ($('cmd-set')) $('cmd-set').onclick = function () { var v = $('cmd').value.trim(); if (v) { setBind(code, { action: 'exec', command: v }); toast('Command set. Apply to TV to use it.'); } };
}
function wireApps(code) {
  each($('panel').querySelectorAll('[data-app]'), function (btn) {
    btn.onclick = function () {
      var id = btn.getAttribute('data-app'), keepScroll = $('applist') ? $('applist').scrollTop : 0;
      setBind(code, { action: 'launch', id: id });
      if ($('applist')) $('applist').scrollTop = keepScroll;
      focusSoon(null, '[data-app="' + id + '"]');
    };
  });
}
function each(nl, fn) { Array.prototype.forEach.call(nl, fn); }
function focusSoon(id, sel) { setTimeout(function () { var e = id ? $(id) : document.querySelector('#panel ' + sel); if (e) e.focus(); }, 0); }

// ---------------------------------------------------------------- side
function renderAssignments() {
  var keys = Object.keys(S.cfg).map(Number).sort(function (a, b) { return a - b; });
  var box = $('assignments');
  if (!keys.length) { box.innerHTML = '<span class="muted small">No buttons changed. Everything does its default.</span>'; return; }
  box.innerHTML = keys.map(function (c) {
    var b = S.cfg[c];
    return '<button class="as" data-code="' + c + '"><span class="k">' + esc(keyName(c)) + '</span><span class="chip ' + b.action + '" style="margin-right:.5rem">' + b.action + '</span><span class="v">' + esc(describe(b)) + '</span></button>';
  }).join('');
  each(box.querySelectorAll('.as'), function (btn) {
    btn.onclick = function () { var c = +btn.getAttribute('data-code'), l = layoutByCode(c); select(l ? { layoutId: l.id } : { code: c }); };
  });
}
function renderLive() {
  var box = $('live');
  if (!S.live.length) return;
  var last = S.live[0];
  var h = '<div class="last"><b>' + esc(keyName(last.code)) + '</b><span class="code-pill">' + last.code + '</span></div>';
  var bnd = bindOf(last.code);
  h += '<div class="small" style="margin-top:.2rem">' + esc(describe(bnd)) + (last.src === 'micomservice' ? ' · IR remote' : '') + '</div>';
  if (S.live.length > 1) h += '<div class="hist">Before: ' + S.live.slice(1, 7).map(function (e) { return esc(keyName(e.code)); }).join(' · ') + '</div>';
  h += '<div style="margin-top:.5rem"><button class="ghost" id="live-edit">Edit this button</button></div>';
  box.innerHTML = h;
  $('live-edit').onclick = function () { var l = layoutByCode(last.code); select(l ? { layoutId: l.id } : { code: last.code }); };
}
function renderTop() {
  var d = dirty();
  $('dirty').className = 'badge' + (d ? '' : ' hidden');
  $('btn-apply').disabled = !d; $('btn-revert').disabled = !d;
}
function renderAll() {
  var active = document.activeElement, activeId = active && active.getAttribute ? active.getAttribute('data-id') : null;
  drawRemote(); $('model-name').textContent = LAYOUTS[S.meta.model].name; renderPanel(); renderAssignments(); renderTop();
  if (activeId) { var g = document.querySelector('.rk[data-id="' + activeId + '"]'); if (g) g.focus(); }
}

// ---------------------------------------------------------------- live key feed (polls the hook's log)
// 1.4 (PHP hook) logs '773 => 1'. 1.5+ (inputhookpp) logs
// 'lginput_uinput_send_button called: keyid=5, state=1 uinput_code=773' or
// 'MICOM_FuncWriteKeyEvent called: fd=9, type=1, code=773, value=1'.
function parseKeyLine(line) {
  var m = line.match(/^(\d+) => (\d+)\s*$/);
  if (m) return { code: +m[1], state: +m[2] };
  m = line.match(/state=(\d+),? uinput_code=(\d+)/);
  if (m) return { code: +m[2], state: +m[1] };
  m = line.match(/type=(\d+), code=(\d+), value=(\d+)/);
  if (m && m[1] === '1') return { code: +m[2], state: +m[3] };
  return null;
}
var RELOAD_RE = /Keybinds (re)?loaded/g;
function pollLogs() {
  ['lginput2', 'micomservice'].forEach(function (src) {
    api('/logs/lginput-hook-' + src + '.log').then(function (t) {
      if (/^ENOENT/.test(t)) { S.logLen[src] = 0; return; }
      var prev = S.logLen[src];
      S.logLen[src] = t.length;
      if (prev < 0 || t.length < prev) return;            // first read or log restarted: just baseline
      var fresh = t.slice(prev).split('\n');
      fresh.forEach(function (line) {
        var k = parseKeyLine(line);
        if (k && k.state === 1) onKey(k.code, src);
      });
    }).catch(function () {});
  });
}
function onKey(code, src) {
  S.live.unshift({ code: code, src: src }); S.live = S.live.slice(0, 12);
  if (S.learning) {
    var l = layoutById(S.learning); S.learning = null;
    var other = layoutByCode(code);
    if (other && other.id !== l.id) learned()[other.id] = -1;   // that picture button no longer owns this code
    learned()[l.id] = code;
    putJSON('/config/studio-layout.json', S.meta).catch(function () {});
    toast(l.label + ' is key code ' + code + '.', 'ok');
    renderAll();
  }
  flash(code); renderLive();
}

// ---------------------------------------------------------------- apply / history
function countReloads(src) {
  return api('/logs/lginput-hook-' + src + '.log').then(function (t) { return (t.match(RELOAD_RE) || []).length; }).catch(function () { return -1; });
}
function apply() {
  var next = clone(S.cfg), before;
  $('btn-apply').disabled = true; $('btn-apply').textContent = 'Applying…';
  countReloads('lginput2').then(function (n) { before = n; return getJSON('/config/studio-history.json', []); })
    .then(function (hist) {
      if (!Array.isArray(hist)) hist = [];
      hist.unshift({ t: new Date().toISOString(), cfg: S.orig });
      return putJSON('/config/studio-history.json', hist.slice(0, 20));
    })
    .then(function () { return putJSON('/config/keybinds.json', next); })
    .then(function () { return new Promise(function (r) { setTimeout(r, 2300); }); })
    .then(function () { return countReloads('lginput2'); })
    .then(function (after) {
      S.orig = next; renderAll();
      if (before >= 0 && after > before) toast('Applied. The remote uses the new buttons now.', 'ok');
      else toast('Saved to the TV, but the hook has not confirmed a reload yet. If buttons do not change, restart the TV.', 'err');
    })
    .catch(function (e) { toast('Could not save: ' + e.message, 'err'); })
    .then(function () { $('btn-apply').textContent = 'Apply to TV'; renderTop(); });
}
function openModal(html, wire) {
  $('sheet').innerHTML = html; $('modal').className = 'modal'; wire($('sheet'));
  var f = $('sheet').querySelector('button, input'); if (f) f.focus();
}
function closeModal() { $('modal').className = 'modal hidden'; }
function moreMenu() {
  openModal('<h3>More</h3>' +
    '<button class="preset" id="m-model"><b>Remote model</b><code>' + esc(LAYOUTS[S.meta.model].name) + '</code></button>' +
    '<button class="preset" id="m-hist"><b>History</b><code>Go back to a configuration from before an Apply</code></button>' +
    '<button class="preset" id="m-code"><b>Edit a key by its code</b><code>For buttons not on the picture (other remotes, IR codes)</code></button>' +
    '<button class="preset" id="m-adv"><b>Advanced</b><code>Logs, status, config file, key codes, restart</code></button>' +
    '<div class="row"><button id="m-close">Close</button></div>', function (s) {
    $('m-close').onclick = closeModal;
    $('m-hist').onclick = history;
    $('m-model').onclick = pickModel;
    $('m-adv').onclick = function () { closeModal(); showTab('advanced'); };
    $('m-code').onclick = function () {
      openModal('<h3>Edit a key by its code</h3><p class="muted small">Codes appear under "Live from the remote" when you press a button.</p><div class="field"><input type="number" id="m-c" min="0" placeholder="e.g. 1083"><button class="primary" id="m-go">Edit</button></div><div class="row"><button id="m-x">Cancel</button></div>', function () {
        $('m-x').onclick = closeModal;
        $('m-go').onclick = function () { var c = parseInt($('m-c').value, 10); if (c >= 0) { closeModal(); var l = layoutByCode(c); select(l ? { layoutId: l.id } : { code: c }); } };
      });
    };
  });
}
function pickModel() {
  var h = '<h3>Which remote do you have?</h3><p class="muted small">Pick the one that looks like yours. Codes you learned are kept per model.</p>';
  Object.keys(LAYOUTS).forEach(function (k) {
    h += '<button class="preset' + (k === S.meta.model ? ' on' : '') + '" data-model="' + k + '"><b>' + esc(LAYOUTS[k].name) + '</b><code>' + esc(LAYOUTS[k].sub) + '</code></button>';
  });
  h += '<div class="row"><button id="pm-close">Close</button></div>';
  openModal(h, function (s) {
    $('pm-close').onclick = closeModal;
    each(s.querySelectorAll('[data-model]'), function (b) {
      b.onclick = function () {
        S.meta.model = b.getAttribute('data-model'); LAYOUT = LAYOUTS[S.meta.model].buttons;
        putJSON('/config/studio-layout.json', S.meta).catch(function () {});
        S.sel = null; closeModal(); renderAll(); toast('Showing the ' + LAYOUTS[S.meta.model].name + ' remote.');
      };
    });
  });
}
function history() {
  getJSON('/config/studio-history.json', []).then(function (hist) {
    if (!Array.isArray(hist)) hist = [];
    var h = '<h3>History</h3><p class="muted small">Each entry is the configuration as it was before an Apply. Picking one loads it here; press Apply to TV to use it.</p>';
    if (!hist.length) h += '<p class="muted">Nothing yet.</p>';
    hist.forEach(function (e, i) {
      var n = Object.keys(e.cfg || {}).length;
      h += '<button class="hist-item" data-i="' + i + '"><span>' + esc(new Date(e.t).toLocaleString()) + '</span><span class="muted">' + n + ' button' + (n === 1 ? '' : 's') + ' changed</span></button>';
    });
    h += '<div class="row"><button id="h-close">Close</button></div>';
    openModal(h, function (s) {
      $('h-close').onclick = closeModal;
      each(s.querySelectorAll('[data-i]'), function (b) { b.onclick = function () { S.cfg = clone(hist[+b.getAttribute('data-i')].cfg || {}); closeModal(); renderAll(); toast('Loaded. Press Apply to TV to use it.'); }; });
    });
  });
}

// ---------------------------------------------------------------- remote-control navigation (TV)
function focusables() {
  var root = $('modal').className.indexOf('hidden') < 0 ? $('sheet') : document;
  return Array.prototype.filter.call(root.querySelectorAll('button:not([disabled]), input, textarea, .rk[tabindex="0"]'), function (e) {
    var r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0;
  });
}
function moveFocus(dx, dy) {
  var list = focusables(), cur = document.activeElement;
  if (list.indexOf(cur) < 0) { if (list[0]) list[0].focus(); return; }
  var a = cur.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2, best = null, bs = 1e9;
  list.forEach(function (e) {
    if (e === cur) return;
    var r = e.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    var px = x - ax, py = y - ay, along = px * dx + py * dy;
    if (dx && (dx > 0 ? r.left < a.right - 2 : r.right > a.left + 2)) return;
    if (dy && (dy > 0 ? r.top < a.bottom - 2 : r.bottom > a.top + 2)) return;
    if (along <= 0) return;
    var across = Math.abs(px * dy) + Math.abs(py * dx), score = along + across * 2.2;
    if (score < bs) { bs = score; best = e; }
  });
  if (best) { best.focus(); if (best.scrollIntoView) best.scrollIntoView({ block: 'nearest' }); }
}
document.addEventListener('keydown', function (e) {
  var k = e.keyCode, t = document.activeElement, typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') && t.type !== 'checkbox';
  if (k === 461 || k === 27) {                     // Back / Esc
    e.preventDefault();
    if ($('modal').className.indexOf('hidden') < 0) closeModal();
    else if (ADV.tab === 'advanced' && !typing) showTab('buttons');
    else if (S.learning) { S.learning = null; renderPanel(); }
    else if (typing) t.blur();
    else if (S.sel) { var id = S.sel.layoutId; select(null); var g = id && document.querySelector('.rk[data-id="' + id + '"]'); if (g) g.focus(); }
    return;
  }
  var dir = { 37: [-1, 0], 38: [0, -1], 39: [1, 0], 40: [0, 1] }[k];
  if (dir) {
    if (typing && dir[0] && t.tagName !== 'INPUT') return;
    if (typing && t.tagName === 'INPUT' && dir[0] && t.value) return;
    if (typing && t.tagName === 'TEXTAREA' && dir[1]) return;
    e.preventDefault(); moveFocus(dir[0], dir[1]); return;
  }
  if (k === 13 && t && t.classList && t.classList.contains('rk')) { e.preventDefault(); t.dispatchEvent(new MouseEvent('click', { bubbles: true })); }
});

// ---------------------------------------------------------------- boot
function setStatus(kind, text) { $('status').className = 'status ' + kind; $('status').querySelector('span').textContent = text; }
function checkHook() {
  return api('/logs/lginput-hook-lginput2.log').then(function (t) {
    if (/Keybinds (re)?loaded|Installed \w+ hook/.test(t)) setStatus('ok', 'Hook active on the Magic Remote');
    else if (/^ENOENT/.test(t)) setStatus('warn', 'Hook not running yet. Restart the TV');
    else setStatus('warn', 'Hook loaded, waiting for config');
  }).catch(function (e) { setStatus('err', 'TV not reachable: ' + e.message); });
}
// Address and password for opening the interface on another device.
// 1.5.2+ reports both in /status.json; older services only give the password to localhost.
function getAccess() {
  if (S.status && S.status.address) return Promise.resolve({ address: S.status.address, password: S.status.password || '' });
  return Promise.all([api('/ip/').catch(function () { return ''; }), api('/password/').catch(function () { return ''; })]).then(function (r) {
    var local = location.hostname === '127.0.0.1' || location.hostname === 'localhost';
    var ip = (r[0] || '').trim() || (local ? '' : location.hostname);
    return { address: ip ? 'http://' + ip + ':1842/' : '', password: (r[1] || '').trim() };
  });
}
function pcCard() {
  return getAccess().then(function (a) {
    S.access = a;
    var local = location.hostname === '127.0.0.1' || location.hostname === 'localhost';
    var where = isTV ? 'on the TV' : local ? 'through an SSH tunnel' : 'from this device';
    $('pc-card').innerHTML = '<h3>Open on another device</h3><div class="small pc">' +
      'Address: <b>' + esc(a.address || 'unknown') + '</b><br>User: anything<br>Password: <b>' + esc(a.password || '(the one you entered)') + '</b></div>' +
      '<div class="small muted" style="margin-top:.3rem">The password changes when the TV restarts. You are connected ' + where + '.</div>';
    if (ADV.tab === 'advanced') renderAdvanced();
  });
}
function loadApps() {
  return getJSON('/apps.json', { apps: [] }).then(function (j) {
    S.apps = ((j && j.apps) || []).map(function (a) {
      return { id: a.id, title: a.title || a.id, hidden: !!(a.visible === false || (a.class && a.class.hidden) || a.systemApp && a.noWindow) };
    }).sort(function (a, b) { return a.title.localeCompare(b.title); });
    S.appsById = {}; S.apps.forEach(function (a) { S.appsById[a.id] = a; });
    if (S.sel) renderPanel();
    renderAssignments();
  }).catch(function () {});
}
function load() {
  loadApps();
  return Promise.all([
    getJSON('/config/keybinds.json', {}), getJSON('/config/studio-layout.json', {})
  ]).then(function (r) {
    S.orig = r[0] && typeof r[0] === 'object' ? r[0] : {}; S.cfg = clone(S.orig);
    var meta = r[1] || {}, codes = meta.codes || {};
    if (!meta.model) {   // older file: flat {buttonId: code} for the 2020 remote
      var flat = {}, any = false;
      Object.keys(codes).forEach(function (k) { if (typeof codes[k] !== 'object') { flat[k] = codes[k]; any = true; } });
      codes = any ? { mr20ga: flat } : {};
    }
    S.meta = { model: LAYOUTS[meta.model] ? meta.model : (codes.mr20ga ? 'mr20ga' : 'mr21'), codes: codes, names: meta.names || {} };
    LAYOUT = LAYOUTS[S.meta.model].buttons;
    renderAll();
  }).catch(function (e) { toast('Could not read from the TV: ' + e.message, 'err'); renderAll(); });
}

// ---------------------------------------------------------------- advanced tab
var ADV = { tab: 'buttons', target: 'lginput2', keysOnly: false, timer: null };
var TARGETS = [
  ['lginput2', 'Magic Remote (lginput2)'], ['micomservice', 'IR remote, webOS 5+ (micomservice)'],
  ['tvservice', 'IR remote, webOS 4 and older (tvservice)'], ['RELEASE', 'IR remote, older webOS (RELEASE)'], ['testapp', 'testapp (debugging)']
];
function showTab(t) {
  ADV.tab = t;
  $('tab-buttons').className = 'tab' + (t === 'buttons' ? ' on' : '');
  $('tab-advanced').className = 'tab' + (t === 'advanced' ? ' on' : '');
  document.querySelector('main').className = t === 'buttons' ? '' : 'hidden';
  $('advanced').className = t === 'advanced' ? 'advanced' : 'advanced hidden';
  clearInterval(ADV.timer);
  if (t === 'advanced') { renderAdvanced(); refreshLogs(); ADV.timer = setInterval(refreshLogs, 1000); }
}
function statusRow(label, ok, text) {
  return '<div class="srow"><span>' + esc(label) + '</span><span class="chip ' + (ok === true ? 'replace' : ok === false ? 'ignore' : 'pass') + '">' + esc(text) + '</span></div>';
}
function renderAdvanced() {
  var st = S.status, h = '';
  h += '<div class="adv-col"><div class="card"><h3>Status</h3>';
  if (st) {
    h += statusRow('Input Hook version', null, st.version);
    h += statusRow('Service runs as root', st.root, st.root ? 'yes' : 'no: open the app once from the TV');
    h += statusRow('Hook injected', st.injected, st.injected ? (st.targets || []).join(', ') || 'yes' : 'no: restart the TV');
    h += statusRow('Starts with the TV', st.autostart, st.autostart ? 'yes' : 'no');
  }
  if (S.access) {
    h += statusRow('Address', null, S.access.address || 'unknown');
    h += statusRow('User / password', null, 'anything / ' + (S.access.password || '(the one you entered)'));
  }
  if (!st) {
    h += '<p class="muted small">This Input Hook version does not report its status (needs 1.5.2 or newer).</p>';
  }
  h += '</div>';
  h += '<div class="card"><h3>Config file</h3><p class="muted small">keybinds.json as edited here (unsaved edits included). Paste a config to import it, then press Use this and Apply to TV.</p>' +
    '<textarea id="raw" spellcheck="false" style="min-height:14rem">' + esc(JSON.stringify(sortKeys(S.cfg), null, 2)) + '</textarea>' +
    '<div class="field"><button id="raw-use">Use this</button><button id="raw-dl">Download</button><button id="raw-reset">Show current</button></div></div>';
  h += '<div class="card"><h3>Maintenance</h3>' +
    '<button class="preset" id="a-reload"><b>Reload from the TV</b><code>Discard local edits and read the TV again</code></button>' +
    '<button class="preset" id="a-forget"><b>Forget learned codes</b><code>Use the built-in key codes for the ' + esc(LAYOUTS[S.meta.model].name) + ' again</code></button>' +
    '<button class="preset" id="a-clear"><b>Reset every button to default</b><code>Clears all assignments here; press Apply to TV to save</code></button>' +
    '<button class="preset danger" id="a-reboot"><b>Restart TV</b><code>Needed after installing or updating Input Hook, or if the hook stops reacting</code></button></div></div>';
  h += '<div class="adv-col wide"><div class="card"><h3>Logs</h3><div class="chips" id="log-targets">';
  TARGETS.forEach(function (t) { h += '<button data-target="' + t[0] + '"' + (t[0] === ADV.target ? ' class="on"' : '') + '>' + esc(t[1]) + '</button>'; });
  h += '</div><label class="check" style="margin:.2rem 0 .6rem"><input type="checkbox" id="keys-only"' + (ADV.keysOnly ? ' checked' : '') + '>Key presses only</label>' +
    '<div class="muted small" id="log1-name"></div><pre class="log" id="log1"></pre>' +
    '<div class="muted small" id="log2-name"></div><pre class="log" id="log2"></pre></div>';
  h += '<div class="card"><h3>Key codes</h3><p class="muted small">Every name this app knows. Codes for buttons not listed show up under Live from the remote when pressed.</p><div class="codes">' +
    Object.keys(KEYNAMES).map(Number).sort(function (a, b) { return a - b; }).map(function (c) { return '<span><b>' + c + '</b> ' + esc(KEYNAMES[c]) + '</span>'; }).join('') + '</div></div></div>';
  $('advanced').innerHTML = h;

  each($('log-targets').querySelectorAll('[data-target]'), function (b) {
    b.onclick = function () { ADV.target = b.getAttribute('data-target'); renderAdvanced(); refreshLogs(); };
  });
  $('keys-only').onchange = function () { ADV.keysOnly = this.checked; refreshLogs(); };
  $('raw-use').onclick = function () {
    var j;
    try { j = JSON.parse($('raw').value); } catch (e) { toast('Not valid JSON: ' + e.message, 'err'); return; }
    if (!j || typeof j !== 'object' || Array.isArray(j)) { toast('The config must be a JSON object.', 'err'); return; }
    var bad = Object.keys(j).filter(function (k) { return !/^\d+$/.test(k) || !j[k] || ['ignore', 'replace', 'launch', 'exec'].indexOf(j[k].action) < 0; });
    if (bad.length) { toast('Check entry ' + bad[0] + ': key must be a number and action ignore, replace, launch or exec.', 'err'); return; }
    S.cfg = j; renderAll(); toast('Loaded. Press Apply to TV to save it.');
  };
  $('raw-dl').onclick = function () {
    var a = document.createElement('a');
    a.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(sortKeys(S.cfg), null, 2));
    a.download = 'keybinds.json'; document.body.appendChild(a); a.click(); a.parentNode.removeChild(a);
  };
  $('raw-reset').onclick = function () { $('raw').value = JSON.stringify(sortKeys(S.cfg), null, 2); };
  $('a-reload').onclick = function () { load().then(function () { renderAdvanced(); toast('Reloaded from the TV.'); }); };
  $('a-forget').onclick = function () { S.meta.codes[S.meta.model] = {}; putJSON('/config/studio-layout.json', S.meta); renderAll(); toast('Learned codes cleared.'); };
  $('a-clear').onclick = function () { S.cfg = {}; renderAll(); renderAdvanced(); toast('All buttons set to default here. Press Apply to TV to save.'); };
  $('a-reboot').onclick = function () {
    openModal('<h3>Restart the TV?</h3><p>The TV reboots now. Unsaved changes here are lost.</p><div class="row"><button id="r-no">Cancel</button><button class="primary" id="r-yes">Restart</button></div>', function () {
      $('r-no').onclick = closeModal;
      $('r-yes').onclick = function () { api('/reboot', { method: 'POST' }).catch(function () {}); closeModal(); toast('Restarting the TV…'); };
    });
  };
}
function fillLog(id, nameId, file) {
  api('/logs/' + file).then(function (t) {
    var pre = $(id); if (!pre) return;
    $(nameId).textContent = '/tmp/' + file;
    if (/^ENOENT/.test(t)) t = '(no log: this hook target is not running on this TV)';
    else if (ADV.keysOnly && id === 'log1') t = t.split('\n').filter(function (l) { return parseKeyLine(l); }).map(function (l) { var k = parseKeyLine(l); return keyName(k.code) + ' (' + k.code + ') ' + (k.state === 1 ? 'pressed' : k.state === 0 ? 'released' : 'held'); }).join('\n');
    var atEnd = pre.scrollHeight - pre.clientHeight <= pre.scrollTop + 4;
    if (pre.textContent !== t) { pre.textContent = t.length > 60000 ? t.slice(-60000) : t; if (atEnd) pre.scrollTop = pre.scrollHeight; }
  }).catch(function () {});
}
function refreshLogs() {
  if (ADV.tab !== 'advanced') return;
  fillLog('log1', 'log1-name', 'lginput-hook-' + ADV.target + '.log');
  fillLog('log2', 'log2-name', 'ezinject-' + ADV.target + '.log');
}
function loadStatus() {
  return api('/status.json').then(function (t) { S.status = JSON.parse(t); }).catch(function () { S.status = null; });
}

$('tab-buttons').onclick = function () { showTab('buttons'); };
$('tab-advanced').onclick = function () { showTab('advanced'); };
$('btn-apply').onclick = apply;
$('btn-revert').onclick = function () { S.cfg = clone(S.orig); renderAll(); toast('Changes discarded.'); };
$('btn-more').onclick = moreMenu;
$('btn-model').onclick = pickModel;
$('modal').onclick = function (e) { if (e.target === $('modal')) closeModal(); };
window.addEventListener('beforeunload', function (e) { if (dirty()) { e.preventDefault(); e.returnValue = ''; } });

load().then(function () {
  loadStatus().then(function () { if (S.sel) renderPanel(); pcCard(); });
  checkHook(); pollLogs();
  setInterval(pollLogs, 700); setInterval(checkHook, 15000);
  var first = document.querySelector('.rk[tabindex="0"]'); if (first && isTV) first.focus();
});
})();
