/* 熟語の迷宮  ブラウザ直読み版（React UMD + Babel Standalone） */
const { useState, useMemo, useRef, useEffect, useCallback } = React;

/* ============================================================
   熟語の迷宮
   ・中学範囲の英熟語をパーツから合成して扉を開くダンジョンRPG
   ・難易度＝もぐる深さ（見習い / 冒険者 / 熟語の王）
   ============================================================ */

/* ------------------------------------------------------------
   熟語データ  「英熟語|意味|学年」
   意味に ／ が入るものは複数の意味を持つ熟語（二重の扉に使われる）
   最後の語＝前置詞の宝珠、最初の語＝動詞の石、間の語＝特殊の札
------------------------------------------------------------ */
const RAW = `
get up|起きる|1
get on|乗る|1
get off|降りる|1
get to|着く|1
look at|見る|1
look for|探す|1
look after|世話をする|1
look up|見上げる／調べる|1
look like|似ている|1
listen to|聞く|1
wait for|待つ|1
arrive at|到着する|1
come from|出身である|1
come back|戻ってくる|1
go out|外出する|1
go back|帰る|1
go to|行く|1
give up|あきらめる|1
stand up|立ち上がる|1
sit down|すわる|1
wake up|目を覚ます|1
write down|書き留める|1
put on|身につける|1
take off|脱ぐ／離陸する|1
turn on|（明かりを）つける|1
turn off|消す|1
talk about|話す|1
think about|考える|1
walk around|歩き回る|1
hurry up|急ぐ|1
clean up|片づける|1
help out|手伝う|1
come in|入る|1
go home|家に帰る|1
get home|家に着く|1
come home|帰ってくる|1
talk to|に話す|1
talk with|いっしょに話す|1
play with|いっしょに遊ぶ|1
live in|住んでいる|1
stay with|家に泊まる|1
ask for|たのむ|1
go up|上がる|1
go down|下りる|1
go into|入っていく|1
get in|乗り込む|1
get out|外に出る|1
come out|出てくる|1
turn left|左に曲がる|1
turn right|右に曲がる|1
go straight|まっすぐ行く|1
move to|引っこす|1
lie down|横になる|1
climb up|登る|1
look down|見下ろす|1
look back|ふり返る|1
come with|いっしょに来る|1
go with|いっしょに行く|1
bring back|持ち帰る|1
turn back|引き返す|1
find out|見つけ出す|2
pick up|拾い上げる／車で迎えに行く|2
hand in|提出する|2
hand out|配る|2
put off|延期する|2
put away|片づける|2
put down|下に置く|2
take out|取り出す|2
take back|取り消す|2
turn down|断る|2
turn around|振り返る|2
try on|試着する|2
think of|思いつく|2
grow up|成長する|2
run after|追いかける|2
run away|逃げる|2
call back|折り返し電話する|2
give back|返す|2
go away|立ち去る|2
get back|取りもどす|2
get over|乗りこえる／回復する|2
bring up|育てる|2
break down|故障する|2
check out|調べる|2
cut down|切りたおす|2
depend on|たよる|2
dress up|着飾る|2
eat out|外食する|2
fall down|転ぶ|2
hang up|電話を切る|2
hold on|待つ／しっかりつかまる|2
keep on|続ける|2
laugh at|笑う|2
leave for|出発する|2
live on|暮らす|2
look around|見回す|2
look into|調査する|2
make up|作り上げる／仲直りする|2
move on|次へ進む|2
pass by|通り過ぎる|2
pay for|支払う|2
save up|お金をためる|2
search for|探す|2
set up|設置する|2
show up|現れる|2
slow down|速度を落とす|2
speak to|話しかける|2
stay up|夜ふかしする|2
stop by|立ち寄る|2
throw away|捨てる|2
try out|試す|2
use up|使い切る|2
warm up|準備運動する|2
watch out|注意する|2
work on|取り組む|2
worry about|心配する|2
write back|返事を書く|2
agree with|同意する|2
belong to|所属する|2
care about|気にかける|2
count on|たよる|2
drop by|立ち寄る|2
fill in|記入する|2
give in|屈する|2
go ahead|先へ進む|2
hear from|便りをもらう|2
hear of|うわさに聞く|2
learn about|学ぶ|2
look out|気をつける|2
name after|ちなんで名づける|2
pick out|選び出す|2
plug in|差しこむ|2
print out|印刷する|2
reach for|手を伸ばす|2
send out|送り出す|2
sign up|申しこむ|2
tell about|話す|2
tidy up|片づける|2
turn into|変わる|2
wash away|洗い流す|2
wrap up|包む|2
carry out|実行する|3
deal with|対処する|3
die out|絶滅する|3
go through|経験する|3
hold back|こらえる|3
keep up|維持する|3
knock down|打ち倒す|3
lay out|並べる|3
make out|理解する|3
mix up|混同する|3
point out|指摘する|3
put together|組み立てる|3
rely on|たよる|3
result in|結果になる|3
settle down|落ち着く|3
shut down|閉鎖する|3
sort out|整理する|3
stand for|表す|3
stick to|こだわる|3
take over|引き継ぐ|3
tear down|取りこわす|3
think over|じっくり考える|3
wipe out|ぬぐい去る|3
wear out|すり減らす|3
apologize for|あやまる|3
hand over|手渡す|3
figure out|理解する／解き明かす|3
bring about|引き起こす|3
carry on|やり続ける|3
come across|偶然出会う|3
pass away|亡くなる|3
pass down|受け継ぐ|3
take place|行われる|3
turn out|結局〜になる|3
get through|切り抜ける|3
take care of|世話をする|2
look forward to|楽しみに待つ|2
take part in|参加する|2
be good at|得意である|2
be interested in|興味がある|2
be afraid of|こわがる|2
be kind to|親切である|2
be late for|遅れる|2
be absent from|欠席する|2
be full of|いっぱいである|2
be able to|できる|2
be proud of|誇りに思う|3
be famous for|有名である|3
be different from|異なる|3
be covered with|おおわれている|3
be surprised at|おどろく|3
be filled with|満たされている|3
be made of|作られている|3
get along with|うまくやっていく|3
catch up with|追いつく|3
run out of|使い果たす|3
come up with|思いつく|3
put up with|我慢する|3
get rid of|取り除く|3
look down on|見下す|3
be known as|として知られている|3
be made from|原料から作られている|3
be based on|に基づいている|3
be worried about|心配している|3
be tired of|にあきている|3
be used for|のために使われる|3
be related to|関係がある|3
be similar to|に似ている|3
be responsible for|に責任がある|3
keep up with|遅れずについていく|3
look up to|尊敬する|3
`.trim();

const IDIOMS = RAW.split("\n").map((line, i) => {
  const [en, ja, g] = line.split("|");
  const tokens = en.trim().split(" ");
  return {
    id: i, en: en.trim(), tokens, grade: Number(g),
    meanings: ja.split("／"),
    verb: tokens[0],
    extra: tokens.slice(1, -1),
    prep: tokens[tokens.length - 1],
  };
});
const BY_EN = Object.fromEntries(IDIOMS.map((x) => [x.en, x]));

/* ------------------------------------------------------------
   コース設定
   ・魔力は厳しめ。灯火（祭壇で休める回数）を使い切って
     魔力が尽きたら、そこで探索は終わる
------------------------------------------------------------ */
const MP_COST = 12;   // 合成して唱える
const MP_BACK = 4;    // 正解で戻る
const MP_DEX = 8;     // 図鑑から唱える
const MP_QUIZ_MISS = 5; // 宝物庫で外したときの消耗

const COURSES = [
  {
    key: "novice", name: "見習い", floors: 2, grades: [1], triples: false,
    mp: 64, torches: 2, midAt: [], midTargets: 1,
    finalName: "石扉の守り手", finalTargets: 1,
    desc: "中1の熟語だけ。最後に守り手が1体。12分ほど。",
  },
  {
    key: "adventurer", name: "冒険者", floors: 4, grades: [1, 2], triples: false,
    mp: 84, torches: 3, midAt: [2], midTargets: 2,
    finalName: "書庫の主", finalTargets: 2,
    desc: "中1〜中2。B2Fに中ボス、最後に書庫の主。25分ほど。",
  },
  {
    key: "king", name: "熟語の王", floors: 5, grades: [1, 2, 3], triples: true, tripleFrom: 2,
    mp: 104, torches: 3, midAt: [2, 4], midTargets: 2,
    finalName: "熟語の王", finalTargets: 3,
    desc: "中学全範囲＋3語熟語。中ボス2体と王。35分〜。",
  },
  {
    key: "endless", name: "果てなき坑道", floors: Infinity, grades: [1, 2, 3],
    triples: true, tripleFrom: 4, endless: true,
    mp: 90, torches: 2, midAt: [], midTargets: 1,
    finalName: "—", finalTargets: 0,
    desc: "終わりはない。もぐるほど熟語が難しくなる。灯が尽きるまで。",
  },
];

/* 果てなき坑道：2層ごとに層の主、深いほど手強い */
/* 古い hub-progress.js がキャッシュされている端末のためのフォールバック */
function hubScale(r, o) { return (window.LearnHub && LearnHub.scale) ? LearnHub.scale(r, o) : Math.round(Math.max(0, Math.min(1, r)) * 10000); }
function hubEndless(r) { return (window.LearnHub && LearnHub.scaleEndless) ? LearnHub.scaleEndless(r) : Math.round(Math.max(0, Math.min(1, r)) * 30000); }
/* ---- 学年モード ----
   学年 1=中1 / 2=中2 / 3=中3(全範囲)。ハブ（まなびの基板）で選んだ学年が初期値。
   ゲーム内で変えた学年は localStorage "manabi-grade:idiom-dungeon" に残り、次回はそれを優先する。
   出題は「熟語の学年 <= 選んだ学年」に絞る（コースごとの学年の進み方はそのまま）。
   3語熟語は中2以上にしかないので、中1では3語の部屋（呪われた道・3語の宝物庫）は出ない。 */
const GRADE_KEY = "manabi-grade:idiom-dungeon";
const GRADE_LABEL = { 1: "中1", 2: "中2", 3: "中3" };
const hubGrade = () => (window.LearnHub && LearnHub.grade) ? LearnHub.grade() : 3;
const loadGrade = () => {
  try { const g = Number(localStorage.getItem(GRADE_KEY)); if (g === 1 || g === 2 || g === 3) return g; } catch (e) {}
  return hubGrade();
};
const saveGrade = (g) => { try { localStorage.setItem(GRADE_KEY, String(g)); } catch (e) {} };
const hasMid = (c, f) => (c.endless ? (f + 1) % 2 === 0 : c.midAt.includes(f + 1));
const midCount = (c, f) => (c.endless ? Math.min(3, 1 + Math.floor(f / 4)) : c.midTargets);
const DEEP_NAMES = ["石碑の回廊", "水没した書庫", "崩れた鐘楼", "封印の坑道", "王の前室",
  "骨の広間", "凍てつく回廊", "灰の谷", "無音の書庫", "逆さの階段", "忘れられた聖堂", "底なしの縦坑"];


const GUARDS = ["ねむりの番人", "石喰いのゴーレム", "頁をめくる者", "ひび割れた守護像", "灯を消す者"];
const MIDBOSS = ["層の守り手", "鎖の番犬", "錠前の魔女", "頁の亡霊"];

const rnd = (a) => a[Math.floor(Math.random() * a.length)];
const shuffle = (a) => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [r[i], r[j]] = [r[j], r[i]]; } return r; };

/* ------------------------------------------------------------
   分岐（ルート）
------------------------------------------------------------ */
const ROUTES = {
  quiet: {
    key: "quiet", name: "静かな回廊", gain: "宝物庫 ×1", risk: "危険なし",
    text: "ほこりの積もった通路。何も出ないが、実入りも少ない。",
    rooms: ["treasure"],
  },
  guard: {
    key: "guard", name: "番人の間道", gain: "宝物庫 ×1／突破で魔力+15", risk: "番人 ×1",
    text: "近道だが番人がいる。倒せば奥の灯から魔力を分けてもらえる。",
    rooms: ["monster", "treasure"],
  },
  cursed: {
    key: "cursed", name: "呪われた宝物庫", gain: "3語熟語のパーツ", risk: "入るのに魔力5",
    text: "扉に長い熟語が彫られている。厄介だが、手に入る札は貴重だ。",
    rooms: ["treasure3"],
  },
};

/* ------------------------------------------------------------
   BGM（その場で合成。音源ファイルなし）
------------------------------------------------------------ */
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

const TRACKS = {
  /* 探索：低いドローンと、遠くで滴る水音のような単音 */
  explore: {
    tempo: 64, wave: "triangle", bassWave: "sine", lead: 0.045, vol: 0.42, drone: 33, dur: 1.6,
    bass: [33, null, null, null, null, null, null, null, 31, null, null, null, null, null, null, null],
    arp: [null, null, 69, null, null, null, null, 72, null, null, 68, null, null, null, 64, null],
    kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    hat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  /* 番人：脈打つ緊張 */
  tense: {
    tempo: 126, wave: "square", bassWave: "triangle", lead: 0.04, vol: 0.5, drone: 38, dur: 0.9,
    bass: [38, null, 38, null, 38, null, 37, null, 36, null, 36, null, 36, null, 38, null],
    arp: [62, null, 65, null, 62, null, 68, 67, 60, null, 63, null, 60, null, 66, 65],
    kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0],
    hat: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1],
  },
  /* ボス：重く速い */
  boss: {
    tempo: 152, wave: "sawtooth", bassWave: "sawtooth", lead: 0.05, vol: 0.55, drone: 33, dur: 0.85,
    bass: [33, 33, 34, 33, 33, null, 36, 35, 33, 33, 34, 33, 40, null, 39, 38],
    arp: [57, 60, 64, 68, 68, 64, 60, 64, 56, 59, 63, 68, 71, 68, 64, 59],
    kick: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1],
    hat: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  },
  /* 層を抜けた：ひと息つく */
  clear: {
    tempo: 92, wave: "triangle", bassWave: "sine", lead: 0.055, vol: 0.5, drone: 41, dur: 1.5,
    bass: [41, null, null, null, 48, null, null, null, 46, null, null, null, 41, null, null, null],
    arp: [[65, 69, 72], null, null, null, [67, 72, 76], null, null, null, [65, 70, 74], null, null, null, [65, 69, 72], null, null, null],
    kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    hat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  /* 制覇：荘厳なファンファーレ */
  victory: {
    tempo: 82, wave: "sawtooth", bassWave: "triangle", lead: 0.05, vol: 0.6, drone: 41, dur: 2.2,
    bass: [41, null, null, null, 46, null, null, null, 48, null, null, null, 41, null, null, 41],
    arp: [[65, 69, 72, 77], null, null, [77], [70, 74, 77, 82], null, null, [82], [72, 76, 79, 84], null, [84], null, [65, 69, 72, 77], null, [72], [77]],
    kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1],
    hat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 1, 1],
  },
  /* 灯が消えた：沈む */
  defeat: {
    tempo: 58, wave: "triangle", bassWave: "sine", lead: 0.06, vol: 0.45, drone: 29, dur: 2.4,
    bass: [33, null, null, null, 31, null, null, null, 29, null, null, null, 28, null, null, null],
    arp: [72, null, 71, null, 68, null, null, 67, 65, null, 64, null, 60, null, null, null],
    kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    hat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
};

