"use strict";
/* =====================================================================
   STONE QUEST ゲームエンジン
   (データの編集は data.js へ。このファイルは基本さわらなくてOK)
   ===================================================================== */

/* ---------------- まなびの基板(ManabiBox)連携 ----------------
   ハブの config.js / hub-progress.js が読み込めた環境でのみ動く。
   研究成功・エンディング時に「研究数 / 14」「文明度(0〜100点)」を送信する */
const MANABI_APP_KEY = "stone-quest";

function quizTotals(){
  const total = Object.values(S.quiz).reduce((a,r)=>a+r.total,0);
  const correct = Object.values(S.quiz).reduce((a,r)=>a+r.correct,0);
  return { total, correct, rate: total ? Math.round(correct/total*100) : 0 };
}

function reportToHub(){
  try{
    if(!window.LearnHub || !S) return;
    const qt = quizTotals();
    window.LearnHub.report({
      app:  MANABI_APP_KEY,
      done: S.techs.length,
      total: TECHS.length,
      best: Math.round(S.techs.length / TECHS.length * 1000), // 文明の進捗率を1000点満点で
      note: qt.total ? `正答率${qt.rate}% 仲間${S.statues}人` : "",
    });
  }catch(e){}
}

function hubBackLink(){
  const c = window.MANABI_CONFIG;
  if(!(window.LearnHub && c && c.backLink && c.hubUrl)) return "";
  return `<div class="center" style="margin-top:10px"><a href="${esc(c.hubUrl)}" style="color:var(--dim); font-size:12px">🏫 まなびの基板にもどる</a></div>`;
}

/* ---------------- 定数 ---------------- */
const TILE = 40;
const PX   = 4;
const VIEW_W = 24, VIEW_H = 15;
const MAP_W = 44, MAP_H = 28;
const SAVE_KEY = "stonequest_save_v2";

const cv  = document.getElementById("cv");
const ctx = cv.getContext("2d");
ctx.imageSmoothingEnabled = false;

/* =====================================================================
   サウンド(WebAudioでチップチューン生成。外部ファイル不要)
   ===================================================================== */
let actx = null, masterGain = null, musicGain = null, sfxGain = null;
let muted = false;
try{ muted = localStorage.getItem("sq_muted") === "1"; }catch(e){}
let bgmName = null, bgmTimer = null, bgmStep = 0;

function ensureAudio(){
  if(!actx){
    try{
      actx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = actx.createGain(); masterGain.connect(actx.destination);
      musicGain  = actx.createGain(); musicGain.connect(masterGain); musicGain.gain.value = 0.14;
      sfxGain    = actx.createGain(); sfxGain.connect(masterGain);   sfxGain.gain.value  = 0.30;
      masterGain.gain.value = muted ? 0 : 1;
      if(bgmName) startBgmTimer();
    }catch(e){}
  }
  if(actx && actx.state === "suspended") actx.resume();
}
document.addEventListener("pointerdown", ensureAudio);
document.addEventListener("touchend", ensureAudio);   /* iOS Safari はタップ(ユーザー操作)内で resume が必要 */
document.addEventListener("keydown", ensureAudio);

function tone(freq, dur, opt){
  if(!actx || muted || !freq) return;
  opt = opt || {};
  const t0 = actx.currentTime + (opt.when || 0);
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = opt.type || "square";
  o.frequency.setValueAtTime(freq, t0);
  if(opt.slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + opt.slide), t0 + dur);
  g.gain.setValueAtTime(opt.vol || 0.4, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g); g.connect(opt.dest || sfxGain);
  o.start(t0); o.stop(t0 + dur + 0.03);
}
function noise(dur, opt){
  if(!actx || muted) return;
  opt = opt || {};
  const t0 = actx.currentTime + (opt.when || 0);
  const len = Math.floor(actx.sampleRate * dur);
  const buf = actx.createBuffer(1, len, actx.sampleRate);
  const d = buf.getChannelData(0);
  for(let i=0; i<len; i++) d[i] = (Math.random()*2-1) * (1 - i/len);
  const src = actx.createBufferSource(); src.buffer = buf;
  const g = actx.createGain(); g.gain.value = opt.vol || 0.3;
  src.connect(g); g.connect(sfxGain);
  src.start(t0);
}
const midi = n => 440 * Math.pow(2, (n-69)/12);

const SFX = {
  hit(){    noise(0.07, {vol:0.5}); tone(midi(50), 0.09, {vol:0.4, slide:-40}); },
  hurt(){   tone(170, 0.16, {type:"sawtooth", vol:0.4, slide:-90}); },
  death(){  [64,60,55,48].forEach((n,i)=>tone(midi(n), 0.30, {type:"triangle", vol:0.5, when:i*0.24})); },
  fanfare(){
    [[60,0],[64,.12],[67,.24],[72,.36],[72,.60],[74,.72],[76,.84]]
      .forEach(p=>tone(midi(p[0]), 0.22, {vol:0.35, when:p[1]}));
    tone(midi(79), 0.55, {vol:0.4, when:1.02});
    tone(midi(67), 0.55, {type:"triangle", vol:0.35, when:1.02});
  },
  research(){ [60,64,67,72,76].forEach((n,i)=>tone(midi(n), 0.15, {type:"triangle", vol:0.45, when:i*0.09})); },
  craft(){  tone(1100, 0.06, {vol:0.3}); tone(1500, 0.09, {vol:0.3, when:0.11}); noise(0.05, {vol:0.2, when:0.11}); },
  gather(){ tone(midi(79), 0.07, {vol:0.25}); tone(midi(84), 0.10, {vol:0.25, when:0.07}); },
};

/* BGM(8分音符ステップのシーケンス。0=休符) */
const BGM_TRACKS = {
  camp: { tempo:260, leadType:"triangle", bassType:"triangle",
    lead:[72,0,0,0, 76,0,74,0, 72,0,0,0, 69,0,67,0,
          69,0,72,0, 0,0,74,0, 76,0,74,72, 69,0,0,0],
    bass:[48,0,55,0, 45,0,52,0, 43,0,50,0, 45,0,52,0] },
  dungeon: { tempo:165, leadType:"square", bassType:"triangle",
    lead:[57,0,60,62, 64,0,62,60, 57,0,60,62, 64,0,67,0,
          65,0,64,62, 60,0,62,64, 62,0,60,59, 57,0,0,0],
    bass:[45,45,0,45, 41,41,0,41, 43,43,0,43, 40,40,0,40] },
};
function playBGM(name){
  if(bgmName === name) return;
  bgmName = name; bgmStep = 0;
  if(bgmTimer){ clearInterval(bgmTimer); bgmTimer = null; }
  if(name && actx) startBgmTimer();
}
function startBgmTimer(){
  if(bgmTimer) clearInterval(bgmTimer);
  const tr = BGM_TRACKS[bgmName]; if(!tr) return;
  bgmTimer = setInterval(()=>{
    if(muted || !actx) return;
    const ln = tr.lead[bgmStep % tr.lead.length];
    const bn = tr.bass[bgmStep % tr.bass.length];
    if(ln) tone(midi(ln), 0.15, {type:tr.leadType, vol:0.5, dest:musicGain});
    if(bn) tone(midi(bn-12), 0.22, {type:tr.bassType, vol:0.55, dest:musicGain});
    bgmStep++;
  }, tr.tempo);
}

/* =====================================================================
   ドット絵定義 (10x10)
   ===================================================================== */
