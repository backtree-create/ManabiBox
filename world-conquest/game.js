/* ============================================================
   世界陣取りクエスト — ゲーム本体
   マップ: world-atlas (Natural Earth 由来 TopoJSON) を three.js で描画
   共有  : Google Apps Script (code.gs) をポーリング
   ============================================================ */
(function () {
  'use strict';

  /* ---------- 設定 ---------- */
  var CFG = window.GAME_CONFIG || {};
  var ENDPOINT = CFG.endpoint || '';
  var TOKEN = CFG.token || '';
  var POLL_MS = CFG.pollMs || 6000;      // 共有マップの更新間隔
  var PROTECT_MS = 45000;                // 占領直後の保護時間
  var LOCK_MS = 30000;                   // 誤答後、同じ国に再挑戦できるまで
  var QUIZ_SEC = 20;                     // 1問の制限時間
  var MAP_URLS = [
    'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json',
    'https://unpkg.com/world-atlas@2/countries-50m.json',
    'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'
  ];
  var FLAG = function (iso2, w) { return 'https://flagcdn.com/w' + (w || 160) + '/' + iso2 + '.png'; };

  var PALETTE = ['#ff5d5d', '#4da3ff', '#ffd93d', '#6dd47e', '#c78bff', '#ff9d4d',
    '#4dd9e8', '#ff7ab8', '#a8e05f', '#8ea2ff', '#ffb3a1', '#5fd4b0', '#e8c94d', '#d98bff'];

  /* ---------- ユーティリティ ---------- */
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function pick(arr, n, excl) {
    var pool = arr.filter(function (x) { return !excl || excl.indexOf(x) < 0; });
    return shuffle(pool).slice(0, n);
  }
  function pad3(id) { return ('000' + String(id)).slice(-3); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem('cq_' + k); localStorage.setItem('cq_' + k, v); } catch (e) { return null; } }

  /* ---------- 効果音（WebAudio・外部ファイルなし） ---------- */
  var AC = null;
  function beep(freqs, dur, type, gain) {
    try {
      if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
      var t = AC.currentTime;
      freqs.forEach(function (f, i) {
        var o = AC.createOscillator(), g = AC.createGain();
        o.type = type || 'triangle'; o.frequency.value = f;
        g.gain.setValueAtTime(0, t + i * dur);
        g.gain.linearRampToValueAtTime(gain || 0.12, t + i * dur + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t + (i + 1) * dur);
        o.connect(g); g.connect(AC.destination);
        o.start(t + i * dur); o.stop(t + (i + 1) * dur + 0.05);
      });
    } catch (e) { }
  }
  var SND = {
    ok: function () { beep([523, 659, 784], 0.11); },
    big: function () { beep([523, 659, 784, 1047, 1319], 0.1); },
    ng: function () { beep([196, 147], 0.16, 'sawtooth', 0.07); },
    tap: function () { beep([880], 0.06, 'sine', 0.05); },
    steal: function () { beep([392, 330, 262], 0.13, 'square', 0.06); }
  };

  /* ---------- ゲーム状態 ---------- */
  var me = {
    pid: store('pid') || (function () {
      var p = Math.random().toString(36).slice(2, 8);
      store('pid', p); return p;
    })(),
    nick: '', color: PALETTE[0]
  };
  var room = 'A';
  var online = false;
  var claims = {};             // cid -> [pid, color, ts]
  var players = {};            // pid -> [nick, score, color, ts]
  var score = 0, combo = 0, correct = 0, wrong = 0, sessionCaptures = 0;
  var locks = {};              // cid -> 解除時刻（自分の誤答ロック）
  var earned = {};             // 一度きりボーナスの記録
  var quizTimer = null, quizDeadline = 0, quizStart = 0;
  var pollHandle = null, netBusy = false;

  /* ---------- 使えない時間帯 ----------
     '17:00' のような文字を、0時からの分数に直して比べる。
     先生が確認したいときは、URLのうしろに ?free=1 を付けると外れる。 */
  function toMin(s) {
    var m = /^\s*(\d{1,2})\s*(?::\s*(\d{1,2}))?\s*$/.exec(String(s == null ? '' : s));
    if (!m) return -1;
    var h = Number(m[1]), mi = Number(m[2] || 0);
    return (h > 23 || mi > 59) ? -1 : h * 60 + mi;
  }
  function fmtHM(min) {
    min = ((Math.round(min) % 1440) + 1440) % 1440;
    return Math.floor(min / 60) + ':' + ('0' + (min % 60)).slice(-2);
  }
  var BLOCK_FROM = toMin(CFG.blockFrom), BLOCK_TO = toMin(CFG.blockTo);
  var BLOCK_ON = BLOCK_FROM >= 0 && BLOCK_TO >= 0 && BLOCK_FROM !== BLOCK_TO &&
    !/[?&]free=1/.test(location.search);
  var timeUp = false, started = false, clockHandle = null, warned = {};

  function nowMin() {
    var d = new Date();
    return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
  }
  function isBlocked() {
    if (!BLOCK_ON) return false;
    var t = nowMin();
    return (BLOCK_FROM < BLOCK_TO) ? (t >= BLOCK_FROM && t < BLOCK_TO)   // 同じ日の中
                                   : (t >= BLOCK_FROM || t < BLOCK_TO);  // 日をまたぐ
  }
  /* 使えなくなるまであと何分か */
  function minsLeft() {
    if (!BLOCK_ON) return -1;
    var d = BLOCK_FROM - nowMin();
    return d < 0 ? d + 1440 : d;
  }

  /* ---------- three.js ---------- */
  var scene, camera, renderer, raycaster, mapGroup;
  var meshes = {};             // cid -> Mesh
  var neighborsOf = {};        // cid -> [cid,...]（TopoJSONの隣接情報から）
  var mapIds = [];             // 描画された登録国の cid 一覧
  var SC = 120;                // 投影スケール
  /* 表示範囲。地図を組み立てたあと、実際に陸地がある範囲に合わせて更新する
     （南極を外しているので、緯度いっぱいに取ると下が大きく余ってしまう） */
  var VIEW = { cx: 0, cy: 0, hw: 0.8707 * Math.PI * SC, hh: 1.44 * SC };
  var camMinZ = 26, camMaxZ = 900, camFitZ = 500;
  var camAnim = null;          // {from, to, t0, dur}
  var hoverCid = null, selectedCid = null;
  var COL = {
    base: new THREE.Color(0x59708f),
    gray: new THREE.Color(0x2b374e)
  };

  /* ナチュラルアース図法（多項式近似）。lon/lat(度) -> x/y */
  function project(lon, lat) {
    var la = lat * Math.PI / 180, lo = lon * Math.PI / 180;
    var l2 = la * la, l4 = l2 * l2;
    var lx = 0.8707 - 0.131979 * l2 - 0.013791 * l4 +
      l4 * l4 * l2 * (0.003971 - 0.001529 * l2);
    var y = la * (1.007226 + l2 * (0.015085 + l4 * (-0.044475 + 0.028874 * l2 - 0.005916 * l4)));
    return [lx * lo * SC, y * SC];
  }

  function initThree() {
    var wrap = $('map');
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);          // 海はCSSグラデーションで描く
    wrap.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(40, 1, 1, 3000);
    raycaster = new THREE.Raycaster();
    mapGroup = new THREE.Group();
    scene.add(mapGroup);

    onResize();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', function () { setTimeout(onResize, 300); });
    // resizeイベントが飛ばない環境（一部タブレット等）でも追従する保険
    setInterval(function () {
      var c = renderer.domElement;
      if (c.clientWidth !== window.innerWidth || c.clientHeight !== window.innerHeight) onResize();
    }, 1200);
    animate();
  }

  function onResize() {
    var w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    var t = Math.tan(camera.fov * Math.PI / 360);
    /* 縦長のスマホでは横を、横長のPCでは縦を基準に、陸地全体が収まる距離を求める */
    camFitZ = Math.max(VIEW.hw / (t * camera.aspect), VIEW.hh / t) * 1.04;
    camMaxZ = camFitZ * 1.18;
    if (!camera.userData.placed) {
      camera.position.set(VIEW.cx, VIEW.cy, camFitZ);
      camera.userData.placed = true;
    }
    camera.position.z = Math.min(camera.position.z, camMaxZ);
    camera.updateProjectionMatrix();
    needsRender = true;
  }

  var needsRender = true;
  function animate() {
    requestAnimationFrame(animate);
    if (camAnim) {
      var k = Math.min(1, (performance.now() - camAnim.t0) / camAnim.dur);
      var e = 1 - Math.pow(1 - k, 3);                     // ease-out
      camera.position.z = camAnim.from + (camAnim.to - camAnim.from) * e;
      if (k >= 1) camAnim = null;
      needsRender = true;
    }
    if (needsRender) { renderer.render(scene, camera); needsRender = false; }
  }
  function redraw() { needsRender = true; }
  function zoomTo(z, dur) {
    z = Math.max(camMinZ, Math.min(camMaxZ, z));
    camAnim = { from: camera.position.z, to: z, t0: performance.now(), dur: dur || 350 };
  }

  /* 座標列を掃除してから描画する。
     ・日付変更線をまたぐリング（ロシア本土・フィジーなど）は、そのまま投影すると
       地図を横切る帯になってしまうので、経度を連続化してから片側に寄せる
     ・重複点は三角形分割を乱すので取り除く */
  function cleanRing(ring) {
    if (ring.length < 3) return [];

    // 1) 隣り合う点の経度差が180度を超えたら±360して連続化（アンラップ）
    var lons = [ring[0][0]], sum = ring[0][0];
    for (var i = 1; i < ring.length; i++) {
      var d = ring[i][0] - ring[i - 1][0];
      if (d > 180) d -= 360; else if (d < -180) d += 360;
      lons[i] = lons[i - 1] + d;
      sum += lons[i];
    }
    // 2) 面の大半がある側へリングごと寄せる
    var shift = -Math.round((sum / ring.length) / 360) * 360;

    var out = [], px = 1e9, py = 1e9, EPS = 0.018;
    for (var j = 0; j < ring.length; j++) {
      // 3) はみ出した先端は地図の端でそろえる（横断する帯を防ぐ）
      var lon = Math.max(-180, Math.min(180, lons[j] + shift));
      var p = project(lon, ring[j][1]);
      if (Math.abs(p[0] - px) < EPS && Math.abs(p[1] - py) < EPS) continue;
      out.push(p); px = p[0]; py = p[1];
    }
    // 閉じるための末尾の重複点は取り除く
    if (out.length > 1) {
      var a = out[0], b = out[out.length - 1];
      if (Math.abs(a[0] - b[0]) < EPS && Math.abs(a[1] - b[1]) < EPS) out.pop();
    }
    return out.length < 3 ? [] : out;
  }

  /* TopoJSON を読み込んでメッシュ化 */
  function buildMap(topo) {
    var geoms = topo.objects.countries.geometries;
    var borderPts = [];

    // 隣接テーブル（つなげ塗りボーナス用）
    try {
      var nb = topojson.neighbors(geoms);
      geoms.forEach(function (g, i) {
        var id = pad3(g.id);
        neighborsOf[id] = nb[i].map(function (j) { return pad3(geoms[j].id); });
      });
    } catch (e) { }

    // 同じ国IDのジオメトリ（例: オーストラリア本土＋離島）は1つにまとめる。
    // idが無い地域は個別キーで灰色表示のみ。
    var byId = {}, anon = 0;
    geoms.forEach(function (g) {
      var id = pad3(g.id);
      if (!/^\d{3}$/.test(id)) id = 'x' + (anon++);
      if (id === '010') return;                       // 南極は対象外
      if (!byId[id]) byId[id] = { shapes: [], en: (g.properties && g.properties.name) || '' };
      var f = topojson.feature(topo, g);
      var polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;

      polys.forEach(function (rings) {
        if (!rings.length) return;
        var outer = cleanRing(rings[0]);
        if (outer.length < 3) return;
        var shape = new THREE.Shape();
        outer.forEach(function (p, i) {
          if (i === 0) shape.moveTo(p[0], p[1]); else shape.lineTo(p[0], p[1]);
        });
        for (var h = 1; h < rings.length; h++) {
          var hp = cleanRing(rings[h]);
          if (hp.length < 3) continue;
          var hole = new THREE.Path();
          hp.forEach(function (p, i) {
            if (i === 0) hole.moveTo(p[0], p[1]); else hole.lineTo(p[0], p[1]);
          });
          shape.holes.push(hole);
        }
        byId[id].shapes.push(shape);
        // 国境線（掃除済みの点列で描く）
        var loops = [outer].concat(shape.holes.map(function (h2) { return h2.getPoints(); }));
        loops.forEach(function (loop) {
          for (var i = 0; i < loop.length; i++) {
            var a = loop[i], b = loop[(i + 1) % loop.length];
            var ax = a.x !== undefined ? a.x : a[0], ay = a.y !== undefined ? a.y : a[1];
            var bx = b.x !== undefined ? b.x : b[0], by = b.y !== undefined ? b.y : b[1];
            borderPts.push(ax, ay, 0.25, bx, by, 0.25);
          }
        });
      });
    });

    Object.keys(byId).forEach(function (id) {
      var entry = byId[id];
      if (!entry.shapes.length) return;
      var known = !!COUNTRIES[id];
      var geo;
      try { geo = new THREE.ShapeGeometry(entry.shapes); } catch (e) { return; }
      /* 地図データの回転方向によらず表示・タップ判定できるよう両面描画 */
      var mat = new THREE.MeshBasicMaterial({ color: known ? COL.base : COL.gray, side: THREE.DoubleSide });
      var mesh = new THREE.Mesh(geo, mat);
      mesh.userData = { cid: id, known: known, en: entry.en };
      mapGroup.add(mesh);
      meshes[id] = mesh;
      if (known) mapIds.push(id);
    });

    var bGeo = new THREE.BufferGeometry();
    bGeo.setAttribute('position', new THREE.Float32BufferAttribute(borderPts, 3));
    mapGroup.add(new THREE.LineSegments(bGeo,
      new THREE.LineBasicMaterial({ color: 0x16283f, transparent: true, opacity: 0.9 })));

    /* 陸地が実際にある範囲を求めて、表示範囲をそこに合わせる */
    var box = new THREE.Box3();
    Object.keys(meshes).forEach(function (id) {
      meshes[id].geometry.computeBoundingBox();
      box.union(meshes[id].geometry.boundingBox);
    });
    if (!box.isEmpty()) {
      VIEW.cx = (box.min.x + box.max.x) / 2;
      VIEW.cy = (box.min.y + box.max.y) / 2;
      VIEW.hw = (box.max.x - box.min.x) / 2;
      VIEW.hh = (box.max.y - box.min.y) / 2;
      camera.userData.placed = false;    // 新しい範囲で置きなおす
      onResize();
    }
    redraw();
  }

  /* 所有状況・ホバー・選択をメッシュ色に反映 */
  var tmpColor = new THREE.Color();
  function colorOf(cid) {
    var c = claims[cid];
    if (c) tmpColor.set(c[1]);
    else tmpColor.copy(COUNTRIES[cid] ? COL.base : COL.gray);
    if (cid === selectedCid) tmpColor.lerp(new THREE.Color(0xffffff), 0.28);
    else if (cid === hoverCid) tmpColor.lerp(new THREE.Color(0xffffff), 0.16);
    return tmpColor;
  }
  function paintOne(cid) {
    var m = meshes[cid];
    if (m) { m.material.color.copy(colorOf(cid)); redraw(); }
  }
  function paintAll() {
    Object.keys(meshes).forEach(paintOne);
    updateHud();
    renderRanking();
  }

  /* ---------- カメラ操作（パン・ピンチ・タップ・ホバー） ---------- */
  var pointers = {}, panStart = null, pinchStart = null, moved = 0, downAt = 0;

  function clampCam() {
    camera.position.z = Math.max(camMinZ, Math.min(camMaxZ, camera.position.z));
    /* 見えている範囲の半分だけ外へはみ出せる（地図を見失わないように） */
    var t = Math.tan(camera.fov * Math.PI / 360);
    var halfH = camera.position.z * t, halfW = halfH * camera.aspect;
    var mx = Math.max(0, VIEW.hw - halfW * 0.55), my = Math.max(0, VIEW.hh - halfH * 0.55);
    camera.position.x = Math.max(VIEW.cx - mx, Math.min(VIEW.cx + mx, camera.position.x));
    camera.position.y = Math.max(VIEW.cy - my, Math.min(VIEW.cy + my, camera.position.y));
  }
  function raycastAt(px, py) {
    var v = new THREE.Vector2((px / window.innerWidth) * 2 - 1, -(py / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(v, camera);
    var hits = raycaster.intersectObjects(mapGroup.children.filter(function (o) { return o.isMesh; }));
    return hits.length ? hits[0].object.userData : null;
  }
  function initControls() {
    var el = renderer.domElement;
    el.style.touchAction = 'none';

    el.addEventListener('pointerdown', function (e) {
      el.setPointerCapture(e.pointerId);
      pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      var keys = Object.keys(pointers);
      moved = 0; downAt = Date.now();
      if (keys.length === 1) {
        panStart = { x: e.clientX, y: e.clientY, cam: camera.position.clone() };
        pinchStart = null;
      } else if (keys.length === 2) {
        var a = pointers[keys[0]], b = pointers[keys[1]];
        pinchStart = { d: Math.hypot(a.x - b.x, a.y - b.y), z: camera.position.z };
        panStart = null;
      }
    });
    el.addEventListener('pointermove', function (e) {
      // マウスのホバー演出（タッチでは無効）
      if (e.pointerType === 'mouse' && !pointers[e.pointerId]) {
        var ud = raycastAt(e.clientX, e.clientY);
        var cid = ud ? ud.cid : null;
        if (cid !== hoverCid) {
          var prev = hoverCid; hoverCid = cid;
          if (prev) paintOne(prev);
          if (cid) paintOne(cid);
          el.style.cursor = (ud && ud.known) ? 'pointer' : '';
        }
        return;
      }
      if (!pointers[e.pointerId]) return;
      pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      var keys = Object.keys(pointers);
      if (keys.length === 1 && panStart) {
        var dx = e.clientX - panStart.x, dy = e.clientY - panStart.y;
        moved = Math.max(moved, Math.abs(dx) + Math.abs(dy));
        var worldPerPx = 2 * camera.position.z * Math.tan(camera.fov * Math.PI / 360) / window.innerHeight;
        camera.position.x = panStart.cam.x - dx * worldPerPx;
        camera.position.y = panStart.cam.y + dy * worldPerPx;
        clampCam(); redraw();
      } else if (keys.length === 2 && pinchStart) {
        moved = 99;
        var a = pointers[keys[0]], b = pointers[keys[1]];
        var d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d > 10) {
          camAnim = null;
          camera.position.z = pinchStart.z * pinchStart.d / d;
          clampCam(); redraw();
        }
      }
    });
    function up(e) {
      delete pointers[e.pointerId];
      var wasTap = moved < 9 && Date.now() - downAt < 600;
      if (Object.keys(pointers).length === 0) {
        panStart = pinchStart = null;
        if (wasTap) tapAt(e.clientX, e.clientY);
      }
    }
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', function (e) { delete pointers[e.pointerId]; });

    el.addEventListener('wheel', function (e) {
      e.preventDefault();
      camAnim = null;
      camera.position.z *= (e.deltaY > 0 ? 1.12 : 0.89);
      clampCam(); redraw();
    }, { passive: false });

    $('btn-home').addEventListener('click', function () {
      camera.position.x = VIEW.cx; camera.position.y = VIEW.cy;
      zoomTo(camFitZ, 500); SND.tap();
    });
    $('btn-zin').addEventListener('click', function () { zoomTo(camera.position.z * 0.7); });
    $('btn-zout').addEventListener('click', function () { zoomTo(camera.position.z * 1.45); });
  }

  function tapAt(px, py) {
    var ud = raycastAt(px, py);
    if (!ud) { hideInfo(); return; }
    SND.tap();
    showInfo(ud.cid, ud);
  }

  /* ---------- 国情報カード ---------- */
  function ownerName(cid) {
    var c = claims[cid];
    if (!c) return null;
    var p = players[c[0]];
    return { pid: c[0], nick: p ? p[0] : '???', color: c[1], ts: c[2] };
  }

  function setSelected(cid) {
    var prev = selectedCid; selectedCid = cid;
    if (prev) paintOne(prev);
    if (cid) paintOne(cid);
  }

  function showInfo(cid, ud) {
    setSelected(cid);
    var card = $('info');
    var d = COUNTRIES[cid];
    if (!d) {
      card.innerHTML =
        '<div class="i-head"><div class="i-flagbox i-flag-secret">–</div>' +
        '<div><div class="i-name">' + esc(ud.en || '不明な地域') + '</div></div></div>' +
        '<div class="i-sub">この地域は今回の対象外です</div>';
      card.classList.add('show');
      return;
    }
    var own = ownerName(cid);
    var mine = own && own.pid === me.pid;
    var lockLeft = Math.max(0, (locks[cid] || 0) - Date.now());
    var protLeft = own && !mine ? Math.max(0, PROTECT_MS - (Date.now() - own.ts)) : 0;

    /* 国旗は占領するまで見せない（国旗クイズの答えになるため） */
    var flagHtml = mine
      ? '<div class="i-flagbox"><img src="' + FLAG(d[3]) + '" alt="国旗" ' +
        'onerror="this.parentNode.outerHTML=\'<div class=&quot;i-flagbox i-flag-secret&quot;>?</div>\'"></div>'
      : '<div class="i-flagbox i-flag-secret">？<small>ひみつ</small></div>';

    var status;
    if (mine) status = '<span class="tag tag-mine">🚩 あなたの領地</span>';
    else if (own) status = '<span class="tag" style="background:' + own.color + '">' + esc(own.nick) + ' の領地</span>';
    else status = '<span class="tag tag-free">✨ まだ誰のものでもない</span>';

    var html =
      '<div class="i-head">' + flagHtml +
      '<div><div class="i-name">' + esc(d[0]) + '</div>' +
      '<span class="i-cont">' + esc(d[2]) + '州</span></div></div>' +
      '<div class="i-status">' + status + '</div>';

    if (mine) {
      html += '<div class="i-sub">' + (d[1] ? '首都: ' + esc(d[1]) + '　' : '') + 'この国はあなたの色。守りぬこう!</div>';
    } else if (timeUp) {
      html += '<div class="i-sub">⏰ 時間が終わりました。おつかれさま!</div>';
    } else if (protLeft > 0) {
      html += '<div class="i-sub">🛡 占領直後のため保護中（あと' + Math.ceil(protLeft / 1000) + '秒）</div>';
    } else if (lockLeft > 0) {
      html += '<div class="i-sub">⏳ 不正解のため休けい中（あと' + Math.ceil(lockLeft / 1000) + '秒）</div>';
    } else {
      html += '<button class="btn btn-go pulse" id="btn-challenge">' +
        (own ? '⚔️ うばいに行く' : '🚩 クイズに挑戦して占領する') + '</button>';
    }
    card.innerHTML = html;
    card.classList.add('show');
    var b = $('btn-challenge');
    if (b) b.addEventListener('click', function () { startQuiz(cid, !!own); });
  }
  function hideInfo() { $('info').classList.remove('show'); setSelected(null); }

  /* ---------- クイズ生成 ----------
     基本は「◯◯の国旗はどれ?」。首都・特色の問題をまぜる。
     ※「首都が◯◯の国は?」「この国旗はどの国?」は答えが自明なため出さない */
  function sameContinent(cid) {
    var cont = COUNTRIES[cid][2];
    return mapIds.filter(function (id) { return id !== cid && COUNTRIES[id][2] === cont; });
  }
  function makeQuestion(cid, isSteal) {
    var d = COUNTRIES[cid];
    var trivia = (typeof TRIVIA !== 'undefined' && TRIVIA[cid]) || [];
    var near = sameContinent(cid);
    var q = { choices: [], correct: 0, text: '', type: '国旗' };

    /* 出題タイプ。国旗の問題を基本にして、ときどき特色や首都をまぜる */
    var type = 'flag';
    if (isSteal) {
      // うばう時は難しめ（特色 > 首都 > 国旗）
      if (trivia.length) type = 'trivia';
      else if (d[1]) type = 'capital';
    } else if (Math.random() >= 0.72) {
      if (trivia.length) type = 'trivia';
      else if (d[1]) type = 'capital';
    }

    if (type === 'trivia') {
      var tv = trivia[Math.floor(Math.random() * trivia.length)];
      q.text = tv.q; q.type = 'ちしき';
      var order = shuffle([0, 1, 2, 3]);
      q.choices = order.map(function (i) { return { label: tv.c[i] }; });
      q.correct = order.indexOf(0);
    } else if (type === 'capital') {
      q.text = '「' + d[0] + '」の首都はどこ?'; q.type = '首都';
      var caps = pick(near.filter(function (id) { return COUNTRIES[id][1] && COUNTRIES[id][1] !== d[1]; }), 3)
        .map(function (id) { return COUNTRIES[id][1]; });
      q.choices = shuffle([d[1]].concat(caps)).map(function (c) { return { label: c }; });
      q.correct = q.choices.findIndex(function (c) { return c.label === d[1]; });
    } else {
      q.text = '「' + d[0] + '」の国旗はどれ?'; q.type = '国旗';
      var flags = pick(near, 3).map(function (id) { return COUNTRIES[id][3]; });
      var opts = shuffle([d[3]].concat(flags));
      q.choices = opts.map(function (f) { return { flag: FLAG(f, 320) }; });
      q.correct = opts.indexOf(d[3]);
    }
    return q;
  }

  /* ---------- クイズ画面 ---------- */
  var quizCid = null, quizSteal = false, quizQ = null, answered = false;

  function startQuiz(cid, isSteal) {
    if (timeUp) return;
    hideInfo();
    quizCid = cid; quizSteal = isSteal; answered = false;
    quizQ = makeQuestion(cid, isSteal);
    var d = COUNTRIES[cid];

    $('q-type').textContent = quizQ.type;
    $('q-country').textContent = d[0] + (isSteal ? '（うばう!）' : '');
    $('q-text').textContent = quizQ.text;

    var box = $('q-choices');
    box.className = quizQ.choices[0].flag ? 'flags' : '';
    box.innerHTML = '';
    quizQ.choices.forEach(function (c, i) {
      var b = document.createElement('button');
      b.className = 'choice' + (c.flag ? ' choice-flag' : '');
      if (c.flag) b.innerHTML = '<img src="' + c.flag + '" alt="国旗の選択肢" onerror="this.parentNode.textContent=\'（画像が読めません）\'">';
      else b.textContent = c.label;
      b.addEventListener('click', function () { answer(i, b); });
      box.appendChild(b);
    });

    var bar = $('q-bar');
    bar.className = ''; bar.style.width = '100%';
    $('quiz').classList.add('show');
    quizStart = Date.now();
    quizDeadline = quizStart + QUIZ_SEC * 1000;
    if (quizTimer) clearInterval(quizTimer);
    quizTimer = setInterval(function () {
      var left = quizDeadline - Date.now();
      var pct = Math.max(0, left / (QUIZ_SEC * 10));
      bar.style.width = pct + '%';
      bar.className = pct < 25 ? 'danger' : (pct < 50 ? 'warn' : '');
      if (left <= 0 && !answered) answer(-1, null);
    }, 100);
  }
  function closeQuiz() {
    $('quiz').classList.remove('show');
    if (quizTimer) { clearInterval(quizTimer); quizTimer = null; }
  }

  function answer(i, btn) {
    if (answered) return;
    answered = true;
    clearInterval(quizTimer); quizTimer = null;
    var ok = (i === quizQ.correct);
    var kids = $('q-choices').children;
    if (kids[quizQ.correct]) kids[quizQ.correct].classList.add('right');
    if (!ok && btn) btn.classList.add('wrongC');
    for (var k = 0; k < kids.length; k++) kids[k].disabled = true;

    setTimeout(function () {
      closeQuiz();
      if (ok) onCorrect(); else onWrong();
    }, ok ? 700 : 1300);
  }

  /* ---------- 正解 → 占領とボーナス ---------- */
  function myCids() {
    return mapIds.filter(function (id) { return claims[id] && claims[id][0] === me.pid; });
  }
  function onCorrect() {
    correct++;
    combo++;
    var cid = quizCid, d = COUNTRIES[cid];
    var elapsed = (Date.now() - quizStart) / 1000;
    var mine = myCids();
    var lines = [], pts = 100;
    lines.push(['占領成功!', 100]);

    if (elapsed <= 7) { pts += 30; lines.push(['⚡ スピード回答', 30]); }
    if (combo >= 2) {
      var cb = 20 * Math.min(combo - 1, 5);
      pts += cb; lines.push(['🔥 ' + combo + '連続正解', cb]);
    }
    var adj = (neighborsOf[cid] || []).some(function (n) { return mine.indexOf(n) >= 0; });
    if (adj) { pts += 50; lines.push(['🧩 つなげ塗り（隣接）', 50]); }
    if (quizSteal) { pts += 100; lines.push(['⚔️ 領地をうばった', 100]); }

    // 占領を反映（楽観的更新 → サーバー確認）
    claims[cid] = [me.pid, me.color, Date.now()];
    pending[cid] = Date.now();          // サーバーの返事が来るまでは、この表示を守る
    sessionCaptures++;
    var total = mine.length + 1;

    if (total % 5 === 0) { pts += 200; lines.push(['🏅 ' + total + 'か国達成', 200]); }

    // 州ボーナス
    var cont = d[2];
    var contMine = myCids().filter(function (id) { return COUNTRIES[id][2] === cont; }).length;
    var contAll = mapIds.filter(function (id) { return COUNTRIES[id][2] === cont; }).length;
    [5, 10, 15].forEach(function (th) {
      var key = 'c' + cont + th;
      if (contMine >= th && !earned[key]) { earned[key] = 1; pts += 300; lines.push(['🌏 ' + cont + '州で' + th + 'か国', 300]); }
    });
    if (contMine >= contAll && !earned['full' + cont]) {
      earned['full' + cont] = 1; pts += 1000; lines.push(['👑 ' + cont + '州 完全制覇!!', 1000]);
      banner('👑 ' + cont + '州 完全制覇! +1000');
    }

    score += pts;
    (pts >= 300 ? SND.big : SND.ok)();
    resultToast(d, lines, pts, true);
    paintAll();
    sendClaim(cid);
    saveCaptured(cid);
    maybeReport(false);
  }

  function onWrong() {
    wrong++;
    combo = 0;
    locks[quizCid] = Date.now() + LOCK_MS;
    SND.ng();
    var d = COUNTRIES[quizCid];
    resultToast(d, [['ざんねん! 30秒たつと再挑戦できます', 0]], 0, false);
    updateHud();
  }

  /* ---------- 通信 ---------- */
  function api(params, body) {
    if (!ENDPOINT) return Promise.reject('no-endpoint');
    if (body) {
      body.token = TOKEN; body.room = room;
      return fetch(ENDPOINT, { method: 'POST', body: JSON.stringify(body) })
        .then(function (r) { return r.json(); });
    }
    var qs = Object.keys(params).map(function (k) { return k + '=' + encodeURIComponent(params[k]); }).join('&');
    return fetch(ENDPOINT + '?token=' + encodeURIComponent(TOKEN) + '&' + qs)
      .then(function (r) { return r.json(); });
  }

  /* サーバー（Apps Script）は返事に1〜3秒かかる。そのため
       ① 自分の占領が届く前に、古い状態の返事が返ってくる
       ② 返事どうしが追いこして、古い状態があとから届く
     ということが起きる。そのまま画面に映すと、取り合っていないのに
     「うばわれた!」と出てしまうので、次の2つで防ぐ。
       ・通信ごとに通し番号をつけ、古い返事は捨てる
       ・返事待ちの自分の占領（pending）は、返事が来るまで画面上で保つ */
  var reqSeq = 0, appliedSeq = 0;
  var pending = {};            // cid -> 送った時刻（サーバーの返事待ち）

  function applyState(st, seq, skipCid) {
    if (!st) return;
    if (seq !== undefined) {
      if (seq < appliedSeq) return;                 // 追いこされた古い返事は捨てる
      appliedSeq = seq;
    }
    var lost = {};
    myCids().forEach(function (id) { lost[id] = 1; });

    /* 受け取ったデータは書きかえずに、写しを作って使う */
    var next = {}, src = st.c || {};
    Object.keys(src).forEach(function (k) { next[k] = src[k]; });
    /* まだ返事が来ていない自分の占領は、こちらの表示のままにしておく */
    Object.keys(pending).forEach(function (cid) {
      if (!next[cid] || next[cid][0] !== me.pid) next[cid] = [me.pid, me.color, pending[cid]];
    });
    claims = next;
    players = st.p || {};

    // 自分の情報は常に最新に
    if (!players[me.pid]) players[me.pid] = [me.nick, score, me.color, Date.now()];
    else { players[me.pid][0] = me.nick; players[me.pid][1] = score; players[me.pid][2] = me.color; }

    // うばわれ通知（返事待ちのものと、いま結果が分かったものは除く）
    myCids().forEach(function (id) { delete lost[id]; });
    Object.keys(lost).forEach(function (id) {
      if (pending[id] || id === skipCid) return;
      var o = ownerName(id);
      if (o && o.pid !== me.pid) {
        SND.steal();
        toast('😱 ' + esc(o.nick) + ' に「' + esc(COUNTRIES[id][0]) + '」をうばわれた!', 'ng');
      }
    });
    paintAll();
  }

  function sendClaim(cid) {
    if (!online) { delete pending[cid]; paintAll(); return; }
    var seq = ++reqSeq;
    api(null, { m: 'claim', cid: cid, pid: me.pid, nick: me.nick, color: me.color, score: score })
      .then(function (r) {
        delete pending[cid];                        // 返事が来たので待ちを解除
        if (r.ok) applyState(r.state, seq);
        else if (r.err === 'protected') {
          toast('🛡 一歩おそかった! この国は保護中です（あと' + (r.wait || '?') + '秒）', 'ng');
          applyState(r.state, seq, cid);            // ここでは「うばわれた」を出さない
        } else {
          toast('⚠ この占領は記録できませんでした', 'ng');
        }
      })
      .catch(function () {
        delete pending[cid];
        toast('⚠ 通信エラー: この占領は記録できませんでした', 'ng');
      });
  }

  function poll() {
    if (!online || netBusy || document.hidden) return;
    // 返事が返ってこないまま残った待ちは、時間で片づける
    var now = Date.now();
    Object.keys(pending).forEach(function (cid) {
      if (now - pending[cid] > 30000) delete pending[cid];
    });
    netBusy = true;
    var seq = ++reqSeq;
    api({ mode: 'state', room: room })
      .then(function (r) { if (r.ok) applyState(r.state, seq); })
      .catch(function () { })
      .then(function () { netBusy = false; });
  }
  function startPolling() {
    if (pollHandle) clearInterval(pollHandle);
    pollHandle = setInterval(poll, POLL_MS + Math.random() * 1500);
    poll();
  }

  /* ---------- HUD・ランキング・通知 ---------- */
  function updateHud() {
    $('hud-score').textContent = score;
    $('hud-count').textContent = myCids().length;
    var cEl = $('hud-combo');
    cEl.textContent = combo >= 2 ? '🔥' + combo : '-';
    cEl.className = 'hud-v' + (combo >= 2 ? ' hot' : '');
  }

  var MEDAL = ['🥇', '🥈', '🥉'];
  var RANK_SHOW = 12;

  /* 順位表を作る。
     ・地図を持っているのに players に載っていない人も数に入れる（地図と食いちがわないように）
     ・同じ点数の人は同じ順位にする
     ・並びが毎回入れかわらないよう、点数→国数→名前→IDの順で決める */
  function rankList() {
    var by = {};
    Object.keys(players).forEach(function (pid) {
      var p = players[pid];
      by[pid] = { pid: pid, nick: p[0] || '???', score: Number(p[1]) || 0, color: p[2] || '#888', cnt: 0 };
    });
    mapIds.forEach(function (id) {
      var c = claims[id];
      if (!c) return;
      if (!by[c[0]]) by[c[0]] = { pid: c[0], nick: '???', score: 0, color: c[1] || '#888', cnt: 0 };
      by[c[0]].cnt++;
    });
    if (!by[me.pid]) by[me.pid] = { pid: me.pid, nick: me.nick, score: 0, color: me.color, cnt: 0 };
    /* 自分の行だけは、送信前でも手元の最新の値を出す */
    by[me.pid].score = score;
    by[me.pid].nick = me.nick;
    by[me.pid].color = me.color;

    var list = Object.keys(by).map(function (k) { return by[k]; });
    list.sort(function (a, b) {
      return (b.score - a.score) || (b.cnt - a.cnt) ||
        (a.nick < b.nick ? -1 : a.nick > b.nick ? 1 : 0) ||
        (a.pid < b.pid ? -1 : a.pid > b.pid ? 1 : 0);
    });
    var rank = 0, prevScore = null;
    list.forEach(function (p, i) {
      if (prevScore === null || p.score !== prevScore) rank = i + 1;
      p.rank = rank; prevScore = p.score;
    });
    return list;
  }

  function rankRow(p) {
    var pos = p.rank <= 3 ? MEDAL[p.rank - 1] : p.rank;
    return '<div class="rk-row' + (p.pid === me.pid ? ' rk-me' : '') + '">' +
      '<span class="rk-pos">' + pos + '</span>' +
      '<span class="rk-dot" style="background:' + p.color + ';color:' + p.color + '"></span>' +
      '<span class="rk-nick">' + esc(p.nick) + '</span>' +
      '<span class="rk-cnt">' + p.cnt + '国</span>' +
      '<span class="rk-score">' + p.score + '</span></div>';
  }

  function renderRanking() {
    var list = rankList();
    var top = list.slice(0, RANK_SHOW);
    var inTop = top.some(function (p) { return p.pid === me.pid; });
    var html = top.map(rankRow).join('');
    /* 自分が下のほうでも、自分の行だけは必ず見えるようにする */
    if (!inTop) {
      var mine = null;
      list.forEach(function (p) { if (p.pid === me.pid) mine = p; });
      if (mine) html += '<div class="rk-gap">…</div>' + rankRow(mine);
    }
    $('rank-list').innerHTML = html || '<div class="rk-row">まだ誰もいません</div>';
    $('rank-count').textContent = list.length >= 2 ? '(' + list.length + '人)' : '';
  }

  function toast(html, kind) {
    var t = document.createElement('div');
    t.className = 'toast' + (kind ? ' t-' + kind : '');
    t.innerHTML = html;
    $('toasts').appendChild(t);
    setTimeout(function () { t.classList.add('out'); }, 3600);
    setTimeout(function () { t.remove(); }, 4200);
  }

  function resultToast(d, lines, pts, ok) {
    var rows = lines.map(function (l) {
      return '<div class="rt-row"><span>' + esc(l[0]) + '</span>' +
        (l[1] ? '<b>+' + l[1] + '</b>' : '') + '</div>';
    }).join('');
    /* 正解したら国旗と首都を見せる（学習用のごほうび） */
    var head = ok
      ? '<div class="rt-head rt-ok"><img src="' + FLAG(d[3], 80) + '" alt="" onerror="this.remove()">' + esc(d[0]) + '</div>'
      : '<div class="rt-head rt-ng">❌ ' + esc(d[0]) + '</div>';
    var learn = (ok && d[1]) ? '<div class="rt-learn">首都: ' + esc(d[1]) + '</div>' : '';
    toast(head + rows + (pts ? '<div class="rt-total">合計 +' + pts + 'pt</div>' : '') + learn,
      ok ? 'ok' : 'ng');
  }

  function banner(text) {
    var b = $('banner');
    b.textContent = text;
    b.classList.remove('show');
    void b.offsetWidth;                    // アニメーションをリスタート
    b.classList.add('show');
    setTimeout(function () { b.classList.remove('show'); }, 3000);
  }

  /* ---------- まなびの基盤への送信 ---------- */
  function saveCaptured(cid) {
    try {
      var set = JSON.parse(store('captured') || '[]');
      if (set.indexOf(cid) < 0) { set.push(cid); store('captured', JSON.stringify(set)); }
    } catch (e) { }
  }
  var lastReportSig = '';
  function maybeReport(force) {
    var cum = [];
    try { cum = JSON.parse(store('captured') || '[]'); } catch (e) { }
    var acc = (correct + wrong) ? Math.round(correct / (correct + wrong) * 100) : 0;
    if (!force && sessionCaptures % 5 !== 0) return;   // 5か国ごと＋終了時に送信
    var sig = cum.length + '/' + acc + '/' + score;
    if (sig === lastReportSig) return;
    lastReportSig = sig;
    var payload = {
      app: 'world-conquest',
      done: cum.length,
      total: mapIds.length || Object.keys(COUNTRIES).length,
      best: acc * 10,   /* 他ゲームに合わせて1000点満点に換算 */
      note: '今回' + sessionCaptures + 'か国・' + score + 'pt（正答率' + acc + '%）'
    };
    try {
      if (typeof window.manabiReport === 'function') window.manabiReport(payload);
      else if (window.LearnHub && window.LearnHub.report) window.LearnHub.report(payload);
    } catch (e) { }
  }
  window.addEventListener('pagehide', function () { maybeReport(true); });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) maybeReport(true); else poll();
  });

  /* ---------- 起動・スタート画面 ---------- */
  function myColor(nick) {
    // ニックネームから安定した色を割り当て（同じ人はいつも同じ色）
    var h = 0, s = me.pid + nick;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return PALETTE[h % PALETTE.length];
  }

  function begin(isOnline) {
    if (isBlocked()) {          // 時間ちょうどに押されたときの用心
      toast('⏰ いまは ' + fmtHM(BLOCK_FROM) + '〜' + fmtHM(BLOCK_TO) + ' で使えません', 'ng');
      return;
    }
    var nick = $('in-nick').value.trim().slice(0, 10);
    if (!nick) { $('in-nick').focus(); toast('ニックネームを入れてください（本名はダメ!）', 'ng'); return; }
    me.nick = nick;
    room = ($('in-room').value.trim() || 'A').slice(0, 12);
    store('nick', nick); store('room', room);
    me.color = myColor(nick);
    online = isOnline;

    started = true;
    $('start').classList.remove('show');
    $('hud').style.display = 'flex';
    var whoHtml =
      '<span class="rk-dot" style="display:inline-block;vertical-align:-1px;background:' + me.color + ';color:' + me.color + '"></span> ' +
      '<b>' + esc(me.nick) + '</b>';
    var modeHtml = online ? '🌐 ' + esc(room) : '📴 練習';
    $('room-badge').style.display = 'block';
    $('room-badge').innerHTML = whoHtml + '　' + modeHtml;
    /* スマホでは右上のバッジを隠すので、同じ情報をランキングの中にも出す */
    $('side-me').innerHTML = whoHtml + '<span class="room">' + modeHtml + '</span>';
    $('fabs-l').style.display = 'flex';
    $('fabs-r').style.display = 'flex';
    if (window.innerWidth >= 900) $('side').classList.add('open');

    players[me.pid] = [me.nick, 0, me.color, Date.now()];
    paintAll();

    // ズームインの演出
    camera.position.z = Math.min(camMaxZ, camFitZ * 1.14);
    zoomTo(camFitZ, 900);

    startClock();
    if (BLOCK_ON) toast('⏰ <b>' + fmtHM(BLOCK_FROM) + '</b> まで あそべます');

    if (online) {
      var joinSeq = ++reqSeq;
      api(null, { m: 'join', pid: me.pid, nick: me.nick, color: me.color, score: 0 })
        .then(function (r) { if (r.ok) applyState(r.state, joinSeq); })
        .catch(function () { toast('⚠ サーバーに接続できません。練習モードとして続けます', 'ng'); online = false; });
      startPolling();
    }
  }

  function initUI() {
    $('in-nick').value = store('nick') || '';
    $('in-room').value = store('room') || '';
    var updPreview = function () {
      $('color-preview').querySelector('i').style.background = myColor($('in-nick').value.trim());
    };
    $('in-nick').addEventListener('input', updPreview);
    updPreview();

    $('r-close').addEventListener('click', function () { $('result').classList.remove('show'); });

    /* 使えない時間帯なら、スタート画面で止める。
       時間をまたいだときに自動で切りかわるよう、ときどき見なおす */
    function refreshGate() {
      var blocked = isBlocked();
      $('btn-solo').disabled = blocked;
      $('btn-online').disabled = blocked || !ENDPOINT;
      $('btn-solo').textContent = blocked ? '⏰ いまは おやすみ時間' : '📴 ひとりで練習';
      if (!blocked && !ENDPOINT) $('btn-online').textContent = '🌐 みんなで対戦（先生の設定待ち）';
      else if (!blocked) $('btn-online').textContent = '🌐 みんなで対戦';
      $('gate-msg').innerHTML = blocked
        ? '⏰ <b>' + fmtHM(BLOCK_FROM) + '〜' + fmtHM(BLOCK_TO) + '</b> は使えません。<br>' +
          fmtHM(BLOCK_TO) + ' になったら、また来てね!'
        : (BLOCK_ON ? '⏰ ' + fmtHM(BLOCK_FROM) + ' まで あそべます' : '');
      $('gate-msg').className = blocked ? 'gate-msg blocked' : 'gate-msg';
    }
    refreshGate();
    if (BLOCK_ON) {
      setInterval(refreshGate, 20000);
      document.addEventListener('visibilitychange', function () { if (!document.hidden) refreshGate(); });
    }
    $('btn-online').addEventListener('click', function () { begin(true); });
    $('btn-solo').addEventListener('click', function () { begin(false); });
    $('btn-help').addEventListener('click', function () { $('help').classList.add('show'); });
    $('btn-help-close').addEventListener('click', function () { $('help').classList.remove('show'); });
    $('btn-finish').addEventListener('click', function () {
      maybeReport(true);
      banner('📤 きろくを送信しました! スコア ' + score + 'pt');
    });
    $('btn-rank').addEventListener('click', function () { $('side').classList.toggle('open'); });
    $('side-close').addEventListener('click', function () { $('side').classList.remove('open'); });
    $('q-close').addEventListener('click', function () {
      if (!answered) { answered = true; closeQuiz(); combo = 0; }
    });
  }

  /* ---------- 時間の管理 ----------
     決めた時刻になったら、そこで終わりにする。 */
  function startClock() {
    if (clockHandle) clearInterval(clockHandle);
    clockHandle = setInterval(updateClock, 1000);
    updateClock();
  }

  function updateClock() {
    var el = $('hud-time'), lab = $('hud-time-k');
    if (!BLOCK_ON) { lab.textContent = 'じかん'; el.textContent = '∞'; el.className = 'hud-v'; return; }
    if (isBlocked()) { finishGame(); return; }

    var left = minsLeft(), s = Math.ceil(left * 60);
    if (left > 10) {                       // まだ先のときは、終わる時刻だけ出す
      lab.textContent = 'つかえる';
      el.textContent = '〜' + fmtHM(BLOCK_FROM);
      el.className = 'hud-v';
      return;
    }
    lab.textContent = 'のこり';
    el.textContent = Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2);
    el.className = 'hud-v' + (s <= 60 ? ' danger' : ' warn');
    [600, 300, 60].forEach(function (w) {
      if (s <= w && !warned[w]) {
        warned[w] = 1;
        SND.steal();
        toast('⏰ あと' + (w / 60) + '分で ' + fmtHM(BLOCK_FROM) + ' です', 'ng');
      }
    });
  }

  function finishGame() {
    if (timeUp || !started) return;   // 始まる前は、スタート画面で止めるだけにする
    timeUp = true;
    closeQuiz();
    hideInfo();
    if (pollHandle) { clearInterval(pollHandle); pollHandle = null; }
    maybeReport(true);
    showResult();
  }

  function showResult() {
    var mine = myCids();
    var acc = (correct + wrong) ? Math.round(correct / (correct + wrong) * 100) : 0;
    var rank = null, total = 0;
    if (online) {
      var list = rankList();
      total = list.length;
      list.forEach(function (p) { if (p.pid === me.pid) rank = p.rank; });
    }
    $('r-sub').innerHTML =
      (BLOCK_ON ? fmtHM(BLOCK_FROM) + ' になりました。つづきは ' + fmtHM(BLOCK_TO) + ' から!<br>' : '') +
      esc(me.nick) + ' の記録を「まなびの基盤」に送りました。' +
      (rank ? '<br>' + total + '人中 <b>' + rank + '位</b>' : '');
    $('r-grid').innerHTML =
      '<div class="r-cell"><b>' + score + '</b><span>スコア</span></div>' +
      '<div class="r-cell"><b>' + mine.length + '</b><span>りょうち</span></div>' +
      '<div class="r-cell"><b>' + acc + '%</b><span>せいとうりつ</span></div>';
    /* 州ごとの内訳（地理の復習になるように） */
    $('r-conts').innerHTML = CONTINENTS.map(function (c) {
      var got = mine.filter(function (id) { return COUNTRIES[id][2] === c; }).length;
      var all = mapIds.filter(function (id) { return COUNTRIES[id][2] === c; }).length;
      return got ? '<span class="r-chip">' + esc(c) + ' <b>' + got + '</b>/' + all + '</span>' : '';
    }).join('');
    $('r-hub').href = (window.MANABI_CONFIG || {}).hubUrl || '../';
    $('result').classList.add('show');
  }

  /* ---------- まなびの基盤にもどるボタン ----------
     ふだんはハブの manabi-connect.js が付けてくれる。
     ただしこのゲームをハブと同じフォルダの中（ManabiBox/world-conquest/）に置くと、
     向こうの「ハブ自身には出さない」判定が前方一致のため誤作動して付かない。
     そこで、まだ無いときだけ自前で用意する。idを合わせてあるので二重には出ない。 */
  function addBackButton() {
    if (document.getElementById('manabi-back')) return;
    var cfg = window.MANABI_CONFIG || {};
    if (cfg.backLink === false) return;
    var a = document.createElement('a');
    a.id = 'manabi-back';
    a.href = cfg.hubUrl || '../';
    a.setAttribute('aria-label', 'まなびの基盤にもどる');
    a.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M19 12H6M11.5 5.5 5 12l6.5 6.5"/></svg>まなびの基盤';
    document.body.appendChild(a);
  }

  /* ---------- 読み込み ---------- */
  function loadMap(i) {
    i = i || 0;
    if (i >= MAP_URLS.length) {
      $('load-msg').textContent = '地図データを読み込めませんでした。通信環境を確認して、再読み込みしてください。';
      return;
    }
    fetch(MAP_URLS[i])
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (topo) {
        $('load-msg').textContent = '地図を組み立てています…';
        setTimeout(function () {
          buildMap(topo);
          $('loading').style.display = 'none';
          $('start').classList.add('show');
        }, 30);
      })
      .catch(function () { loadMap(i + 1); });
  }

  window.addEventListener('DOMContentLoaded', function () {
    if (!window.THREE || !window.topojson) {
      $('load-msg').textContent = 'ライブラリを読み込めませんでした。通信環境を確認してください。';
      return;
    }
    initThree();
    initControls();
    initUI();
    addBackButton();
    loadMap(0);
    setInterval(updateHud, 1000);
  });

  /* デバッグ用（URLに ?debug=1 を付けたときだけコンソールから確認できる） */
  if (/[?&]debug=1/.test(location.search)) {
    window.__CQ = {
      state: function () {
        return { mapIds: mapIds.length, meshes: Object.keys(meshes).length,
          claims: claims, players: players, score: score, combo: combo,
          neighborsSample: neighborsOf['392'] };
      },
      tap: tapAt, quiz: startQuiz, claims: function () { return claims; },
      correctIndex: function () { return quizQ ? quizQ.correct : -1; },
      question: function () { return quizQ; },
      three: function () { return { scene: scene, camera: camera, raycaster: raycaster, mapGroup: mapGroup, meshes: meshes }; },
      addBackButton: addBackButton,
      applyState: applyState, pending: function () { return pending; },
      rankList: rankList, finish: finishGame, updateClock: updateClock,
      clock: function () {
        return { on: BLOCK_ON, from: BLOCK_FROM, to: BLOCK_TO,
          now: nowMin(), blocked: isBlocked(), minsLeft: minsLeft(), timeUp: timeUp };
      },
      /* 検証用: 時計をずらして、時間帯の判定を試す */
      setNow: function (hhmm) {
        var real = function () {
          var d = new Date();
          return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
        };
        var off = toMin(hhmm) - real();          // ずれは必ず本物の時計から測る
        nowMin = function () { return ((real() + off) % 1440 + 1440) % 1440; };
        updateClock();
      }
    };
  }
})();
