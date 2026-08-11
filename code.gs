/** ===========================================================
 *  まなびの基板 — データ集約サーバー（Google Apps Script）
 *
 *  スプレッドシートを開く → 拡張機能 → Apps Script にこの中身を貼り、
 *  下の2つの合言葉を書きかえてからデプロイします。
 *  手順は セットアップ.md にあります。
 *
 *  つくられるシート
 *    records … 送られてきた記録をぜんぶ残す台帳
 *    best    … 生徒 × ゲーム の最高記録（ランキングはここから作ります）
 *    apps    … ハブに並べるゲームの一覧（manage.html から書きかえます）
 *  =========================================================== */

/* 生徒アプリが記録を送るときの合言葉。config.js と同じ文字列にします */
var WRITE_TOKEN = 'manabi-write-2026';

/* 先生用。ダッシュボードとゲーム追加に使います。生徒に配るファイルには書かないこと */
var ADMIN_TOKEN = 'manabi-admin-2026';

/* 1ゲームあたりの満点。総合ポイントの上限は 満点 × ゲーム数 */
var MAX_SCORE = 100;

/* ---------------------------------------------------------- */

function sheet_(name, header) {
  var book = SpreadsheetApp.getActiveSpreadsheet();
  var sh = book.getSheetByName(name);
  if (!sh) {
    sh = book.insertSheet(name);
    sh.appendRow(header);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, header.length).setFontWeight('bold');
  }
  return sh;
}

function records_() {
  return sheet_('records', ['日時', '生徒ID', 'ニックネーム', 'ゲーム', '到達', '全体', 'スコア', 'メモ']);
}
function best_() {
  return sheet_('best', ['生徒ID', 'ニックネーム', 'ゲーム', '最高スコア', '到達', '全体', '回数', '最終プレイ']);
}
function apps_() {
  return sheet_('apps', ['順番', 'キー', '名前', '教科', 'ファイル', 'せつめい', '単位', '全体数', '色', 'アイコン']);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
function clean_(v, max) {
  return String(v == null ? '' : v).replace(/[\u0000-\u001F<>]/g, '').trim().slice(0, max || 40);
}
function int_(v, min, max) {
  var n = Math.round(Number(v));
  if (!isFinite(n)) n = 0;
  return Math.max(min, Math.min(max, n));
}

/* ===== 受け取り ============================================= */

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);

    if (body.action === 'saveApps') {
      if (body.token !== ADMIN_TOKEN) return json_({ ok: false, error: 'bad-token' });
      return json_(saveApps_(body.apps || []));
    }

    if (body.token !== WRITE_TOKEN) return json_({ ok: false, error: 'bad-token' });

    var items = body.items || [];
    if (!items.length) return json_({ ok: true, saved: 0 });

    var lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      var saved = 0;
      for (var i = 0; i < items.length && i < 50; i++) saved += save_(items[i]) ? 1 : 0;
      clearCache_();
      return json_({ ok: true, saved: saved });
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function save_(item) {
  var playerId = clean_(item.playerId, 40);
  var app = clean_(item.app, 30);
  if (!playerId || !app) return false;

  var nickname = clean_(item.nickname, 12) || 'ななし';
  var total = int_(item.total, 0, 999);
  var done  = int_(item.done, 0, total || 999);
  var score = int_(item.best, 0, MAX_SCORE);
  var note  = clean_(item.note, 40);
  var when  = item.at ? new Date(Number(item.at)) : new Date();

  records_().appendRow([when, playerId, nickname, app, done, total, score, note]);

  var sh = best_();
  var rows = sh.getDataRange().getValues();
  for (var r = 1; r < rows.length; r++) {
    if (rows[r][0] === playerId && rows[r][2] === app) {
      sh.getRange(r + 1, 1, 1, 8).setValues([[
        playerId, nickname, app,
        Math.max(Number(rows[r][3]) || 0, score),
        Math.max(Number(rows[r][4]) || 0, done),
        total || rows[r][5],
        (Number(rows[r][6]) || 0) + 1,
        when
      ]]);
      return true;
    }
  }
  sh.appendRow([playerId, nickname, app, score, done, total, 1, when]);
  return true;
}

/* ===== ゲーム一覧 =========================================== */

function listApps_() {
  var cache = CacheService.getScriptCache();
  var hit = cache.get('apps');
  if (hit) return JSON.parse(hit);

  var rows = apps_().getDataRange().getValues().slice(1);
  var list = rows.filter(function (r) { return r[1] && r[2]; })
    .sort(function (a, b) { return (Number(a[0]) || 0) - (Number(b[0]) || 0); })
    .map(function (r) {
      return {
        key: String(r[1]), name: String(r[2]), subject: String(r[3] || ''),
        file: String(r[4] || ''), desc: String(r[5] || ''), unit: String(r[6] || 'ステージ'),
        total: Number(r[7]) || 1, color: String(r[8] || '#8B7CFF'), icon: String(r[9] || 'star')
      };
    });

  var out = { ok: true, list: list, at: Date.now() };
  cache.put('apps', JSON.stringify(out), 60);
  return out;
}