const SPRITES = {
  player: { colors:{o:"#7a4a20",f:"#f2c79b",w:"#20242a",c:"#3f8f4f",d:"#6b4423"},
    rows:[ "...oooo...",
           "..oooooo..",
           "..offffo..",
           "..fwffwf..",
           "...ffff...",
           "..cccccc..",
           ".c.cccc.c.",
           "..cccccc..",
           "...c..c...",
           "..dd..dd.." ]},
  statue: { colors:{o:"#8f8f8f",f:"#b0b0b0",w:"#606060",c:"#9a9a9a",d:"#7c7c7c"},
    rows:[ "...oooo...",
           "..oooooo..",
           "..offffo..",
           "..fwffwf..",
           "...ffff...",
           "..cccccc..",
           ".c.cccc.c.",
           "..cccccc..",
           "..cccccc..",
           ".cccccccc." ]},
  rat: { colors:{k:"#9a8f86",w:"#202020",t:"#d09a9a"},
    rows:[ "..........",
           "..........",
           ".kk...kk..",
           ".kkk.kkk..",
           ".kkkkkkk..",
           "kkwkkkwkk.",
           "kkkkkkkkkt",
           ".kkkkkkk..",
           "..k...k...",
           ".........." ]},
  dog: { colors:{k:"#8a8a92",w:"#e8e8e8",e:"#202020"},
    rows:[ "..........",
           ".kk.......",
           ".kkk......",
           ".kekkkkk..",
           ".kkkkkkkk.",
           ".kkkkkkk..",
           ".kk...kk..",
           ".kk...kk..",
           ".ww...ww..",
           ".........." ]},
  bat: { colors:{p:"#7a5a9a",w:"#e8e8e8",e:"#e05555"},
    rows:[ "..........",
           "..........",
           "p...pp...p",
           "pp.pppp.pp",
           "pppppppppp",
           ".ppeppep..",
           "..pppppp..",
           "...p..p...",
           "..........",
           ".........." ]},
  snake: { colors:{s:"#5a9a4a",e:"#e0e030",r:"#c04040"},
    rows:[ "..........",
           "..ssss....",
           ".sessse...",
           ".ssssss...",
           "..r.ss....",
           "....ss....",
           "..ssss....",
           ".ss.......",
           "..ssssss..",
           ".........." ]},
  wolf: { colors:{k:"#5a5a66",w:"#c8c8d0",e:"#e05555"},
    rows:[ ".k........",
           ".kk..kk...",
           ".kkkkkkk..",
           ".kekkkkkk.",
           ".kkkkkkkkk",
           ".kkkkkkk..",
           ".kk...kk..",
           ".kk...kk..",
           ".ww...ww..",
           ".........." ]},
  boar: { colors:{b:"#7a5230",w:"#f0f0e0",e:"#202020",d:"#5a3a20"},
    rows:[ "..........",
           "..bbbbbb..",
           ".bbbbbbbb.",
           "bbbbbbbbbb",
           "bebbbbbbbb",
           "bbwbbbbbb.",
           ".bbbbbbbb.",
           ".bb....bb.",
           ".dd....dd.",
           ".........." ]},
  bear: { colors:{k:"#6a4a2a",w:"#e8d8c8",e:"#202020"},
    rows:[ ".kk....kk.",
           ".kkk..kkk.",
           ".kkkkkkkk.",
           "kkekkkkekk",
           "kkkkwwkkkk",
           "kkkkkkkkkk",
           "kkkkkkkkkk",
           ".kkkkkkkk.",
           ".kk....kk.",
           ".ww....ww." ]},
  scorpion: { colors:{r:"#c05540",e:"#202020",d:"#8a3a2a"},
    rows:[ "r........r",
           "rr......rr",
           ".r.rrrr.r.",
           "..rrrrrr..",
           "..rerrer..",
           "..rrrrrr..",
           "...rrrr...",
           ".....d....",
           "....dd....",
           "....d....." ]},
  lizard: { colors:{o:"#d07030",e:"#e8e030",d:"#a05020"},
    rows:[ "..........",
           ".oo.......",
           ".oeo......",
           ".ooooooo..",
           ".ooooooood",
           ".ooooooo..",
           ".o..o.....",
           ".o..o.....",
           ".d..d.....",
           ".........." ]},
  golem: { colors:{g:"#7a86a0",e:"#e05555",d:"#5a6478"},
    rows:[ "..gggg....",
           "..geeg....",
           "..gggg....",
           "gggggggg..",
           "g.gggg.g..",
           "g.gggg.g..",
           "..gggg....",
           "..g..g....",
           "..g..g....",
           ".dd..dd..." ]},
  guard: { colors:{g:"#4a86a0",e:"#4fd1c5",d:"#2a5670"},
    rows:[ "...gg.....",
           "..gggg....",
           ".geeeeg...",
           ".gggggg...",
           "..gggg....",
           ".ggggggg..",
           "g..gg..g..",
           "...gg.....",
           "..g..g....",
           ".g....g..." ]},
};

/* ---- 装備の見た目 ---- */
const ARMOR_STYLE = {
  cloth:        { c:"#3f8f4f" },
  fur:          { c:"#8a5a30" },
  potteryarmor: { c:"#b0703c" },
  ironarmor:    { c:"#b8bcc4", helm:"#9aa2ae" },
  suit:         { c:"#d8c04e", helm:"#c0a83a" },
  alloy:        { c:"#58c8d8", helm:"#3aa8ba" },
};
const WEAPON_OVERLAYS = {
  club: { colors:{b:"#8a5a2b"},
    rows:[ "..........","..........","........bb","........bb","........b.",
           "........b.","........b.","..........","..........",".........." ]},
  stoneaxe: { colors:{b:"#8a5a2b",g:"#9aa0a8"},
    rows:[ "..........",".......gg.",".......ggg","........b.","........b.",
           "........b.","........b.","..........","..........",".........." ]},
  spear: { colors:{b:"#8a5a2b",g:"#9aa0a8"},
    rows:[ "........g.","........g.","........b.","........b.","........b.",
           "........b.","........b.","........b.","..........",".........." ]},
  bow: { colors:{b:"#8a5a2b",s:"#e8e8d0"},
    rows:[ "..........",".......bb.","......b..s","......b..s","......b..s",
           "......b..s",".......bb.","..........","..........",".........." ]},
  ironsword: { colors:{m:"#c8ccd4",h:"#6b4423"},
    rows:[ "..........","........m.","........m.","........m.","........m.",
           ".......mmm","........h.","..........","..........",".........." ]},
  ironspear: { colors:{b:"#8a5a2b",m:"#c8ccd4"},
    rows:[ "........m.","........m.","........m.","........b.","........b.",
           "........b.","........b.","........b.","..........",".........." ]},
  firebow: { colors:{b:"#8a5a2b",s:"#e8e8d0",r:"#e05530",y:"#f0c34e"},
    rows:[ "........y.",".......bry","......b..s","......b..s","......b..s",
           "......b..s",".......bb.","..........","..........",".........." ]},
  maglance: { colors:{m:"#c8ccd4",c:"#4fd1c5"},
    rows:[ "........c.",".......ccc","........m.","........m.","........m.",
           "........m.","........m.","........m.","..........",".........." ]},
};

function drawRows(rows, colors, px, py, mirror){
  for(let y=0; y<rows.length; y++){
    const row = rows[y];
    for(let x=0; x<row.length; x++){
      const c = colors[row[x]];
      if(c){
        const dx = mirror ? (9-x) : x;
        ctx.fillStyle = c;
        ctx.fillRect(px + dx*PX, py + y*PX, PX, PX);
      }
    }
  }
}
function drawSprite(name, px, py){
  const sp = SPRITES[name]; if(!sp) return;
  drawRows(sp.rows, sp.colors, px, py, false);
}
function drawShadow(px, py){
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(px + TILE/2, py + TILE - 3, 13, 4, 0, 0, Math.PI*2);
  ctx.fill();
}
function drawPlayer(px, py){
  const sp = SPRITES.player;
  const style = ARMOR_STYLE[S.gear.armor] || ARMOR_STYLE.cloth;
  const colors = Object.assign({}, sp.colors, { c: style.c });
  if(style.helm){ colors.o = style.helm; }
  drawShadow(px, py);
  drawRows(sp.rows, colors, px, py, false);
  const ov = WEAPON_OVERLAYS[S.gear.weapon];
  const mirror = D ? D.player.mir : false;
  if(ov) drawRows(ov.rows, ov.colors, px, py, mirror);
}

