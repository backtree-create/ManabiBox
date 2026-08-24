/* ============================================================
   世界陣取りクエスト — 共有マップサーバー（Google Apps Script）

   まなびの基盤とは「別の」スプレッドシートに置いてください。
   （通信回数が多いため、基盤の記録用とは分けるのが安全です）

   使い方はフォルダ内の「セットアップ.md」を参照。
   ============================================================ */

var WRITE_TOKEN = 'world-write-2026';   // index.html の GAME_CONFIG.token と同じにする
var PROTECT_MS = 45 * 1000;             // 占領直後の保護時間（ゲーム側と合わせる）
var CACHE_SEC = 21600;                  // 状態キャッシュの保持時間（6時間）

/* ---------- 入口 ---------- */
function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.mode === 'ping') return out({ ok: true, msg: 'つながっています' });

  /* 先生用リセット: <URL>?mode=reset&room=3-2&admin=ADMIN_TOKEN をブラウザで開く */
  if (p.mode === 'reset') {
    if (p.admin !== ADMIN_TOKEN) return out({ ok: false, err: 'admin' });
    var room0 = String(p.room || 'A').slice(0, 20);
    putState(room0, { c: {}, p: {} });
    logRow([Date.now(), room0, 'reset', '', '', '', '', '']);
    return out({ ok: true, msg: 'ルーム「' + room0 + '」をリセットしました' });
  }

  if (p.token !== WRITE_TOKEN) return out({ ok: false, err: 'token' });
  if (p.mode === 'state') {
    return out({ ok: true, state: getState(String(p.room || 'A').slice(0, 20)) });
  }
  return out({ ok: false, err: 'mode' });
}

function doPost(e) {
  var b;
  try { b = JSON.parse(e.postData.contents); } catch (err) { return out({ ok: false, err: 'json' }); }
  if (b.token !== WRITE_TOKEN) return out({ ok: false, err: 'token' });

  var room = String(b.room || 'A').slice(0, 20);
  var pid = String(b.pid || '').slice(0, 12);
  var nick = String(b.nick || '?').slice(0, 12);
  var color = /^#[0-9a-fA-F]{6}$/.test(b.color || '') ? b.color : '#999999';
  var scoreV = Math.max(0, Math.min(999999, Number(b.score) || 0));
  if (!pid) return out({ ok: false, err: 'pid' });

  var lock = LockService.getScriptLock();
  lock.waitLock(8000);
  try {
    var st = getState(room);
    var now = Date.now();

    if (b.m === 'claim') {
      var cid = String(b.cid || '').slice(0, 4);
      var cur = st.c[cid];
      if (cur && cur[0] !== pid && (now - cur[2]) < PROTECT_MS) {
        return out({
          ok: false, err: 'protected',
          wait: Math.ceil((PROTECT_MS - (now - cur[2])) / 1000),
          state: st
        });
      }
      st.c[cid] = [pid, color, now];
      st.p[pid] = [nick, scoreV, color, now];
      putState(room, st);
      logRow([now, room, 'claim', cid, pid, nick, color, scoreV]);
      return out({ ok: true, state: st });
    }

    if (b.m === 'join' || b.m === 'sync') {
      st.p[pid] = [nick, scoreV, color, now];
      putState(room, st);
      if (b.m === 'join') logRow([now, room, 'join', '', pid, nick, color, scoreV]);
      return out({ ok: true, state: st });
    }

    return out({ ok: false, err: 'mode' });
  } finally {
    lock.releaseLock();
  }
}

/* ---------- 状態の保存（キャッシュ＋シートで復元可能に） ---------- */
function getState(room) {
  var cache = CacheService.getScriptCache();
  var raw = cache.get('room:' + room);
  if (raw) { try { return JSON.parse(raw); } catch (e) { } }
  var st = rebuildFromSheet(room);
  cache.put('room:' + room, JSON.stringify(st), CACHE_SEC);
  return st;
}

function putState(room, st) {
  CacheService.getScriptCache().put('room:' + room, JSON.stringify(st), CACHE_SEC);
}

function logSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('log');
  if (!sh) {
    sh = ss.insertSheet('log');
    sh.appendRow(['ts', 'room', 'type', 'cid', 'pid', 'nick', 'color', 'score']);
  }
  return sh;
}

function logRow(row) {
  try { logSheet().appendRow(row); } catch (e) { }
}

/* キャッシュが消えたとき、シートの記録から占領状況を復元する */
function rebuildFromSheet(room) {
  var st = { c: {}, p: {} };
  try {
    var sh = logSheet();
    var last = sh.getLastRow();
    if (last < 2) return st;
    var from = Math.max(2, last - 4000);
    var rows = sh.getRange(from, 1, last - from + 1, 8).getValues();
    rows.forEach(function (r) {
      if (String(r[1]) !== room) return;
      var type = String(r[2]);
      if (type === 'reset') { st = { c: {}, p: {} }; return; }
      var ts = Number(r[0]) || 0, cid = String(r[3]), pid = String(r[4]);
      if (type === 'claim' && cid) st.c[cid] = [pid, String(r[6]), ts];
      if ((type === 'claim' || type === 'join') && pid) {
        st.p[pid] = [String(r[5]), Number(r[7]) || 0, String(r[6]), ts];
      }
    });
  } catch (e) { }
  return st;
}

/* ---------- 出力 ---------- */
function out(o) {
  return ContentService.createTextOutput(JSON.stringify(o))
    .setMimeType(ContentService.MimeType.JSON);
}