function useBgm() {
  const eng = useRef({ ctx: null, master: null, timer: null, next: 0, step: 0, cfg: null, drone: null });

  const schedule = (step, t) => {
    const e = eng.current, ctx = e.ctx, cfg = e.cfg;
    if (!ctx || !cfg) return;
    const dur = cfg.dur || 1;
    const note = (m, wave, len, vol) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = wave; o.frequency.value = mtof(m);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      o.connect(g).connect(e.master);
      o.start(t); o.stop(t + len + 0.03);
    };
    if (cfg.bass[step] != null) note(cfg.bass[step], cfg.bassWave, 0.42 * dur, 0.15);
    const a = cfg.arp[step];
    if (a != null) {
      const list = Array.isArray(a) ? a : [a];
      list.forEach((m, i) => note(m, cfg.wave, 0.3 * dur, cfg.lead * (i === 0 ? 1 : 0.72)));
    }
    if (cfg.kick[step]) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(150, t);
      o.frequency.exponentialRampToValueAtTime(44, t + 0.12);
      g.gain.setValueAtTime(0.24, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      o.connect(g).connect(e.master);
      o.start(t); o.stop(t + 0.22);
    }
    if (cfg.hat[step]) {
      const len = Math.floor(ctx.sampleRate * 0.03);
      const b = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource(); src.buffer = b;
      const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 6500;
      const g = ctx.createGain(); g.gain.value = 0.045;
      src.connect(hp).connect(g).connect(e.master);
      src.start(t);
    }
  };

  const stop = useCallback(() => {
    const e = eng.current;
    if (e.timer) { clearInterval(e.timer); e.timer = null; }
    if (e.drone && e.ctx) { try { e.drone.stop(e.ctx.currentTime + 0.4); } catch (x) {} e.drone = null; }
    if (e.master && e.ctx) { try { e.master.gain.setTargetAtTime(0.0001, e.ctx.currentTime, 0.12); } catch (x) {} }
    e.cfg = null;
  }, []);

  const start = useCallback((cfg) => {
    const e = eng.current;
    if (e.cfg === cfg && e.timer) return;   // 同じ曲なら鳴らし直さない
    try {
      if (!e.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        e.ctx = new AC();
        e.master = e.ctx.createGain();
        e.master.connect(e.ctx.destination);
      }
      const ctx = e.ctx;
      if (ctx.state === "suspended") ctx.resume();
      if (e.timer) clearInterval(e.timer);
      if (e.drone) { try { e.drone.stop(ctx.currentTime + 0.3); } catch (x) {} e.drone = null; }
      e.cfg = cfg; e.step = 0;
      e.master.gain.cancelScheduledValues(ctx.currentTime);
      e.master.gain.setValueAtTime(0.0001, ctx.currentTime);
      e.master.gain.setTargetAtTime(cfg.vol, ctx.currentTime, 0.5);

      if (cfg.drone != null) {
        const o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
        o.type = "sawtooth"; o.frequency.value = mtof(cfg.drone);
        const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 260;
        g.gain.value = 0.11;
        lfo.frequency.value = 0.13; lg.gain.value = 0.045;
        lfo.connect(lg).connect(g.gain);
        o.connect(lp).connect(g).connect(e.master);
        o.start(); lfo.start();
        e.drone = o;
      }
      e.next = ctx.currentTime + 0.1;
      e.timer = setInterval(() => {
        const c = eng.current;
        if (!c.ctx || !c.cfg) return;
        const stepDur = 60 / c.cfg.tempo / 4;
        while (c.next < c.ctx.currentTime + 0.16) {
          schedule(c.step, c.next);
          c.next += stepDur;
          c.step = (c.step + 1) % 16;
        }
      }, 28);
    } catch (x) {}
  }, []);

  useEffect(() => () => { const e = eng.current; if (e.timer) clearInterval(e.timer); }, []);
  return { start, stop };
}

/* ------------------------------------------------------------
   効果音（その場で合成）
------------------------------------------------------------ */
function useSfx(enabled) {
  const ref = useRef(null);
  return useCallback((kind) => {
    if (!enabled) return;
    try {
      if (!ref.current) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ref.current = new AC();
      }
      const ctx = ref.current;
      if (ctx.state === "suspended") ctx.resume();
      const now = ctx.currentTime;

      /* 雑音を作る（岩ずれ・きしみ・がれき） */
      const noise = (t, len, type, f0, f1, vol, q = 1) => {
        const n = Math.max(1, Math.floor(ctx.sampleRate * len));
        const buf = ctx.createBuffer(1, n, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 1.4);
        const src = ctx.createBufferSource(); src.buffer = buf;
        const flt = ctx.createBiquadFilter(); flt.type = type; flt.Q.value = q;
        flt.frequency.setValueAtTime(f0, t);
        flt.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + len);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t + len);
        src.connect(flt).connect(g).connect(ctx.destination);
        src.start(t);
      };
      /* 音程のある音 */
      const tone = (t, len, type, f0, f1, vol) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(f0, t);
        if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + len);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + 0.014);
        g.gain.exponentialRampToValueAtTime(0.0001, t + len);
        o.connect(g).connect(ctx.destination);
        o.start(t); o.stop(t + len + 0.04);
      };

      if (kind === "chest") {
        /* 宝箱：錠がカチリと外れ、ふたがきしみ、金貨がきらめく */
        noise(now, 0.05, "bandpass", 2200, 1400, 0.22, 6);
        noise(now + 0.09, 0.34, "lowpass", 420, 900, 0.13, 2);
        tone(now + 0.09, 0.34, "sawtooth", 165, 232, 0.05);
        [[1047, 0.24], [1319, 0.32], [1568, 0.40], [2093, 0.48]].forEach(([f, t]) =>
          tone(now + t, 0.26, "triangle", f, f, 0.10));
        return;
      }

      if (kind === "door") {
        /* 扉：石が擦れ、低く響き、封印が澄んだ音を残す */
        noise(now, 0.85, "lowpass", 300, 900, 0.20, 1.2);
        noise(now + 0.05, 0.7, "bandpass", 180, 320, 0.12, 3);
        tone(now, 0.55, "sine", 92, 44, 0.3);
        tone(now + 0.45, 1.4, "triangle", 523, 523, 0.09);
        tone(now + 0.5, 1.5, "triangle", 784, 784, 0.07);
        tone(now + 0.62, 1.3, "sine", 1046, 1046, 0.05);
        return;
      }

      if (kind === "kill") {
        /* 撃破：一撃、崩落、地響き */
        noise(now, 0.09, "highpass", 5200, 2600, 0.3);
        tone(now, 0.16, "square", 420, 70, 0.22);
        tone(now + 0.02, 0.5, "sine", 78, 34, 0.3);
        for (let i = 0; i < 9; i++) {
          const t = now + 0.12 + Math.random() * 0.55;
          noise(t, 0.07 + Math.random() * 0.07, "bandpass", 900 - i * 60, 320, 0.1, 4);
        }
        noise(now + 0.2, 0.75, "lowpass", 700, 180, 0.12, 1);
        return;
      }

      if (kind === "hit") {
        noise(now, 0.06, "highpass", 4200, 2000, 0.2);
        tone(now, 0.12, "square", 380, 120, 0.16);
        return;
      }
    } catch (e) { /* 音が出せない環境では黙って無視 */ }
  }, [enabled]);
}

/* ------------------------------------------------------------
   洞窟の背景（壁に灯火）
------------------------------------------------------------ */
function Torch({ x, y, s = 1, flip }) {
  return (
    <g transform={`translate(${x},${y}) scale(${flip ? -s : s},${s})`}>
      <ellipse cx="0" cy="-14" rx="52" ry="40" fill="url(#cvGlow)" className="pool" />
      <path d="M0,0 L2,16 L-2,16 Z" fill="#241F2C" />
      <path d="M-11,0 q11,-7 22,0 q-3,11 -11,12 q-8,-1 -11,-12 Z" fill="#3A3240" stroke="#15111C" strokeWidth="1.5" />
      <path d="M-11,0 q11,-5 22,0 q-11,4 -22,0 Z" fill="#1B1726" />
      <path d="M-14,4 q-8,4 -10,12" fill="none" stroke="#241F2C" strokeWidth="3" strokeLinecap="round" />
      <g className="flame">
        <path d="M0,-27 q11,13 6,22 q-3,6 -6,7 q-3,-1 -6,-7 q-5,-9 6,-22 Z" fill="#E8873A" opacity=".92" />
        <path d="M0,-19 q7,9 3,15 q-2,4 -3,4 q-1,0 -3,-4 q-4,-6 3,-15 Z" fill="#FFD27A" />
      </g>
    </g>
  );
}