/* ---------------- ユーティリティ ---------------- */
const ri = n => Math.floor(Math.random()*n);
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
function shuffled(arr){
  const a = arr.slice();
  for(let i=a.length-1; i>0; i--){ const j = ri(i+1); [a[i],a[j]] = [a[j],a[i]]; }
  return a;
}
function esc(s){ return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

/* ---------------- 状態 ---------------- */
let S = null;
let D = null;
let Q = null;
let logs = [];
let effects = [];          // ヒットエフェクト {x,y,t0,dur}
let hurtUntil = 0;         // 被ダメージの赤フラッシュ

function addFx(x, y){ effects.push({x, y, t0:performance.now(), dur:220}); }

function newState(){
  return {
    inv:{}, items:{ medicine:0, revival:0 },
    techs:[], hp:PLAYER_BASE.maxhp,
    statues:0, defeated:0,
    quiz:{},
    gear:{ weapons:["club"], armors:["cloth"], weapon:"club", armor:"cloth" },
  };
}

function stats(){
  let mh = PLAYER_BASE.maxhp, atk = PLAYER_BASE.atk, def = PLAYER_BASE.def;
  for(const t of TECHS){
    if(!S.techs.includes(t.id)) continue;
    const e = t.effect || {};
    if(e.hp) mh += e.hp;
    if(e.atk) atk += e.atk;
    if(e.def) def += e.def;
  }
  const w = WEAPONS[S.gear.weapon] || WEAPONS.club;
  const a = ARMORS[S.gear.armor] || ARMORS.cloth;
  atk += w.atk; def += a.def;
  mh += S.statues * 10;
  return { maxhp:mh, atk, def, weapon:w, armor:a };
}

function weaponTypeLabel(w){
  if(w.type === "reach")  return `とどく:${w.range}マス`;
  if(w.type === "ranged") return `遠距離:${w.range}マス`;
  return "近接";
}

function eraComplete(n){ return TECHS.filter(t=>t.era===n).every(t=>S.techs.includes(t.id)); }
function completedEras(){ let n=0; while(n<4 && eraComplete(n+1)) n++; return n; }
function areaUnlocked(i){ return i===0 || eraComplete(i); }
function civPercent(){ return Math.round(S.techs.length / TECHS.length * 100); }

function save(){ try{ localStorage.setItem(SAVE_KEY, JSON.stringify(S)); }catch(e){} }
function loadSave(){
  try{
    const raw = localStorage.getItem(SAVE_KEY);
    if(!raw) return null;
    const s = Object.assign(newState(), JSON.parse(raw));
    s.items = Object.assign({ medicine:0, revival:0 }, s.items);
    s.gear  = Object.assign({ weapons:["club"], armors:["cloth"], weapon:"club", armor:"cloth" }, s.gear);
    if(!s.gear.weapons.includes("club")) s.gear.weapons.push("club");
    if(!s.gear.armors.includes("cloth")) s.gear.armors.push("cloth");
    return s;
  }catch(e){ return null; }
}

/* ---------------- ログ ---------------- */
function log(msg){
  logs.unshift(msg);
  if(logs.length > 30) logs.pop();
  const el = document.getElementById("log");
  el.innerHTML = logs.slice(0,8).map(m=>`<div>${esc(m)}</div>`).join("");
}

/* ---------------- サイドバー更新 ---------------- */
function updateSide(){
  const st = stats();
  S.hp = clamp(S.hp, 0, st.maxhp);
  const fill = document.getElementById("hpFill");
  fill.style.width = (S.hp/st.maxhp*100) + "%";
  fill.classList.toggle("low", S.hp/st.maxhp < 0.3);
  document.getElementById("hpText").textContent = `HP ${S.hp} / ${st.maxhp}`;
  document.getElementById("statText").textContent = `こうげき ${st.atk}　ぼうぎょ ${st.def}`;
  document.getElementById("equipText").textContent =
    `そうび: ${st.weapon.name}(${weaponTypeLabel(st.weapon)}) / ${st.armor.name}`;
  document.getElementById("herbCt").textContent = `×${S.inv.herb||0}`;
  document.getElementById("medCt").textContent = `×${S.items.medicine||0}`;
  document.getElementById("leaveBtn").style.display = (D ? "" : "none");
  document.getElementById("padWrap").classList.toggle("on", !!D);

  const ml = document.getElementById("matList");
  const rows = [];
  for(const key in MATERIALS){
    const n = S.inv[key] || 0;
    if(n > 0) rows.push(`<div class="matRow"><span class="n">${MATERIALS[key].name}</span><span>×${n}</span></div>`);
  }
  ml.innerHTML = rows.length ? rows.join("") : `<span style="color:var(--dim)">まだ何も持っていない</span>`;

  document.getElementById("civFill").style.width = civPercent() + "%";
  document.getElementById("civPct").textContent = civPercent() + "%";
  document.getElementById("eraName").textContent = CIV_STAGES[completedEras()];
}

/* ---------------- オーバーレイ ---------------- */
const overlay = document.getElementById("overlay");
const obox = document.getElementById("obox");
function showOverlay(html){ obox.innerHTML = html; overlay.classList.remove("hidden"); obox.scrollTop = 0; }
function hideOverlay(){ overlay.classList.add("hidden"); }

/* ---------------- グローバルAPI ---------------- */
const G = {};
window.G = G;

G.toggleMute = function(){
  muted = !muted;
  try{ localStorage.setItem("sq_muted", muted ? "1" : "0"); }catch(e){}
  if(masterGain) masterGain.gain.value = muted ? 0 : 1;
  document.getElementById("muteBtn").textContent = muted ? "🔇" : "🔊";
};

/* ================= タイトル ================= */
G.showTitle = function(){
  const has = !!loadSave();
  playBGM("camp");
  showOverlay(`
    <div class="titleLogo">
      <div class="big">STONE QUEST</div>
      <div class="small">―科学で文明を取りもどせ―</div>
    </div>
    <p class="center dim" style="line-height:2">
      ある日、なぞの光で人類のほとんどが石になってしまった。<br>
      数千年後、目覚めたキミの前にあるのは、文明が消えた原始の世界。<br>
      武器は<b style="color:var(--gold)">「科学の知識」</b>ただひとつ。<br>
      素材を集め、理科の力で技術を研究し、現代文明を取りもどせ!
    </p>
    <div class="center" style="margin-top:20px">
      ${has ? `<button class="primary" onclick="G.continueGame()">つづきから</button>` : ""}
      <button class="${has?'':'primary'}" onclick="G.startNew(${has})">はじめから</button>
      <button onclick="G.showHelp('title')">あそびかた</button>
    </div>`);
};

G.startNew = function(confirmNeeded){
  if(confirmNeeded && !confirm("セーブデータを消して最初からはじめますか?")) return;
  localStorage.removeItem(SAVE_KEY);
  S = newState();
  logs = [];
  log("目が覚めた…。ここから文明を取りもどす冒険がはじまる!");
  G.showCamp();
};

G.continueGame = function(){
  S = loadSave() || newState();
  log("冒険のつづきをはじめよう。");
  G.showCamp();
};

/* ================= 拠点 ================= */
G.showCamp = function(){
  D = null;
  playBGM("camp");
  const st = stats();
  S.hp = st.maxhp;
  save(); updateSide();
  const stage = CIV_STAGES[completedEras()];
  showOverlay(`
    <h2>⛺ 科学王国の拠点 <span class="tag">いまの文明:${esc(stage)}</span></h2>
    <p class="dim">拠点にもどると HP は全回復する。研究を進めて文明度100%を目指そう!<br>
    ⚠ ダンジョンでたおれると<b>持ち物の半分</b>を落としてしまうぞ。準備はしっかりと。</p>
    <div class="btns" style="margin-bottom:14px">
      <button class="primary" onclick="G.showResearch()">🔬 研究する(科学ロードマップ)</button>
      <button onclick="G.showWorkshop()">⚒ そうび工房</button>
      <button onclick="G.showAreas()">🗺 ダンジョンへ出発</button>
      <button onclick="G.showCraft()">🛠 道具づくり</button>
      <button onclick="G.showRecord()">📖 学習のきろく</button>
      <button onclick="G.showHelp('camp')">❓ あそびかた</button>
    </div>
    <p class="dim">研究ずみ: ${S.techs.length} / ${TECHS.length}　|　復活させた人: ${S.statues}人　|　たおした敵: ${S.defeated}体</p>
    <div class="center" style="margin-top:8px"><button onclick="G.confirmReset()">データをはじめから</button></div>
    ${hubBackLink()}`);
};

G.confirmReset = function(){
  if(confirm("本当にセーブデータを消しますか?")){ localStorage.removeItem(SAVE_KEY); location.reload(); }
};

/* ================= 研究(技術ツリー) ================= */
function costHtml(cost){
  return Object.entries(cost).map(([k,n])=>{
    const have = S.inv[k]||0;
    const ok = have >= n;
    return `<span class="${ok?'ok':'ng'}">${esc(MATERIALS[k].name)} ${have}/${n}</span>`;
  }).join("　");
}
function canAfford(cost){ return Object.entries(cost).every(([k,n]) => (S.inv[k]||0) >= n); }

G.showResearch = function(){
  const eraNames = {1:"時代1:石器の文明", 2:"時代2:農耕と金属の文明", 3:"時代3:エネルギーの文明", 4:"時代4:情報の文明"};
  let html = `<h2>🔬 科学ロードマップ <span class="tag">研究には素材と「理科の知識」(クイズ3問中2問正解)が必要</span></h2>`;
  for(let era=1; era<=4; era++){
    const open = era===1 || eraComplete(era-1);
    html += `<div class="eraHead">${eraNames[era]} ${open?"":"🔒(前の時代をすべて研究すると解放)"}</div>`;
    for(const t of TECHS.filter(t=>t.era===era)){
      const done = S.techs.includes(t.id);
      const reqOk = !t.req || S.techs.includes(t.req);
      const reqName = t.req ? (TECHS.find(x=>x.id===t.req)||{}).name : "";
      /* 解放前は ??? 表記(必要条件のみ表示) */
      if(!done && !(open && reqOk)){
        const hint = !open
          ? "前の時代の研究をすべて終えると、見えてくるようだ…"
          : `「${esc(reqName)}」を研究すると、見えてくるようだ…`;
        html += `<div class="techCard mystery">
          <div class="tname">❓ ？？？</div>
          <div class="tdesc">${hint}</div>
        </div>`;
        continue;
      }
      const afford = canAfford(t.cost);
      const rec = S.quiz[t.id];
      html += `<div class="techCard ${done?"done":""}">
        <div class="tname">${done?"✅":"🧪"} ${esc(t.name)}<span class="topic">【${esc(t.topic)}】</span></div>
        <div class="tdesc">${esc(t.desc)}</div>
        <div class="tcost">必要な素材: ${costHtml(t.cost)}</div>
        ${rec ? `<div class="tdesc">これまでのクイズ正答: ${rec.correct}/${rec.total}問</div>` : ""}
        ${done ? `<div class="tdesc" style="color:var(--good)">研究ずみ</div>`
              : `<button class="primary" ${afford?"":"disabled"} onclick="G.startResearch('${t.id}')">${afford?"研究する!":"素材が足りない"}</button>`}
      </div>`;
    }
  }
  html += `<div class="center" style="margin-top:12px"><button onclick="G.showCamp()">もどる</button></div>`;
  showOverlay(html);
};

/* ================= そうび工房 ================= */
function gearCardHtml(kind, id, def){
  const unlocked = !def.tech || S.techs.includes(def.tech);
  const techName = def.tech ? (TECHS.find(t=>t.id===def.tech)||{}).name : "";
  /* 解放前は ??? 表記(必要な研究のみ表示) */
  if(!unlocked){
    return `<div class="techCard mystery">
      <div class="tname">❓ ？？？</div>
      <div class="tdesc"><span class="ng">要研究:${esc(techName)}</span></div>
    </div>`;
  }
  const list = kind==="w" ? S.gear.weapons : S.gear.armors;
  const equipped = (kind==="w" ? S.gear.weapon : S.gear.armor) === id;
  const owned = list.includes(id);
  const statText = kind==="w"
    ? `こうげき+${def.atk}　[${weaponTypeLabel(def)}]`
    : `ぼうぎょ+${def.def}`;
  let action = "";
  if(equipped)   action = `<span style="color:var(--good)">✔ そうび中</span>`;
  else if(owned) action = `<button class="primary" onclick="G.equipGear('${kind}','${id}')">そうびする</button>`;
  else action = canAfford(def.cost||{})
      ? `<button onclick="G.craftGear('${kind}','${id}')">作る</button>`
      : `<button disabled>素材が足りない</button>`;
  return `<div class="techCard ${equipped?"done":""}">
    <div class="tname">${equipped?"🟢":owned?"⚪":"🔨"} ${esc(def.name)}
      <span class="topic">${statText}</span></div>
    <div class="tdesc">${esc(def.desc)}</div>
    ${(!owned && def.cost) ? `<div class="tcost">材料: ${costHtml(def.cost)}</div>` : ""}
    ${action}
  </div>`;
}

G.showWorkshop = function(){
  let html = `<h2>⚒ そうび工房 <span class="tag">研究した技術で武器・防具を作り、そうびを切りかえよう</span></h2>
    <p class="dim">武器には3タイプある。<b>近接</b>=ぶつかって攻撃 /
    <b>とどく</b>=スペースキーで2マス先まで攻撃 /
    <b>遠距離</b>=スペースキーで向いている方向に矢を放つ(接近戦は威力半分)。</p>
    <div class="eraHead">武器</div>`;
  for(const [id,def] of Object.entries(WEAPONS)) html += gearCardHtml("w", id, def);
  html += `<div class="eraHead">防具</div>`;
  for(const [id,def] of Object.entries(ARMORS)) html += gearCardHtml("a", id, def);
  html += `<div class="center" style="margin-top:12px"><button onclick="G.showCamp()">もどる</button></div>`;
  showOverlay(html);
};

G.craftGear = function(kind, id){
  const def = kind==="w" ? WEAPONS[id] : ARMORS[id];
  if(!def || !def.cost || !canAfford(def.cost)) return;
  if(def.tech && !S.techs.includes(def.tech)) return;
  for(const [k,n] of Object.entries(def.cost)) S.inv[k] -= n;
  const list = kind==="w" ? S.gear.weapons : S.gear.armors;
  list.push(id);
  if(kind==="w") S.gear.weapon = id; else S.gear.armor = id;
  SFX.craft();
  log(`${def.name}を作ってそうびした!`);
  save(); updateSide();
  G.showWorkshop();
};

G.equipGear = function(kind, id){
  const list = kind==="w" ? S.gear.weapons : S.gear.armors;
  if(!list.includes(id)) return;
  if(kind==="w") S.gear.weapon = id; else S.gear.armor = id;
  const def = kind==="w" ? WEAPONS[id] : ARMORS[id];
  log(`${def.name}をそうびした。`);
  save(); updateSide();
  G.showWorkshop();
};

/* ================= クイズ ================= */
G.startResearch = function(techId){
  const t = TECHS.find(x=>x.id===techId);
  if(!t || S.techs.includes(t.id) || !canAfford(t.cost)) return;
  const picked = shuffled(t.quiz).slice(0,3);
  Q = { tech:t, list:picked, idx:0, correct:0, answered:false };
  if(!S.quiz[t.id]) S.quiz[t.id] = { tries:0, correct:0, total:0 };
  S.quiz[t.id].tries++;
  renderQuizQuestion();
};

function renderQuizQuestion(){
  const t = Q.tech;
  const item = Q.list[Q.idx];
  const order = shuffled([0,1,2,3]);
  Q.order = order;
  Q.answered = false;
  showOverlay(`
    <h2>🧪 研究:${esc(t.name)} <span class="tag">【${esc(t.topic)}】</span></h2>
    <p class="dim">研究を成功させるには、3問中2問以上の正解が必要だ。</p>
    <div class="qProg">第${Q.idx+1}問 / 3問(いままでの正解:${Q.correct})</div>
    <p style="font-size:15px; line-height:1.9"><b>Q. ${esc(item.q)}</b></p>
    <div id="qChoices">
      ${order.map((oi,i)=>`<button class="qChoice" onclick="G.answer(${oi})">${["ア","イ","ウ","エ"][i]}. ${esc(item.a[oi])}</button>`).join("")}
    </div>`);
}

G.answer = function(choiceIdx){
  if(Q.answered) return;
  Q.answered = true;
  const item = Q.list[Q.idx];
  const good = (choiceIdx === item.c);
  if(good) Q.correct++;
  S.quiz[Q.tech.id].total++;
  if(good) S.quiz[Q.tech.id].correct++;
  save();
  if(good) SFX.gather();
  const last = (Q.idx === 2);
  showOverlay(`
    <h2>🧪 研究:${esc(Q.tech.name)}</h2>
    <div class="qProg">第${Q.idx+1}問 / 3問</div>
    <p><b>Q. ${esc(item.q)}</b></p>
    <div class="qResult ${good?'good':'bad'}">${good ? "⭕ 正解!" : "❌ ざんねん…　正解は「" + esc(item.a[item.c]) + "」"}</div>
    <div class="qExpl">💡 ${esc(item.ex)}</div>
    <div class="center"><button class="primary" onclick="G.quizNext()">${last ? "研究の結果を見る" : "次の問題へ"}</button></div>`);
};

G.quizNext = function(){
  Q.idx++;
  if(Q.idx < 3){ renderQuizQuestion(); return; }
  const t = Q.tech;
  if(Q.correct >= 2){
    for(const [k,n] of Object.entries(t.cost)) S.inv[k] -= n;
    S.techs.push(t.id);
    const st = stats();
    S.hp = clamp(S.hp, 0, st.maxhp);
    save(); updateSide();
    if(t.id === "computer"){ showEnding(); return; }
    reportToHub();
    SFX.research();
    let unlockMsg = "";
    for(let i=1; i<AREAS.length; i++){
      if(eraComplete(i) && TECHS.filter(x=>x.era===i).some(x=>x.id===t.id)){
        unlockMsg = `<p style="color:var(--gold)">🗺 新エリア「${esc(AREAS[i].name)}」が解放された!</p>`;
      }
    }
    const newGear = [...Object.values(WEAPONS), ...Object.values(ARMORS)].some(g=>g.tech===t.id);
    log(`研究成功!「${t.name}」を手に入れた!`);
    showOverlay(`
      <h2>🎉 研究成功!</h2>
      <p style="font-size:16px; color:var(--gold)">「${esc(t.name)}」を発明した!</p>
      <p>${esc(t.flavor || "文明がまた一歩進んだ!")}</p>
      ${unlockMsg}
      <p class="dim">クイズの成績: ${Q.correct}/3問正解(文明度 ${civPercent()}%)</p>
      <div class="center">
        ${newGear ? `<button class="primary" onclick="G.showWorkshop()">⚒ そうび工房へ</button>` : ""}
        <button class="${newGear?"":"primary"}" onclick="G.showResearch()">研究をつづける</button>
        <button onclick="G.showCamp()">拠点にもどる</button>
      </div>`);
  } else {
    save();
    log(`「${t.name}」の研究に失敗…知識を確かめてもう一度!`);
    showOverlay(`
      <h2>研究失敗…</h2>
      <p>正解は ${Q.correct}/3問。研究には2問以上の正解が必要だ。</p>
      <p class="dim">だいじょうぶ、解説を読めば知識は身につく。素材は減っていないので、何度でも挑戦しよう!</p>
      <div class="center">
        <button class="primary" onclick="G.startResearch('${t.id}')">もう一度挑戦する</button>
        <button onclick="G.showResearch()">ロードマップにもどる</button>
      </div>`);
  }
};

/* ================= 道具づくり ================= */
G.showCraft = function(){
  let html = `<h2>🛠 道具づくり</h2><p class="dim">研究した技術のレシピで道具を作れる。薬草はダンジョンで採取しよう。</p>`;
  let any = false;
  for(const [id,def] of Object.entries(ITEM_DEFS)){
    if(!S.techs.includes(def.tech)) continue;
    any = true;
    const afford = canAfford(def.cost);
    html += `<div class="techCard">
      <div class="tname">${esc(def.name)}(所持 ×${S.items[id]||0})</div>
      <div class="tdesc">${esc(def.desc)}</div>
      <div class="tcost">材料: ${costHtml(def.cost)}</div>
      <button ${afford?"":"disabled"} onclick="G.craft('${id}')">${afford?"作る":"素材が足りない"}</button>
    </div>`;
  }
  if(!any) html += `<p class="dim">まだ作れる道具がない。「くすり」や「復活液」を研究すると道具が作れるようになる。</p>`;
  html += `<div class="center" style="margin-top:12px"><button onclick="G.showCamp()">もどる</button></div>`;
  showOverlay(html);
};

G.craft = function(id){
  const def = ITEM_DEFS[id];
  if(!def || !canAfford(def.cost)) return;
  for(const [k,n] of Object.entries(def.cost)) S.inv[k] -= n;
  S.items[id] = (S.items[id]||0) + 1;
  SFX.craft();
  save(); updateSide();
  log(`${def.name}を作った!`);
  G.showCraft();
};

/* ================= 学習のきろく ================= */
G.showRecord = function(){
  let rows = "";
  for(const t of TECHS){
    const r = S.quiz[t.id];
    rows += `<tr>
      <td>${S.techs.includes(t.id)?"✅":"　"} ${esc(t.name)}</td>
      <td>${esc(t.topic)}</td>
      <td>${r ? `${r.correct}/${r.total}問` : "―"}</td>
    </tr>`;
  }
  const total = Object.values(S.quiz).reduce((a,r)=>a+r.total,0);
  const correct = Object.values(S.quiz).reduce((a,r)=>a+r.correct,0);
  showOverlay(`
    <h2>📖 学習のきろく</h2>
    <p class="dim">クイズの正答記録。苦手な単元は教科書やノートで確認してから再挑戦しよう!</p>
    <table class="rec">
      <tr><th>技術</th><th>理科の単元</th><th>正答</th></tr>
      ${rows}
    </table>
    <p style="margin-top:10px">合計: ${correct} / ${total}問 正解 ${total? "(正答率 " + Math.round(correct/total*100) + "%)" : ""}</p>
    <div class="center"><button onclick="G.showCamp()">もどる</button></div>`);
};

/* ================= あそびかた ================= */
G.showHelp = function(from){
  showOverlay(`
    <h2>❓ あそびかた</h2>
    <p>
      🗺 <b>ダンジョンで素材あつめ</b>:矢印キーかWASDで移動。素材にぶつかると採取、敵にぶつかると攻撃だ。<br><br>
      ⚔ <b>武器のタイプ</b>:<b>スペースキー(またはZ)</b>で「向いている方向」に武器攻撃!
      やり系は2マス先まで、弓系は遠くまで届く(そのかわり接近戦は威力半分)。
      向いている方向は、キャラの横の黄色い矢印マークでわかるぞ。<br><br>
      🔬 <b>拠点で研究</b>:集めた素材で新しい技術を研究する。研究には<b style="color:var(--gold)">理科クイズ(3問中2問正解)</b>が必要。まちがえても解説を読んで何度でも挑戦できる。<br><br>
      ⚒ <b>そうび工房</b>:研究で解放されたレシピから武器・防具を作ってそうびする。そうびは見た目にも反映される!<br><br>
      📈 <b>文明を進める</b>:同じ時代の技術をすべて研究すると、次の時代とダンジョンが解放される。最終目標は<b style="color:var(--accent)">「コンピュータ」を発明して現代文明に到達</b>すること!<br><br>
      🗿 <b>石化した人</b>:ダンジョンには石になった人がいる。「復活液」を研究して助けよう。仲間が増えると最大HPが上がる。<br><br>
      ⚠ <b>注意</b>:HPが0になると拠点に運ばれ、<b style="color:var(--bad)">持ち物(素材・道具)の半分を落としてしまう</b>。薬草や薬を持って、無理せず「拠点にもどる」も大事な作戦だ。
    </p>
    <div class="center"><button class="primary" onclick="${from==='title' ? "G.showTitle()" : "G.showCamp()"}">もどる</button></div>`);
};

/* ================= エリア選択 ================= */
G.showAreas = function(){
  let html = `<h2>🗺 ダンジョンへ出発</h2>`;
  AREAS.forEach((a,i)=>{
    const open = areaUnlocked(i);
    html += `<div class="areaCard ${open?"":"locked"}">
      <div>
        <div class="aname">${open?"":"🔒"} ${esc(a.name)}(地下${a.floors}階)</div>
        <div class="adesc">${esc(a.desc)}<br>手に入る素材: ${a.mats.map(m=>esc(MATERIALS[m].name)).join("・")}</div>
      </div>
      ${open ? `<button class="primary" onclick="G.enterDungeon(${i})">出発</button>`
             : `<span class="dim" style="font-size:11px">時代${i}の技術を<br>すべて研究で解放</span>`}
    </div>`;
  });
  html += `<div class="center" style="margin-top:12px"><button onclick="G.showCamp()">もどる</button></div>`;
  showOverlay(html);
};

/* =====================================================================
   ダンジョン生成(箱庭スタイル:部屋数保証・回遊路・池・装飾)
   grid: 0=床 1=壁 2=水(通れない)
   ===================================================================== */
function carveCorridor(grid, x1, y1, x2, y2){
  while(x1 !== x2){ grid[y1][x1] = 0; x1 += (x2 > x1 ? 1 : -1); }
  while(y1 !== y2){ grid[y1][x1] = 0; y1 += (y2 > y1 ? 1 : -1); }
  grid[y1][x1] = 0;
}

function genFloor(areaIdx, floorNo){
  const area = AREAS[areaIdx];
  const cx = r => Math.floor(r.x + r.w/2), cy = r => Math.floor(r.y + r.h/2);

  /* 部屋数が7以上になるまで作り直す(毎回ちゃんとした箱庭に) */
  let grid, rooms;
  for(let attempt = 0; attempt < 60; attempt++){
    grid = [];
    for(let y=0; y<MAP_H; y++) grid.push(new Array(MAP_W).fill(1));
    rooms = [];
    for(let tryN=0; tryN<260 && rooms.length<9; tryN++){
      const w = 5 + ri(5), h = 4 + ri(4);
      const x = 1 + ri(MAP_W - w - 2), y = 1 + ri(MAP_H - h - 2);
      if(rooms.some(r => x < r.x+r.w+1 && x+w+1 > r.x && y < r.y+r.h+1 && y+h+1 > r.y)) continue;
      rooms.push({x,y,w,h});
    }
    if(rooms.length >= 7) break;
  }
  for(const r of rooms){
    for(let y=r.y; y<r.y+r.h; y++) for(let x=r.x; x<r.x+r.w; x++) grid[y][x] = 0;
  }
  /* 順番につなぐ+ところどころ近道を作って回遊できる庭に */
  for(let i=0; i<rooms.length-1; i++){
    carveCorridor(grid, cx(rooms[i]), cy(rooms[i]), cx(rooms[i+1]), cy(rooms[i+1]));
  }
  for(let i=2; i<rooms.length; i++){
    if(ri(10) < 3){
      const j = ri(i-1);
      carveCorridor(grid, cx(rooms[i]), cy(rooms[i]), cx(rooms[j]), cy(rooms[j]));
    }
  }
  /* 池(火山エリアでは溶岩だまり)。最初と最後の部屋にはつくらない */
  for(let i=1; i<rooms.length-1; i++){
    const r = rooms[i];
    if(r.w >= 6 && r.h >= 5 && ri(10) < 4){
      const pw = 2 + ri(2), ph = 2;
      const px0 = r.x + 2 + ri(Math.max(1, r.w - 4 - (pw - 2)));
      const py0 = r.y + 2 + ri(Math.max(1, r.h - 4));
      for(let y=py0; y<py0+ph && y<r.y+r.h-2+1; y++)
        for(let x=px0; x<px0+pw && x<r.x+r.w-2+1; x++)
          grid[y][x] = 2;
    }
  }
  /* 装飾(草・花・小石など)を床にちりばめる */
  const deco = [];
  for(let y=0; y<MAP_H; y++){
    deco.push(new Array(MAP_W).fill(0));
    for(let x=0; x<MAP_W; x++){
      if(grid[y][x] === 0 && ri(100) < 14) deco[y][x] = 1 + ri(3);
    }
  }

  const ents = [];
  const px = cx(rooms[0]), py = cy(rooms[0]);
  function freeTile(avoidRoom0){
    for(let i=0; i<300; i++){
      const r = rooms[avoidRoom0 ? 1+ri(rooms.length-1) : ri(rooms.length)];
      const x = r.x + ri(r.w), y = r.y + ri(r.h);
      if(grid[y][x] !== 0) continue;
      if(x===px && y===py) continue;
      if(ents.some(e=>e.x===x&&e.y===y)) continue;
      return {x,y};
    }
    return null;
  }

  const isBossFloor = (floorNo === area.floors);
  const last = rooms[rooms.length-1];
  if(isBossFloor){
    const bdef = ENEMIES[area.boss];
    ents.push({ t:"enemy", id:area.boss, name:bdef.name, x:cx(last), y:cy(last),
                hp:bdef.hp, maxhp:bdef.hp, atk:bdef.atk, def:bdef.def, sprite:bdef.sprite, boss:true });
  } else {
    ents.push({ t:"stairs", x:cx(last), y:cy(last) });
  }

  const nNodes = 8 + ri(3);
  for(let i=0; i<nNodes; i++){
    const p = freeTile(false); if(!p) break;
    const mat = area.mats[ri(area.mats.length)];
    ents.push({ t:"node", mat, x:p.x, y:p.y });
  }
  const nEnemies = 6 + floorNo + (isBossFloor ? 2 : 0);
  for(let i=0; i<nEnemies; i++){
    const p = freeTile(true); if(!p) break;
    const id = area.enemies[ri(area.enemies.length)];
    const def = ENEMIES[id];
    ents.push({ t:"enemy", id, name:def.name, x:p.x, y:p.y,
                hp:def.hp, maxhp:def.hp, atk:def.atk, def:def.def, sprite:def.sprite, drop:def.drop });
  }
  if(Math.random() < 0.4){
    const p = freeTile(true);
    if(p) ents.push({ t:"statue", x:p.x, y:p.y });
  }

  return { grid, ents, px, py, deco };
}

G.enterDungeon = function(areaIdx){
  if(!areaUnlocked(areaIdx)) return;
  hideOverlay();
  playBGM("dungeon");
  D = { area:areaIdx, floor:1 };
  startFloor();
  log(`「${AREAS[areaIdx].name}」に入った!(地下1階)`);
};

function startFloor(){
  const f = genFloor(D.area, D.floor);
  D.grid = f.grid; D.ents = f.ents; D.deco = f.deco;
  D.player = { x:f.px, y:f.py, f:[1,0], mir:false };
  effects = [];
  updateSide();
}

G.leaveDungeon = function(){
  if(!D) return;
  log("拠点にもどった。(HP全回復)");
  G.showCamp();
};

/* ================= ターン処理 ================= */
function entAt(x,y){ return D.ents.find(e => e.x===x && e.y===y); }
function passable(x,y){ return x>=0 && y>=0 && x<MAP_W && y<MAP_H && D.grid[y][x]===0; }

function playerMove(dx,dy){
  if(!D) return;
  D.player.f = [dx,dy];
  if(dx !== 0) D.player.mir = (dx < 0);
  const nx = D.player.x + dx, ny = D.player.y + dy;
  if(!passable(nx,ny)) return;
  const e = entAt(nx,ny);
  if(e){
    if(e.t === "enemy") attackEnemy(e, true);
    else if(e.t === "node") gatherNode(e);
    else if(e.t === "statue") touchStatue(e);
    else if(e.t === "stairs"){ D.floor++; log(`地下${D.floor}階へ降りた。`); startFloor(); return; }
    else if(e.t === "portal"){ log("光の出口をくぐった!"); G.showCamp(); return; }
  } else {
    D.player.x = nx; D.player.y = ny;
  }
  enemiesTurn();
  updateSide();
}

/* スペースキー:武器のタイプに応じた方向攻撃 */
function weaponAttack(){
  if(!D) return;
  const st = stats();
  const w = st.weapon;
  const range = (w.type === "melee") ? 1 : (w.range || 1);
  const [fx,fy] = D.player.f;
  let hit = false;
  for(let i=1; i<=range; i++){
    const x = D.player.x + fx*i, y = D.player.y + fy*i;
    const cell = (D.grid[y]||[])[x];
    if(cell === undefined || cell === 1) break;   // 壁でストップ(水の上は飛びこえる)
    const e = entAt(x,y);
    if(e && e.t === "enemy"){ attackEnemy(e, false); hit = true; break; }
  }
  if(!hit) log(w.type === "ranged" ? "矢は当たらなかった…" : "攻撃は空を切った。");
  enemiesTurn();
  updateSide();
}

function attackEnemy(e, isBump){
  const st = stats();
  let atk = st.atk;
  if(isBump && st.weapon.type === "ranged"){
    atk = Math.ceil(atk / 2);
  }
  const dmg = Math.max(1, atk - e.def + ri(3) - 1);
  e.hp -= dmg;
  addFx(e.x, e.y);
  SFX.hit();
  if(e.hp <= 0){
    S.defeated++;
    log(`${e.name}をたおした!(${dmg}ダメージ)`);
    if(e.drop && Math.random() < 0.6){
      S.inv[e.drop] = (S.inv[e.drop]||0) + 1;
      log(`${e.name}が${MATERIALS[e.drop].name}を落とした!`);
    }
    const idx = D.ents.indexOf(e);
    if(idx >= 0) D.ents.splice(idx,1);
    if(e.boss){
      const reward = ENEMIES[e.id].reward || {};
      const names = [];
      for(const [k,n] of Object.entries(reward)){
        S.inv[k] = (S.inv[k]||0) + n;
        names.push(`${MATERIALS[k].name}×${n}`);
      }
      D.ents.push({ t:"portal", x:e.x, y:e.y });
      SFX.fanfare();
      log(`ボスをたおした!${names.join("・")}を手に入れた!出口の光が現れた!`);
    }
    save();
  } else {
    log(`${e.name}に${dmg}ダメージ!(のこりHP ${e.hp})`);
  }
}

function gatherNode(e){
  const n = 1 + (Math.random() < 0.4 ? 1 : 0);
  S.inv[e.mat] = (S.inv[e.mat]||0) + n;
  SFX.gather();
  log(`${MATERIALS[e.mat].name}を${n}個手に入れた!`);
  const idx = D.ents.indexOf(e);
  if(idx >= 0) D.ents.splice(idx,1);
  save();
}

function touchStatue(e){
  if((S.items.revival||0) > 0){
    S.items.revival--;
    S.statues++;
    const st = stats();
    S.hp = clamp(S.hp + 10, 0, st.maxhp);
    const idx = D.ents.indexOf(e);
    if(idx >= 0) D.ents.splice(idx,1);
    SFX.research();
    log(`復活液をかけた…石化した人がよみがえった!仲間になって最大HP+10!(仲間 ${S.statues}人)`);
    save();
  } else {
    log("石になった人がいる…。「復活液」を研究して作れば助けられそうだ。");
  }
}

function enemiesTurn(){
  const st = stats();
  for(const e of D.ents){
    if(e.t !== "enemy") continue;
    const dx = D.player.x - e.x, dy = D.player.y - e.y;
    const dist = Math.max(Math.abs(dx), Math.abs(dy));
    if(Math.abs(dx) + Math.abs(dy) === 1){
      const dmg = Math.max(1, e.atk - st.def + ri(3) - 1);
      S.hp -= dmg;
      hurtUntil = performance.now() + 220;
      SFX.hurt();
      log(`${e.name}のこうげき!${dmg}ダメージ!`);
      if(S.hp <= 0){ playerDown(); return; }
    } else if(dist <= 8){
      const tryMoves = [];
      if(Math.abs(dx) >= Math.abs(dy)){
        tryMoves.push([Math.sign(dx),0], [0,Math.sign(dy)]);
      } else {
        tryMoves.push([0,Math.sign(dy)], [Math.sign(dx),0]);
      }
      for(const [mx,my] of tryMoves){
        if(mx===0 && my===0) continue;
        const nx = e.x+mx, ny = e.y+my;
        if(passable(nx,ny) && !entAt(nx,ny) && !(nx===D.player.x && ny===D.player.y)){
          e.x = nx; e.y = ny; break;
        }
      }
    }
  }
}

/* たおれると持ち物の半分を落とす */
function halveLoot(){
  const lost = [];
  for(const k in S.inv){
    const l = Math.floor((S.inv[k]||0) / 2);
    if(l > 0){ S.inv[k] -= l; lost.push(`${MATERIALS[k].name}×${l}`); }
  }
  for(const k in S.items){
    const l = Math.floor((S.items[k]||0) / 2);
    if(l > 0){ S.items[k] -= l; lost.push(`${ITEM_DEFS[k].name}×${l}`); }
  }
  return lost;
}

function playerDown(){
  S.hp = 0;
  const lost = halveLoot();
  updateSide();
  playBGM(null);
  SFX.death();
  const lostText = lost.length ? lost.join("・") : "なし";
  log(`気を失った…。持ち物の半分を落としてしまった!(${lostText})`);
  showOverlay(`
    <h2>😵 力つきた…</h2>
    <p>気がつくと拠点で寝かされていた。仲間が運んでくれたようだ。<br>
    しかし、にげる途中で<b style="color:var(--bad)">持ち物の半分</b>を落としてしまった…。</p>
    <p class="dim">失ったもの: ${esc(lostText)}</p>
    <p class="dim">そうびと研究の成果は失われない。回復アイテムを持って、無理のない探索を!</p>
    <div class="center"><button class="primary" onclick="G.showCamp()">拠点で休む</button></div>`);
  D = null;
  save();
}

/* ================= アイテム使用 ================= */
G.useHerb = function(){
  if((S.inv.herb||0) <= 0){ log("薬草を持っていない。ダンジョンで採取しよう。"); return; }
  const st = stats();
  if(S.hp >= st.maxhp){ log("HPは満タンだ。"); return; }
  S.inv.herb--;
  const heal = S.techs.includes("farm") ? 25 : 15;
  S.hp = clamp(S.hp + heal, 0, st.maxhp);
  SFX.gather();
  log(`薬草を使った。HPが${heal}回復!`);
  save(); updateSide();
};

G.useMedicine = function(){
  if((S.items.medicine||0) <= 0){ log("薬を持っていない。「くすり」を研究して道具づくりで作ろう。"); return; }
  const st = stats();
  if(S.hp >= st.maxhp){ log("HPは満タンだ。"); return; }
  S.items.medicine--;
  S.hp = st.maxhp;
  SFX.research();
  log("薬を使った。HPが全回復した!");
  save(); updateSide();
};

/* ================= エンディング ================= */
function showEnding(){
  const total = Object.values(S.quiz).reduce((a,r)=>a+r.total,0);
  const correct = Object.values(S.quiz).reduce((a,r)=>a+r.correct,0);
  save(); updateSide();
  reportToHub();
  playBGM(null);
  SFX.fanfare();
  showOverlay(`
    <div class="titleLogo">
      <div class="big" style="font-size:30px">文明度 100%達成!</div>
      <div class="small">コンピュータの画面に、光がともった――。</div>
    </div>
    <p style="line-height:2.2">
      石おのから始まった旅は、火・鉄・電気をこえて、ついに<b style="color:var(--gold)">現代文明</b>にたどり着いた。<br>
      ここまでキミを運んだのは、運でも魔法でもない。<br>
      ひとつひとつ積み上げた<b style="color:var(--accent)">科学の知識</b>だ。<br><br>
      そしてこの知識は、ゲームの中だけのものじゃない。<br>
      教室で学ぶ理科は、人類が何万年もかけて積み上げてきた「文明の設計図」そのものなんだ。
    </p>
    <p class="dim">
      📊 冒険のきろく<br>
      ・研究した技術: ${S.techs.length} / ${TECHS.length}<br>
      ・理科クイズ: ${correct} / ${total}問 正解${total ? "(正答率 " + Math.round(correct/total*100) + "%)" : ""}<br>
      ・復活させた仲間: ${S.statues}人<br>
      ・たおした敵: ${S.defeated}体
    </p>
    <div class="center" style="margin-top:14px">
      <button class="primary" onclick="G.showCamp()">拠点にもどる(冒険をつづける)</button>
      <button onclick="G.confirmReset()">最初からあそぶ</button>
    </div>`);
}

/* =====================================================================
   描画(常時アニメーションループ)
   ===================================================================== */
const DECO_COLORS = [
  ["#6a9a58","#8ac070","#e0d070"],   // 森:草・花
  ["#7a7068","#8a8078","#5a524a"],   // 鉱山:小石
  ["#8a5a48","#e0a050","#606058"],   // 火山:焦げ石
  ["#5a6a88","#70c8d8","#8a98b8"],   // 遺跡:苔石
];
const WATER_STYLE = [
  { a:"#2e5a8a", b:"#3a6ea6", s:"#7ab8e0" },   // 森:池
  { a:"#28506e", b:"#326286", s:"#6aa8c8" },   // 鉱山:地底湖
  { a:"#8a2810", b:"#b04018", s:"#f0a040" },   // 火山:溶岩
  { a:"#204858", b:"#2a5a6e", s:"#5ac8c8" },   // 遺跡:古代水路
];
let vignette = null;
function getVignette(){
  if(!vignette){
    vignette = ctx.createRadialGradient(480,300,280, 480,300,600);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,0.38)");
  }
  return vignette;
}

