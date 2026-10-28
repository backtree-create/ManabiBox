/* まなびの基板 — 共通ライブラリ

   ゲーム側でやることは1行だけです。

     LearnHub.report({ app:'english-go', done:3, total:4, best:820, note:'S3クリア' });

   best は LearnHub.scale(出来ばえ0〜1, { diff:'hard' }) で換算した値を入れます
   （満点は学年と難易度で変わる: 中1 10,000 / 中2 12,000 / 中3 15,000、難易度 ×1.0/×1.2/×1.5）。
   エンドレス系は endless: LearnHub.scaleEndless(到達度0〜1) を足すと到達度ランキングに出ます。
   grade を省略すると、ハブで選んだ学年（LearnHub.grade()）が付きます。
   raw には素点（ゲーム内スコア）をそのまま入れられます。

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
  var KEY_GRADE    = 'manabi-board:grade:v1';
  var cfg = global.MANABI_CONFIG || {};

  /* ---- 学年と満点 ------------------------------------------
     学年は 1/2/3（中1〜中3）。未設定は 3（全範囲）。
     ハブへ送る best は「満点 10,000 × 学年係数 × 難易度係数」で換算する。
     エンドレス系（乱世流し・無限回廊など）は別枠 ENDLESS_MAX を上限に
     report({ endless: 値 }) で送り、到達度ランキングに出る。 */
  var GRADE_MULT   = { 1: 1.0, 2: 1.2, 3: 1.5 };
  var DIFF_MULT    = { normal: 1.0, hard: 1.2, expert: 1.5 };
  var BASE_MAX     = 10000;
  var ENDLESS_MAX  = 30000;

  function grade() {
    var g = Number(global.localStorage ? global.localStorage.getItem(KEY_GRADE) : 0);
    return (g === 1 || g === 2 || g === 3) ? g : 3;
  }
  function setGrade(g) {
    g = Number(g);
    if (g !== 1 && g !== 2 && g !== 3) return grade();
    try { global.localStorage.setItem(KEY_GRADE, String(g)); } catch (e) {}
    return g;
  }
  function gradeLabel(g) { return '中' + (g || grade()); }

  /* その学年・難易度での満点 */
  function maxFor(g, diff) {
    var gm = GRADE_MULT[Number(g) || grade()] || 1;
    var dm = diff == null ? 1 : (typeof diff === 'number' ? diff : (DIFF_MULT[String(diff)] || 1));
    return Math.round(BASE_MAX * gm * dm);
  }
  /* 0〜1 の出来ばえを、その学年・難易度の満点に換算する */
  function scale(ratio, opt) {
    opt = opt || {};
    var r = Math.max(0, Math.min(1, Number(ratio) || 0));
    return Math.round(r * maxFor(opt.grade, opt.diff));
  }
  /* エンドレス系の到達度（0〜1）を別枠の満点に換算する */
  function scaleEndless(ratio) {
    var r = Math.max(0, Math.min(1, Number(ratio) || 0));
    return Math.round(r * ENDLESS_MAX);
  }

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

  /* 別リポジトリで公開していたころの URL → ManabiBox 内の置き場所。
     スプレッドシートや控えに古い URL が残っていても、新しい場所へ案内します。
     （manage.html で一覧を保存し直せば、この表は使われなくなります） */
  var MOVED = {
    'Resque_Japn':          'games/japan-quest/',
    'Science_Quest':        'games/science-quest/',
    'elementgame':          'games/elementgame/',
    'RealMoneySurvival.Web':'games/money-survival/',
    'English_de_GO':        'games/english-go/',
    'Idiom_Labyrinth':      'games/idiom-dungeon/',
    'stone-quest':          'games/stone-quest/',
    'fitness_dungeon':      'games/fitness-dungeon/'
  };
  function hubBase() {
    try {
      var list = document.getElementsByTagName('script');
      for (var i = list.length - 1; i >= 0; i--) {
        if ((list[i].src || '').indexOf('hub-progress.js') >= 0) return list[i].src.replace(/[^\/]*$/, '');
      }
    } catch (e) {}
    return '';
  }
  function migrateFile(file) {
    var m = /^https?:\/\/backtree-create\.github\.io\/([^\/?#]+)\/?(?:index\.html)?(?:[?#].*)?$/.exec(String(file || ''));
    if (!m || !MOVED[m[1]]) return file;
    return (hubBase() || 'https://backtree-create.github.io/ManabiBox/') + MOVED[m[1]];
  }

  function normalize(list) {
    return (list || []).filter(function (a) { return a && a.key && a.name; }).map(function (a) {
      return {
        key: String(a.key), name: String(a.name),
        subject: a.subject || '', file: migrateFile(a.file || ''),
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

  function ranking(app, limit, kind) {
    if (!cfg.endpoint) return Promise.resolve({ ok: false, error: 'offline', list: [] });
    return getJSON(cfg.endpoint + '?mode=ranking&app=' + encodeURIComponent(app || 'total')
      + '&limit=' + (limit || cfg.rankLimit || 20)
      + (kind === 'endless' ? '&kind=endless' : ''))
      .catch(function () { return { ok: false, error: 'offline', list: [] }; });
  }

  /* ---- クラスコード ----------------------------------------- */

  var KEY_GATE = 'manabi-board:gate:v1';
  var GATE_DAYS = 90;      /* これだけの日数はもう一度きかない */
  var RECHECK_DAYS = 7;    /* ときどき裏で確かめ直す */

  function gateState() { return read(KEY_GATE, null) || {}; }

  function gateOK() {
    var g = gateState();
    if (!g.ok || !g.at) return false;
    return (Date.now() - g.at) < GATE_DAYS * 86400000;
  }

  function gateSave(code) {
    write(KEY_GATE, { ok: true, at: Date.now(), code: String(code || '') });
  }

  function gateClear() { write(KEY_GATE, { ok: false, at: 0, code: '' }); }

  /* 合言葉が合っているかサーバーに聞く */
  function checkCode(code) {
    var c = String(code || '').trim();
    if (!c) return Promise.resolve({ ok: false, error: 'empty' });
    if (!cfg.endpoint) return Promise.resolve({ ok: false, error: 'offline' });
    return getJSON(cfg.endpoint + '?mode=gate&code=' + encodeURIComponent(c))
      .then(function (d) {
        if (d && d.ok) gateSave(c);
        return d || { ok: false, error: 'bad' };
      })
      .catch(function () { return { ok: false, error: 'offline' }; });
  }

  /* 前に通した合言葉がまだ有効か、裏でそっと確かめる。
     通信できないときは何もしません（オフラインでも遊べるように） */
  function gateRecheck() {
    var g = gateState();
    if (!g.ok || !g.code || !cfg.endpoint) return;
    if (Date.now() - (g.at || 0) < RECHECK_DAYS * 86400000) return;
    getJSON(cfg.endpoint + '?mode=gate&code=' + encodeURIComponent(g.code))
      .then(function (d) {
        if (d && d.ok) gateSave(g.code);
        else gateClear();
      })
      .catch(function () {});
  }

  /* ---- 本体 ------------------------------------------------ */

  global.LearnHub = {
    gateOK: gateOK,
    checkCode: checkCode,
    gateRecheck: gateRecheck,
    gateClear: gateClear,
    player: player,
    setNickname: setNickname,
    flush: flush,
    ranking: ranking,
    grade: grade,
    setGrade: setGrade,
    gradeLabel: gradeLabel,
    maxFor: maxFor,
    scale: scale,
    scaleEndless: scaleEndless,
    BASE_MAX: BASE_MAX,
    ENDLESS_MAX: ENDLESS_MAX,
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
      var prev = data[result.app] || { done: 0, total: 0, best: 0, plays: 0, endless: 0 };
      var g = Number(result.grade);
      if (g !== 1 && g !== 2 && g !== 3) g = grade();
      var best = Math.min(num(result.best, 0), maxFor(3, 'expert'));
      var endless = Math.min(num(result.endless, 0), ENDLESS_MAX);
      var entry = {
        done:  Math.max(num(prev.done, 0), num(result.done, 0)),
        total: num(result.total, num(prev.total, 0)),
        best:  Math.max(num(prev.best, 0), best),
        endless: Math.max(num(prev.endless, 0), endless),
        grade: best >= num(prev.best, 0) ? g : (prev.grade || g),
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
        best: best, note: entry.note, at: Date.now(),
        grade: g, endless: endless, raw: num(result.raw, 0)
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
