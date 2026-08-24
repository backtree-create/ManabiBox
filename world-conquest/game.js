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
  var online = false;          // みんなで対戦モードか
  var claims = {};             // cid -> [pid, color, ts]
  var players = {};            // pid -> [nick, score, color, ts]
  var score = 0, combo = 0, correct = 0, wrong = 0, sessionCaptures = 0;
  var locks = {};              // cid -> 解除時刻（自分の誤答ロック）
  var earned = {};             // 一度きりボーナスの記録
  var current = null;          // 選択中の国 cid
  var quizTimer = null, quizDeadline = 0, quizStart = 0;
  var pollHandle = null, netBusy = false;

  /* ---------- three.js ---------- */
  var scene, camera, renderer, raycaster, mapGroup;
  var meshes = {};             // cid -> Mesh
  var neighborsOf = {};        // cid -> [cid,...]（TopoJSONの隣接情報から）
  var mapIds = [];             // 描画された登録国の cid 一覧
  var SC = 120;                // 投影スケール
  var BOUNDS = { x: 0.8707 * Math.PI * SC, y: 1.44 * SC };
  var camMinZ = 26, camMaxZ = 900, camFitZ = 500;
  var BASE_LAND = 0x46586e, HOVER_LAND = 0x60778f, GRAY_LAND = 0x2e3947;

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
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x0a1626);
    wrap.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(40, 1, 1, 3000);
    raycaster = new THREE.Raycaster();
    mapGroup = new THREE.Group();
    scene.add(mapGroup);

    // 海（背景の大きな板）
    var sea = new THREE.Mesh(
      new THREE.PlaneGeometry(BOUNDS.x * 4, BOUNDS.y * 4),
      new THREE.MeshBasicMaterial({ color: 0x0d1e33 }));
    sea.position.z = -0.5;
    scene.add(sea);

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
    camFitZ = Math.max(BOUNDS.x / (t * camera.aspect), BOUNDS.y / t) * 1.06;
    camMaxZ = camFitZ * 1.15;
    if (!camera.userData.placed) {
      camera.position.set(0, 0, camFitZ);
      camera.userData.placed = true;
    }
    camera.position.z = Math.min(camera.position.z, camMaxZ);
    camera.updateProjectionMatrix();
    needsRender = true;
  }

  var needsRender = true;
  function animate() {
    requestAnimationFrame(animate);
    if (needsRender) { renderer.render(scene, camera); needsRender = false; }
  }
  function redraw() { needsRender = true; }

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
        var shape = new THREE.Shape();
        rings[0].forEach(function (pt, i) {
          var p = project(pt[0], pt[1]);
          if (i === 0) shape.moveTo(p[0], p[1]); else shape.lineTo(p[0], p[1]);
        });
        for (var h = 1; h < rings.length; h++) {
          var hole = new THREE.Path();
          rings[h].forEach(function (pt, i) {
            var p = project(pt[0], pt[1]);
            if (i === 0) hole.moveTo(p[0], p[1]); else hole.lineTo(p[0], p[1]);
          });
          shape.holes.push(hole);
        }
        byId[id].shapes.push(shape);
        // 国境線
        rings.forEach(function (ring) {
          for (var i = 0; i < ring.length - 1; i++) {
            var a = project(ring[i][0], ring[i][1]);
            var b = project(ring[i + 1][0], ring[i + 1][1]);
            borderPts.push(a[0], a[1], 0.25, b[0], b[1], 0.25);
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
      var mat = new THREE.MeshBasicMaterial({ color: known ? BASE_LAND : GRAY_LAND, side: THREE.DoubleSide });
      var mesh = new THREE.Mesh(geo, mat);
      mesh.userData = { cid: id, known: known, en: entry.en };
      mapGroup.add(mesh);
      meshes[id] = mesh;
      if (known) mapIds.push(id);
    });

    var bGeo = new THREE.BufferGeometry();
    bGeo.setAttribute('position', new THREE.Float32BufferAttribute(borderPts, 3));
    mapGroup.add(new THREE.LineSegments(bGeo,
      new THREE.LineBasicMaterial({ color: 0x0a1626, transparent: true, opacity: 0.9 })));
    redraw();
  }

  /* 所有状況をメッシュ色に反映 */
  function paintAll() {
    mapIds.forEach(function (cid) {
      var m = meshes[cid], c = claims[cid];
      if (c) {
        m.material.color.set(c[1]);
        m.position.z = (c[0] === me.pid) ? 1.6 : 0.9;
      } else {
        m.material.color.set(BASE_LAND);
        m.position.z = 0;
      }
    });
    redraw();
    updateHud();
    renderRanking();
  }

  /* ---------- カメラ操作（パン・ピンチ・タップ） ---------- */
  var pointers = {}, panStart = null, pinchStart = null, moved = 0, downAt = 0;

  function screenToWorldZ0(px, py) {
    var v = new THREE.Vector3((px / window.innerWidth) * 2 - 1, -(py / window.innerHeight) * 2 + 1, 0.5);
    v.unproject(camera);
    var dir = v.sub(camera.position).normalize();
    var t = -camera.position.z / dir.z;
    return camera.position.clone().add(dir.multiplyScalar(t));
  }
  function clampCam() {
    var margin = 0.35 * camera.position.z;
    camera.position.x = Math.max(-BOUNDS.x, Math.min(BOUNDS.x, camera.position.x));
    camera.position.y = Math.max(-BOUNDS.y - margin * 0.1, Math.min(BOUNDS.y + margin * 0.1, camera.position.y));
    camera.position.z = Math.max(camMinZ, Math.min(camMaxZ, camera.position.z));
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
      camera.position.z *= (e.deltaY > 0 ? 1.12 : 0.89);
      clampCam(); redraw();
    }, { passive: false });

    $('btn-home').addEventListener('click', function () {
      camera.position.set(0, 0, camFitZ); clampCam(); redraw();
    });
  }

  function tapAt(px, py) {
    var v = new THREE.Vector2((px / window.innerWidth) * 2 - 1, -(py / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(v, camera);
    var hits = raycaster.intersectObjects(mapGroup.children.filter(function (o) { return o.isMesh; }));
    if (!hits.length) { hideInfo(); return; }
    var ud = hits[0].object.userData;
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

  function showInfo(cid, ud) {
    current = cid;
    var card = $('info');
    var d = COUNTRIES[cid];
    if (!d) {
      card.innerHTML =
        '<div class="i-head"><div class="i-name">' + esc(ud.en || '不明な地域') + '</div></div>' +
        '<div class="i-sub">この地域は今回の対象外です</div>';
      card.classList.add('show');
      return;
    }
    var own = ownerName(cid);
    var mine = own && own.pid === me.pid;
    var lockLeft = Math.max(0, (locks[cid] || 0) - Date.now());
    var protLeft = own && !mine ? Math.max(0, PROTECT_MS - (Date.now() - own.ts)) : 0;

    var status;
    if (mine) status = '<span class="tag tag-mine">あなたの領地</span>';
    else if (own) status = '<span class="tag" style="background:' + own.color + '">' + esc(own.nick) + ' の領地</span>';
    else status = '<span class="tag tag-free">まだ誰のものでもない</span>';

    var html =
      '<div class="i-head">' +
      '<img class="i-flag" src="' + FLAG(d[3]) + '" alt="国旗" onerror="this.style.display=\'none\'">' +
      '<div><div class="i-name">' + esc(d[0]) + '</div>' +
      '<div class="i-sub">' + esc(d[2]) + '州' + (mine && d[1] ? '　首都: ' + esc(d[1]) : '') + '</div></div></div>' +
      '<div class="i-status">' + status + '</div>';

    if (mine) {
      html += '<div class="i-sub">この国はあなたの色にぬられています。守りぬこう!</div>';
    } else if (protLeft > 0) {
      html += '<div class="i-sub">🛡 占領直後のため保護中（あと' + Math.ceil(protLeft / 1000) + '秒）</div>';
    } else if (lockLeft > 0) {
      html += '<div class="i-sub">⏳ 不正解のため休けい中（あと' + Math.ceil(lockLeft / 1000) + '秒）</div>';
    } else {
      html += '<button class="btn btn-go" id="btn-challenge">' +
        (own ? '⚔️ うばいに行く（クイズ）' : '🚩 クイズに挑戦して占領する') + '</button>';
    }
    card.innerHTML = html;
    card.classList.add('show');
    var b = $('btn-challenge');
    if (b) b.addEventListener('click', function () { startQuiz(cid, !!own); });
  }
  function hideInfo() { $('info').classList.remove('show'); current = null; }

  /* ---------- クイズ生成 ---------- */
  function sameContinent(cid) {
    var cont = COUNTRIES[cid][2];
    return mapIds.filter(function (id) { return id !== cid && COUNTRIES[id][2] === cont; });
  }
  function makeQuestion(cid, isSteal) {
    var d = COUNTRIES[cid];
    var types = [];
    var trivia = (typeof TRIVIA !== 'undefined' && TRIVIA[cid]) || [];
    trivia.forEach(function (t, i) { types.push(['trivia', i]); });
    if (d[1]) { types.push(['capital'], ['capitalRev']); }
    types.push(['flagQ'], ['flagPick'], ['continent']);
    // うばう時は難しめ（特色・首都系を優先）
    if (isSteal) {
      var hard = types.filter(function (t) { return t[0] === 'trivia' || t[0] === 'capital' || t[0] === 'capitalRev'; });
      if (hard.length) types = hard;
    }
    var t = types[Math.floor(Math.random() * types.length)];
    var near = sameContinent(cid);
    var q = { img: null, choices: [], correct: 0, text: '' };

    if (t[0] === 'trivia') {
      var tv = trivia[t[1]];
      q.text = tv.q;
      var order = shuffle([0, 1, 2, 3]);
      q.choices = order.map(function (i) { return { label: tv.c[i] }; });
      q.correct = order.indexOf(0);
    } else if (t[0] === 'capital') {
      q.text = '「' + d[0] + '」の首都はどこ?';
      var caps = pick(near.filter(function (id) { return COUNTRIES[id][1] && COUNTRIES[id][1] !== d[1]; }), 3).map(function (id) { return COUNTRIES[id][1]; });
      q.choices = shuffle([d[1]].concat(caps)).map(function (c) { return { label: c }; });
      q.correct = q.choices.findIndex(function (c) { return c.label === d[1]; });
    } else if (t[0] === 'capitalRev') {
      q.text = '首都が「' + d[1] + '」の国はどこ?';
      var names = pick(near, 3).map(function (id) { return COUNTRIES[id][0]; });
      q.choices = shuffle([d[0]].concat(names)).map(function (c) { return { label: c }; });
      q.correct = q.choices.findIndex(function (c) { return c.label === d[0]; });
    } else if (t[0] === 'flagQ') {
      q.text = 'この国旗はどの国のもの?';
      q.img = FLAG(d[3], 320);
      var names2 = pick(near, 3).map(function (id) { return COUNTRIES[id][0]; });
      q.choices = shuffle([d[0]].concat(names2)).map(function (c) { return { label: c }; });
      q.correct = q.choices.findIndex(function (c) { return c.label === d[0]; });
    } else if (t[0] === 'flagPick') {
      q.text = '「' + d[0] + '」の国旗はどれ?';
      var flags = pick(near, 3).map(function (id) { return COUNTRIES[id][3]; });
      var opts = shuffle([d[3]].concat(flags));
      q.choices = opts.map(function (f) { return { flag: FLAG(f, 160) }; });
      q.correct = opts.indexOf(d[3]);
    } else {
      q.text = '「' + d[0] + '」がある州はどこ?';
      var conts = shuffle([d[2]].concat(pick(CONTINENTS, 3, [d[2]])));
      q.choices = conts.map(function (c) { return { label: c + '州' }; });
      q.correct = conts.indexOf(d[2]);
    }
    return q;
  }

  /* ---------- クイズ画面 ---------- */
  var quizCid = null, quizSteal = false, quizQ = null, answered = false;

  function startQuiz(cid, isSteal) {
    hideInfo();
    quizCid = cid; quizSteal = isSteal; answered = false;
    quizQ = makeQuestion(cid, isSteal);
    var d = COUNTRIES[cid];

    $('q-country').textContent = d[0] + (isSteal ? '（うばう!）' : '');
    $('q-text').textContent = quizQ.text;
    var im = $('q-img');
    if (quizQ.img) { im.src = quizQ.img; im.style.display = 'block'; } else { im.style.display = 'none'; }

    var box = $('q-choices');
    box.innerHTML = '';
    quizQ.choices.forEach(function (c, i) {
      var b = document.createElement('button');
      b.className = 'choice';
      if (c.flag) b.innerHTML = '<img src="' + c.flag + '" alt="国旗の選択肢" onerror="this.parentNode.textContent=\'（画像が読めません）\'">';
      else b.textContent = c.label;
      b.addEventListener('click', function () { answer(i, b); });
      box.appendChild(b);
    });

    $('quiz').classList.add('show');
    quizStart = Date.now();
    quizDeadline = quizStart + QUIZ_SEC * 1000;
    if (quizTimer) clearInterval(quizTimer);
    quizTimer = setInterval(function () {
      var left = quizDeadline - Date.now();
      $('q-bar').style.width = Math.max(0, left / (QUIZ_SEC * 10)) + '%';
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
    var box = $('q-choices');
    var kids = box.children;
    if (kids[quizQ.correct]) kids[quizQ.correct].classList.add('right');
    if (!ok && btn) btn.classList.add('wrongC');
    for (var k = 0; k < kids.length; k++) kids[k].disabled = true;

    setTimeout(function () {
      closeQuiz();
      if (ok) onCorrect(); else onWrong();
    }, ok ? 650 : 1200);
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

  function applyState(st) {
    if (!st) return;
    var before = {};
    myCids().forEach(function (id) { before[id] = 1; });
    claims = st.c || {};
    players = st.p || {};
    // 自分の情報は常に最新に
    if (!players[me.pid]) players[me.pid] = [me.nick, score, me.color, Date.now()];
    else { players[me.pid][0] = me.nick; players[me.pid][1] = score; players[me.pid][2] = me.color; }
    // うばわれ通知
    myCids().forEach(function (id) { delete before[id]; });
    Object.keys(before).forEach(function (id) {
      var o = ownerName(id);
      if (o && o.pid !== me.pid) {
        SND.steal();
        toast('😱 ' + esc(o.nick) + ' に「' + esc(COUNTRIES[id][0]) + '」をうばわれた!');
      }
    });
    paintAll();
  }

  function sendClaim(cid) {
    if (!online) { paintAll(); return; }
    api(null, { m: 'claim', cid: cid, pid: me.pid, nick: me.nick, color: me.color, score: score })
      .then(function (r) {
        if (r.ok) { applyState(r.state); }
        else if (r.err === 'protected') {
          toast('🛡 一歩おそかった! この国は保護中です（あと' + (r.wait || '?') + '秒）');
          applyState(r.state);
        }
      })
      .catch(function () { toast('⚠ 通信エラー: 記録できませんでした'); });
  }

  function poll() {
    if (!online || netBusy || document.hidden) return;
    netBusy = true;
    api({ mode: 'state', room: room })
      .then(function (r) { if (r.ok) applyState(r.state); })
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
    $('hud-combo').textContent = combo >= 2 ? '🔥' + combo : '-';
  }

  function renderRanking() {
    if (players[me.pid]) players[me.pid][1] = score;   // 自分のスコアは常に最新を表示
    var list = Object.keys(players).map(function (pid) {
      var p = players[pid];
      var cnt = mapIds.filter(function (id) { return claims[id] && claims[id][0] === pid; }).length;
      return { pid: pid, nick: p[0], score: p[1] || 0, color: p[2], cnt: cnt };
    }).sort(function (a, b) { return b.score - a.score; });

    var html = list.slice(0, 15).map(function (p, i) {
      var meCls = p.pid === me.pid ? ' rk-me' : '';
      return '<div class="rk-row' + meCls + '">' +
        '<span class="rk-pos">' + (i + 1) + '</span>' +
        '<span class="rk-dot" style="background:' + p.color + '"></span>' +
        '<span class="rk-nick">' + esc(p.nick) + '</span>' +
        '<span class="rk-cnt">' + p.cnt + '国</span>' +
        '<span class="rk-score">' + p.score + '</span></div>';
    }).join('');
    $('rank-list').innerHTML = html || '<div class="rk-row">まだ誰もいません</div>';
  }

  function toast(html) {
    var t = document.createElement('div');
    t.className = 'toast';
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
    toast('<div class="rt-head ' + (ok ? 'rt-ok' : 'rt-ng') + '">' +
      (ok ? '⭕ ' : '❌ ') + esc(d[0]) + '</div>' + rows +
      (pts ? '<div class="rt-total">合計 +' + pts + 'pt</div>' : ''));
  }

  function banner(text) {
    var b = $('banner');
    b.textContent = text;
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
      best: acc,
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
  function setColor() {
    // ニックネームから安定した色を割り当て（同じ人はいつも同じ色）
    var h = 0, s = me.pid + me.nick;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    me.color = PALETTE[h % PALETTE.length];
  }

  function begin(isOnline) {
    var nick = $('in-nick').value.trim().slice(0, 10);
    if (!nick) { $('in-nick').focus(); toast('ニックネームを入れてください（本名はダメ!）'); return; }
    me.nick = nick;
    room = ($('in-room').value.trim() || 'A').slice(0, 12);
    store('nick', nick); store('room', room);
    setColor();
    online = isOnline;

    $('start').classList.remove('show');
    $('hud').style.display = 'flex';
    $('side').style.display = 'block';
    $('mode-label').textContent = online ? '🌐 ' + room : '📴 練習';
    $('me-chip').innerHTML = '<span class="rk-dot" style="background:' + me.color + '"></span>' + esc(me.nick);

    players[me.pid] = [me.nick, 0, me.color, Date.now()];
    paintAll();

    if (online) {
      api(null, { m: 'join', pid: me.pid, nick: me.nick, color: me.color, score: 0 })
        .then(function (r) { if (r.ok) applyState(r.state); })
        .catch(function () { toast('⚠ サーバーに接続できません。練習モードとして続けます'); online = false; });
      startPolling();
    }
  }

  function initUI() {
    $('in-nick').value = store('nick') || '';
    $('in-room').value = store('room') || '';
    if (!ENDPOINT) {
      $('btn-online').disabled = true;
      $('btn-online').textContent = '🌐 みんなで対戦（先生の設定待ち）';
    }
    $('btn-online').addEventListener('click', function () { begin(true); });
    $('btn-solo').addEventListener('click', function () { begin(false); });
    $('btn-help').addEventListener('click', function () { $('help').classList.add('show'); });
    $('btn-help-close').addEventListener('click', function () { $('help').classList.remove('show'); });
    $('btn-finish').addEventListener('click', function () {
      maybeReport(true);
      banner('📤 きろくを送信しました! スコア ' + score + 'pt');
    });
    $('btn-rank').addEventListener('click', function () {
      $('side').classList.toggle('open');
    });
    $('q-close').addEventListener('click', function () {
      if (!answered) { answered = true; closeQuiz(); combo = 0; }
    });
    // 情報カード以外をタップしたら閉じる、はマップ側 tapAt で処理
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
      three: function () { return { scene: scene, camera: camera, raycaster: raycaster, mapGroup: mapGroup, meshes: meshes }; }
    };
  }
})();