function draw(t){
  const area = AREAS[D.area];
  const pal = area.pal;
  const water = WATER_STYLE[D.area] || WATER_STYLE[0];
  const decoCol = DECO_COLORS[D.area] || DECO_COLORS[0];
  ctx.fillStyle = "#000";
  ctx.fillRect(0,0,cv.width,cv.height);

  const camX = clamp(D.player.x - Math.floor(VIEW_W/2), 0, MAP_W - VIEW_W);
  const camY = clamp(D.player.y - Math.floor(VIEW_H/2), 0, MAP_H - VIEW_H);

  for(let vy=0; vy<VIEW_H; vy++){
    for(let vx=0; vx<VIEW_W; vx++){
      const x = camX+vx, y = camY+vy;
      const sx = vx*TILE, sy = vy*TILE;
      const cell = D.grid[y][x];
      if(cell === 1){
        ctx.fillStyle = pal.wall; ctx.fillRect(sx,sy,TILE,TILE);
        if(y+1 < MAP_H && D.grid[y+1][x] !== 1){
          ctx.fillStyle = pal.wallTop; ctx.fillRect(sx, sy+TILE-8, TILE, 8);
        }
        // 壁の質感
        if((x*7+y*13)%5===0){ ctx.fillStyle="rgba(0,0,0,0.18)"; ctx.fillRect(sx+8,sy+8,8,4); }
      } else if(cell === 2){
        // 水・溶岩(ゆらめき)
        const ph = Math.sin(t/420 + x*1.7 + y*2.3);
        ctx.fillStyle = ph > 0 ? water.a : water.b;
        ctx.fillRect(sx,sy,TILE,TILE);
        ctx.fillStyle = water.s;
        const off = Math.floor((t/300 + x*3 + y*5) % 4) * 4;
        ctx.fillRect(sx+6+off, sy+10, 10, 3);
        ctx.fillRect(sx+16-off/2, sy+26, 8, 3);
      } else {
        ctx.fillStyle = ((x+y)%2===0) ? pal.floor : pal.floor2;
        ctx.fillRect(sx,sy,TILE,TILE);
        const d = D.deco[y][x];
        if(d){
          const c = decoCol[(x+y+d)%decoCol.length];
          ctx.fillStyle = c;
          if(d===1){ ctx.fillRect(sx+10,sy+24,3,8); ctx.fillRect(sx+16,sy+20,3,12); ctx.fillRect(sx+22,sy+26,3,6); }
          else if(d===2){ ctx.fillRect(sx+24,sy+10,5,5); ctx.fillRect(sx+12,sy+14,4,4); }
          else { ctx.fillRect(sx+8,sy+8,6,3); ctx.fillRect(sx+26,sy+28,5,3); }
        }
      }
    }
  }

  for(const e of D.ents){
    const vx = e.x - camX, vy = e.y - camY;
    if(vx<0||vy<0||vx>=VIEW_W||vy>=VIEW_H) continue;
    const sx = vx*TILE, sy = vy*TILE;
    if(e.t === "node") drawNode(e, sx, sy, t);
    else if(e.t === "stairs") drawStairs(sx, sy);
    else if(e.t === "portal") drawPortal(sx, sy, t);
    else if(e.t === "statue"){ drawShadow(sx, sy); drawSprite("statue", sx, sy); }
    else if(e.t === "enemy"){
      if(e.boss){
        const r = TILE*0.6 + Math.sin(t/200)*4;
        ctx.fillStyle = "rgba(240,80,80,0.22)";
        ctx.beginPath(); ctx.arc(sx+TILE/2, sy+TILE/2, r, 0, Math.PI*2); ctx.fill();
      }
      drawShadow(sx, sy);
      drawSprite(e.sprite, sx, sy);
      if(e.hp < e.maxhp){
        ctx.fillStyle = "#301010"; ctx.fillRect(sx+4, sy-6, TILE-8, 5);
        ctx.fillStyle = "#e05555"; ctx.fillRect(sx+4, sy-6, (TILE-8)*Math.max(0,e.hp/e.maxhp), 5);
      }
    }
  }

  const pvx = D.player.x - camX, pvy = D.player.y - camY;
  drawPlayer(pvx*TILE, pvy*TILE);
  drawFacing(pvx*TILE, pvy*TILE, t);

  /* ヒットエフェクト */
  effects = effects.filter(f => t - f.t0 < f.dur);
  for(const f of effects){
    const vx = f.x - camX, vy = f.y - camY;
    if(vx<0||vy<0||vx>=VIEW_W||vy>=VIEW_H) continue;
    const k = (t - f.t0) / f.dur;
    ctx.fillStyle = `rgba(255,255,255,${(1-k)*0.75})`;
    const inset = k * 14;
    ctx.fillRect(vx*TILE+inset, vy*TILE+inset, TILE-inset*2, TILE-inset*2);
  }

  /* 被ダメージの赤フラッシュ */
  if(t < hurtUntil){
    const a = (hurtUntil - t) / 220 * 0.35;
    ctx.fillStyle = `rgba(224,60,60,${a})`;
    ctx.fillRect(0,0,cv.width,14); ctx.fillRect(0,cv.height-14,cv.width,14);
    ctx.fillRect(0,0,14,cv.height); ctx.fillRect(cv.width-14,0,14,cv.height);
  }

  ctx.fillStyle = getVignette();
  ctx.fillRect(0,0,cv.width,cv.height);

  ctx.fillStyle = "rgba(10,14,18,0.75)";
  ctx.fillRect(0, 0, 300, 26);
  ctx.fillStyle = "#e8eef4";
  ctx.font = "13px 'MS Gothic', monospace";
  ctx.fillText(`${area.name}　地下${D.floor}階 / ${area.floors}階`, 10, 17);
}

