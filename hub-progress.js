/* まなびの基板 — 共通ライブラリ

   ゲーム側でやることは1行だけです。

     LearnHub.report({ app:'english-go', done:3, total:4, best:820, note:'S3クリア' });

   端末に保存し、スプレッドシートへ送ります。
   通信できなかったぶんは貯めておき、次に開いたときにまとめて送ります。

   読み込み順:  <script src="config.js"></script>
                <script src="hub-progress.js"></script>
*/
(function (global) {
  'use strict';

  var KEY_PROGRESS = 'manabi-board:progress:v1';
  var KEY_PLAYER   = 'manabi-board:player:v1';
  var KEY_QUEUE    = 'manabi-board:queue:v1';
  var KEY_APPS     = 'manabi-board:apps:v1';
  var cfg = global.MANABI_CONFIG || {};

  function read(key, fallback) {
    try { return JSON.parse(global.localStorage.getItem(key)) || fallback; }
    catch (e) { return fallback; }
  }
  function write(key, value) {
    try { global.localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { return false; }
  }
  function num(v, d) { var n = Number(v); return isFinite(n) ? n : d; }

  function getJSON(url) {
    return fetch(url, { redirect: 'follow' }).then(function (r) { return r.json(); });
  }
  function postJSON(payload) {
    return fetch(cfg.endpoint, {
      method: 'POST',
      /* text/plain にすると事前確認の通信が起きず、そのまま通ります */
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow'
    }).then(function (r) { return r.json(); });
  }

  /* ---- 生徒 ------------------------------------------------ */

  function player() {
    var p = read(KEY_PLAYER, null);
    if (!p || !p.id) {
      p = { id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8), nickname: '' };
      write(KEY_PLAYER, p);
    }
    return p;
  }

  function setNickname(name) {
    var p = player();
    p.nickname = String(name || '').replace(/[\u0000-\u001F<>]/g, '').trim().slice(0, 10);
    write(KEY_PLAYER, p);
    return p;
  }

  /* ---- 送信キュー ------------------------------------------ */

  var sending = false;

  function flush() {
    if (sending || !cfg.endpoint) return Promise.resolve(0);
    var q = read(KEY_QUEUE, []);
    if (!q.length) return Promise.resolve(0);

    sending = true;
    var batch = q.slice(0, 30);

    return postJSON({ token: cfg.token, items: batch })
      .then(function (data) {
        if (!data || !data.ok) throw new Error('send-failed');
        write(KEY_QUEUE, read(KEY_QUEUE, []).slice(batch.length));
        sending = false;
        if (read(KEY_QUEUE, []).length) return flush();
        return batch.length;
      })
      .catch(function () { sending = false; return 0; });
  }

  /* ---- ゲーム一覧 ------------------------------------------ */

  function normalize(list) {
    return (list || []).filter(function (a) { return a && a.key && a.name; }).map(function (a) {
      return {
        key: String(a.key), name: String(a.name),
        subject: a.subject || '', file: a.file || '',
        desc: a.desc || '', unit: a.unit || 'ステージ',
        total: num(a.total, 1) || 1,
        color: a.color || '#8B7CFF', icon: a.icon || 'star'
      };
    });
  }

  /* すぐ描くための控え。まだ無ければ null */
  function appsCached() {
    var c = read(KEY_APPS, null);
    return c && c.length ? normalize(c) : null;
  }

  /* スプレッドシート → apps.json → 控え、の順に探します */
  function apps() {
    var first = cfg.endpoint
      ? getJSON(cfg.endpoint + '?mode=apps').then(function (d) {
          if (d && d.ok && d.list && d.list.length) return d.list;
          throw new Error('empty');
        })
      : Promise.reject(new Error('no-endpoint'));

    return first
      .catch(function () { return getJSON('apps.json'); })
      .then(function (list) {
        var out = normalize(list);
        if (!out.length) throw new Error('empty');
        write(KEY_APPS, out);
        return out;
      })
      .catch(function () { return appsCached(); });
  }

  /* 先生用。合言葉が要ります */
  function saveApps(list, adminToken) {
    if (!cfg.endpoint) return Promise.resolve({ ok: false, error: 'no-endpoint' });
    return postJSON({ action: 'saveApps', token: adminToken, apps: normalize(list) })
      .catch(function () { return { ok: false, error: 'offline' }; });
  }

  /* ---- ランキング ------------------------------------------ */

  function ranking(app, limit) {
    if (!cfg.endpoint) return Promise.resolve({ ok: false, error: 'offline', list: [] });
    return getJSON(cfg.endpoint + '?mode=ranking&app=' + encodeURIComponent(app || 'total')
      + '&limit=' + (limit || cfg.rankLimit || 20))
      .catch(function () { return { ok: false, error: 'offline', list: [] }; });
  }

  /* ---- 本体 ------------------------------------------------ */

  global.LearnHub = {
    player: player,
    setNickname: setNickname,
    flush: flush,
    ranking: ranking,
    apps: apps,
    appsCached: appsCached,
    saveApps: saveApps,
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
      var q = read(KEY_QUEUE, []);
      q.push({
        playerId: me.id, nickname: me.nickname || 'ななし', app: result.app,
        done: num(result.done, entry.done), total: entry.total,
        best: num(result.best, 0), note: entry.note, at: Date.now()
      });
      write(KEY_QUEUE, q.slice(-200));
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

  global.addEventListener('load', flush);
  global.addEventListener('online', flush);
})(window);
