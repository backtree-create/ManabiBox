/* =========================================================
   manabi-juice.js  まなびの基板 共通演出・ごほうびスクリプト
   ---------------------------------------------------------
   各ゲームで1行読み込むだけで使える「土台」。
     <script src="../../manabi-juice.js"></script>   （games/○○/ から）
     <script src="manabi-juice.js"></script>         （ルート直下のゲーム）
   世界観（色・フォント）はゲーム側に残し、ここは動きと保存だけを担う。
   外部ライブラリなし・絵文字なし・prefers-reduced-motion に対応。

   使い方（すべて window.MJ）
   [演出]
     MJ.sfx(name)                 効果音  ok / ng / combo / clear / fail / stamp / coin / page / tap / record / levelup / type
     MJ.setMuted(bool) / MJ.muted()   消音（ゲーム側の音設定と合わせる）
     MJ.burst(target, opt)        パーティクル  target＝要素 or {x,y}。opt {color, colors, count, spread}
     MJ.pop(target, text, opt)    得点ポップ（上に浮いて消える）opt {color, size}
     MJ.shake(el, strength)       揺れ（誤答）
     MJ.flash(color)              画面フラッシュ（既定は赤）
     MJ.cutin(opt) → Promise      クリアのカットイン。opt {title, sub, rank, color, ms}
     MJ.countUp(el, to, opt)      数字のカウントアップ。opt {from, ms, format(n)}
     MJ.toast(text, opt)          画面上部の小さな通知。opt {color, ms}
     MJ.banner(text, opt)         「新記録」などの帯（中央）。opt {color, ms}
   [ごほうび]
     MJ.best(app, key)                     自己ベスト取得
     MJ.record(app, key, value, opt) → {isNew, prev}   自己ベスト更新（opt.lower=true で小さい方が良い）
     MJ.title(app, defs, value) → 称号     defs=[{min:0,name:'見習い'},…]。ハブのカードにも出る
     MJ.achieve(app, id, label) → bool     実績解除（初回だけ true＋通知）
     MJ.achievements(app) → {id:{label,at}}
   [学習効果]
     MJ.miss(app, id, data)   誤答を端末に貯める（同じ id は回数を加算）
     MJ.hit(app, id)          復習で正解したら消す
     MJ.misses(app) → [{id, data, n, at}]   新しい順
     MJ.clearMisses(app)
   ========================================================= */