/* 向いている方向のマーク(ゆっくり明滅) */
function drawFacing(px, py, t){
  const [fx,fy] = D.player.f;
  const pulse = Math.sin(t/180) * 2;
  const cxp = px + TILE/2 + fx*(TILE/2 + 5 + pulse);
  const cyp = py + TILE/2 + fy*(TILE/2 + 5 + pulse);
  ctx.fillStyle = "#f0c34e";
  ctx.beginPath();
  ctx.moveTo(cxp + fx*5, cyp + fy*5);
  if(fx !== 0){ ctx.lineTo(cxp - fx*3, cyp - 5); ctx.lineTo(cxp - fx*3, cyp + 5); }
  else        { ctx.lineTo(cxp - 5, cyp - fy*3); ctx.lineTo(cxp + 5, cyp - fy*3); }
  ctx.closePath(); ctx.fill();
}

function drawNode(e, sx, sy, t){
  const m = MATERIALS[e.mat];
  ctx.fillStyle = m.color;
  const c = TILE/2;
  switch(m.shape){
    case "rock":
      ctx.fillRect(sx+8, sy+16, 24, 16);
      ctx.fillRect(sx+12, sy+10, 16, 8);
      ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.fillRect(sx+12, sy+12, 6, 4);
      break;
    case "wood":
      ctx.fillStyle = "#6b4423"; ctx.fillRect(sx+16, sy+12, 8, 22);
      ctx.fillStyle = m.color; ctx.fillRect(sx+8, sy+4, 24, 12);
      break;
    case "plant":
      ctx.fillRect(sx+18, sy+18, 4, 16);
      ctx.fillRect(sx+10, sy+10, 8, 10);
      ctx.fillRect(sx+22, sy+8, 8, 12);
      break;
    case "pile":
      ctx.beginPath();
      ctx.moveTo(sx+6, sy+32); ctx.lineTo(sx+c, sy+10); ctx.lineTo(sx+34, sy+32);
      ctx.closePath(); ctx.fill();
      break;
    case "crystal":
      ctx.beginPath();
      ctx.moveTo(sx+c, sy+6); ctx.lineTo(sx+30, sy+20); ctx.lineTo(sx+c, sy+34); ctx.lineTo(sx+10, sy+20);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.fillRect(sx+16, sy+12, 4, 6);
      break;
    case "box":
      ctx.fillRect(sx+8, sy+12, 24, 20);
      ctx.fillStyle = "#204048"; ctx.fillRect(sx+8, sy+20, 24, 3);
      break;
  }
  /* きらめき(明滅) */
  if(Math.floor(t/350 + e.x*7 + e.y*13) % 3 !== 0){
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillRect(sx+30, sy+4, 3, 3);
    ctx.fillRect(sx+31, sy+2, 1, 7); ctx.fillRect(sx+28, sy+5, 7, 1);
  }
}

