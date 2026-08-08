/* まなびの基板 — 共通進捗ストア

   各アプリのクリア時・ゲームオーバー時に1行呼ぶだけです。

     LearnHub.report({ app:'english-go', done:3, total:4, best:82, note:'S3クリア' });

   端末に保存したうえで、スプレッドシートへ送信します。
   通信できなかったぶんは端末に貯めておき、次に開いたときにまとめて送ります。

   読み込み順:  <script src="config.js"></script>
                <script src="hub-progress.js"></script>
*/
(function (global) {
  'use strict';

  var KEY_PROGRESS = 'manabi-board:progress:v1';
  var KEY_PLAYER   = 'manabi-board:player:v1';
  var KEY_QUEUE    = 'manabi-board:queue:v1';
  var cfg = global.MANABI_CONFIG || {};

  /* ---- localStorage ---------------------------------------- */

  function read(key, fallback) {
    try { return JSON.parse(global.localStorage.getItem(key)) || fallback; }
    catch (e) { return fallback; }
  }
  function write(key, value) {
    try { global.localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { return false; }
  }
  function num(v, d) { var n = Number(v); return isFinite(n) ? n : d; }

  /* ---- 生徒 ------------------------------------------------- */

  function newId() {
    return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function player() {
    var p = read(KEY_PLAYER, null);
    if (!p || !p.id) {
      p = { id: newId(), nickname: '' };
      write(KEY_PLAYER, p);
    }
    return p;
  }

  function setNickname(name) {
    var clean = String(name || '').replace(/[\u0000-\u001F<>]/g, '').trim().slice(0, 10);
    var p = player();
    p.nickname = clean;
    write(KEY_PLAYER, p);
    return p;
  }

  /* ---- 送信キュー ------------------------------------------- */

  function enqueue(item) {
    var q = read(KEY_QUEUE, []);
    q.push(item);
    if (q.length > 200) q = q.slice(-200);
    write(KEY_QUEUE, q);
  }

  var sending = false;

  function flush() {
    if (sending || !cfg.endpoint) return Promise.resolve(0);
    var q = read(KEY_QUEUE, []);
    if (!q.length) return Promise.resolve(0);

    sending = true;
    var batch = q.slice(0, 30);

    return fetch(cfg.endpoint, {
      method: 'POST',
      /* text/plain にすると事前確認の通信が起きず、そのまま通ります */
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ token: cfg.token, items: batch }),
      redirect: 'follow'
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data || !data.ok) throw new Error(data && data.error || 'send-failed');
        write(KEY_QUEUE, read(KEY_QUEUE, []).slice(batch.length));
        sending = false;
        if (read(KEY_QUEUE, []).length) return flush();
        return batch.length;
      })
      .catch(function () { sending = false; return 0; });
  }

  /* ---- ランキング ------------------------------------------- */

  function ranking(app, limit) {
    if (!cfg.endpoint) return Promise.resolve({ ok: false, error: 'offline', list: [] });
    var url = cfg.endpoint
      + '?mode=ranking&app=' + encodeURIComponent(app || 'total')
      + '&limit=' + (limit || cfg.rankLimit || 20);
    return fetch(url, { redirect: 'follow' })
      .then(function (res) { return res.json(); })
      .catch(function () { return { ok: false, error: 'offline', list: [] }; });
  }

  /* ---- 本体 ------------------------------------------------- */

  var LearnHub = {
    player: player,
    setNickname: setNickname,
    flush: flush,
    ranking: ranking,
    queued: function () { return read(KEY_QUEUE, []).length; },
    online: function () { return !!cfg.endpoint; },

    all: function () { return read(KEY_PROGRESS, {}); },
    get: function (app) { return read(KEY_PROGRESS, {})[app] || null; },

    report: function (result) {
      if (!result || !result.app) return null;

      var data = read(KEY_PROGRESS, {});
      var prev = data[result.app] || { done: 0, total: 0, best: 0, plays: 0 };
      var entry = {
        done:  Math.max(num(prev.done, 0), num(result.done, 0)),
        total: num(result.total, num(prev.total, 0)),
        best:  Math.max(num(prev.best, 0), num(result.best, 0)),
        plays: num(prev.plays, 0) + 1,
        note:  result.note != null ? String(result.note).slice(0, 40) : (prev.note || ''),
        updated: Date.now()
      };
      if (entry.total > 0) entry.done = Math.min(entry.done, entry.total);
      data[result.app] = entry;
      write(KEY_PROGRESS, data);

      var me = player();
      enqueue({
        playerId: me.id,
        nickname: me.nickname || 'ななし',
        app: result.app,
        done: num(result.done, entry.done),
        total: entry.total,
        best: num(result.best, 0),
        note: entry.note,
        at: Date.now()
      });
      flush();

      return entry;
    },

    reset: function (app) {
      if (!app) return write(KEY_PROGRESS, {});
      var data = read(KEY_PROGRESS, {});
      delete data[app];
      return write(KEY_PROGRESS, data);
    }
  };

  global.LearnHub = LearnHub;

  /* 開いたとき・回線が戻ったときに未送信ぶんを送る */
  global.addEventListener('load', function () { flush(); });
  global.addEventListener('online', function () { flush(); });
})(window);