(function (global) {
  'use strict';
  if (global.MJ) return;
  var doc = global.document;
  var KEY = 'manabi-juice:v1';          // ゲームごとの記録・称号・実績・誤答
  var KEY_TITLES = 'manabi-board:titles:v1'; // ハブのカードに出す称号
  var KEY_MUTE = 'manabi-juice:mute';

  function reduced() {
    try { return global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch (e) { return false; }
  }

  /* ---------------- 保存 ---------------- */
  /* 読み込みはメモリに控えておき、毎回 localStorage を解析しない（描画のたびに呼ばれても軽い） */
  var cache = null;
  function load() {
    if (cache) return cache;
    try { cache = JSON.parse(global.localStorage.getItem(KEY)) || {}; } catch (e) { cache = {}; }
    return cache;
  }
  function save(all) {
    cache = all;
    try { global.localStorage.setItem(KEY, JSON.stringify(all)); } catch (e) {}
  }
  global.addEventListener('storage', function (e) { if (!e.key || e.key === KEY) cache = null; });
  function slot(all, app) {
    if (!all[app]) all[app] = { best: {}, title: '', ach: {}, miss: {} };
    var s = all[app];
    s.best = s.best || {}; s.ach = s.ach || {}; s.miss = s.miss || {};
    return s;
  }

  /* ---------------- CSS ---------------- */
  var css = [
    '.mj-layer{position:fixed;inset:0;pointer-events:none;z-index:2147483000;overflow:hidden}',
    '.mj-canvas{position:absolute;inset:0;width:100%;height:100%}',
    '.mj-pop{position:absolute;transform:translate(-50%,-50%);font-weight:900;white-space:nowrap;',
    ' text-shadow:0 2px 0 rgba(0,0,0,.45),0 0 12px rgba(0,0,0,.25);letter-spacing:.02em;',
    ' animation:mjPop .9s cubic-bezier(.22,1,.36,1) forwards;font-variant-numeric:tabular-nums}',
    '@keyframes mjPop{0%{opacity:0;transform:translate(-50%,-30%) scale(.6)}',
    ' 18%{opacity:1;transform:translate(-50%,-70%) scale(1.15)}',
    ' 40%{transform:translate(-50%,-90%) scale(1)}',
    ' 100%{opacity:0;transform:translate(-50%,-190%) scale(.95)}}',
    '.mj-shake{animation:mjShake .38s cubic-bezier(.36,.07,.19,.97) both}',
    '@keyframes mjShake{10%,90%{transform:translateX(calc(var(--mj-s,6px)*-.3))}',
    ' 20%,80%{transform:translateX(calc(var(--mj-s,6px)*.6))}',
    ' 30%,50%,70%{transform:translateX(calc(var(--mj-s,6px)*-1))}',
    ' 40%,60%{transform:translateX(var(--mj-s,6px))}}',
    '.mj-flash{position:absolute;inset:0;opacity:0;animation:mjFlash .36s ease-out forwards}',
    '@keyframes mjFlash{0%{opacity:.32}100%{opacity:0}}',
    /* カットイン */
    '.mj-cut{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:auto;',
    ' background:rgba(6,10,18,.0);animation:mjDim .25s ease-out forwards}',
    '@keyframes mjDim{to{background:rgba(6,10,18,.45)}}',
    '.mj-cut.out{animation:mjOut .3s ease-in forwards}',
    '@keyframes mjOut{from{opacity:1}to{opacity:0}}',
    '.mj-band{position:relative;width:100%;padding:22px 16px 20px;text-align:center;color:#fff;',
    ' background:linear-gradient(90deg,transparent,var(--mj-c,#d9a441) 12%,var(--mj-c,#d9a441) 88%,transparent);',
    ' clip-path:inset(0 50% 0 50%);animation:mjBand .45s cubic-bezier(.22,1,.36,1) .05s forwards;',
    ' box-shadow:0 10px 30px rgba(0,0,0,.25)}',
    '@keyframes mjBand{to{clip-path:inset(0 0 0 0)}}',
    '.mj-band .t{font-size:clamp(26px,6vmin,46px);font-weight:900;letter-spacing:.08em;line-height:1.1;',
    ' text-shadow:0 3px 0 rgba(0,0,0,.28);opacity:0;transform:translateY(14px);',
    ' animation:mjUp .45s cubic-bezier(.22,1,.36,1) .3s forwards}',
    '.mj-band .s{margin-top:6px;font-size:clamp(13px,2.6vmin,17px);font-weight:700;letter-spacing:.06em;',
    ' opacity:0;transform:translateY(10px);animation:mjUp .4s cubic-bezier(.22,1,.36,1) .42s forwards}',
    '@keyframes mjUp{to{opacity:1;transform:none}}',
    '.mj-stamp{position:absolute;right:max(16px,8vw);top:50%;width:clamp(76px,15vmin,120px);aspect-ratio:1;',
    ' margin-top:calc(clamp(76px,15vmin,120px)/-2);border-radius:50%;display:flex;align-items:center;justify-content:center;',
    ' font-size:clamp(38px,8vmin,64px);font-weight:900;color:#fff;background:#c8452f;',
    ' border:5px solid #fff;box-shadow:0 0 0 4px #c8452f,0 12px 24px rgba(0,0,0,.35);',
    ' opacity:0;transform:scale(2.6) rotate(-18deg);animation:mjStamp .32s cubic-bezier(.5,1.6,.6,1) .7s forwards}',
    '@keyframes mjStamp{to{opacity:1;transform:scale(1) rotate(-12deg)}}',
    /* 通知 */
    '.mj-toast{position:absolute;left:50%;top:max(14px,env(safe-area-inset-top));transform:translate(-50%,-140%);',
    ' max-width:min(92vw,520px);padding:10px 18px;border-radius:999px;font-size:14px;font-weight:700;',
    ' color:#fff;background:var(--mj-c,rgba(20,28,44,.95));border:1px solid rgba(255,255,255,.22);box-shadow:0 8px 22px rgba(0,0,0,.28);z-index:3;',
    ' animation:mjToast var(--mj-ms,2.4s) cubic-bezier(.22,1,.36,1) forwards;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '@keyframes mjToast{0%{transform:translate(-50%,-140%)}12%,86%{transform:translate(-50%,0)}100%{transform:translate(-50%,-140%)}}',
    '.mj-banner{position:absolute;left:0;right:0;top:38%;text-align:center;font-size:clamp(22px,5vmin,36px);',
    ' font-weight:900;letter-spacing:.12em;color:#fff;padding:10px 0;z-index:3;',
    ' background:linear-gradient(90deg,transparent,var(--mj-c,#c8452f) 20%,var(--mj-c,#c8452f) 80%,transparent);',
    ' text-shadow:0 2px 0 rgba(0,0,0,.3);animation:mjBanner var(--mj-ms,1.6s) cubic-bezier(.22,1,.36,1) forwards}',
    '@keyframes mjBanner{0%{opacity:0;transform:scaleY(0)}12%{opacity:1;transform:scaleY(1.1)}20%{transform:scaleY(1)}',
    ' 82%{opacity:1}100%{opacity:0;transform:translateY(-10px)}}',
    '@media (prefers-reduced-motion: reduce){.mj-pop,.mj-band,.mj-band .t,.mj-band .s,.mj-stamp,.mj-toast,.mj-banner{animation-duration:.01s!important;animation-delay:0s!important}',
    ' .mj-shake{animation:none}}'
  ].join('\n');

  var layer = null, canvas = null, ctx = null;
  function ensure() {
    if (layer || !doc || !doc.body) return layer;
    var st = doc.createElement('style'); st.id = 'mj-style'; st.textContent = css;
    doc.head.appendChild(st);
    layer = doc.createElement('div'); layer.className = 'mj-layer'; layer.setAttribute('aria-hidden', 'true');
    canvas = doc.createElement('canvas'); canvas.className = 'mj-canvas';
    layer.appendChild(canvas); doc.body.appendChild(layer);
    ctx = canvas.getContext('2d');
    resize(); global.addEventListener('resize', resize);
    return layer;
  }
  function resize() {
    if (!canvas) return;
    var d = Math.min(2, global.devicePixelRatio || 1);
    canvas.width = Math.round(global.innerWidth * d); canvas.height = Math.round(global.innerHeight * d);
    ctx.setTransform(d, 0, 0, d, 0, 0);
  }
  function pointOf(t) {
    if (!t) return { x: global.innerWidth / 2, y: global.innerHeight / 2 };
    if (typeof t.x === 'number' && typeof t.y === 'number' && !t.getBoundingClientRect) return t;
    var r = t.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  /* ---------------- 効果音（WebAudio） ---------------- */
  var AC = null, muted = false;
  try { muted = global.localStorage.getItem(KEY_MUTE) === '1'; } catch (e) {}
  function ac() {
    if (!AC) {
      var C = global.AudioContext || global.webkitAudioContext;
      if (!C) return null;
      try { AC = new C(); } catch (e) { return null; }
    }
    if (AC.state === 'suspended') { try { AC.resume(); } catch (e) {} }
    return AC;
  }
  ['pointerdown', 'touchend', 'keydown'].forEach(function (ev) {
    global.addEventListener(ev, function () { if (AC && AC.state === 'suspended') { try { AC.resume(); } catch (e) {} } }, { passive: true });
  });
  function tone(f, t, d, type, v, f2) {
    var c = AC, o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v || 0.12, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + d + 0.02);
  }
  function noise(t, d, v, hp) {
    var c = AC, n = Math.floor(c.sampleRate * d), b = c.createBuffer(1, n, c.sampleRate), a = b.getChannelData(0);
    for (var i = 0; i < n; i++) a[i] = (Math.random() * 2 - 1) * (1 - i / n);
    var s = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = hp || 800;
    g.gain.value = v || 0.1; s.buffer = b; s.connect(f); f.connect(g); g.connect(c.destination); s.start(t);
  }
  var SFX = {
    tap: function (t) { tone(880, t, 0.05, 'square', 0.05); },
    type: function (t) { tone(1400 + Math.random() * 200, t, 0.03, 'square', 0.035); },
    ok: function (t) { tone(784, t, 0.09, 'triangle', 0.14); tone(1175, t + 0.07, 0.16, 'triangle', 0.14); },
    ng: function (t) { tone(220, t, 0.16, 'sawtooth', 0.09, 150); tone(165, t + 0.1, 0.2, 'square', 0.06); },
    combo: function (t) { [0, 4, 7, 12].forEach(function (n, i) { tone(659 * Math.pow(2, n / 12), t + i * 0.045, 0.12, 'triangle', 0.11); }); },
    coin: function (t) { tone(988, t, 0.06, 'square', 0.07); tone(1319, t + 0.06, 0.18, 'square', 0.07); },
    page: function (t) { noise(t, 0.12, 0.08, 2400); },
    stamp: function (t) { noise(t, 0.08, 0.22, 200); tone(110, t, 0.18, 'sine', 0.25, 60); },
    clear: function (t) { [0, 4, 7, 12, 16].forEach(function (n, i) { tone(523 * Math.pow(2, n / 12), t + i * 0.08, 0.32, 'triangle', 0.12); }); },
    fail: function (t) { [7, 3, 0].forEach(function (n, i) { tone(330 * Math.pow(2, n / 12), t + i * 0.14, 0.26, 'triangle', 0.1); }); },
    record: function (t) { [0, 7, 12, 19].forEach(function (n, i) { tone(587 * Math.pow(2, n / 12), t + i * 0.07, 0.24, 'square', 0.06); }); noise(t + 0.28, 0.25, 0.05, 5000); },
    levelup: function (t) { tone(392, t, 0.5, 'triangle', 0.08, 1568); [0, 5, 9, 12].forEach(function (n, i) { tone(784 * Math.pow(2, n / 12), t + 0.25 + i * 0.06, 0.2, 'square', 0.05); }); }
  };
  function sfx(name) {
    if (muted || !SFX[name]) return;
    var c = ac(); if (!c) return;
    try { SFX[name](c.currentTime + 0.005); } catch (e) {}
  }

  /* ---------------- パーティクル ---------------- */
  var parts = [], running = false;
  function burst(target, opt) {
    opt = opt || {};
    if (reduced()) return;
    if (!ensure()) return;
    var p = pointOf(target);
    var colors = opt.colors || [opt.color || '#ffd166', '#ffffff', opt.color2 || '#ef8354'];
    var n = Math.min(80, opt.count || 22), sp = opt.spread || 1;
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, v = (2.2 + Math.random() * 4.6) * sp;
      parts.push({
        x: p.x, y: p.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2.2 * sp,
        r: 2 + Math.random() * 3.5, c: colors[i % colors.length],
        life: 0, max: 34 + Math.random() * 26, sq: Math.random() < 0.45, rot: Math.random() * 6
      });
    }
    if (!running) { running = true; global.requestAnimationFrame(step); }
  }
  function step() {
    if (!ctx) { running = false; return; }
    ctx.clearRect(0, 0, global.innerWidth, global.innerHeight);
    for (var i = parts.length - 1; i >= 0; i--) {
      var q = parts[i];
      q.life++; q.x += q.vx; q.y += q.vy; q.vy += 0.22; q.vx *= 0.985; q.rot += 0.2;
      var k = 1 - q.life / q.max;
      if (k <= 0) { parts.splice(i, 1); continue; }
      ctx.globalAlpha = Math.min(1, k * 1.6); ctx.fillStyle = q.c;
      if (q.sq) {
        ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot);
        ctx.fillRect(-q.r, -q.r * 0.5, q.r * 2, q.r); ctx.restore();
      } else { ctx.beginPath(); ctx.arc(q.x, q.y, q.r * k + 0.5, 0, 6.283); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    if (parts.length) global.requestAnimationFrame(step); else running = false;
  }

  /* ---------------- 得点ポップ・揺れ・フラッシュ ---------------- */
  function pop(target, text, opt) {
    opt = opt || {};
    if (!ensure()) return;
    var p = pointOf(target), el = doc.createElement('div');
    el.className = 'mj-pop'; el.textContent = text;
    el.style.left = p.x + 'px'; el.style.top = p.y + 'px';
    el.style.color = opt.color || '#ffd166';
    el.style.fontSize = (opt.size || 26) + 'px';
    layer.appendChild(el);
    setTimeout(function () { el.remove(); }, 950);
  }
  function shake(el, strength) {
    if (!el || reduced()) return;
    el.style.setProperty('--mj-s', (strength || 6) + 'px');
    el.classList.remove('mj-shake'); void el.offsetWidth; el.classList.add('mj-shake');
    setTimeout(function () { el.classList.remove('mj-shake'); }, 420);
  }
  function flash(color) {
    if (!ensure() || reduced()) return;
    var el = doc.createElement('div'); el.className = 'mj-flash';
    el.style.background = color || '#e63946'; layer.appendChild(el);
    setTimeout(function () { el.remove(); }, 400);
  }

  /* ---------------- カットイン ---------------- */
  function cutin(opt) {
    opt = opt || {};
    return new Promise(function (resolve) {
      if (!ensure()) return resolve();
      var wrap = doc.createElement('div'); wrap.className = 'mj-cut';
      var band = doc.createElement('div'); band.className = 'mj-band';
      band.style.setProperty('--mj-c', opt.color || '#d9a441');
      var t = doc.createElement('div'); t.className = 't'; t.textContent = opt.title || 'CLEAR';
      band.appendChild(t);
      if (opt.sub) { var s = doc.createElement('div'); s.className = 's'; s.textContent = opt.sub; band.appendChild(s); }
      if (opt.rank) {
        var st = doc.createElement('div'); st.className = 'mj-stamp'; st.textContent = opt.rank;
        if (opt.stampColor) { st.style.background = opt.stampColor; st.style.boxShadow = '0 0 0 4px ' + opt.stampColor + ',0 12px 24px rgba(0,0,0,.35)'; }
        band.appendChild(st);
        setTimeout(function () { sfx('stamp'); }, reduced() ? 0 : 720);
      }
      wrap.appendChild(band); layer.appendChild(wrap);
      sfx(opt.sound || 'clear');
      setTimeout(function () { burst({ x: global.innerWidth / 2, y: global.innerHeight / 2 }, { count: 46, spread: 1.4, color: opt.color }); }, 300);
      var done = false;
      function close() {
        if (done) return; done = true;
        wrap.classList.add('out');
        setTimeout(function () { wrap.remove(); resolve(); }, 300);
      }
      wrap.addEventListener('pointerdown', close);
      setTimeout(close, opt.ms || 1900);
    });
  }

  /* ---------------- カウントアップ ---------------- */
  function countUp(el, to, opt) {
    opt = opt || {};
    if (!el) return;
    var from = opt.from || 0, ms = reduced() ? 0 : (opt.ms || 900);
    var fmt = opt.format || function (n) { return Math.round(n).toLocaleString('ja-JP'); };
    if (!ms) { el.textContent = fmt(to); return; }
    var t0 = null;
    function f(ts) {
      if (t0 === null) t0 = ts;
      var k = Math.min(1, (ts - t0) / ms), e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(from + (to - from) * e);
      if (k < 1) global.requestAnimationFrame(f);
    }
    global.requestAnimationFrame(f);
  }

  /* ---------------- 通知・帯 ---------------- */
  var toastQ = [], toastOn = false;
  function toast(text, opt) {
    toastQ.push({ text: text, opt: opt || {} });
    if (!toastOn) nextToast();
  }
  function nextToast() {
    var it = toastQ.shift();
    if (!it || !ensure()) { toastOn = false; return; }
    toastOn = true;
    var ms = it.opt.ms || 2400, el = doc.createElement('div');
    el.className = 'mj-toast'; el.textContent = it.text;
    el.style.setProperty('--mj-ms', ms + 'ms');
    if (it.opt.color) el.style.setProperty('--mj-c', it.opt.color);
    layer.appendChild(el);
    setTimeout(function () { el.remove(); nextToast(); }, ms);
  }
  function banner(text, opt) {
    opt = opt || {};
    if (!ensure()) return;
    var ms = opt.ms || 1600, el = doc.createElement('div');
    el.className = 'mj-banner'; el.textContent = text;
    el.style.setProperty('--mj-ms', ms + 'ms');
    if (opt.color) el.style.setProperty('--mj-c', opt.color);
    layer.appendChild(el);
    sfx(opt.sound || 'record');
    setTimeout(function () { el.remove(); }, ms);
  }

  /* ---------------- 自己ベスト・称号・実績 ---------------- */
  function best(app, key) {
    var s = load()[app]; return s && s.best ? s.best[key] : undefined;
  }
  function record(app, key, value, opt) {
    opt = opt || {};
    var all = load(), s = slot(all, app), prev = s.best[key];
    var isNew = (prev === undefined) || (opt.lower ? value < prev : value > prev);
    if (isNew) { s.best[key] = value; save(all); }
    return { isNew: isNew && prev !== undefined, first: prev === undefined, prev: prev };
  }
  function title(app, defs, value) {
    var name = '';
    (defs || []).slice().sort(function (a, b) { return a.min - b.min; })
      .forEach(function (d) { if (value >= d.min) name = d.name; });
    var all = load(), s = slot(all, app), old = s.title;
    if (name && name !== old) {
      s.title = name; save(all);
      try {
        var t = JSON.parse(global.localStorage.getItem(KEY_TITLES) || '{}');
        t[app] = name; global.localStorage.setItem(KEY_TITLES, JSON.stringify(t));
      } catch (e) {}
      if (old) { toast('称号「' + name + '」になった', { color: '#7a4ad9' }); sfx('levelup'); }
    }
    return name || old || '';
  }
  function titleOf(app) { var s = load()[app]; return (s && s.title) || ''; }
  function achieve(app, id, label) {
    var all = load(), s = slot(all, app);
    if (s.ach[id]) return false;
    s.ach[id] = { label: label || id, at: Date.now() }; save(all);
    toast('実績「' + (label || id) + '」', { color: '#2a7f62' }); sfx('coin');
    return true;
  }
  function achievements(app) { var s = load()[app]; return (s && s.ach) || {}; }

  /* ---------------- 誤答の復習 ---------------- */
  var MISS_MAX = 200;
  function miss(app, id, data) {
    if (id === undefined || id === null) return;
    var all = load(), s = slot(all, app), k = String(id), m = s.miss[k];
    s.miss[k] = { data: data, n: (m ? m.n : 0) + 1, at: Date.now() };
    var keys = Object.keys(s.miss);
    if (keys.length > MISS_MAX) {
      keys.sort(function (a, b) { return s.miss[a].at - s.miss[b].at; })
        .slice(0, keys.length - MISS_MAX).forEach(function (x) { delete s.miss[x]; });
    }
    save(all);
  }
  function hit(app, id) {
    var all = load(), s = all[app];
    if (s && s.miss && s.miss[String(id)]) { delete s.miss[String(id)]; save(all); return true; }
    return false;
  }
  function misses(app) {
    var s = load()[app]; if (!s || !s.miss) return [];
    return Object.keys(s.miss).map(function (k) { var m = s.miss[k]; return { id: k, data: m.data, n: m.n, at: m.at }; })
      .sort(function (a, b) { return b.at - a.at; });
  }
  function clearMisses(app) { var all = load(); if (all[app]) { all[app].miss = {}; save(all); } }

  global.MJ = {
    sfx: sfx, setMuted: function (b) { muted = !!b; try { global.localStorage.setItem(KEY_MUTE, b ? '1' : '0'); } catch (e) {} },
    muted: function () { return muted; },
    burst: burst, pop: pop, shake: shake, flash: flash, cutin: cutin, countUp: countUp, toast: toast, banner: banner,
    best: best, record: record, title: title, titleOf: titleOf, achieve: achieve, achievements: achievements,
    miss: miss, hit: hit, misses: misses, clearMisses: clearMisses,
    reduced: reduced
  };
})(window);