function saveApps_(apps) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = apps_();
    var last = sh.getLastRow();
    if (last > 1) sh.getRange(2, 1, last - 1, 10).clearContent();

    var rows = apps.slice(0, 60).filter(function (a) { return a && a.key && a.name; })
      .map(function (a, i) {
        return [
          i + 1, clean_(a.key, 30), clean_(a.name, 40), clean_(a.subject, 12),
          clean_(a.file, 80), clean_(a.desc, 120), clean_(a.unit, 10),
          int_(a.total, 1, 999), clean_(a.color, 9), clean_(a.icon, 20)
        ];
      });

    if (rows.length) sh.getRange(2, 1, rows.length, 10).setValues(rows);
    CacheService.getScriptCache().remove('apps');
    return { ok: true, saved: rows.length };
  } finally {
    lock.releaseLock();
  }
}

/* ===== 読み出し ============================================= */

function doGet(e) {
  var p = e.parameter || {};
  try {
    if (p.mode === 'ping') return json_({ ok: true, message: 'つながっています' });
    if (p.mode === 'apps') return json_(listApps_());
    if (p.mode === 'ranking') return json_(ranking_(p.app || 'total', int_(p.limit || 20, 1, 100)));
    if (p.mode === 'dashboard') {
      if (p.token !== ADMIN_TOKEN) return json_({ ok: false, error: 'bad-token' });
      return json_(dashboard_());
    }
    return json_({ ok: false, error: 'unknown-mode' });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function clearCache_() {
  var cache = CacheService.getScriptCache();
  var keys = ['rank:total:20'];
  listApps_().list.forEach(function (a) { keys.push('rank:' + a.key + ':20'); });
  cache.removeAll(keys);
}

function ranking_(app, limit) {
  var cache = CacheService.getScriptCache();
  var key = 'rank:' + app + ':' + limit;
  var hit = cache.get(key);
  if (hit) return JSON.parse(hit);

  var rows = best_().getDataRange().getValues().slice(1);
  var bucket = {};

  rows.forEach(function (r) {
    var id = r[0], nick = r[1], a = r[2], score = Number(r[3]) || 0;
    if (!id) return;
    if (app !== 'total' && a !== app) return;
    if (!bucket[id]) bucket[id] = { nickname: nick, score: 0 };
    bucket[id].nickname = nick;
    bucket[id].score += score;
  });

  var list = Object.keys(bucket).map(function (id) {
    return { id: id, nickname: bucket[id].nickname, score: bucket[id].score };
  }).sort(function (a, b) { return b.score - a.score; }).slice(0, limit);

  var rank = 0, prev = null;
  list.forEach(function (row, i) {
    if (row.score !== prev) { rank = i + 1; prev = row.score; }
    row.rank = rank;
  });

  var out = { ok: true, app: app, list: list, at: Date.now() };
  cache.put(key, JSON.stringify(out), 60);
  return out;
}

function dashboard_() {
  var best = best_().getDataRange().getValues().slice(1);
  var recs = records_().getDataRange().getValues().slice(1);
  var names = {};
  listApps_().list.forEach(function (a) { names[a.key] = a.name; });

  var apps = {}, students = {};

  best.forEach(function (r) {
    var id = r[0], nick = r[1], app = r[2];
    if (!id || !app) return;
    var score = Number(r[3]) || 0, done = Number(r[4]) || 0,
        total = Number(r[5]) || 0, plays = Number(r[6]) || 0;

    if (!apps[app]) apps[app] = { players: 0, sum: 0, cleared: 0, plays: 0 };
    apps[app].players++; apps[app].sum += score; apps[app].plays += plays;
    if (total > 0 && done >= total) apps[app].cleared++;

    if (!students[id]) students[id] = { nickname: nick, total: 0, plays: 0, perApp: {}, last: 0 };
    students[id].nickname = nick;
    students[id].total += score;
    students[id].plays += plays;
    students[id].perApp[app] = score;
    var t = r[7] instanceof Date ? r[7].getTime() : 0;
    if (t > students[id].last) students[id].last = t;
  });

  var daily = {};
  recs.forEach(function (r) {
    if (!(r[0] instanceof Date)) return;
    var k = Utilities.formatDate(r[0], Session.getScriptTimeZone(), 'MM/dd');
    daily[k] = (daily[k] || 0) + 1;
  });

  return {
    ok: true,
    names: names,
    apps: Object.keys(apps).map(function (k) {
      var a = apps[k];
      return {
        app: k, players: a.players, plays: a.plays,
        avg: a.players ? Math.round(a.sum / a.players) : 0,
        clearRate: a.players ? Math.round(a.cleared / a.players * 100) : 0
      };
    }),
    students: Object.keys(students).map(function (id) {
      var s = students[id];
      return { id: id, nickname: s.nickname, total: s.total, plays: s.plays, perApp: s.perApp, last: s.last };
    }).sort(function (a, b) { return b.total - a.total; }),
    daily: Object.keys(daily).sort().slice(-30).map(function (k) { return { date: k, plays: daily[k] }; }),
    records: recs.length,
    at: Date.now()
  };
}

/* ===== 手動メンテ =========================================== */

/** エディタから1回実行して、シートの土台を作っておく用 */
function セットアップ() {
  records_(); best_(); apps_();
  SpreadsheetApp.getUi().alert('records / best / apps のシートを用意しました。');
}
