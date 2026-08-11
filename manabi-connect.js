/* まなびの基板 — 接続スクリプト

   各ゲームの <head> に、この3行をこの順で入れます。
   （URL の「ManabiBox」の部分は、ハブを置いたリポジトリ名に直してください）

     <script src="https://backtree-create.github.io/ManabiBox/config.js"></script>
     <script src="https://backtree-create.github.io/ManabiBox/hub-progress.js"></script>
     <script src="https://backtree-create.github.io/ManabiBox/manabi-connect.js"></script>

   このファイルがやること
     1. window.storage が無い環境で、同じ使い勝手の入れ物を用意する
        （Claudeのプレビュー用に書かれたゲームが、GitHub Pages でも記録を残せるようになります）
     2. 日本一周クエストの記録を見張って、進んだときだけハブへ送る
     3. どのゲームからでも使える manabiReport() を用意する

   うまく動かないときは、URLのうしろに ?manabidebug=1 を付けて開くと、
   ブラウザのコンソールに何が起きているか出ます。
*/
(function (global) {
  'use strict';

  var DEBUG = /[?&]manabidebug=1/.test(global.location.search);
  function log() {
    if (!DEBUG || !global.console) return;
    console.log.apply(console, ['[まなびの基板]'].concat([].slice.call(arguments)));
  }

  var PREFIX = 'manabi-storage:';
  var watchers = [];

  /* ---- 1. window.storage の代わり --------------------------- */
  if (!global.storage) {
    global.storage = {
      get: function (key) {
        try {
          var v = global.localStorage.getItem(PREFIX + key);
          return Promise.resolve(v == null ? null : { key: key, value: v, shared: false });
        } catch (e) { return Promise.resolve(null); }
      },
      set: function (key, value) {
        var s = String(value);
        try { global.localStorage.setItem(PREFIX + key, s); } catch (e) {}
        watchers.forEach(function (fn) { try { fn(key, s); } catch (e) {} });
        return Promise.resolve({ key: key, value: s, shared: false });
      },
      delete: function (key) {
        try { global.localStorage.removeItem(PREFIX + key); } catch (e) {}
        return Promise.resolve({ key: key, deleted: true, shared: false });
      },
      list: function (prefix) {
        var keys = [];
        try {
          for (var i = 0; i < global.localStorage.length; i++) {
            var k = global.localStorage.key(i);
            if (k && k.indexOf(PREFIX) === 0) {
              var name = k.slice(PREFIX.length);
              if (!prefix || name.indexOf(prefix) === 0) keys.push(name);
            }
          }
        } catch (e) {}
        return Promise.resolve({ keys: keys, prefix: prefix, shared: false });
      }
    };
    log('window.storage を用意しました（記録は端末に残ります）');
  } else {
    log('window.storage はすでにあります');
  }

  /* ---- 2. ハブへ送る ---------------------------------------- */
  global.manabiReport = function (result) {
    if (!global.LearnHub || !global.LearnHub.report) {
      log('LearnHub が読みこめていません。script の順番とURLを確かめてください', result);
      return null;
    }
    log('送信', result);
    return global.LearnHub.report(result);
  };

  if (!global.LearnHub) {
    log('注意：hub-progress.js が先に読みこまれていません');
  } else if (!global.LearnHub.online()) {
    log('注意：config.js の endpoint が空です。記録は端末の中だけに残ります');
  }

  /* ---- 3. ハブへもどるボタン -------------------------------- */
  var cfg = global.MANABI_CONFIG || {};
  var HUB = cfg.hubUrl || 'https://backtree-create.github.io/ManabiBox/';

  function addBackButton() {
    if (cfg.backLink === false) return;
    if (document.getElementById('manabi-back')) return;
    /* ハブ自身には出さない */
    if (global.location.href.indexOf(HUB) === 0) return;

    var css = document.createElement('style');
    css.textContent =
      '#manabi-back{position:fixed;z-index:2147483000;' +
      'top:calc(8px + env(safe-area-inset-top));left:calc(8px + env(safe-area-inset-left));' +
      'display:flex;align-items:center;gap:6px;' +
      'font-family:"Zen Kaku Gothic New","Hiragino Sans",sans-serif;' +
      'font-size:12px;font-weight:700;line-height:1;text-decoration:none;' +
      'color:#EDF1FB;background:rgba(11,15,26,.82);' +
      'border:1px solid rgba(190,205,235,.45);border-radius:999px;' +
      'padding:7px 13px 7px 10px;backdrop-filter:blur(6px);' +
      '-webkit-backdrop-filter:blur(6px);opacity:.55;transition:opacity .2s;}' +
      '#manabi-back:hover,#manabi-back:focus-visible{opacity:1;}' +
      '#manabi-back svg{width:13px;height:13px;flex:none;}';
    document.head.appendChild(css);

    var a = document.createElement('a');
    a.id = 'manabi-back';
    a.href = HUB;
    a.setAttribute('aria-label', 'まなびの基板にもどる');
    a.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M19 12H6M11.5 5.5 5 12l6.5 6.5"/></svg>まなびの基板';
    document.body.appendChild(a);
    log('もどるボタンを置きました →', HUB);
  }

  if (document.readyState === 'loading') {
    global.addEventListener('DOMContentLoaded', addBackButton);
  } else {
    addBackButton();
  }

  /* ---- 4. 日本一周クエストのアダプター ---------------------- */
  /* 表：5エリア＋東京　裏：5エリア＋東京　= ぜんぶで12 */
  var JQ = { key: 'nihon_quest_save', app: 'japan-quest', total: 12, sig: null };

  function jqSend(raw) {
    var s;
    try { s = JSON.parse(raw); } catch (e) { return; }
    if (!s || !s.cleared) return;

    var omote = (s.cleared || []).length, ura = (s.dark || []).length;
    var done = omote + (s.tokyo ? 1 : 0) + ura + (s.darkTokyo ? 1 : 0);

    var vals = [];
    for (var k in (s.best || {})) vals.push(Number(s.best[k]) || 0);
    var best = vals.length
      ? Math.round(vals.reduce(function (a, b) { return a + b; }, 0) / vals.length) : 0;

    var sig = done + '/' + best;
    if (sig === JQ.sig) return;          /* 変わっていなければ送らない */
    JQ.sig = sig;

    global.manabiReport({
      app: JQ.app, done: done, total: JQ.total, best: best,
      note: '御朱印 ' + omote + '/5' + (ura ? '・裏 ' + ura + '/5' : '')
    });
  }

  watchers.push(function (key, value) {
    if (key === JQ.key) jqSend(value);
  });

  /* すでに端末に残っている記録を、開いたときに一度だけ送る */
  global.addEventListener('load', function () {
    setTimeout(function () {
      try {
        var raw = global.localStorage.getItem(PREFIX + JQ.key);
        if (raw) jqSend(raw);
      } catch (e) {}
    }, 1200);
  });

  log('接続スクリプトを読みこみました');
})(window);