function drawStairs(sx, sy){
  ctx.fillStyle = "#0c0c10"; ctx.fillRect(sx+4, sy+4, TILE-8, TILE-8);
  ctx.fillStyle = "#3a4450";
  ctx.fillRect(sx+8, sy+26, 24, 6);
  ctx.fillRect(sx+12, sy+18, 20, 6);
  ctx.fillRect(sx+16, sy+10, 16, 6);
}

function drawPortal(sx, sy, t){
  const c = TILE/2;
  const r = 15 + Math.sin(t/220)*2;
  ctx.fillStyle = "#1a4a50";
  ctx.beginPath(); ctx.arc(sx+c, sy+c, r+2, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#4fd1c5";
  ctx.beginPath(); ctx.arc(sx+c, sy+c, r-5, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#c8f8f4";
  ctx.beginPath(); ctx.arc(sx+c, sy+c, 4, 0, Math.PI*2); ctx.fill();
}

function drawCamp(t){
  ctx.fillStyle = "#0c1018"; ctx.fillRect(0,0,cv.width,cv.height);
  // 星(またたき)
  for(let i=0; i<60; i++){
    const tw = Math.floor(t/400 + i) % 7 === 0;
    ctx.fillStyle = tw ? "#ffffff" : (i%3 ? "#7a8aa0" : "#d8e4f0");
    ctx.fillRect((i*97)%cv.width, (i*53)%320, 2, 2);
  }
  // 月
  ctx.fillStyle = "#e8e4d0";
  ctx.beginPath(); ctx.arc(840, 90, 26, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#0c1018";
  ctx.beginPath(); ctx.arc(852, 82, 22, 0, Math.PI*2); ctx.fill();
  // 地面
  ctx.fillStyle = "#2a3626"; ctx.fillRect(0, 420, cv.width, 180);
  ctx.fillStyle = "#324030"; ctx.fillRect(0, 420, cv.width, 10);
  // テント
  ctx.fillStyle = "#6a4a2a";
  ctx.beginPath(); ctx.moveTo(600, 420); ctx.lineTo(700, 310); ctx.lineTo(800, 420); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#503620";
  ctx.beginPath(); ctx.moveTo(670, 420); ctx.lineTo(700, 350); ctx.lineTo(730, 420); ctx.closePath(); ctx.fill();
  // たき火(ゆらめき)
  const fl = Math.sin(t/90) * 6 + Math.sin(t/37) * 3;
  ctx.fillStyle = "#5a3a1a";
  ctx.fillRect(400, 470, 60, 10);
  ctx.fillStyle = "#e07030";
  ctx.beginPath(); ctx.moveTo(410, 470); ctx.lineTo(430, 412 + fl); ctx.lineTo(450, 470); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#f0c34e";
  ctx.beginPath(); ctx.moveTo(420, 470); ctx.lineTo(430, 434 + fl*0.6); ctx.lineTo(440, 470); ctx.closePath(); ctx.fill();
  // 煙
  for(let i=0; i<3; i++){
    const k = ((t/40 + i*45) % 130);
    ctx.fillStyle = `rgba(180,180,190,${0.35 * (1 - k/130)})`;
    ctx.fillRect(426 + Math.sin((k+i*30)/18)*8, 400 - k, 6, 6);
  }
  // たき火の明かり
  const g = ctx.createRadialGradient(430,460,10, 430,460,130);
  g.addColorStop(0, "rgba(240,160,60,0.16)");
  g.addColorStop(1, "rgba(240,160,60,0)");
  ctx.fillStyle = g;
  ctx.fillRect(300,330,260,270);
  // プレイヤー(そうびの見た目つき)
  if(S && S.gear){
    const sp = SPRITES.player;
    const style = ARMOR_STYLE[S.gear.armor] || ARMOR_STYLE.cloth;
    const colors = Object.assign({}, sp.colors, { c: style.c });
    if(style.helm) colors.o = style.helm;
    drawRows(sp.rows, colors, 320, 430, false);
    const ov = WEAPON_OVERLAYS[S.gear.weapon];
    if(ov) drawRows(ov.rows, ov.colors, 320, 430, false);
  }
  ctx.fillStyle = "#9ab0c4";
  ctx.font = "14px 'MS Gothic', monospace";
  ctx.fillText("⛺ 科学王国の拠点", 20, 30);
}

/* 描画ループ */
function frame(t){
  requestAnimationFrame(frame);
  if(D) draw(t); else drawCamp(t);
}
requestAnimationFrame(frame);

/* ---------------- 入力 ---------------- */
document.addEventListener("keydown", (ev)=>{
  if(!D || !overlay.classList.contains("hidden")) return;
  const k = ev.key.toLowerCase();
  if(k === " " || k === "z"){
    ev.preventDefault();
    weaponAttack();
    return;
  }
  let dx=0, dy=0;
  if(k==="arrowup"   || k==="w") dy=-1;
  else if(k==="arrowdown" || k==="s") dy=1;
  else if(k==="arrowleft" || k==="a") dx=-1;
  else if(k==="arrowright"|| k==="d") dx=1;
  else return;
  ev.preventDefault();
  playerMove(dx,dy);
});

/* ---------------- タッチ操作(スマホ・タブレット) ---------------- */
const IS_TOUCH = (window.matchMedia && matchMedia("(pointer: coarse)").matches) || navigator.maxTouchPoints > 0;
if(IS_TOUCH){
  document.body.classList.add("touch");
  document.getElementById("keyHint").innerHTML =
    "<b>十字ボタン</b> 移動・ぶつかって攻撃/採取　<b>⚔</b> 向いている方向に武器こうげき　<b>🌿💊</b> 回復";
}
(function(){
  const DIRS = { up:[0,-1], down:[0,1], left:[-1,0], right:[1,0] };
  let timer = null;
  function stop(){ if(timer){ clearInterval(timer); timer = null; } }
  function press(fn){
    if(!D || !overlay.classList.contains("hidden")) return;
    fn(); stop();
    timer = setInterval(()=>{
      if(!D || !overlay.classList.contains("hidden")){ stop(); return; }
      fn();
    }, 190);
  }
  document.querySelectorAll("#padWrap [data-dir]").forEach(b=>{
    const d = DIRS[b.dataset.dir];
    b.addEventListener("pointerdown", e=>{ e.preventDefault(); press(()=>playerMove(d[0], d[1])); });
    ["pointerup","pointercancel","pointerleave"].forEach(t=>b.addEventListener(t, stop));
    b.addEventListener("contextmenu", e=>e.preventDefault());
  });
  const atk = document.getElementById("atkBtn");
  atk.addEventListener("pointerdown", e=>{
    e.preventDefault();
    if(D && overlay.classList.contains("hidden")) weaponAttack();
  });
  document.getElementById("padHerb").addEventListener("pointerdown", e=>{ e.preventDefault(); G.useHerb(); });
  document.getElementById("padMed").addEventListener("pointerdown", e=>{ e.preventDefault(); G.useMedicine(); });
  ["atkBtn","padHerb","padMed"].forEach(id=>
    document.getElementById(id).addEventListener("contextmenu", e=>e.preventDefault()));
})();

/* ---------------- 起動 ---------------- */
S = newState();
document.getElementById("muteBtn").textContent = muted ? "🔇" : "🔊";
/* まなびの基板が読み込めていれば、ヘッダーに「もどる」ボタンを出す */
(function(){
  const c = window.MANABI_CONFIG;
  if(window.LearnHub && c && c.backLink && c.hubUrl){
    const btn = document.getElementById("hubBtn");
    btn.href = c.hubUrl;
    btn.classList.add("show");
  }
})();
updateSide();
G.showTitle();