function Cave({ fork }) {
  return (
    <svg className="cave" viewBox="0 0 400 230" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="cvWall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3A3244" /><stop offset="1" stopColor="#191521" />
        </linearGradient>
        <linearGradient id="cvWall2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2B2536" /><stop offset="1" stopColor="#12101A" />
        </linearGradient>
        <linearGradient id="cvFloor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#241F2E" /><stop offset="1" stopColor="#0E0C14" />
        </linearGradient>
        <radialGradient id="cvDeep" cx="50%" cy="46%" r="42%">
          <stop offset="0" stopColor="#05040A" /><stop offset="1" stopColor="#05040A" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="cvGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#FFB55A" stopOpacity=".55" />
          <stop offset="1" stopColor="#FF9A3C" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="400" height="230" fill="#151220" />
      {/* 奥の闇 */}
      <ellipse cx="200" cy="104" rx="96" ry="70" fill="#07060C" />
      <rect width="400" height="230" fill="url(#cvDeep)" />

      {/* 左右の岩壁 */}
      <path d="M0,0 L0,230 L74,230 L58,196 L86,168 L60,146 L92,120 L64,92 L96,64 L70,34 L104,0 Z" fill="url(#cvWall)" />
      <path d="M400,0 L400,230 L326,230 L342,196 L314,168 L340,146 L308,120 L336,92 L304,64 L330,34 L296,0 Z" fill="url(#cvWall)" />
      <path d="M0,0 L0,120 L34,96 L18,66 L44,40 L26,0 Z" fill="url(#cvWall2)" />
      <path d="M400,0 L400,120 L366,96 L382,66 L356,40 L374,0 Z" fill="url(#cvWall2)" />

      {/* 天井としょうにゅう石 */}
      <path d="M0,0 L400,0 L400,26 L372,22 L360,52 L344,20 L308,30 L292,58 L276,26 L232,18 L216,44 L200,16
               L164,26 L150,56 L134,22 L96,30 L84,58 L68,22 L28,26 L0,20 Z" fill="url(#cvWall2)" />

      {/* 床 */}
      <path d="M0,230 L400,230 L400,182 L338,192 L286,176 L232,188 L176,174 L118,190 L64,178 L0,190 Z" fill="url(#cvFloor)" />
      <g fill="#0C0A12" opacity=".85">
        <ellipse cx="88" cy="206" rx="26" ry="7" /><ellipse cx="292" cy="212" rx="32" ry="8" />
        <ellipse cx="196" cy="220" rx="44" ry="8" />
      </g>

      {fork && (
        <g>
          {/* 分かれ道：奥に2つの坑道 */}
          <path d="M126,178 Q118,96 168,86 Q210,96 202,178 Z" fill="#07060C" />
          <path d="M198,178 Q190,96 236,86 Q282,96 274,178 Z" fill="#07060C" />
          <path d="M126,178 Q118,96 168,86 Q210,96 202,178" fill="none" stroke="#3A3244" strokeWidth="5" />
          <path d="M198,178 Q190,96 236,86 Q282,96 274,178" fill="none" stroke="#3A3244" strokeWidth="5" />
          <path d="M196,180 L204,180 L206,120 L194,120 Z" fill="#241F2E" />
        </g>
      )}

      {/* 壁の灯火 */}
      <Torch x={58} y={96} s={1.05} />
      <Torch x={342} y={104} s={1.05} flip />
      {fork && <Torch x={200} y={72} s={0.8} />}

      {/* 手前の岩（黒いシルエット） */}
      <path d="M0,230 L0,196 Q30,182 52,206 Q66,222 96,230 Z" fill="#07060C" />
      <path d="M400,230 L400,200 Q368,186 344,208 Q330,224 302,230 Z" fill="#07060C" />
    </svg>
  );
}

/* 分岐の坑道（選択肢の中に出す小さな絵） */
function TunnelMouth({ kind }) {
  return (
    <svg viewBox="0 0 120 84" className="mouth" aria-hidden="true">
      <defs>
        <radialGradient id={`tm-${kind}`} cx="50%" cy="60%" r="60%">
          <stop offset="0" stopColor={kind === "guard" ? "#3A1E1E" : kind === "cursed" ? "#2A1838" : "#241F2E"} />
          <stop offset="1" stopColor="#07060C" />
        </radialGradient>
      </defs>
      <rect width="120" height="84" fill="#12101A" />
      <path d="M18,84 Q14,26 60,16 Q106,26 102,84 Z" fill={`url(#tm-${kind})`} />
      <path d="M18,84 Q14,26 60,16 Q106,26 102,84" fill="none" stroke="#3A3244" strokeWidth="4" />
      <path d="M0,84 L0,58 Q14,50 22,68 L26,84 Z M120,84 L120,62 Q108,52 98,70 L94,84 Z" fill="#241F2E" />

      {kind === "quiet" && (
        <g>
          <ellipse cx="60" cy="46" rx="26" ry="20" fill="#FFB55A" opacity=".16" />
          <path d="M52,30 v10 M60,26 v12 M68,31 v9" stroke="#4A4258" strokeWidth="2" />
          <ellipse cx="60" cy="78" rx="22" ry="5" fill="#2B2536" />
        </g>
      )}
      {kind === "guard" && (
        <g>
          <path d="M44,30 q6,10 0,18 M76,30 q-6,10 0,18" stroke="#6B6478" strokeWidth="3" fill="none" />
          <circle cx="50" cy="52" r="4" fill="#D9563C" className="bl" />
          <circle cx="70" cy="52" r="4" fill="#D9563C" className="bl" />
          <path d="M40,72 h40" stroke="#4A4258" strokeWidth="3" />
          <path d="M46,72 l-4,8 M62,72 l3,8 M74,72 l-3,8" stroke="#6B6478" strokeWidth="2" />
        </g>
      )}
      {kind === "cursed" && (
        <g>
          <rect x="38" y="34" width="44" height="44" rx="4" fill="#1B1626" stroke="#5A4A2E" strokeWidth="3" />
          <circle cx="60" cy="54" r="12" fill="none" stroke="#9B6BD9" strokeWidth="3" className="bl" />
          <path d="M60,42 v24 M48,54 h24" stroke="#9B6BD9" strokeWidth="3" />
        </g>
      )}
    </svg>
  );
}

/* 崩れ落ちる破片（角度と飛距離をあらかじめ散らしておく） */
const SHARDS = Array.from({ length: 14 }).map((_, i) => {
  const a = (i * 137.5) % 360;
  const rad = (a * Math.PI) / 180;
  const dist = 38 + ((i * 23) % 46);
  return {
    x: `${18 + ((i * 29) % 64)}%`,
    y: `${32 + ((i * 17) % 40)}%`,
    tx: `${Math.round(Math.cos(rad) * dist)}px`,
    ty: `${Math.round(Math.sin(rad) * dist * 0.5 + 60)}px`,
    r: `${Math.round(Math.cos(rad) * 320)}deg`,
    d: `${(i % 7) * 0.045}s`,
    k: i % 3,
  };
});

/* ------------------------------------------------------------
   モンスター（陰影・質感つき）
------------------------------------------------------------ */
const Defs = () => (
  <defs>
    <linearGradient id="gStone" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0" stopColor="#7C7488" /><stop offset="0.55" stopColor="#4E4759" /><stop offset="1" stopColor="#241F2E" />
    </linearGradient>
    <linearGradient id="gRock" x1="0.2" y1="0" x2="0.8" y2="1">
      <stop offset="0" stopColor="#6E6478" /><stop offset="1" stopColor="#2A2434" />
    </linearGradient>
    <linearGradient id="gCloth" x1="0.1" y1="0" x2="0.7" y2="1">
      <stop offset="0" stopColor="#4A3D63" /><stop offset="0.6" stopColor="#2E2440" /><stop offset="1" stopColor="#150F22" />
    </linearGradient>
    <linearGradient id="gPaper" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0" stopColor="#EFE6CE" /><stop offset="0.6" stopColor="#CDC0A4" /><stop offset="1" stopColor="#8E836A" />
    </linearGradient>
    <linearGradient id="gIron" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0" stopColor="#8891A3" /><stop offset="0.5" stopColor="#4A5060" /><stop offset="1" stopColor="#20242E" />
    </linearGradient>
    <linearGradient id="gFur" x1="0.2" y1="0" x2="0.8" y2="1">
      <stop offset="0" stopColor="#4E4260" /><stop offset="1" stopColor="#1E1830" />
    </linearGradient>
    <linearGradient id="gLeather" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0" stopColor="#7A4A2E" /><stop offset="1" stopColor="#341E14" />
    </linearGradient>
    <radialGradient id="gEye" cx="50%" cy="50%" r="50%">
      <stop offset="0" stopColor="#FFE6A8" /><stop offset="0.45" stopColor="#E8A93C" /><stop offset="1" stopColor="#E8A93C" stopOpacity="0" />
    </radialGradient>
    <radialGradient id="gEyeC" cx="50%" cy="50%" r="50%">
      <stop offset="0" stopColor="#D8FFF8" /><stop offset="0.45" stopColor="#5ED6C6" /><stop offset="1" stopColor="#5ED6C6" stopOpacity="0" />
    </radialGradient>
    <filter id="soft"><feGaussianBlur stdDeviation="2.2" /></filter>
    <filter id="soft4"><feGaussianBlur stdDeviation="4" /></filter>
  </defs>
);

const OL = "#0A0810";
const Eye = ({ x, y, r = 6, c = "gEye", dead }) => (
  <g>
    {!dead && <circle cx={x} cy={y} r={r * 3} fill={`url(#${c})`} filter="url(#soft)" className="glow" />}
    <ellipse cx={x} cy={y} rx={r} ry={r * 1.25} fill={dead ? "#2A2434" : c === "gEye" ? "#FFDB92" : "#CFFAF2"} />
  </g>
);
/* 岩肌の割れ目 */
const Cracks = ({ d, w = 1.6 }) => <path d={d} fill="none" stroke="#100D18" strokeWidth={w} strokeLinecap="round" opacity=".85" />;

const CREATURES = {
  /* ── 番人 ── */
  "ねむりの番人": (dead) => (
    <g>
      <ellipse cx="100" cy="126" rx="44" ry="7" fill="#07060C" opacity=".65" />
      <path d="M60,126 Q54,66 78,46 Q100,34 122,46 Q146,66 140,126 Z" fill="url(#gCloth)" />
      <path d="M100,34 Q78,44 74,80 Q88,92 100,92 Q112,92 126,80 Q122,44 100,34 Z" fill="#3A2F52" />
      <path d="M78,86 Q72,110 74,126 M100,92 Q98,110 100,126 M122,86 Q128,110 126,126" fill="none" stroke="#150F22" strokeWidth="2.5" />
      <path d="M66,116 Q84,108 100,110 Q118,108 134,116" fill="none" stroke="#150F22" strokeWidth="2.5" />
      <ellipse cx="100" cy="74" rx="24" ry="21" fill="#08060E" />
      <ellipse cx="100" cy="70" rx="24" ry="17" fill="#0E0B16" opacity=".7" />
      <path d="M88,76 q12,7 24,0" fill="none" stroke="#B9AEC8" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M74,50 Q100,38 126,50" fill="none" stroke="#5A4A76" strokeWidth="2.5" />
      <path d="M64,104 q10,-6 16,2 q-6,8 -16,-2 Z" fill="#CFC6B4" opacity=".9" />
      {!dead && (
        <g fill="#9BE3D8" fontFamily="monospace" fontSize="14" fontWeight="700" className="fl1">
          <text x="140" y="46" opacity=".85">z</text><text x="152" y="30" opacity=".55">Z</text>
        </g>
      )}
    </g>
  ),

  "石喰いのゴーレム": (dead) => (
    <g>
      <ellipse cx="100" cy="126" rx="52" ry="7" fill="#07060C" opacity=".65" />
      <rect x="16" y="70" width="28" height="40" rx="9" fill="url(#gRock)" className="arm-l" />
      <rect x="156" y="70" width="28" height="40" rx="9" fill="url(#gRock)" className="arm-r" />
      <path d="M54,124 L50,74 L66,54 L84,48 L118,48 L136,56 L150,76 L146,124 Z" fill="url(#gStone)" />
      <path d="M66,54 L84,48 L118,48 L136,56 L124,72 L78,72 Z" fill="#6E6478" opacity=".55" />
      <path d="M54,124 L146,124 L142,104 L58,104 Z" fill="#1B1726" opacity=".65" />
      <Cracks d="M78,50 L86,72 L74,84 L88,104 M124,52 L116,74 L130,88 L120,106 M100,74 L104,96" w={2} />
      <path d="M74,88 L128,88 L120,112 L82,112 Z" fill="#08060E" />
      <path d="M78,88 l8,12 l8,-12 M100,88 l8,12 l8,-12 M118,88 l-6,10" fill="#D8D0C0" opacity=".9" />
      <path d="M84,112 l6,-9 l6,9 M104,112 l6,-9 l6,9" fill="#D8D0C0" opacity=".7" />
      <g>
        <Eye x={80} y={68} r={5} dead={dead} /><Eye x={122} y={68} r={5} dead={dead} />
      </g>
      <path d="M60,60 q10,-4 16,2" fill="none" stroke="#8E8698" strokeWidth="2" opacity=".7" />
      <ellipse cx="66" cy="96" rx="8" ry="5" fill="#4E6B3A" opacity=".5" />
      <ellipse cx="136" cy="86" rx="6" ry="4" fill="#4E6B3A" opacity=".4" />
    </g>
  ),

  "頁をめくる者": (dead) => (
    <g className={dead ? "" : "fl2"}>
      <ellipse cx="100" cy="126" rx="34" ry="5" fill="#07060C" opacity=".55" />
      <path d="M34,58 L20,40 L40,46 Z M166,58 L180,40 L160,46 Z" fill="#DCD0B4" className="wing" opacity=".85" />
      <path d="M100,44 L30,58 L30,104 L100,90 Z" fill="url(#gPaper)" />
      <path d="M100,44 L170,58 L170,104 L100,90 Z" fill="url(#gPaper)" opacity=".82" />
      <g stroke="#9A8E72" strokeWidth="1" opacity=".8">
        <path d="M32,62 L100,49 M32,68 L100,55 M32,74 L100,61 M168,62 L100,49 M168,68 L100,55 M168,74 L100,61" />
      </g>
      <path d="M94,44 L94,90 L106,90 L106,44 Z" fill="url(#gLeather)" />
      <path d="M46,78 h34 M46,86 h26 M120,78 h34 M128,86 h26" stroke="#7C7058" strokeWidth="2" opacity=".8" />
      <ellipse cx="100" cy="68" rx="15" ry="12" fill="#08060E" />
      <Eye x={100} y={68} r={6} c="gEyeC" dead={dead} />
      <path d="M100,90 L100,110" stroke="#5A5060" strokeWidth="2" />
      <circle cx="100" cy="114" r="4" fill="none" stroke="#5A5060" strokeWidth="2" />
    </g>
  ),

  "ひび割れた守護像": (dead) => (
    <g>
      <ellipse cx="100" cy="128" rx="50" ry="6" fill="#07060C" opacity=".65" />
      <path d="M46,128 L54,110 L146,110 L154,128 Z" fill="url(#gRock)" />
      <path d="M60,110 L66,92 Q100,80 134,92 L140,110 Z" fill="url(#gStone)" />
      <path d="M72,92 Q66,42 100,30 Q134,42 128,92 Z" fill="url(#gStone)" />
      <path d="M100,30 Q80,40 76,74 Q88,88 100,88 Q112,88 124,74 Q120,40 100,30 Z" fill="#6E6478" opacity=".45" />
      <Cracks d="M100,30 L92,52 L108,60 L96,84 L104,92" w={2.4} />
      <Cracks d="M128,64 L146,74 M72,66 L54,76 M118,86 L132,100" w={1.8} />
      <path d="M100,30 L94,52 L106,58" fill="none" stroke="#E8A93C" strokeWidth="1.2" opacity={dead ? 0 : .7} className="bl" />
      <ellipse cx="86" cy="62" rx="9" ry="6" fill="#08060E" />
      <ellipse cx="114" cy="62" rx="9" ry="6" fill="#08060E" />
      <Eye x={86} y={62} r={4.5} dead={dead} /><Eye x={114} y={62} r={4.5} dead={dead} />
      <path d="M88,80 q12,6 24,0" fill="none" stroke="#241F2E" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="64" cy="104" rx="9" ry="4" fill="#4E6B3A" opacity=".45" />
      <ellipse cx="138" cy="118" rx="10" ry="4" fill="#4E6B3A" opacity=".35" />
    </g>
  ),

  "灯を消す者": (dead) => (
    <g>
      <g className={dead ? "" : "fl1"}>
        <path d="M64,118 Q56,52 100,36 Q144,52 136,118 Q126,104 118,118 Q110,102 100,118 Q90,102 82,118 Q74,104 64,118 Z" fill="url(#gCloth)" />
        <path d="M100,36 Q76,48 74,84 Q86,96 100,96 Q114,96 126,84 Q124,48 100,36 Z" fill="#241A38" />
        <path d="M82,92 Q78,108 80,118 M100,96 Q100,108 100,118 M118,92 Q122,108 120,118" fill="none" stroke="#120C1E" strokeWidth="2.5" />
        <ellipse cx="100" cy="62" rx="23" ry="20" fill="#07050C" />
        <Eye x={91} y={60} r={4} dead={dead} /><Eye x={109} y={60} r={4} dead={dead} />
        <path d="M70,52 Q100,40 130,52" fill="none" stroke="#4A3D63" strokeWidth="2.5" />
      </g>
      <path d="M150,34 v26" stroke="#5A5060" strokeWidth="2.5" />
      <path d="M136,60 h28 l-4,-6 h-20 Z" fill="url(#gIron)" />
      <rect x="138" y="60" width="24" height="28" rx="2" fill="#1B1626" stroke="#5A5060" strokeWidth="2.5" />
      <path d="M136,88 h28 l-3,6 h-22 Z" fill="url(#gIron)" />
      {!dead && <path d="M150,68 q6,8 0,14 q-6,-6 0,-14" fill="#FFC46A" className="bl" />}
      <path d="M130,52 q-10,-10 -6,-22" fill="none" stroke="#8E86A0" strokeWidth="2" opacity=".35" />
    </g>
  ),

  /* ── 中ボス ── */
  "層の守り手": (dead) => (
    <g>
      <ellipse cx="100" cy="128" rx="56" ry="7" fill="#07060C" opacity=".65" />
      <path d="M56,126 L52,80 Q68,66 100,62 Q132,66 148,80 L144,126 Z" fill="url(#gIron)" />
      <path d="M52,80 Q68,66 100,62 Q132,66 148,80 L142,92 Q100,80 58,92 Z" fill="#9AA3B5" opacity=".4" />
      <path d="M78,126 L82,92 M122,126 L118,92 M100,86 L100,126" fill="none" stroke="#171B24" strokeWidth="2.5" />
      <path d="M76,58 Q76,28 100,22 Q124,28 124,58 L120,74 Q100,82 80,74 Z" fill="url(#gIron)" />
      <path d="M100,22 Q84,28 80,54 Q90,64 100,64 Q110,64 120,54 Q116,28 100,22 Z" fill="#9AA3B5" opacity=".35" />
      <path d="M80,54 h40 v9 h-40 Z" fill="#06050A" />
      <rect x="96" y="54" width="4" height="9" fill="#4A5060" />
      <rect x="106" y="54" width="4" height="9" fill="#4A5060" />
      <Eye x={88} y={58} r={3.4} dead={dead} /><Eye x={112} y={58} r={3.4} dead={dead} />
      <path d="M100,22 L100,8 M96,10 q4,-8 8,0" fill="#D9A94A" stroke="#D9A94A" strokeWidth="2" />
      <path d="M20,74 q24,-10 38,10 q-16,30 -38,22 Z" fill="url(#gIron)" />
      <path d="M20,74 q24,-10 38,10 l-8,6 q-14,-14 -30,-8 Z" fill="#9AA3B5" opacity=".35" />
      <circle cx="38" cy="92" r="9" fill="none" stroke="#D9A94A" strokeWidth="2.5" className={dead ? "" : "bl"} />
      <path d="M38,83 v18 M29,92 h18" stroke="#D9A94A" strokeWidth="2" />
      <path d="M170,52 L158,124" stroke="#4A3520" strokeWidth="7" strokeLinecap="round" />
      <path d="M170,52 L162,34 L182,40 Z" fill="url(#gIron)" />
    </g>
  ),

  "鎖の番犬": (dead) => (
    <g>
      <ellipse cx="100" cy="126" rx="58" ry="7" fill="#07060C" opacity=".65" />
      <path d="M38,122 Q30,88 58,78 L142,78 Q170,88 162,122 Q150,110 138,122 Q124,108 110,122 Q96,108 82,122 Q66,110 52,122 Z" fill="url(#gFur)" />
      <path d="M58,78 L142,78 Q158,84 158,96 Q100,86 42,96 Q42,84 58,78 Z" fill="#5E5074" opacity=".4" />
      <g className={dead ? "" : "hd1"}>
        <ellipse cx="64" cy="58" rx="25" ry="22" fill="url(#gFur)" />
        <path d="M44,40 L36,20 L58,32 M84,40 L92,20 L70,32" fill="url(#gFur)" />
        <path d="M52,66 Q64,58 76,66 Q72,78 64,79 Q56,78 52,66 Z" fill="#2A2038" />
        <ellipse cx="64" cy="70" rx="6" ry="4" fill="#0A0810" />
        <path d="M56,76 q8,5 16,0" fill="none" stroke="#0A0810" strokeWidth="2" />
        <path d="M54,74 l3,7 M74,74 l-3,7" stroke="#E4DACA" strokeWidth="2.5" />
        <Eye x={54} y={52} r={4} dead={dead} /><Eye x={76} y={52} r={4} dead={dead} />
      </g>
      <g className={dead ? "" : "hd2"}>
        <ellipse cx="136" cy="58" rx="25" ry="22" fill="url(#gFur)" />
        <path d="M116,40 L108,20 L130,32 M156,40 L164,20 L142,32" fill="url(#gFur)" />
        <path d="M124,66 Q136,58 148,66 Q144,78 136,79 Q128,78 124,66 Z" fill="#2A2038" />
        <ellipse cx="136" cy="70" rx="6" ry="4" fill="#0A0810" />
        <path d="M128,76 q8,5 16,0" fill="none" stroke="#0A0810" strokeWidth="2" />
        <path d="M126,74 l3,7 M146,74 l-3,7" stroke="#E4DACA" strokeWidth="2.5" />
        <Eye x={126} y={52} r={4} dead={dead} /><Eye x={146} y={52} r={4} dead={dead} />
      </g>
      <g fill="none" stroke="url(#gIron)" strokeWidth="5">
        <ellipse cx="82" cy="92" rx="8" ry="6" /><ellipse cx="100" cy="98" rx="8" ry="6" /><ellipse cx="118" cy="92" rx="8" ry="6" />
      </g>
      <path d="M64,80 Q100,74 136,80" fill="none" stroke="#4A5060" strokeWidth="6" />
    </g>
  ),

  "錠前の魔女": (dead) => (
    <g>
      <g className={dead ? "" : "fl1"}>
        <path d="M60,122 Q50,58 100,34 Q150,58 140,122 Q128,106 118,122 Q108,104 100,122 Q92,104 82,122 Q72,106 60,122 Z" fill="url(#gCloth)" />
        <path d="M100,34 Q70,52 66,92 Q84,102 100,102 Q116,102 134,92 Q130,52 100,34 Z" fill="#3A2B54" opacity=".8" />
        <path d="M52,52 Q100,20 148,52 Q124,44 100,42 Q76,44 52,52 Z" fill="#241A38" />
        <path d="M82,100 Q80,112 82,122 M118,100 Q120,112 118,122" fill="none" stroke="#120C1E" strokeWidth="2.5" />
        <ellipse cx="100" cy="66" rx="21" ry="19" fill="#07050C" />
        <circle cx="100" cy="60" r="9" fill="#1B1224" stroke="#8E7AB0" strokeWidth="2" />
        <path d="M100,60 L94,82 h12 Z" fill="#1B1224" stroke="#8E7AB0" strokeWidth="2" />
        <circle cx="100" cy="60" r="3.5" fill="#C6A0F0" className={dead ? "" : "bl"} />
      </g>
      <g className={dead ? "" : "orbit"} style={{ transformOrigin: "100px 76px" }}>
        <g fill="url(#gIron)" stroke="#20242E" strokeWidth="2">
          <rect x="24" y="46" width="20" height="16" rx="3" />
          <path d="M28,46 v-5 a6,6 0 0 1 12,0 v5" fill="none" stroke="#8891A3" strokeWidth="3" />
          <rect x="156" y="90" width="20" height="16" rx="3" />
          <path d="M160,90 v-5 a6,6 0 0 1 12,0 v5" fill="none" stroke="#8891A3" strokeWidth="3" />
        </g>
      </g>
    </g>
  ),

  "頁の亡霊": (dead) => (
    <g className={dead ? "" : "fl2"}>
      <path d="M40,30 L58,22 L56,40 Z M162,42 L146,32 L146,50 Z" fill="#E4D9BE" className="wing" opacity=".8" />
      <path d="M56,116 Q48,48 100,32 Q152,48 144,116 Q132,102 122,116 Q110,100 100,116 Q90,100 78,116 Q68,102 56,116 Z" fill="url(#gPaper)" opacity=".95" />
      <path d="M100,32 Q64,50 60,102 Q80,110 100,110 Q120,110 140,102 Q136,50 100,32 Z" fill="#FFF7E4" opacity=".35" />
      <g stroke="#9A8E72" strokeWidth="1.4" opacity=".75">
        <path d="M70,52 h60 M66,64 h68 M70,76 h44 M74,88 h52" />
      </g>
      <ellipse cx="86" cy="60" rx="8" ry="11" fill="#0A0810" />
      <ellipse cx="114" cy="60" rx="8" ry="11" fill="#0A0810" />
      <path d="M86,71 q-2,10 2,16 M114,71 q2,10 -2,16" stroke="#0A0810" strokeWidth="2" fill="none" opacity=".6" />
      <path d="M92,88 q8,9 16,0" fill="none" stroke="#0A0810" strokeWidth="2.5" />
    </g>
  ),

  /* ── 最終ボス ── */
  "石扉の守り手": (dead) => (
    <g>
      <rect x="26" y="6" width="148" height="122" fill="#1B1626" />
      <path d="M46,128 L46,58 Q100,26 154,58 L154,128 Z" fill="url(#gStone)" />
      <path d="M100,26 Q68,42 62,92 Q80,106 100,106 Q120,106 138,92 Q132,42 100,26 Z" fill="#6E6478" opacity=".38" />
      <path d="M100,26 L100,128" stroke="#120F1A" strokeWidth="3" />
      <g fill="#4A5060" stroke="#20242E" strokeWidth="1.5">
        <circle cx="60" cy="70" r="4" /><circle cx="60" cy="100" r="4" />
        <circle cx="140" cy="70" r="4" /><circle cx="140" cy="100" r="4" />
      </g>
      <path d="M68,62 Q84,54 96,62 M132,62 Q116,54 104,62" fill="none" stroke="#241F2E" strokeWidth="4" />
      <ellipse cx="82" cy="76" rx="11" ry="8" fill="#07050C" />
      <ellipse cx="118" cy="76" rx="11" ry="8" fill="#07050C" />
      <Eye x={82} y={76} r={5.5} dead={dead} /><Eye x={118} y={76} r={5.5} dead={dead} />
      <path d="M80,98 q20,14 40,0" fill="none" stroke="#120F1A" strokeWidth="5" strokeLinecap="round" />
      <Cracks d="M70,44 L78,64 L66,78 M130,48 L124,70 L136,84" w={2} />
      <path d="M26,84 q-20,6 -22,26 q16,6 26,-10" fill="url(#gRock)" className="arm-l" />
      <path d="M174,84 q20,6 22,26 q-16,6 -26,-10" fill="url(#gRock)" className="arm-r" />
    </g>
  ),

  "書庫の主": (dead) => (
    <g>
      <g className="wing" stroke="#B3A488" strokeWidth="5" fill="none" opacity=".85">
        <path d="M10,116 q24,-24 38,2" /><path d="M190,116 q-24,-24 -38,2" />
        <path d="M22,50 q16,-18 30,-2" /><path d="M178,50 q-16,-18 -30,-2" />
      </g>
      <path d="M100,24 L26,44 L26,114 L100,96 Z" fill="url(#gPaper)" />
      <path d="M100,24 L174,44 L174,114 L100,96 Z" fill="url(#gPaper)" opacity=".85" />
      <g stroke="#9A8E72" strokeWidth="1" opacity=".7">
        <path d="M28,50 L100,31 M28,58 L100,39 M28,66 L100,47 M172,50 L100,31 M172,58 L100,39 M172,66 L100,47" />
      </g>
      <path d="M88,24 L88,96 L112,96 L112,24 Z" fill="url(#gLeather)" />
      <path d="M88,24 L88,96 L96,96 L96,24 Z" fill="#9A5E38" opacity=".5" />
      <g fill="#D9A94A" opacity=".9">
        <path d="M26,44 l10,-3 l0,8 l-10,3 Z" /><path d="M174,44 l-10,-3 l0,8 l10,3 Z" />
        <path d="M26,114 l10,-3 l0,8 l-10,3 Z" /><path d="M174,114 l-10,-3 l0,8 l10,3 Z" />
      </g>
      <ellipse cx="62" cy="82" rx="13" ry="11" fill="#07050C" />
      <ellipse cx="138" cy="82" rx="13" ry="11" fill="#07050C" />
      <ellipse cx="100" cy="54" rx="14" ry="12" fill="#07050C" />
      <Eye x={62} y={82} r={5.5} dead={dead} /><Eye x={138} y={82} r={5.5} dead={dead} />
      <Eye x={100} y={54} r={6} c="gEyeC" dead={dead} />
      <path d="M100,96 v18" stroke="#5A5060" strokeWidth="3" />
      <g fill="none" stroke="#4A5060" strokeWidth="3">
        <ellipse cx="100" cy="120" rx="7" ry="5" />
      </g>
    </g>
  ),

  "熟語の王": (dead) => (
    <g>
      <path d="M34,128 L40,44 L160,44 L166,128 Z" fill="#1B1626" />
      <g stroke="#2E2740" strokeWidth="2" opacity=".8">
        <path d="M48,58 h30 M48,72 h30 M48,86 h30 M122,58 h30 M122,72 h30 M122,86 h30" />
      </g>
      <path d="M60,128 Q52,60 100,40 Q148,60 140,128 Z" fill="url(#gCloth)" />
      <path d="M100,40 Q70,56 66,98 Q84,110 100,110 Q116,110 134,98 Q130,56 100,40 Z" fill="#4A3D63" opacity=".55" />
      <path d="M70,110 Q66,120 68,128 M100,110 Q100,120 100,128 M130,110 Q134,120 132,128" fill="none" stroke="#120C1E" strokeWidth="2.5" />
      <ellipse cx="100" cy="66" rx="27" ry="24" fill="url(#gStone)" />
      <path d="M100,42 Q82,52 80,76 Q90,88 100,88 Q110,88 120,76 Q118,52 100,42 Z" fill="#6E6478" opacity=".4" />
      <Cracks d="M94,46 L90,64 L100,70 L94,86 M112,52 L116,68 L108,74" w={1.8} />
      <path d="M94,46 L90,64 L100,70" fill="none" stroke="#E8A93C" strokeWidth="1.4" opacity={dead ? 0 : .8} className="bl" />
      <Eye x={89} y={64} r={5} dead={dead} /><Eye x={111} y={64} r={5} dead={dead} />
      <path d="M86,80 q14,9 28,0" fill="none" stroke="#120F1A" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M88,80 l5,8 l5,-8 M104,80 l5,8 l5,-8" fill="#E4DACA" />
      <path d="M66,44 L52,16 L74,28 M134,44 L148,16 L126,28" fill="url(#gStone)" />
      <path d="M72,34 L62,10 L86,22 L100,4 L114,22 L138,10 L128,34 Z" fill="#D9A94A" />
      <path d="M72,34 L62,10 L86,22 L100,4 L114,22 L138,10 L128,34" fill="none" stroke="#8A6B24" strokeWidth="1.5" />
      <circle cx="100" cy="20" r="4" fill="#C6A0F0" />
      <path d="M176,26 L166,126" stroke="#4A3520" strokeWidth="7" strokeLinecap="round" />
      <circle cx="177" cy="20" r="11" fill="url(#gEyeC)" filter="url(#soft)" className="glow" />
      <circle cx="177" cy="20" r="6" fill="#CFFAF2" />
    </g>
  ),
};

function Creature({ name, big, dead }) {
  const draw = CREATURES[name] || CREATURES["ねむりの番人"];
  return (
    <div className={"crea" + (big ? " big" : "")}>
      <svg viewBox="0 0 200 134" className={"creature" + (dead ? " down" : "")} aria-hidden="true">
        <Defs />
        {draw(dead)}
      </svg>
      {dead && (
        <div className="ruin" aria-hidden="true">
          {SHARDS.map((sh, i) => (
            <i key={i} className={"shard k" + sh.k}
              style={{ left: sh.x, top: sh.y, "--tx": sh.tx, "--ty": sh.ty, "--r": sh.r, animationDelay: sh.d }} />
          ))}
          <span className="dust" />
          <span className="rubble" />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------
   部屋の絵
------------------------------------------------------------ */
function Scene({ kind, name, solved }) {
  if (kind === "monster" || kind === "midboss" || kind === "boss")
    return <Creature name={name} big={kind !== "monster"} dead={solved} />;
  if (kind === "treasure" || kind === "treasure3")
    return (
      <svg viewBox="0 0 200 116" className="scene" aria-hidden="true">
        <ellipse cx="100" cy="106" rx="60" ry="8" fill="#07060C" opacity=".8" />
        <rect x="54" y="58" width="92" height="44" rx="5" fill="#57431F" stroke="#07060C" strokeWidth="4" />
        <path d={solved ? "M54,58 L54,38 Q100,12 146,38 L146,58 Z" : "M54,58 Q100,32 146,58 Z"}
          fill="#6C5528" stroke="#07060C" strokeWidth="4" />
        <rect x="93" y="66" width="14" height="18" rx="2" fill="#D9A94A" stroke="#07060C" strokeWidth="3" />
        {solved && <g className="tw" fill="#D9A94A"><circle cx="74" cy="32" r="3" /><circle cx="128" cy="26" r="4" /><circle cx="100" cy="18" r="2.5" /></g>}
      </svg>
    );
  if (kind === "fork") return null;
  return (
    <svg viewBox="0 0 200 116" className="scene" aria-hidden="true">
      <rect x="40" y="6" width="120" height="104" rx="6" fill="#1B1626" stroke="#07060C" strokeWidth="4" />
      <path d="M60,110 L60,50 Q100,18 140,50 L140,110 Z" fill="#100D18" stroke="#07060C" strokeWidth="4" />
      <circle cx="100" cy="64" r="19" fill="none" stroke={solved ? "#5ED6C6" : "#39304A"} strokeWidth="4" />
      <path d="M100,45 L100,83 M81,64 L119,64" stroke={solved ? "#5ED6C6" : "#39304A"} strokeWidth="4" />
      {solved && <circle cx="100" cy="64" r="28" fill="none" stroke="#5ED6C6" strokeWidth="2" className="rp" />}
    </svg>
  );
}

/* ============================================================ */
function IdiomLabyrinth() {
  const [screen, setScreen] = useState("title");
  const [course, setCourse] = useState(COURSES[1]);
  const [grade, setGradeState] = useState(loadGrade);
  const setGrade = (g) => { setGradeState(g); saveGrade(g); };
  const [fi, setFi] = useState(0);
  const [queue, setQueue] = useState([]);
  const [room, setRoom] = useState(null);
  const [mp, setMp] = useState(70);
  const [torches, setTorches] = useState(2);
  const [stones, setStones] = useState([]);
  const [cards, setCards] = useState([]);
  const [orbs, setOrbs] = useState([]);
  const [dex, setDex] = useState([]);
  const [sel, setSel] = useState({ v: null, s: null, p: null });
  const [msg, setMsg] = useState("");
  const [solved, setSolved] = useState(false);
  const [twinOpen, setTwinOpen] = useState(false);
  const [settled, setSettled] = useState(true);
  const [flash, setFlash] = useState(null);
  const [showDex, setShowDex] = useState(false);
  const [bgmOn, setBgmOn] = useState(true);
  const [bossStep, setBossStep] = useState(0);
  const [stat, setStat] = useState({ fails: 0, tries: 0, rests: 0, spent: 0, route: [] });

  const bgm = useBgm();
  const sfx = useSfx(bgmOn);
  const used = useRef(new Set());
  const owned = useRef({ v: new Set(), s: new Set(), p: new Set() });

  const gaveOut = mp < MP_COST && torches <= 0;

  /* 場面に応じて曲を切り替える */
  useEffect(() => {
    if (!bgmOn) { bgm.stop(); return; }
    if (screen === "play") {
      const k = room ? room.kind : "";
      bgm.start(k === "monster" ? TRACKS.tense
        : k === "midboss" || k === "boss" ? TRACKS.boss
          : TRACKS.explore);
    } else if (screen === "floorclear") bgm.start(TRACKS.clear);
    else if (screen === "end") bgm.start(gaveOut ? TRACKS.defeat : TRACKS.victory);
    else bgm.start(TRACKS.explore);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, room && room.kind, bgmOn, gaveOut]);
   
/* --- まなびの基板へ送る --- */
  /* 出来ばえ = 到達深さ × コース係数 × (1 − 不発率×0.5)。果てなき坑道は到達度(endless)だけ送る */
  const COEF = { novice: 0.5, adventurer: 0.75, king: 1.0 };
  const RANK = { novice: 1, adventurer: 2, king: 3 };
  useEffect(() => {
    if (!window.manabiReport) return;
    if (screen !== "floorclear" && screen !== "end") return;
    const won = screen === "end" && !gaveOut && !course.endless;
    const done = won ? (RANK[course.key] || 0)
      : (course.endless && fi + 1 >= 5) ? 3 : 0;
    const failRate = stat.tries > 0 ? Math.min(1, stat.fails / stat.tries) : 0;
    const deep = course.endless ? 0 : Math.min(1, (fi + 1) / course.floors);
    const ratio = deep * (COEF[course.key] || 0) * (1 - failRate * 0.5);
    const rep = {
      app: "idiom-dungeon",
      done,
      total: 3,
      best: course.endless ? 0 : hubScale(ratio, { grade }),
      grade,
      raw: fi + 1,
      note: won ? `${course.name}コース 制覇（熟語${dex.length}語）`
        : `${course.name} B${fi + 1}F 到達（熟語${dex.length}語）`,
    };
    if (course.endless) rep.endless = hubEndless(Math.min(1, (fi + 1) / 15));
    window.manabiReport(rep);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, fi]);
   
  const floorName = DEEP_NAMES[fi] || `深層 ${fi + 1 - DEEP_NAMES.length}`;
  const gradeOKFor = (c, f) => {
    const g = Math.min(grade, c.grades[Math.min(c.grades.length - 1, Math.floor(f / 2))]);
    return (x) => x.grade <= g && c.grades.includes(x.grade);
  };
  /* 3語熟語を出せるか（コースが3語ありで、選んだ学年に3語熟語があるとき） */
  const triplesOK = (c) => !!c.triples && IDIOMS.some((x) => x.tokens.length === 3 && x.grade <= grade);
  const haveAll = (x) =>
    owned.current.v.has(x.verb) &&
    x.extra.every((t) => owned.current.s.has(t)) &&
    owned.current.p.has(x.prep);

  const target = room ? (room.targets ? room.targets[bossStep] : room.idiom) : null;
  const needTriple = target && target.tokens.length === 3;
  const spellTokens = needTriple ? [sel.v, sel.s, sel.p] : [sel.v, sel.p];
  const spell = spellTokens.every(Boolean) ? spellTokens.join(" ") : null;
  const learned = useMemo(() => dex.map((en) => BY_EN[en]).filter(Boolean), [dex]);
  const crafting = room && ["door", "monster", "midboss", "boss"].includes(room.kind);

  /* ---------- 部屋を作る ---------- */
  const pickIdiom = (opts = {}, c = course, f = fi) => {
    const { triple = false, craftable = false, preferTwin = false, avoid = [], mixed = false } = opts;
    const gradeOK = gradeOKFor(c, f);
    let pool = IDIOMS.filter((x) =>
      gradeOK(x) &&
      !used.current.has(x.id) &&
      !avoid.includes(x.en) &&
      (triple ? x.tokens.length === 3 : mixed ? x.tokens.length <= 3 : x.tokens.length === 2) &&
      (!craftable || haveAll(x))
    );
    if (!pool.length && craftable) {
      pool = IDIOMS.filter((x) => gradeOK(x) && haveAll(x) && !avoid.includes(x.en));
    }
    if (!pool.length) pool = IDIOMS.filter((x) => gradeOK(x) && (triple ? x.tokens.length === 3 : true));
    if (!pool.length) pool = IDIOMS.filter((x) => gradeOK(x) && x.tokens.length <= 3);
    if (!pool.length) pool = IDIOMS;
    if (preferTwin) {
      const twins = pool.filter((x) => x.meanings.length > 1);
      if (twins.length) pool = twins;
    }
    const got = rnd(pool);
    used.current.add(got.id);
    return got;
  };

  const grantParts = (x) => {
    owned.current.v.add(x.verb);
    owned.current.p.add(x.prep);
    x.extra.forEach((t) => owned.current.s.add(t));
    setStones((a) => [...new Set([...a, x.verb])]);
    setOrbs((a) => [...new Set([...a, x.prep])]);
    if (x.extra.length) setCards((a) => [...new Set([...a, ...x.extra])]);
  };

  const buildRoom = (kind, c = course, f = fi) => {
    const mixed = triplesOK(c) && f >= (c.tripleFrom || 2);
    setSel({ v: null, s: null, p: null }); setSolved(false); setMsg(""); setTwinOpen(false); setBossStep(0); setSettled(true);
    if (kind === "fork") {
      const opts = [ROUTES.quiet, ROUTES.guard];
      if (mixed) opts.push(ROUTES.cursed);
      return { kind, options: opts };
    }
    if (kind === "treasure") return { kind, idiom: pickIdiom({}, c, f) };
    if (kind === "treasure3") return { kind: "treasure", triple: mixed, idiom: pickIdiom({ triple: mixed }, c, f) };
    if (kind === "monster") return { kind, name: rnd(GUARDS), idiom: pickIdiom({ craftable: true, mixed }, c, f) };
    if (kind === "door") return { kind, idiom: pickIdiom({ craftable: true, preferTwin: true, mixed }, c, f) };
    if (kind === "midboss") {
      const t = [];
      for (let i = 0; i < midCount(c, f); i++) t.push(pickIdiom({ craftable: true, mixed, avoid: t.map((x) => x.en) }, c, f));
      return { kind, name: rnd(MIDBOSS), targets: t };
    }
    const t = [];
    for (let i = 0; i < c.finalTargets; i++) t.push(pickIdiom({ craftable: true, mixed, avoid: t.map((x) => x.en) }, c, f));
    return { kind: "boss", name: c.finalName, targets: t };
  };

  const advance = (q) => {
    if (!q.length) {
      if (fi + 1 < course.floors) { setScreen("floorclear"); return; }
      setScreen("end"); return;
    }
    const [next, ...rest] = q;
    setQueue(rest);
    setRoom(buildRoom(next));
  };

  const floorQueue = (c, f) => {
    const q = ["treasure", "fork", "door", "monster", "treasure", "door"];
    if (hasMid(c, f)) q.push("midboss");
    if (f + 1 === c.floors) q.push("boss");
    return q;
  };

  const beginFloor = (c, f) => {
    const [first, ...rest] = floorQueue(c, f);
    setQueue(rest);
    setRoom(buildRoom(first, c, f));
    setScreen("play");
  };

  const start = (c) => {
    used.current = new Set();
    owned.current = { v: new Set(), s: new Set(), p: new Set() };
    setCourse(c); setFi(0); setMp(c.mp); setTorches(c.torches);
    setStones([]); setCards([]); setOrbs([]); setDex([]);
    setStat({ fails: 0, tries: 0, rests: 0, spent: 0, route: [] });
    beginFloor(c, 0);
  };

  const learn = (en) => setDex((d) => (d.includes(en) ? d : [...d, en]));

  /* ---------- 宝物庫 ---------- */
  const quizChoices = useMemo(() => {
    if (!room || room.kind !== "treasure") return [];
    const right = room.idiom.meanings.join("／");
    let cand = IDIOMS.filter((x) => x.id !== room.idiom.id && x.grade <= grade);
    if (cand.length < 2) cand = IDIOMS.filter((x) => x.id !== room.idiom.id);
    const others = shuffle(cand).slice(0, 2).map((x) => x.meanings.join("／"));
    return shuffle([right, ...others]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  const answerQuiz = (choice) => {
    if (solved) return;
    const right = room.idiom.meanings.join("／");
    setStat((s) => ({ ...s, tries: s.tries + 1 }));
    if (choice === right) {
      grantParts(room.idiom); learn(room.idiom.en);
      sfx("chest");
      setSolved(true); setFlash("ok");
      setMsg(`「${room.idiom.en}」＝${right}。錠が外れ、${room.idiom.tokens.length}個のパーツを手に入れた。`);
    } else {
      setMp((m) => Math.max(0, m - MP_QUIZ_MISS));
      setStat((s) => ({ ...s, fails: s.fails + 1, spent: s.spent + MP_QUIZ_MISS }));
      setFlash("ng");
      setMsg(`錠は動かない。手がしびれ、魔力を${MP_QUIZ_MISS}失った。`);
    }
    setTimeout(() => setFlash(null), 420);
  };

  /* ---------- 合成 ---------- */
  const cast = (fromDex) => {
    if (solved) return;
    const en = fromDex || spell;
    if (!en) return;
    const cost = fromDex ? MP_DEX : MP_COST;
    if (mp < cost) { setMsg("魔力が足りない。灯火が残っていれば祭壇で休める。"); return; }
    setMp((m) => m - cost);
    setStat((s) => ({ ...s, spent: s.spent + cost, tries: s.tries + 1 }));

    if (en === target.en) {
      setMp((m) => Math.min(course.mp, m - 0 + MP_BACK));
      learn(en);
      setFlash(["monster", "midboss", "boss"].includes(room.kind) &&
        (!room.targets || bossStep + 1 >= room.targets.length) ? "kill" : "ok");
      if (room.targets && bossStep + 1 < room.targets.length) {
        sfx("hit");
        setBossStep(bossStep + 1);
        setSel({ v: null, s: null, p: null });
        setMsg(`「${en}」が鎧を砕いた。${room.name}は次の言葉を突きつけてくる。`);
        setTimeout(() => setFlash(null), 420);
        return;
      }
      setSolved(true);
      sfx(["monster", "midboss", "boss"].includes(room.kind) ? "kill" : "door");
      if (course.endless && room.kind === "midboss") {
        setTorches((t) => Math.min(4, t + 1));
      }
      if (["monster", "midboss", "boss"].includes(room.kind)) {
        setSettled(false);
        setTimeout(() => setSettled(true), 1200);
      }
      setMsg(
        room.kind === "monster" ? `「${en}」が光を放った。${room.name}は音を立てて崩れ落ちた。`
          : room.targets ? `「${en}」＝${target.meanings.join("／")}。${room.name}は砂となって崩れ落ちた。${course.endless && room.kind === "midboss" ? "その手から灯火をひとつ奪い取った。" : ""}`
            : `「${en}」＝${target.meanings.join("／")}。封印が解けた。`
      );
      if (room.kind === "monster" && room.bonus) {
        setMp((m) => Math.min(course.mp, m + 15));
        setMsg((t) => t + " 奥の灯から魔力を15分けてもらった。");
      }
    } else if (BY_EN[en]) {
      learn(en);
      setStat((s) => ({ ...s, fails: s.fails + 1 })); setFlash("ng");
      setMsg(`「${en}」＝${BY_EN[en].meanings.join("／")}。熟語としては成立し、図鑑に記録された。だがここでは反応しない。`);
    } else {
      setStat((s) => ({ ...s, fails: s.fails + 1 })); setFlash("dud");
      setMsg("パーツは反発し合った。その組み合わせは熟語にならない。");
    }
    setSel({ v: null, s: null, p: null });
    setTimeout(() => setFlash(null), 650);
  };

  const rest = () => {
    if (torches <= 0) return;
    const gain = Math.round(course.mp * 0.5);
    setTorches((t) => t - 1);
    setMp((m) => Math.min(course.mp, m + gain));
    setStat((s) => ({ ...s, rests: s.rests + 1 }));
    setMsg(`灯火をひとつ燃やした。魔力が${gain}戻る。残りの灯火は${torches - 1}。`);
  };

  const chooseRoute = (r) => {
    if (r.key === "cursed") {
      if (mp < 5) { setMsg("魔力が足りず、呪われた扉は開かない。"); return; }
      setMp((m) => m - 5);
      setStat((s) => ({ ...s, spent: s.spent + 5 }));
    }
    setStat((s) => ({ ...s, route: [...s.route, r.name] }));
    const extra = r.rooms.map((k) => (k === "monster" && r.key === "guard" ? "monster+" : k));
    const q = [...extra, ...queue];
    const [first, ...rest] = q;
    setQueue(rest);
    const built = buildRoom(first === "monster+" ? "monster" : first, course, fi);
    if (first === "monster+") built.bonus = true;
    setRoom(built);
  };

  const nextRoom = () => advance(queue);
  const descend = () => {
    const n = fi + 1;
    if (course.endless) setMp((m) => Math.min(course.mp, m + 10));
    setFi(n); beginFloor(course, n);
  };

  const stuck = mp < MP_COST && torches <= 0 && !solved && crafting;

  /* ---------------- タイトル ---------------- */
  if (screen === "title")
    return (
      <div className="lab">
        <style>{CSS}</style>
        <div className="frame title">
          <p className="eyebrow">動詞の石　＋　前置詞の宝珠</p>
          <h1 className="mincho">熟語の迷宮</h1>
          <p className="lead">
            扉に浮かぶ日本語を読み、パーツを組み合わせて英熟語を作る。<br />
            道は途中で分かれる。どちらを選ぶかで、手に入るものと消える魔力が変わる。
          </p>
          <div className="toprow">
            <button className={"bgmtoggle" + (bgmOn ? "" : " off")} onClick={() => setBgmOn(!bgmOn)}>♪ 音 {bgmOn ? "ON" : "OFF"}</button>
            <div className="gradepills" role="group" aria-label="学年">
              {[1, 2, 3].map((g) => (
                <button key={g} className={"bgmtoggle gradepill" + (grade === g ? " on" : "")} aria-pressed={grade === g} onClick={() => setGrade(g)}>{GRADE_LABEL[g]}</button>
              ))}
            </div>
          </div>
          <div className="courses">
            {COURSES.map((c) => (
              <button key={c.key} className="course" onClick={() => start(c)}>
                <span className="cname mincho">{c.name}</span>
                <span className="cfloor">{c.endless ? "果てしなく" : `地下${c.floors}層`}／灯火{c.torches}／魔力{c.mp}</span>
                <span className="cdesc">{c.desc}</span>
              </button>
            ))}
          </div>
          <p className="note">
            唱えるたびに魔力を{MP_COST}使い、正解でも{MP_BACK}しか戻らない。<br />
            尽きたら祭壇で灯火を燃やす。灯火が切れて魔力も尽きれば、そこで終わり。<br />
            果てなき坑道は 2層ごとに層の主が現れ、倒すと灯火をひとつ奪える。
          </p>
        </div>
      </div>
    );

  /* ---------------- 層クリア ---------------- */
  if (screen === "floorclear")
    return (
      <div className="lab">
        <style>{CSS}</style>
        <div className="frame title finale">
          <div className="rays" aria-hidden="true" />
          <div className="beam" aria-hidden="true" />
          <Motes n={10} />
          <p className="eyebrow drop1">B{fi + 1}F 突破</p>
          <h1 className="mincho grand drop2">{floorName}を抜けた</h1>
          <div className="rule drop2" aria-hidden="true" />
          <div className="stats drop3">
            <div><span>覚えた熟語</span><b>{dex.length}</b></div>
            <div><span>残り魔力</span><b>{mp}</b></div>
            <div><span>灯火</span><b>{torches}</b></div>
            <div><span>不発</span><b>{stat.fails}</b></div>
          </div>
          <p className="lead drop3">
            つぎは <b>B{fi + 2}F {DEEP_NAMES[fi + 1] || `深層 ${fi + 2 - DEEP_NAMES.length}`}</b>。
            {course.endless && <><br />下るたびに魔力が10戻る。{hasMid(course, fi + 1) ? "この先に層の主がいる。" : ""}</>}
          </p>
          <div className="row drop4">
            <button className="act" onClick={descend}>下へおりる</button>
            <button className="act alt" onClick={rest} disabled={torches <= 0 || mp >= course.mp}>
              祭壇で休む（灯火{torches}）
            </button>
          </div>
        </div>
      </div>
    );

  /* ---------------- 結果 ---------------- */
  if (screen === "end") {
    const won = !gaveOut && !course.endless;
    return (
      <div className="lab">
        <style>{CSS}</style>
        <div className={"frame title finale" + (won ? " win" : " lose")}>
          <div className="rays" aria-hidden="true" />
          <div className="beam" aria-hidden="true" />
          <Motes n={won ? 18 : 8} />
          {won && <div className="halo" aria-hidden="true" />}
          <p className="eyebrow drop1">{course.name}コース</p>
          <h1 className="mincho grand drop2">
            {course.endless ? `B${fi + 1}F で灯が消えた` : won ? "迷宮を制した" : "灯が消えた"}
          </h1>
          <div className="rule drop2" aria-hidden="true" />
          {won && <p className="lead drop3">扉はすべて開かれ、坑道の奥に朝の光が差している。</p>}
          <div className="stats drop3">
            <div><span>到達</span><b>B{fi + 1}F</b></div>
            <div><span>覚えた熟語</span><b>{dex.length}</b></div>
            <div><span>不発</span><b>{stat.fails}</b></div>
            <div><span>使った魔力</span><b>{stat.spent}</b></div>
            <div><span>灯火の残り</span><b>{torches}</b></div>
          </div>
          {stat.route.length > 0 && <p className="route drop3">通った道　{stat.route.join(" → ")}</p>}
          <div className="stele drop4">
            <h3 className="sub">持ち帰った熟語</h3>
            <ul className="dexlist">
              {learned.map((x) => (<li key={x.en}><b>{x.en}</b><span>{x.meanings.join("／")}</span></li>))}
            </ul>
          </div>
          <div className="row drop4">
            <button className="act" onClick={() => start(course)}>もう一度もぐる</button>
            <button className="act alt" onClick={() => setScreen("title")}>コースを選び直す</button>
          </div>
        </div>
      </div>
    );
  }

  if (!room) return <div className="lab"><style>{CSS}</style></div>;

  /* ---------------- 探索 ---------------- */
  return (
    <div className="lab play">
      <style>{CSS}</style>
      <div className="frame">
        <header className="top">
          <div className="place">
            <span className="bf">B{fi + 1}F</span>
            <span className="mincho">{floorName}</span>
            {grade !== 3 && <span className="gradetag">{GRADE_LABEL[grade]}</span>}
          </div>
          <div className="gauges">
            <div className="mp">
              <span className="mplabel">魔力</span>
              <div className="mpbar"><div className="mpfill" style={{ width: `${(mp / course.mp) * 100}%` }} /></div>
              <span className="mpnum">{mp}</span>
            </div>
            <span className="torch" title="祭壇で休める回数">
              {Array.from({ length: course.torches }).map((_, i) => (
                <i key={i} className={i < torches ? "fire on" : "fire"} />
              ))}
            </span>
            <button className={"dexbtn" + (bgmOn ? "" : " off")} onClick={() => setBgmOn(!bgmOn)} title="音（BGMと効果音）">♪</button>
            <button className="dexbtn" onClick={() => setShowDex(true)}>図鑑 {dex.length}</button>
          </div>
        </header>

        <main className={"room" + (flash ? ` fl-${flash}` : "")}>
          <Cave fork={room.kind === "fork"} />
          <Scene kind={room.kind} name={room.name} solved={solved} />

          {/* 分かれ道 */}
          {room.kind === "fork" && (
            <div className="fork">
              <p className="forklead">道が分かれている。</p>
              <div className="routes">
                {room.options.map((r) => (
                  <button key={r.key} className="route-btn" onClick={() => chooseRoute(r)}>
                    <TunnelMouth kind={r.key} />
                    <span className="rname mincho">{r.name}</span>
                    <span className="rtext">{r.text}</span>
                    <span className="rmeta"><i className="gain">{r.gain}</i><i className="risk">{r.risk}</i></span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {(room.kind === "midboss" || room.kind === "boss") && !solved && (
            <p className="bosslead">
              {room.name}が {room.targets.length} つの言葉を突きつけてくる。（{bossStep + 1}つ目）
            </p>
          )}

          {crafting && (
            <div className="inscribe">
              <div className="ja mincho">{target.meanings[0]}</div>
              {room.kind === "door" && target.meanings.length > 1 && (
                <div className={"twin" + (twinOpen ? " on" : "")}>
                  <div className="ja mincho">{target.meanings[1]}</div>
                </div>
              )}
              {needTriple && <div className="tag">3語の熟語</div>}
            </div>
          )}

          {room.kind === "treasure" && (
            <div className="quiz">
              <div className="carved">{room.idiom.en}</div>
              {!solved && (
                <div className="choices">
                  {quizChoices.map((c) => (
                    <button key={c} className="choice" onClick={() => answerQuiz(c)}>{c}</button>
                  ))}
                </div>
              )}
            </div>
          )}

          {crafting && !solved && (
            <div className="circle">
              <div className="ring" aria-hidden="true" />
              <div className="slots">
                <span className={"slot sv" + (sel.v ? " on" : "")}>{sel.v || "動詞"}</span>
                <span className="plus">＋</span>
                {needTriple && (<>
                  <span className={"slot ss" + (sel.s ? " on" : "")}>{sel.s || "語"}</span>
                  <span className="plus">＋</span>
                </>)}
                <span className={"slot sp" + (sel.p ? " on" : "")}>{sel.p || "前置詞"}</span>
              </div>
              <button className="act" onClick={() => cast()} disabled={!spell || mp < MP_COST}>
                唱える（魔力{MP_COST}）
              </button>
            </div>
          )}
        </main>

        <div className="window">
          <p>{msg || DEFAULT_TEXT(room)}</p>
          {solved && room.kind === "door" && target.meanings.length > 1 && !twinOpen && (
            <button className="act sm" onClick={() => { setTwinOpen(true); setMsg(`右の扉も同じ呪文で開いた。${target.en} は二つの意味を持っている。`); }}>
              右の扉を調べる
            </button>
          )}
          {solved && settled && (room.kind !== "door" || target.meanings.length === 1 || twinOpen) && (
            <button className="act sm" onClick={nextRoom}>
              {queue.length ? "先へ進む" : fi + 1 < course.floors ? "この層を抜ける" : "迷宮を出る"}
            </button>
          )}
          {!solved && mp < MP_COST && torches > 0 && <button className="act sm alt" onClick={rest}>祭壇で休む（灯火{torches}）</button>}
          {stuck && <button className="act sm alt" onClick={() => setScreen("end")}>力尽きる</button>}
        </div>

        {room.kind !== "fork" && (
          <footer className="bag">
            <Row label="動詞の石" cls="stone" items={stones} sel={sel.v} on={(v) => setSel((s) => ({ ...s, v: s.v === v ? null : v }))} lock={!crafting || solved} />
            {needTriple && <Row label="特殊の札" cls="card" items={cards} sel={sel.s} on={(v) => setSel((s) => ({ ...s, s: s.s === v ? null : v }))} lock={!crafting || solved} />}
            <Row label="前置詞の宝珠" cls="orb" items={orbs} sel={sel.p} on={(v) => setSel((s) => ({ ...s, p: s.p === v ? null : v }))} lock={!crafting || solved} />
            {crafting && !solved && learned.length > 0 && (
              <div className="bagrow">
                <span className="bagname">図鑑から</span>
                <div className="parts">
                  {learned.map((x) => (
                    <button key={x.en} className="known" disabled={mp < MP_DEX} onClick={() => cast(x.en)}>
                      {x.en}<i>魔力{MP_DEX}</i>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </footer>
        )}
      </div>

      {showDex && (
        <div className="modal" onClick={() => setShowDex(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h3 className="mincho">熟語図鑑</h3>
            {learned.length === 0 ? <p className="empty">まだ何も記録されていない。</p> : (
              <ul className="dexlist">
                {learned.map((x) => (<li key={x.en}><b>{x.en}</b><span>{x.meanings.join("／")}</span></li>))}
              </ul>
            )}
            <button className="act sm" onClick={() => setShowDex(false)}>閉じる</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Motes({ n }) {
  return (
    <div className="motes" aria-hidden="true">
      {Array.from({ length: n }).map((_, i) => (
        <i key={i} style={{
          left: `${(i * 37 + 7) % 96}%`,
          animationDelay: `${(i * 0.42) % 5}s`,
          animationDuration: `${5 + (i % 5)}s`,
          width: `${3 + (i % 3) * 2}px`, height: `${3 + (i % 3) * 2}px`,
        }} />
      ))}
    </div>
  );
}

function Row({ label, cls, items, sel, on, lock }) {
  return (
    <div className="bagrow">
      <span className="bagname">{label}</span>
      <div className="parts">
        {items.length === 0 && <span className="empty">まだ持っていない</span>}
        {items.map((v) => (
          <button key={v} className={cls + (sel === v ? " on" : "")} disabled={lock} onClick={() => on(v)}>{v}</button>
        ))}
      </div>
    </div>
  );
}

const DEFAULT_TEXT = (room) => {
  if (room.kind === "fork") return "松明の火が二手に揺れている。進む道を選べ。";
  if (room.kind === "treasure") return "宝箱のふたに熟語が彫られている。意味を答えれば錠が外れる。";
  if (room.kind === "monster") return `${room.name}が道をふさいでいる。額に浮かぶ日本語に合う熟語を唱えろ。`;
  if (room.kind === "midboss") return `${room.name}が立ちはだかる。層の主だ。`;
  if (room.kind === "boss") return `${room.name}。壁という壁に熟語が彫られ、こちらを見下ろしている。`;
  return "扉に日本語が浮かんでいる。この意味になるようパーツを組め。";
};

const CSS = `
.lab{
  --slate:#100E18; --stone:#1B1626; --panel:#221C2F; --carve:#39304A;
  --gold:#D9A94A; --arcane:#5ED6C6; --parch:#E6DCC4; --ink:#07060C; --dim:#8A7FA3;
  --go:"Hiragino Kaku Gothic ProN","Yu Gothic","Noto Sans JP",sans-serif;
  --mi:"Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif;
  --mo:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  font-family:var(--go); color:#D6CDE6; padding:14px; min-height:100%;
  background:radial-gradient(130% 70% at 50% -10%, #2A2138 0%, var(--slate) 60%);
}
.lab *{box-sizing:border-box;}
.frame{max-width:780px; margin:0 auto; display:flex; flex-direction:column; gap:10px;}
.mincho{font-family:var(--mi);}

/* タイトル・結果 */
.title{text-align:center; padding:28px 18px 34px; gap:0;}
.eyebrow{font-family:var(--mo); font-size:12px; letter-spacing:.34em; color:var(--dim); margin:0 0 12px;}
.title h1{font-size:clamp(30px,7vw,52px); letter-spacing:.2em; color:var(--parch); margin:0 0 16px;
  text-shadow:0 0 40px #D9A94A28;}
.lead{font-size:14px; line-height:2; color:#B7ACCB; margin:0 0 22px;}
.lead b{color:var(--gold);}
.courses{display:flex; gap:10px; justify-content:center; flex-wrap:wrap; margin-bottom:22px;}
.course{flex:1 1 200px; max-width:230px; display:flex; flex-direction:column; gap:5px; padding:16px 14px;
  background:#181322; border:1px solid var(--carve); cursor:pointer; text-align:left; transition:.16s;
  font-family:inherit; color:inherit;}
@media (hover:hover){ .course:hover{border-color:var(--gold); background:#20192E;} }
.course:focus-visible{outline:2px solid var(--arcane); outline-offset:2px;}
.cname{font-size:20px; letter-spacing:.14em; color:var(--gold);}
.cfloor{font-family:var(--mo); font-size:12px; color:var(--arcane); letter-spacing:.08em;}
.cdesc{font-size:12px; color:var(--dim); line-height:1.7;}
.note{font-size:12px; line-height:2; color:var(--dim); margin:0;}
.sub{font-size:12px; letter-spacing:.16em; color:var(--dim); margin:20px 0 10px; font-weight:400;}
.row{display:flex; gap:10px; justify-content:center; flex-wrap:wrap; margin-top:18px;}

/* 上段 */
.top{display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;
  border-bottom:1px solid var(--carve); padding:40px 0 9px;}
.place{display:flex; align-items:center; gap:9px; font-size:15px; color:var(--parch); letter-spacing:.1em;}
.bf{font-family:var(--mo); font-size:11px; color:var(--ink); background:var(--gold); padding:2px 7px; letter-spacing:.1em;}
.prog{font-family:var(--mo); font-size:11px; color:var(--dim);}
.gauges{display:flex; align-items:center; gap:12px;}
.mp{display:flex; align-items:center; gap:7px;}
.mplabel{font-size:12px; color:var(--dim); letter-spacing:.1em;}
.mpbar{width:104px; height:9px; background:#0A0810; border:1px solid var(--carve);}
.mpfill{height:100%; background:linear-gradient(90deg,var(--arcane),#2E9E93); transition:width .35s;}
.mpnum{font-family:var(--mo); font-size:12px; color:var(--arcane); width:28px; text-align:right;}
.dexbtn{font-family:inherit; font-size:13px; color:var(--parch); background:transparent;
  border:1px solid var(--carve); padding:4px 12px; min-height:44px; min-width:44px; cursor:pointer;}
@media (hover:hover){ .dexbtn:hover{border-color:var(--gold); color:var(--gold);} }

/* 部屋 */
.room{position:relative; overflow:hidden; background:#0E0B16;
  border:1px solid var(--carve); padding:18px 16px 24px; text-align:center; min-height:290px;}
.room::after{content:""; position:absolute; inset:0; pointer-events:none; z-index:2;
  background:radial-gradient(120% 82% at 50% 42%, transparent 52%, #07060CB8 100%);}
.fl-ok{animation:fok .42s;} .fl-ng{animation:fng .38s;} .fl-dud{animation:fdud .4s;} .fl-kill{animation:quake .55s;}
@keyframes quake{
  0%,100%{transform:translate(0,0)}
  10%{transform:translate(-7px,3px)} 22%{transform:translate(6px,-3px)}
  36%{transform:translate(-5px,2px)} 52%{transform:translate(4px,2px)}
  68%{transform:translate(-3px,-1px)} 84%{transform:translate(2px,1px)}
}
@keyframes fok{0%,100%{box-shadow:inset 0 24px 56px #00000066}
  40%{box-shadow:inset 0 0 0 2px var(--arcane), inset 0 24px 56px #00000066}}
@keyframes fng{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}
@keyframes fdud{0%,100%{opacity:1}50%{opacity:.58}}
.scene{width:min(268px,70%); height:auto; display:block; margin:0 auto 10px;}
.bl{animation:bl 2.8s steps(1) infinite;}
@keyframes bl{0%,93%{opacity:1}94%,100%{opacity:.15}}
.tw{animation:tw 1.4s ease-in-out infinite alternate;}
@keyframes tw{from{opacity:.3}to{opacity:1}}
.rp{animation:rp 1.7s ease-out infinite;}
@keyframes rp{from{r:20; opacity:.9}to{r:44; opacity:0}}
.bosslead{font-size:13px; color:var(--gold); margin:0 0 8px; letter-spacing:.06em;}

.inscribe{margin:4px 0 14px;}
.ja{font-size:clamp(23px,5vw,38px); color:var(--gold); letter-spacing:.14em;
  text-shadow:0 0 26px #D9A94A38;}
.twin{opacity:.22; margin-top:9px; padding-top:9px; border-top:1px dashed var(--carve); transition:opacity .6s;}
.twin.on{opacity:1;}
.twin .ja{font-size:clamp(17px,3.4vw,26px);}
.tag{display:inline-block; margin-top:9px; font-family:var(--mo); font-size:11px; letter-spacing:.16em;
  color:var(--arcane); border:1px solid var(--arcane); padding:2px 9px;}

.carved{font-family:var(--mo); font-size:clamp(20px,4.6vw,32px); color:var(--parch);
  letter-spacing:.06em; margin-bottom:14px; text-shadow:0 1px 0 #000,0 0 18px #E6DCC42E;}
.choices{display:flex; gap:8px; justify-content:center; flex-wrap:wrap;}
.choice{font-family:inherit; font-size:14px; color:var(--parch); background:#1E1829;
  border:1px solid var(--carve); padding:10px 16px; min-height:44px; cursor:pointer; transition:.15s;}
@media (hover:hover){ .choice:hover{border-color:var(--gold); color:var(--gold); background:#271F35;} }
.choice:focus-visible{outline:2px solid var(--arcane); outline-offset:2px;}

/* 合成の魔法陣 */
.circle{position:relative; margin-top:6px; padding:26px 10px 6px;}
.ring{position:absolute; left:50%; top:6px; width:236px; height:236px; margin-left:-118px;
  border:1px solid #5ED6C630; border-radius:50%; pointer-events:none;
  background:repeating-conic-gradient(from 0deg,#5ED6C600 0deg 11deg,#5ED6C61F 11deg 12deg),
             radial-gradient(closest-side,#5ED6C60D,transparent 70%);
  animation:spin 46s linear infinite;}
@keyframes spin{to{transform:rotate(360deg)}}
.slots{position:relative; display:flex; align-items:center; justify-content:center; gap:10px;
  margin-bottom:18px; flex-wrap:wrap;}
.slot{display:flex; align-items:center; justify-content:center; font-family:var(--mo); font-size:15px;
  min-width:96px; height:50px; color:#6B6182; background:#0E0B16; border:1px solid var(--carve);}
.sv{clip-path:polygon(12% 0,88% 0,100% 50%,88% 100%,12% 100%,0 50%);}
.sp{border-radius:999px;}
.ss{min-width:86px; border-left:2px solid var(--gold);}
.slot.on{color:var(--parch); border-color:var(--arcane); background:#132320; box-shadow:0 0 16px #5ED6C630;}
.plus{color:var(--carve); font-size:17px;}

.act{font-family:inherit; font-size:15px; font-weight:700; letter-spacing:.06em; color:var(--ink);
  background:var(--gold); border:none; padding:11px 26px; min-height:44px; cursor:pointer;}
@media (hover:hover){ .act:hover{filter:brightness(1.08);} }
.act:disabled{background:#39304A; color:#6B6182; cursor:not-allowed;}
.act:focus-visible{outline:2px solid var(--arcane); outline-offset:3px;}
.act.sm{font-size:14px; padding:8px 18px; margin-top:9px;}
.act.alt{background:transparent; color:var(--arcane); border:1px solid var(--arcane);}

.window{background:#0A0810; border:2px solid var(--parch); padding:13px 16px; font-size:14px;
  line-height:1.95; min-height:74px;}
.window p{margin:0;}

.bag{background:var(--panel); border:1px solid var(--carve); padding:11px 13px;
  display:flex; flex-direction:column; gap:9px;}
.bagrow{display:flex; align-items:center; gap:11px; flex-wrap:wrap;}
.bagname{font-size:12px; color:var(--dim); letter-spacing:.1em; width:84px; flex:none;}
.parts{display:flex; gap:7px; flex-wrap:wrap;}
.empty{font-size:12px; color:#6B6182;}
.stone,.orb,.card,.known{font-family:var(--mo); font-size:13px; cursor:pointer; color:var(--parch);
  background:#151120; border:1px solid var(--carve); padding:7px 14px; min-height:44px; transition:.14s;}
.stone{clip-path:polygon(12% 0,88% 0,100% 50%,88% 100%,12% 100%,0 50%); padding:7px 18px;}
.orb{border-radius:999px;}
.card{border-left:2px solid var(--gold);}
@media (hover:hover){ .stone:hover,.orb:hover,.card:hover{border-color:var(--gold); color:var(--gold);} }
.stone.on,.orb.on,.card.on{background:#132320; border-color:var(--arcane); color:var(--arcane);
  box-shadow:0 0 12px #5ED6C63A;}
.stone:disabled,.orb:disabled,.card:disabled{opacity:.4; cursor:default;}
.known{border-radius:2px; display:inline-flex; align-items:baseline; gap:7px;}
.known i{font-style:normal; font-family:var(--go); font-size:11px; color:var(--dim);}
@media (hover:hover){ .known:hover{border-color:var(--arcane); color:var(--arcane);} }

.stats{display:flex; gap:9px; justify-content:center; flex-wrap:wrap; margin-bottom:16px;}
.stats div{border:1px solid var(--carve); padding:8px 16px;}
.stats span{display:block; font-size:11px; color:var(--dim); letter-spacing:.08em;}
.stats b{font-family:var(--mo); font-size:19px; color:var(--parch);}
.dexlist{list-style:none; padding:0; margin:0; display:grid;
  grid-template-columns:repeat(auto-fill,minmax(210px,1fr)); gap:5px; text-align:left;}
.dexlist li{display:flex; justify-content:space-between; gap:9px; background:#151120;
  border-left:2px solid var(--gold); padding:6px 11px; font-size:13px;}
.dexlist b{font-family:var(--mo); color:var(--parch); font-weight:500;}
.dexlist span{color:#A99DC0; font-size:12px;}
.modal{position:fixed; inset:0; background:#04030899; display:flex; align-items:center;
  justify-content:center; padding:20px; z-index:20;}
.sheet{background:var(--stone); border:1px solid var(--gold); padding:20px; max-width:620px;
  width:100%; max-height:80vh; max-height:80dvh; overflow:auto; -webkit-overflow-scrolling:touch;}
.sheet h3{font-size:18px; color:var(--gold); letter-spacing:.14em; margin:0 0 14px;}

/* 洞窟 */
.cave{position:absolute; inset:0; width:100%; height:100%; display:block; z-index:0;}
.room > *:not(.cave){position:relative; z-index:1;}
.flame{animation:flame 1.5s ease-in-out infinite alternate;
  transform-box:fill-box; transform-origin:50% 100%;}
@keyframes flame{
  0%{transform:scaleY(1) scaleX(1) translateY(0)}
  40%{transform:scaleY(1.14) scaleX(.9) translateY(-2px)}
  100%{transform:scaleY(.94) scaleX(1.06) translateY(1px)}
}
.pool{animation:pool 2.7s ease-in-out infinite alternate;}
@keyframes pool{from{opacity:.75}to{opacity:1}}
.glow{animation:glow 2.4s ease-in-out infinite alternate;}
@keyframes glow{from{opacity:.55}to{opacity:1}}

/* 坑道の入口（分岐の選択肢） */
.mouth{width:100%; height:auto; display:block; border:1px solid #07060C; margin-bottom:4px;}

/* モンスター */
.crea{position:relative; width:min(238px,64%); margin:0 auto 10px;}
.crea.big{width:min(300px,82%);}
.creature{width:100%; height:auto; display:block;}

/* 崩れ落ちる */
.creature.down{animation:crumble 1.15s cubic-bezier(.42,0,.72,1) forwards; transform-origin:50% 100%;}
@keyframes crumble{
  0%{transform:none; filter:none;}
  7%{transform:translateX(-5px) scale(1.04); filter:brightness(2.6) saturate(.2);}
  14%{transform:translateX(5px) scale(1.02); filter:brightness(1.6);}
  21%{transform:translateX(-4px); filter:none;}
  30%{transform:translateY(3px) scaleY(.96) rotate(1.5deg); filter:grayscale(.4) brightness(.9);}
  55%{transform:translateY(10px) scaleY(.78) scaleX(1.05) rotate(3deg); filter:grayscale(.8) brightness(.6);}
  100%{transform:translateY(30px) scaleY(.18) scaleX(1.16) rotate(4deg);
       filter:grayscale(1) brightness(.3); opacity:0;}
}
.ruin{position:absolute; inset:0; pointer-events:none;}
.shard{position:absolute; width:11px; height:11px; background:#4A4258; border:1px solid #07060C;
  animation:shard 1s cubic-bezier(.3,.5,.7,1) forwards;}
.shard.k0{background:#6B6478; width:8px; height:8px;}
.shard.k1{background:#33284D; width:14px; height:9px;}
.shard.k2{background:#5A4F70; width:9px; height:13px; border-radius:2px;}
@keyframes shard{
  0%{transform:translate(0,0) rotate(0); opacity:1;}
  25%{opacity:1;}
  100%{transform:translate(var(--tx),var(--ty)) rotate(var(--r)); opacity:0;}
}
.dust{position:absolute; left:50%; bottom:0; width:86%; height:34%; margin-left:-43%;
  background:radial-gradient(closest-side,#9C93A8B0,transparent 74%);
  animation:dust 1.3s ease-out forwards;}
@keyframes dust{
  0%{transform:scale(.25) translateY(10%); opacity:0;}
  25%{opacity:.85;}
  100%{transform:scale(1.6) translateY(-10%); opacity:0;}
}
.rubble{position:absolute; left:50%; bottom:2%; width:48%; height:11%; margin-left:-24%;
  background:linear-gradient(180deg,#3E3650,#241F30); border-radius:46% 54% 14% 14%;
  box-shadow:0 2px 0 #07060C; animation:rubble .7s ease-out .6s both;}
@keyframes rubble{from{opacity:0; transform:scaleX(.35) scaleY(.4);} to{opacity:1; transform:none;}}
.fl1{animation:fl1 3.4s ease-in-out infinite;}
@keyframes fl1{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
.fl2{animation:fl2 2.6s ease-in-out infinite;}
@keyframes fl2{0%,100%{transform:translateY(0) rotate(-1.5deg)}50%{transform:translateY(-9px) rotate(1.5deg)}}
.wing{animation:wing 1.5s ease-in-out infinite alternate;
  transform-box:fill-box; transform-origin:50% 50%;}
@keyframes wing{from{transform:translateY(0) scaleY(1)}to{transform:translateY(-4px) scaleY(.82)}}
.arm-l{animation:arml 2.8s ease-in-out infinite alternate;
  transform-box:fill-box; transform-origin:50% 12%;}
.arm-r{animation:arml 2.8s ease-in-out infinite alternate-reverse;
  transform-box:fill-box; transform-origin:50% 12%;}
@keyframes arml{from{transform:rotate(-5deg)}to{transform:rotate(6deg)}}
.hd1{animation:hd 3s ease-in-out infinite alternate; transform-origin:66px 70px;}
.hd2{animation:hd 3s ease-in-out infinite alternate-reverse; transform-origin:134px 70px;}
@keyframes hd{from{transform:rotate(-4deg)}to{transform:rotate(4deg)}}
.orbit{animation:spin 9s linear infinite;}

/* 灯火 */
.torch{display:flex; gap:4px; align-items:center;}
.fire{width:9px; height:13px; background:#2A2438; border-radius:50% 50% 45% 45%; display:block;}
.fire.on{background:linear-gradient(180deg,#FFD98A,#D9A94A); box-shadow:0 0 9px #D9A94A88;}

/* 分かれ道 */
.fork{margin-top:6px;}
.forklead{font-size:13px; color:var(--dim); letter-spacing:.1em; margin:0 0 12px;}
.routes{display:flex; gap:9px; justify-content:center; flex-wrap:wrap;}
.route-btn{flex:1 1 190px; max-width:230px; display:flex; flex-direction:column; gap:5px;
  padding:8px 8px 12px; background:#191325E6; border:1px solid var(--carve); cursor:pointer;
  text-align:left; font-family:inherit; color:inherit; transition:.16s;}
@media (hover:hover){ .route-btn:hover{border-color:var(--gold); background:#221A31;} }
.route-btn:focus-visible{outline:2px solid var(--arcane); outline-offset:2px;}
.rname{font-size:17px; letter-spacing:.12em; color:var(--gold);}
.rtext{font-size:12px; line-height:1.8; color:#A99DC0;}
.rmeta{display:flex; gap:6px; flex-wrap:wrap;}
.rmeta i{font-style:normal; font-family:var(--mo); font-size:11px; padding:2px 7px; letter-spacing:.04em;}
.gain{color:var(--arcane); border:1px solid var(--arcane);}
.risk{color:#D98A8A; border:1px solid #D98A8A;}
.route{font-size:12px; color:var(--dim); letter-spacing:.06em; margin:0 0 6px;}

/* ================= 荘厳な幕引き ================= */
.finale{position:relative; overflow:hidden; min-height:520px; justify-content:center;}
.finale > *{position:relative; z-index:2;}
.finale .rays, .finale .beam, .finale .motes, .finale .halo{z-index:0;}
.rays{position:absolute; left:50%; top:56%; width:1100px; height:1100px; margin:-550px 0 0 -550px;
  background:repeating-conic-gradient(from 0deg at 50% 50%,
    #D9A94A00 0deg 5deg, #D9A94A22 5deg 6.4deg);
  -webkit-mask-image:radial-gradient(closest-side,#000 12%,transparent 72%);
  mask-image:radial-gradient(closest-side,#000 12%,transparent 72%);
  animation:rays 90s linear infinite, fadein 2.2s ease-out both;}
@keyframes rays{to{transform:rotate(360deg)}}
.beam{position:absolute; left:50%; bottom:-10%; width:46%; height:110%; margin-left:-23%;
  background:linear-gradient(0deg,#D9A94A00,#D9A94A26 42%,#FFE6A800 96%);
  filter:blur(14px); animation:beam 1.6s cubic-bezier(.2,.7,.3,1) both;}
@keyframes beam{from{transform:scaleY(.1) scaleX(.5); opacity:0}to{transform:none; opacity:1}}
.halo{position:absolute; left:50%; top:30%; width:420px; height:420px; margin:-210px 0 0 -210px;
  background:radial-gradient(closest-side,#FFE6A82E,transparent 70%);
  animation:halo 4.5s ease-in-out infinite alternate;}
@keyframes halo{from{transform:scale(.9); opacity:.6}to{transform:scale(1.08); opacity:1}}
.motes{position:absolute; inset:0; pointer-events:none;}
.motes i{position:absolute; bottom:-6%; border-radius:50%; background:#FFDFA0;
  box-shadow:0 0 10px #D9A94A; opacity:0; animation:mote linear infinite;}
@keyframes mote{
  0%{transform:translateY(0) scale(.6); opacity:0}
  15%{opacity:.9} 85%{opacity:.7}
  100%{transform:translateY(-520px) translateX(24px) scale(1); opacity:0}}
.grand{animation:engrave 1.5s cubic-bezier(.2,.8,.3,1) both;
  text-shadow:0 0 46px #D9A94A55, 0 0 12px #D9A94A33;}
@keyframes engrave{
  0%{opacity:0; letter-spacing:.9em; filter:blur(14px); transform:scale(1.12)}
  60%{opacity:1; filter:blur(0)}
  100%{opacity:1; letter-spacing:.2em; filter:none; transform:none}}
.rule{height:1px; width:min(420px,80%); margin:2px auto 20px;
  background:linear-gradient(90deg,transparent,#D9A94A,transparent);
  animation:rule 1.4s .6s cubic-bezier(.2,.8,.3,1) both;}
@keyframes rule{from{transform:scaleX(0); opacity:0}to{transform:none; opacity:1}}
.stele{width:100%; max-width:640px; margin:6px auto 0; padding:14px 16px 16px;
  background:linear-gradient(180deg,#221C2FEE,#150F22EE); border:1px solid var(--carve);
  box-shadow:0 -2px 0 #D9A94A44 inset; max-height:230px; overflow:auto;}
.win .grand{color:#F0D79A;}
.lose .grand{color:#B7ACCB;}
.lose .rays, .lose .beam{opacity:.35; filter:grayscale(.6);}
.drop1{animation:up .8s .15s both;}
.drop2{animation:up .9s .4s both;}
.drop3{animation:up .9s 1.1s both;}
.drop4{animation:up .9s 1.6s both;}
@keyframes up{from{opacity:0; transform:translateY(14px)}to{opacity:1; transform:none}}
@keyframes fadein{from{opacity:0}to{opacity:1}}
.grand.drop2{animation:engrave 1.5s .4s cubic-bezier(.2,.8,.3,1) both;}
.bgmtoggle{font-family:inherit; font-size:13px; color:var(--dim); background:transparent;
  border:1px solid var(--carve); padding:5px 14px; min-height:44px; margin-bottom:14px; cursor:pointer;}
@media (hover:hover){ .bgmtoggle:hover{border-color:var(--gold); color:var(--gold);} }
.bgmtoggle.off{opacity:.5; text-decoration:line-through;}
.toprow{display:flex; gap:18px; justify-content:center; align-items:center; flex-wrap:wrap; margin-bottom:14px;}
.toprow .bgmtoggle{margin-bottom:0;}
.gradepills{display:flex; gap:8px; justify-content:center;}
.bgmtoggle.gradepill{min-width:72px; font-size:14px; touch-action:manipulation;}
@media (max-width:560px){ .toprow{gap:10px;} .bgmtoggle.gradepill{min-width:52px; padding:5px 8px;} }
.bgmtoggle.gradepill.on{border-color:var(--gold); color:var(--ink); background:var(--gold); font-weight:700;}
.gradetag{font-family:var(--mo); font-size:11px; color:var(--gold); border:1px solid var(--gold); padding:1px 7px; letter-spacing:.1em;}
.dexbtn.off{opacity:.45; text-decoration:line-through;}

@media (max-width:560px){
  .bagname{width:100%;}
  .ring{width:184px; height:184px; margin-left:-92px;}
  .slot{min-width:78px; height:44px; font-size:13px;}
  .course{max-width:none;}
  .route-btn{max-width:none;}
  .finale{min-height:460px;}
  .rays{width:760px; height:760px; margin:-380px 0 0 -380px;}
}
/* 横向きの iPad など背の低い画面：ページ全体をスクロールさせず、袋の中だけをスクロールする */
@media (max-height:860px) and (orientation:landscape){
  .lab{padding:10px 14px;}
  .frame{gap:8px;}
  .top{padding-top:36px;}
  .room{min-height:0; padding:12px 16px 14px;}
  .scene{width:min(190px,50%); margin-bottom:6px;}
  .crea{width:min(170px,46%);} .crea.big{width:min(210px,58%);}
  .ja{font-size:clamp(20px,3vw,28px);}
  .inscribe{margin:2px 0 8px;}
  .circle{padding:16px 10px 4px;} .ring{width:184px; height:184px; margin-left:-92px;}
  .slots{margin-bottom:10px;}
  .window{min-height:0; padding:9px 14px;}
  .lab.play{box-sizing:border-box; height:100vh; height:100dvh; overflow:hidden;}
  .lab.play .frame{height:100%;}
  .lab.play .room{flex:none;}
  .lab.play .bag{flex:1 1 auto; min-height:90px; overflow:auto; -webkit-overflow-scrolling:touch;}
}
@media (prefers-reduced-motion:reduce){ .lab *{animation:none !important;} }
`;


/* ---- マウント ---- */
ReactDOM.createRoot(document.getElementById("root")).render(<IdiomLabyrinth />);
