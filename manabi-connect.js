/* まなびの基板 — 接続スクリプト

   各ゲームの <head> に、この3行をこの順で入れます。

   ・ManabiBox の games/○○/ に置いたゲーム（相対パス。リポジトリ名を変えても直さなくてよい）
     <script src="../../config.js"></script>
     <script src="../../hub-progress.js"></script>
     <script src="../../manabi-connect.js"></script>

   ・別リポジトリで公開しているゲーム（絶対URL。「ManabiBox」はハブのリポジトリ名）
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

  /* ハブの場所は、このファイル自身の置き場所から割り出します。
     こうしておくとリポジトリ名を変えてもURLを直す必要がありません。 */
  function hubFromScript() {
    var el = document.currentScript;
    if (!el) {
      var list = document.getElementsByTagName('script');
      for (var i = list.length - 1; i >= 0; i--) {
        if ((list[i].src || '').indexOf('manabi-connect.js') >= 0) { el = list[i]; break; }
      }
    }
    if (!el || !el.src) return '';
    return el.src.replace(/[^\/]*$/, '');
  }
  var HUB = cfg.hubUrl || hubFromScript() || 'https://backtree-create.github.io/ManabiBox/';

  function bare(u) { return String(u).split('#')[0].split('?')[0]; }
  function isHubPage() {
    var here = bare(global.location.href);
    return here === bare(HUB) || here === bare(HUB) + 'index.html';
  }

  function addBackButton() {
    if (cfg.backLink === false) return;
    if (document.getElementById('manabi-back')) return;
    /* ハブ自身には出さない */
    if (isHubPage()) return;

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

  /* ---- 3.5 ニックネームが無いうちは遊ばせない ---------------- */
  function hasNickname() {
    try {
      if (global.LearnHub && LearnHub.player) return !!LearnHub.player().nickname;
      var raw = global.localStorage.getItem('manabi-board:player:v1');
      return !!(raw && JSON.parse(raw).nickname);
    } catch (e) { return false; }
  }

  function gatePassed() {
    try {
      if (global.LearnHub && LearnHub.gateOK) return LearnHub.gateOK();
      return true;   /* 古い hub-progress.js のときは素通り */
    } catch (e) { return true; }
  }

  function addNameGate() {
    if (isHubPage()) return;   /* ハブ自身には出さない */
    var old = document.getElementById('manabi-gate');
    var needCode = !gatePassed();
    var needName = !hasNickname();
    if (!needCode && !needName) {
      if (old && old.parentNode) old.parentNode.removeChild(old);
      return;
    }
    if (old) return;

    var css = document.createElement('style');
    css.textContent =
      '#manabi-gate{position:fixed;inset:0;z-index:2147483600;display:flex;' +
      'align-items:center;justify-content:center;padding:24px;' +
      'background:rgba(6,9,17,.94);backdrop-filter:blur(4px);' +
      '-webkit-backdrop-filter:blur(4px);' +
      'font-family:"Zen Kaku Gothic New","Hiragino Sans","Meiryo",sans-serif;}' +
      '#manabi-gate .box{max-width:420px;width:100%;text-align:center;' +
      'background:#121a2c;border:1px solid rgba(190,205,235,.28);' +
      'border-radius:18px;padding:30px 26px;}' +
      '#manabi-gate h2{margin:0 0 12px;font-size:21px;font-weight:700;color:#fff;line-height:1.5;}' +
      '#manabi-gate p{margin:0 0 22px;font-size:14px;line-height:1.9;color:#AFC0D6;}' +
      '#manabi-gate a{display:inline-block;text-decoration:none;font-weight:700;font-size:15px;' +
      'color:#06121A;background:#4FD1C5;border-radius:999px;padding:13px 26px;}';
    document.head.appendChild(css);

    var title = needCode
      ? 'まなびの基板から<br>入ってください'
      : 'ニックネームを決めてから<br>あそんでください';
    var body = needCode
      ? 'クラスコードを入れると、<br>ここから遊べるようになります。'
      : 'まなびの基板でニックネームを登録すると、<br>ここから遊べるようになります。';

    var box = document.createElement('div');
    box.id = 'manabi-gate';
    box.innerHTML =
      '<div class="box"><h2>' + title + '</h2><p>' + body + '</p>' +
      '<a href="' + HUB + '">まなびの基板をひらく</a></div>';
    document.body.appendChild(box);

    /* ハブで済ませて戻ってきたら、自動で外す */
    var timer = setInterval(function () {
      if (!gatePassed() || !hasNickname()) return;
      clearInterval(timer);
      if (box.parentNode) box.parentNode.removeChild(box);
    }, 1500);

    log(needCode ? 'クラスコード未入力のためロックしました'
                 : 'ニックネーム未登録のためロックしました');
  }

  if (document.readyState === 'loading') {
    global.addEventListener('DOMContentLoaded', addNameGate);
  } else {
    addNameGate();
  }
  global.addEventListener('pageshow', addNameGate);

  /* ---- 4. localStorage を見張る（外部ライブラリで保存するゲーム用） ---- */
  var polls = [];
  function watchKey(key, fn) {
    polls.push({ key: key, fn: fn, last: null });
  }
  function pollOnce() {
    for (var i = 0; i < polls.length; i++) {
      var w = polls[i], raw = null;
      try { raw = global.localStorage.getItem(w.key); } catch (e) {}
      if (raw == null || raw === w.last) continue;
      w.last = raw;
      try { w.fn(raw); } catch (e) { log('見張り中のエラー', w.key, e); }
    }
  }
  global.addEventListener('load', function () {
    if (!polls.length) return;
    pollOnce();
    setInterval(pollOnce, 3000);
    log('localStorage の見張りを開始しました', polls.map(function (w) { return w.key; }));
  });

  /* ---- 5. リアル人生サバイバルのアダプター ------------------ */
  /* zustand が oshi-life-survival-save に状態をまるごと保存している。
     章(chapter 1〜3)の進みと、人生が終わったときの最終スコアを送る。
     best はハブの配点換算（出来ばえ 0〜1 → LearnHub.scale）:
       出来ばえ = min(1, 最終スコア / 3,000,000)。ゲームオーバーは 0.1。
       章クリアごとに最低 0.1 × クリア章数 を保証する。
     raw は最終スコア（素点）。 */
  var RM = { key: 'oshi-life-survival-save', app: 'money-survival', total: 3, cards: 10, sig: null };
  var RM_FULL_SCORE = 3000000;

  /* 古い hub-progress.js がキャッシュされている端末向けのフォールバック */
  function rmScale(r) {
    return (global.LearnHub && global.LearnHub.scale)
      ? global.LearnHub.scale(r)
      : Math.round(Math.max(0, Math.min(1, r)) * 10000);
  }

  /* ゲーム本体と同じ計算で最終スコアを出す
     (最終スコア = 推し活支出 × 知識ボーナス(最大×2)) */
  function rmScore(st) {
    var rec = st.records || {};
    var spend = Math.max(Number(rec.totalOshiSpending) || 0,
                         st.finalMissionPurchased ? 1500000 : 0);
    var use = Math.max(Number(rec.knowledgeUseCount) || 0,
                       Number(st.knowledgeUseCount) || 0);
    return Math.round(spend * Math.min(2, 1 + use * 0.1));
  }
  /* 最終ランク（ゲームオーバーはD） */
  function rmRank(st, score) {
    var rec = st.records || {};
    if (rec.gameOver || st.gameOver) return 'D';
    return score >= 3000000 ? 'SSS'
         : score >= 2500000 ? 'S'
         : score >= 1500000 ? 'A'
         : score >= 1000000 ? 'B' : 'C';
  }

  watchKey(RM.key, function (raw) {
    var st;
    try { st = (JSON.parse(raw) || {}).state; } catch (e) { return; }
    if (!st || !st.chapter) return;

    var rec = st.records || {};
    var got = (rec.acquiredKnowledge || []).length;
    /* 章の途中はまだクリアしていないので、結果画面に着いたぶんだけ数える */
    var done = st.screen === 'result' ? st.chapter : st.chapter - 1;
    if (done < 0) done = 0;
    if (done > RM.total) done = RM.total;

    /* 最終スコアは、人生が終わった(全章クリア or ゲームオーバー)ときだけ出来ばえにする */
    var over = !!(rec.gameOver || st.gameOver);
    var finished = !!(over || st.finalMissionResolved ||
                      (st.screen === 'result' && st.chapter >= RM.total));
    var score = rmScore(st);
    var rank = finished ? rmRank(st, score) : null;
    var ratio = 0;
    if (finished) ratio = over ? 0.1 : Math.min(1, score / RM_FULL_SCORE);
    ratio = Math.max(ratio, 0.1 * done);          /* 章クリアぶんの最低保証 */
    var best = rmScale(ratio);

    var sig = done + '/' + best + '/' + score;
    if (sig === RM.sig) return;
    RM.sig = sig;

    var note = '第' + st.chapter + '章';
    if (rank) {
      note = '最終ランク' + rank + ' 素点' + score;
    } else if (st.screen === 'result') {
      note = '第' + st.chapter + '章 終了';
    }
    global.manabiReport({
      app: RM.app, done: done, total: RM.total, best: best, raw: score,
      note: note + '・知識 ' + got + '/' + RM.cards
    });
  });

  /* ---- 6. 日本一周クエストのアダプター ---------------------- */
  /* 表：5エリア＋東京　裏：5エリア＋東京　= ぜんぶで12 */
  var JQ = { key: 'nihon_quest_save', app: 'japan-quest', total: 12, sig: null };
  /* 表6エリアは重み1.0、裏6エリア(d_)は重み1.2。未クリアは0 */
  var JQ_AREAS = ['hokkaido', 'higashi', 'nishi', 'kyushu', 'shikoku', 'tokyo'];

  /* 古い hub-progress.js がキャッシュされている端末のためのフォールバック */
  function hubScale(r, o) {
    return (global.LearnHub && LearnHub.scale) ? LearnHub.scale(r, o)
      : Math.round(Math.max(0, Math.min(1, r)) * 10000);
  }

  function jqSend(raw) {
    var s;
    try { s = JSON.parse(raw); } catch (e) { return; }
    if (!s || !s.cleared) return;

    var omote = (s.cleared || []).length, ura = (s.dark || []).length;
    var done = omote + (s.tokyo ? 1 : 0) + ura + (s.darkTokyo ? 1 : 0);

    /* 出来ばえ = Σ(エリアごとの最高正答率/100 × 重み) / Σ重み
       素点 raw = 最高正答率の合計（最大 1200） */
    var bestMap = s.best || {}, sum = 0, wsum = 0, rawPt = 0;
    for (var i = 0; i < JQ_AREAS.length; i++) {
      var o = Math.max(0, Math.min(100, Number(bestMap[JQ_AREAS[i]]) || 0));
      var u = Math.max(0, Math.min(100, Number(bestMap['d_' + JQ_AREAS[i]]) || 0));
      sum += o / 100 * 1.0 + u / 100 * 1.2;
      wsum += 1.0 + 1.2;
      rawPt += o + u;
    }
    var best = hubScale(wsum ? sum / wsum : 0);
    rawPt = Math.round(rawPt);

    var sig = done + '/' + best + '/' + rawPt;
    if (sig === JQ.sig) return;          /* 変わっていなければ送らない */
    JQ.sig = sig;

    global.manabiReport({
      app: JQ.app, done: done, total: JQ.total, best: best, raw: rawPt,
      note: '素点 ' + rawPt + '・御朱印 ' + omote + '/5' + (ura ? '・裏 ' + ura + '/5' : '')
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
