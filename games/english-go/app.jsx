/* 英語でGO!  ブラウザ直読み版（React UMD + Babel Standalone） */
const { useState, useEffect, useRef, useCallback } = React;

/* ============================================================
   英語でGO!   ステージ制 英単語スペリングゲーム
   Lv1〜3は各3問、Lv4は難問1問(全10問) / 時間切れ3回で終了
   ============================================================ */

const MAX_LIFE = 3;

const LEVELS = [
  {
    lv: 1, title: "小学校＋中1", tag: "カンタン", stage: "あさの草原", count: 3, base: 10,
    theme: { sky1: "#B7ECFF", sky2: "#63C6F0", floor: "#3FA6DE", glow: "#FFF6C0", accent: "#2FB3E8", accent2: "#12809E" },
    char: {
      key: "chick", name: "ピヨすけ",
      ask: ["これ、書けるかな？ピヨ！", "かんたんだピヨ〜", "よ〜い、スタートだピヨ！"],
      ok: ["すごいピヨ！", "バッチリだピヨ！", "そのちょうしピヨ！"],
      ng: ["むずかしかったピヨ…", "つぎ、いってみようピヨ！"],
      typo: ["おしいピヨ！", "もういっかいピヨ！"],
    },
    words: [
      ["actor", "俳優"], ["actress", "女優"], ["afternoon", "午後"],
      ["again", "ふたたび"], ["airport", "空港"], ["almost", "ほとんど"],
      ["alone", "ひとりで"], ["always", "いつも"], ["amazing", "おどろくべき"],
      ["angry", "おこった"], ["ant", "アリ"], ["apple", "りんご"],
      ["April", "4月"], ["aquarium", "水族館"], ["arm", "うで"],
      ["art", "美術"], ["artist", "芸術家"], ["ask", "たずねる"],
      ["astronaut", "宇宙飛行士"], ["August", "8月"], ["aunt", "おば"],
      ["baby", "赤ちゃん"], ["back", "背中"], ["backpack", "リュック"],
      ["bad", "悪い"], ["badminton", "バドミントン"], ["bag", "かばん"],
      ["baker", "パン職人"], ["bakery", "パン屋"], ["ball", "ボール"],
      ["balloon", "風船"], ["banana", "バナナ"], ["bank", "銀行"],
      ["baseball", "野球"], ["basket", "かご"], ["basketball", "バスケットボール"],
      ["bat", "バット"], ["bathroom", "浴室"], ["beach", "浜辺"],
      ["bean", "豆"], ["bed", "ベッド"], ["bedroom", "寝室"],
      ["bee", "ハチ"], ["belt", "ベルト"], ["bicycle", "自転車"],
      ["big", "大きい"], ["bike", "自転車"], ["bird", "鳥"],
      ["birthday", "誕生日"], ["bitter", "にがい"], ["black", "黒い"],
      ["blackboard", "黒板"], ["blood", "血"], ["blue", "青い"],
      ["boat", "ボート"], ["body", "体"], ["bone", "骨"],
      ["book", "本"], ["bookstore", "書店"], ["boots", "ブーツ"],
      ["boring", "たいくつな"], ["bottle", "びん"], ["bowl", "ボウル"],
      ["box", "箱"], ["boy", "男の子"], ["brain", "脳"],
      ["branch", "枝"], ["bread", "パン"], ["bridge", "橋"],
      ["bright", "明るい"], ["brother", "兄・弟"], ["brown", "茶色の"],
      ["brush", "みがく"], ["building", "建物"], ["bus", "バス"],
      ["busy", "いそがしい"], ["butter", "バター"], ["butterfly", "チョウ"],
      ["button", "ボタン"], ["buy", "買う"], ["cabbage", "キャベツ"],
      ["cafe", "カフェ"], ["cafeteria", "食堂"], ["cage", "おり"],
      ["cake", "ケーキ"], ["call", "呼ぶ・電話する"], ["camel", "ラクダ"],
      ["camera", "カメラ"], ["can", "かん"], ["candy", "あめ"],
      ["cap", "ぼうし"], ["captain", "主将"], ["car", "車"],
      ["carpenter", "大工"], ["carpet", "じゅうたん"], ["carrot", "にんじん"],
      ["carry", "運ぶ"], ["castle", "城"], ["cat", "ねこ"],
      ["catch", "つかまえる"], ["cereal", "シリアル"], ["chair", "いす"],
      ["chalk", "チョーク"], ["champion", "優勝者"], ["cheese", "チーズ"],
      ["chef", "料理長"], ["cherry", "さくらんぼ"], ["chicken", "ニワトリ・とり肉"],
      ["child", "子ども"], ["chopsticks", "はし"], ["church", "教会"],
      ["city", "市・都市"], ["class", "授業・クラス"], ["classmate", "同級生"],
      ["classroom", "教室"], ["clean", "そうじする"], ["clerk", "店員"],
      ["clever", "りこうな"], ["clock", "時計"], ["close", "閉じる"],
      ["closet", "おしいれ"], ["cloud", "雲"], ["cloudy", "くもりの"],
      ["club", "部活動"], ["coach", "監督"], ["coat", "コート"],
      ["coffee", "コーヒー"], ["cold", "寒い"], ["color", "色"],
      ["come", "来る"], ["cook", "料理する"], ["cookie", "クッキー"],
      ["cool", "すずしい"], ["copy", "写す"], ["corn", "とうもろこし"],
      ["court", "コート"], ["cousin", "いとこ"], ["cow", "牛"],
      ["crocodile", "ワニ"], ["cry", "泣く"], ["cucumber", "きゅうり"],
      ["cup", "カップ"], ["curry", "カレー"], ["curtain", "カーテン"],
      ["cut", "切る"], ["cute", "かわいい"], ["dance", "おどる"],
      ["dancer", "ダンサー"], ["dark", "暗い"], ["date", "日付"],
      ["daughter", "娘"], ["day", "日"], ["December", "12月"],
      ["deep", "深い"], ["deer", "シカ"], ["dentist", "歯科医"],
      ["designer", "デザイナー"], ["desk", "机"], ["dessert", "デザート"],
      ["dictionary", "辞書"], ["dinner", "夕食"], ["dinosaur", "きょうりゅう"],
      ["dirty", "きたない"], ["dish", "皿・料理"], ["doctor", "医者"],
      ["dog", "犬"], ["doll", "人形"], ["door", "ドア"],
      ["doughnut", "ドーナツ"], ["draw", "絵をかく"], ["dream", "夢"],
      ["drink", "飲む"], ["drive", "運転する"], ["driver", "運転手"],
      ["duck", "アヒル"], ["eagle", "ワシ"], ["ear", "耳"],
      ["early", "早い"], ["earth", "地球"], ["earthquake", "地震"],
      ["easy", "かんたんな"], ["eat", "食べる"], ["egg", "卵"],
      ["eight", "8"], ["eighteen", "18"], ["eighth", "8番目の"],
      ["eighty", "80"], ["elbow", "ひじ"], ["elephant", "ゾウ"],
      ["eleven", "11"], ["engineer", "技師"], ["English", "英語"],
      ["enjoy", "楽しむ"], ["enter", "入る"], ["entrance", "入り口"],
      ["eraser", "消しゴム"], ["evening", "夕方"], ["exercise", "運動する"],
      ["eye", "目"], ["face", "顔"], ["factory", "工場"],
      ["fall", "落ちる"], ["family", "家族"], ["farm", "農場"],
      ["farmer", "農場主"], ["fast", "速い"], ["fat", "太った"],
      ["father", "父"], ["feather", "羽"], ["field", "野原・競技場"],
      ["fifteen", "15"], ["fifth", "5番目の"], ["fifty", "50"],
      ["find", "見つける"], ["finger", "指"], ["fire", "火"],
      ["firefighter", "消防士"], ["first", "1番目の"], ["fish", "魚"],
      ["five", "5"], ["floor", "ゆか"], ["flower", "花"],
      ["fly", "飛ぶ"], ["fold", "折る"], ["foot", "足"],
      ["forest", "森"], ["fork", "フォーク"], ["forty", "40"],
      ["four", "4"], ["fourteen", "14"], ["fourth", "4番目の"],
      ["fox", "キツネ"], ["free", "ひまな・自由な"], ["fresh", "新せんな"],
      ["Friday", "金曜日"], ["friend", "友達"], ["frog", "カエル"],
      ["fruit", "果物"], ["funny", "おかしい"], ["game", "試合・ゲーム"],
      ["garage", "車庫"], ["garden", "庭"], ["garlic", "にんにく"],
      ["giant", "巨大な"], ["ginger", "しょうが"], ["giraffe", "キリン"],
      ["girl", "女の子"], ["give", "与える"], ["glass", "コップ"],
      ["glasses", "めがね"], ["glove", "グローブ"], ["gloves", "手ぶくろ"],
      ["glue", "のり"], ["go", "行く"], ["goat", "ヤギ"],
      ["gold", "金"], ["golf", "ゴルフ"], ["good", "よい"],
      ["gorilla", "ゴリラ"], ["grandfather", "祖父"], ["grandmother", "祖母"],
      ["grape", "ぶどう"], ["grass", "草"], ["gray", "灰色の"],
      ["great", "すばらしい"], ["green", "緑の"], ["group", "集団"],
      ["guest", "客"], ["gym", "体育館"], ["hair", "髪"],
      ["half", "半分"], ["hamburger", "ハンバーガー"], ["handsome", "ハンサムな"],
      ["happy", "幸せな"], ["harbor", "港"], ["hard", "難しい・かたい"],
      ["hat", "ぼうし"], ["head", "頭"], ["health", "健康"],
      ["hear", "聞こえる"], ["heart", "心臓・心"], ["heavy", "重い"],
      ["helicopter", "ヘリコプター"], ["helmet", "ヘルメット"], ["help", "助ける"],
      ["hero", "英雄"], ["high", "高い"], ["hill", "丘"],
      ["history", "歴史"], ["hit", "打つ"], ["hobby", "趣味"],
      ["holiday", "休日"], ["homeroom", "ホームルーム"], ["homework", "宿題"],
      ["honey", "はちみつ"], ["horn", "つの"], ["horse", "馬"],
      ["hospital", "病院"], ["hot", "暑い"], ["hotel", "ホテル"],
      ["hour", "1時間"], ["house", "家"], ["hundred", "100"],
      ["hungry", "空腹の"], ["husband", "夫"], ["ice", "氷"],
      ["idea", "考え"], ["jacket", "上着"], ["jam", "ジャム"],
      ["January", "1月"], ["Japanese", "日本語"], ["jeans", "ジーンズ"],
      ["job", "仕事"], ["jog", "ジョギングする"], ["judo", "柔道"],
      ["July", "7月"], ["jump", "とぶ"], ["June", "6月"],
      ["kangaroo", "カンガルー"], ["karate", "空手"], ["kendo", "剣道"],
      ["key", "かぎ"], ["kick", "ける"], ["kind", "親切な"],
      ["king", "王"], ["kitchen", "台所"], ["kite", "たこ"],
      ["know", "知っている"], ["koala", "コアラ"], ["lake", "湖"],
      ["lamp", "ランプ"], ["late", "おそい"], ["lazy", "なまけた"],
      ["leader", "指導者"], ["leaf", "葉"], ["learn", "学ぶ"],
      ["leave", "去る"], ["leg", "あし(脚)"], ["lemon", "レモン"],
      ["lesson", "授業"], ["letter", "手紙"], ["lettuce", "レタス"],
      ["lift", "持ち上げる"], ["light", "軽い"], ["like", "好きだ"],
      ["lion", "ライオン"], ["listen", "聞く"], ["live", "住む"],
      ["long", "長い"], ["look", "見る"], ["love", "愛する"],
      ["low", "低い"], ["lunch", "昼食"], ["make", "作る"],
      ["man", "男の人"], ["mango", "マンゴー"], ["map", "地図"],
      ["marathon", "マラソン"], ["March", "3月"], ["marker", "マーカー"],
      ["market", "市場"], ["match", "試合"], ["math", "数学"],
      ["maybe", "たぶん"], ["mayor", "市長"], ["meal", "食事"],
      ["meat", "肉"], ["medal", "メダル"], ["meet", "会う"],
      ["melon", "メロン"], ["member", "一員"], ["menu", "メニュー"],
      ["milk", "牛乳"], ["million", "100万"], ["minute", "分"],
      ["mirror", "鏡"], ["Monday", "月曜日"], ["monkey", "サル"],
      ["moon", "月"], ["morning", "朝"], ["mother", "母"],
      ["motorcycle", "バイク"], ["mountain", "山"], ["mouse", "ねずみ"],
      ["mouth", "口"], ["movie", "映画"], ["museum", "博物館"],
      ["mushroom", "きのこ"], ["music", "音楽"], ["musician", "音楽家"],
      ["neck", "首"], ["need", "必要とする"], ["nest", "巣"],
      ["never", "決して〜ない"], ["new", "新しい"], ["news", "知らせ"],
      ["newspaper", "新聞"], ["nice", "すてきな"], ["night", "夜"],
      ["nine", "9"], ["nineteen", "19"], ["ninety", "90"],
      ["ninth", "9番目の"], ["noisy", "そうぞうしい"], ["noodle", "めん"],
      ["noon", "正午"], ["nose", "鼻"], ["notebook", "ノート"],
      ["November", "11月"], ["nurse", "看護師"], ["October", "10月"],
      ["office", "事務所"], ["often", "よく"], ["oil", "油"],
      ["old", "古い"], ["one", "1"], ["onion", "たまねぎ"],
      ["open", "開ける"], ["orange", "オレンジ"], ["owl", "フクロウ"],
      ["paint", "絵の具でかく"], ["painter", "画家"], ["panda", "パンダ"],
      ["pants", "ズボン"], ["paper", "紙"], ["parent", "親"],
      ["park", "公園"], ["passport", "パスポート"], ["peach", "もも"],
      ["pear", "なし"], ["pen", "ペン"], ["pencil", "えんぴつ"],
      ["penguin", "ペンギン"], ["people", "人々"], ["pepper", "こしょう"],
      ["pet", "ペット"], ["phone", "電話"], ["photo", "写真"],
      ["picture", "絵・写真"], ["pig", "ぶた"], ["pilot", "パイロット"],
      ["pineapple", "パイナップル"], ["pink", "ピンクの"], ["pizza", "ピザ"],
      ["plan", "計画"], ["plane", "飛行機"], ["planet", "惑星"],
      ["plate", "皿"], ["play", "遊ぶ"], ["player", "選手"],
      ["playground", "運動場"], ["police", "警察"], ["pond", "池"],
      ["pool", "プール"], ["poor", "貧しい"], ["popcorn", "ポップコーン"],
      ["potato", "じゃがいも"], ["present", "贈り物"], ["president", "大統領"],
      ["pretty", "かわいい"], ["prince", "王子"], ["princess", "王女"],
      ["principal", "校長"], ["prize", "賞"], ["problem", "問題"],
      ["programmer", "プログラマー"], ["pudding", "プリン"], ["pumpkin", "かぼちゃ"],
      ["purple", "むらさきの"], ["put", "置く"], ["puzzle", "パズル"],
      ["quarter", "4分の1"], ["queen", "女王"], ["quiet", "静かな"],
      ["rabbit", "うさぎ"], ["racket", "ラケット"], ["radio", "ラジオ"],
      ["rain", "雨"], ["rainbow", "にじ"], ["rainy", "雨の"],
      ["read", "読む"], ["ready", "準備ができた"], ["really", "本当に"],
      ["red", "赤い"], ["relax", "くつろぐ"], ["reporter", "記者"],
      ["rest", "休む"], ["rich", "金持ちの"], ["ride", "乗る"],
      ["road", "道路"], ["robot", "ロボット"], ["rock", "岩"],
      ["rocket", "ロケット"], ["roof", "屋根"], ["room", "部屋"],
      ["root", "根"], ["round", "丸い"], ["rugby", "ラグビー"],
      ["ruler", "定規"], ["run", "走る"], ["sad", "悲しい"],
      ["safe", "安全な"], ["salad", "サラダ"], ["salt", "塩"],
      ["salty", "しおからい"], ["same", "同じ"], ["sand", "砂"],
      ["sandals", "サンダル"], ["Saturday", "土曜日"], ["sauce", "ソース"],
      ["say", "言う"], ["scarf", "マフラー"], ["scary", "こわい"],
      ["school", "学校"], ["science", "理科"], ["season", "季節"],
      ["second", "2番目の"], ["secret", "秘密"], ["see", "見える"],
      ["seed", "種"], ["send", "送る"], ["September", "9月"],
      ["seven", "7"], ["seventeen", "17"], ["seventh", "7番目の"],
      ["seventy", "70"], ["shape", "形"], ["shark", "サメ"],
      ["sheep", "ヒツジ"], ["shelf", "たな"], ["ship", "船"],
      ["shirt", "シャツ"], ["shoes", "くつ"], ["shop", "店"],
      ["short", "短い"], ["shrine", "神社"], ["shy", "はずかしがりの"],
      ["sick", "病気の"], ["silent", "静かな"], ["silver", "銀"],
      ["sing", "歌う"], ["sister", "姉・妹"], ["sit", "すわる"],
      ["six", "6"], ["sixteen", "16"], ["sixth", "6番目の"],
      ["sixty", "60"], ["size", "大きさ"], ["skating", "スケート"],
      ["skiing", "スキー"], ["skin", "はだ"], ["sky", "空"],
      ["sleep", "ねむる"], ["slow", "おそい"], ["small", "小さい"],
      ["smart", "かしこい"], ["smell", "におい"], ["smile", "ほほえむ"],
      ["snack", "おやつ"], ["snake", "ヘビ"], ["snow", "雪"],
      ["snowy", "雪の"], ["soap", "せっけん"], ["soccer", "サッカー"],
      ["socks", "くつ下"], ["sofa", "ソファ"], ["soft", "やわらかい"],
      ["son", "息子"], ["sound", "音"], ["soup", "スープ"],
      ["sour", "すっぱい"], ["space", "宇宙・空間"], ["spaghetti", "スパゲッティ"],
      ["speak", "話す"], ["speech", "スピーチ"], ["spell", "つづる"],
      ["spicy", "からい"], ["spider", "クモ"], ["spinach", "ほうれんそう"],
      ["spoon", "スプーン"], ["sport", "スポーツ"], ["square", "四角い"],
      ["squirrel", "リス"], ["stadium", "競技場"], ["stage", "舞台"],
      ["stairs", "階段"], ["stand", "立つ"], ["star", "星"],
      ["start", "始める"], ["station", "駅"], ["stay", "とどまる"],
      ["steak", "ステーキ"], ["stone", "石"], ["stop", "止める"],
      ["store", "店"], ["story", "物語"], ["strawberry", "いちご"],
      ["street", "通り"], ["strong", "強い"], ["student", "生徒"],
      ["study", "勉強する"], ["subway", "地下鉄"], ["sugar", "砂糖"],
      ["summer", "夏"], ["sun", "太陽"], ["Sunday", "日曜日"],
      ["supermarket", "スーパー"], ["sushi", "すし"], ["sweater", "セーター"],
      ["sweet", "あまい"], ["swim", "泳ぐ"], ["swimming", "水泳"],
      ["table", "テーブル"], ["tail", "しっぽ"], ["take", "取る"],
      ["talk", "話す"], ["tall", "背が高い"], ["taxi", "タクシー"],
      ["tea", "お茶"], ["teach", "教える"], ["teacher", "先生"],
      ["team", "チーム"], ["television", "テレビ"], ["tell", "伝える"],
      ["temple", "寺"], ["ten", "10"], ["tennis", "テニス"],
      ["tenth", "10番目の"], ["terrible", "ひどい"], ["test", "テスト"],
      ["textbook", "教科書"], ["thank", "感謝する"], ["theater", "劇場"],
      ["thick", "厚い"], ["thin", "うすい"], ["think", "考える"],
      ["third", "3番目の"], ["thirsty", "のどがかわいた"], ["thirteen", "13"],
      ["thirty", "30"], ["thousand", "1000"], ["three", "3"],
      ["throw", "投げる"], ["Thursday", "木曜日"], ["ticket", "切符"],
      ["tiger", "トラ"], ["time", "時間"], ["timetable", "時間割"],
      ["tiny", "とても小さい"], ["tired", "つかれた"], ["today", "今日"],
      ["together", "いっしょに"], ["tomato", "トマト"], ["tomorrow", "明日"],
      ["tooth", "歯"], ["toothbrush", "歯ブラシ"], ["towel", "タオル"],
      ["town", "町"], ["toy", "おもちゃ"], ["tree", "木"],
      ["trip", "旅行"], ["trophy", "トロフィー"], ["truck", "トラック"],
      ["Tuesday", "火曜日"], ["turtle", "カメ"], ["twelve", "12"],
      ["twenty", "20"], ["two", "2"], ["typhoon", "台風"],
      ["umbrella", "かさ"], ["uncle", "おじ"], ["uniform", "制服"],
      ["use", "使う"], ["usually", "ふつう"], ["video", "動画"],
      ["village", "村"], ["visit", "訪れる"], ["visitor", "訪問者"],
      ["voice", "声"], ["volcano", "火山"], ["volleyball", "バレーボール"],
      ["wait", "待つ"], ["waiter", "ウェイター"], ["wake", "目を覚ます"],
      ["walk", "歩く"], ["wall", "かべ"], ["want", "ほしい"],
      ["wash", "洗う"], ["watch", "じっと見る"], ["water", "水"],
      ["waterfall", "滝"], ["watermelon", "すいか"], ["weather", "天気"],
      ["week", "週"], ["weekend", "週末"], ["welcome", "歓迎する"],
      ["whale", "クジラ"], ["white", "白い"], ["wide", "広い"],
      ["wife", "妻"], ["wind", "風"], ["window", "窓"],
      ["windy", "風の強い"], ["winter", "冬"], ["wise", "賢い"],
      ["wolf", "オオカミ"], ["woman", "女の人"], ["word", "単語"],
      ["work", "働く"], ["worker", "労働者"], ["world", "世界"],
      ["write", "書く"], ["writer", "作家"], ["yard", "庭"],
      ["year", "年"], ["yellow", "黄色い"], ["yesterday", "昨日"],
      ["yogurt", "ヨーグルト"], ["young", "若い"], ["zebra", "シマウマ"],
      ["zoo", "動物園"],
    ],
  },
  {
    lv: 2, title: "中2のことば", tag: "ふつう", stage: "ゆうやけ商店街", count: 3, base: 9,
    theme: { sky1: "#FFD6A0", sky2: "#FF8FA8", floor: "#D9536F", glow: "#FFEFB8", accent: "#FF7A59", accent2: "#B03A55" },
    char: {
      key: "cat", name: "スペルにゃん",
      ask: ["ここからが本番だニャ", "つづりに気をつけるニャ！", "さあ、書けるかニャ？"],
      ok: ["やるニャ〜！", "お見事だニャ！", "たいしたものだニャ"],
      ng: ["ドンマイだニャ", "おぼえて帰るニャ"],
      typo: ["ちがうニャ！", "落ちついてニャ"],
    },
    words: [
      ["abroad", "海外へ"], ["accident", "事故"], ["activity", "活動"],
      ["add", "加える"], ["admire", "感心する"], ["advance", "進む"],
      ["advice", "助言"], ["afraid", "こわがって"], ["age", "年れい"],
      ["agree", "同意する"], ["aim", "ねらう"], ["airline", "航空会社"],
      ["anger", "いかり"], ["animal", "動物"], ["army", "軍隊"],
      ["arrive", "到着する"], ["arrow", "矢"], ["asleep", "ねむって"],
      ["attack", "攻撃する"], ["attend", "出席する"], ["audience", "観客"],
      ["author", "著者"], ["awake", "目が覚めて"], ["bake", "焼く"],
      ["bark", "ほえる"], ["bear", "クマ"], ["beat", "打ち負かす"],
      ["beautiful", "美しい"], ["believe", "信じる"], ["bell", "ベル"],
      ["bend", "曲げる"], ["bill", "請求書"], ["bit", "少し"],
      ["bite", "かむ"], ["blanket", "毛布"], ["block", "区画"],
      ["blow", "ふく"], ["boil", "ゆでる"], ["bored", "たいくつした"],
      ["borrow", "借りる"], ["boss", "上司"], ["bottom", "底"],
      ["bow", "おじぎする"], ["brand", "銘柄"], ["break", "こわす"],
      ["breakfast", "朝食"], ["breath", "息"], ["breathe", "呼吸する"],
      ["brick", "れんが"], ["brief", "短い"], ["bring", "持ってくる"],
      ["broad", "広い"], ["bucket", "バケツ"], ["build", "建てる"],
      ["bunch", "束"], ["burn", "燃やす"], ["bury", "うめる"],
      ["calm", "落ち着いた"], ["careful", "注意深い"], ["cash", "現金"],
      ["cave", "ほら穴"], ["certain", "確かな"], ["chain", "くさり"],
      ["change", "変える"], ["chart", "図表"], ["cheap", "安い"],
      ["check", "確かめる"], ["cheek", "ほお"], ["cheer", "応援する"],
      ["cheerful", "陽気な"], ["chest", "胸"], ["chew", "かむ"],
      ["chilly", "うすら寒い"], ["choose", "選ぶ"], ["clear", "はっきりした"],
      ["climb", "登る"], ["clothes", "衣服"], ["coast", "海岸"],
      ["coin", "硬貨"], ["collect", "集める"], ["college", "大学"],
      ["comedy", "喜劇"], ["common", "共通の"], ["company", "会社"],
      ["compare", "くらべる"], ["complain", "不平を言う"], ["computer", "コンピューター"],
      ["concert", "コンサート"], ["confuse", "混乱させる"], ["connect", "つなぐ"],
      ["contest", "コンテスト"], ["continue", "続ける"], ["control", "管理する"],
      ["corner", "角"], ["correct", "正しい"], ["cotton", "綿"],
      ["count", "数える"], ["country", "国"], ["couple", "2人組"],
      ["cover", "おおう"], ["crash", "衝突する"], ["crawl", "はう"],
      ["crazy", "気が変な"], ["crop", "作物"], ["cross", "横切る"],
      ["crowd", "群衆"], ["cruel", "残酷な"], ["culture", "文化"],
      ["curly", "巻き毛の"], ["curve", "曲線"], ["customer", "客"],
      ["daily", "毎日の"], ["damp", "しめった"], ["dead", "死んだ"],
      ["deal", "取り引き"], ["dear", "親愛な"], ["debate", "討論"],
      ["decide", "決める"], ["delicate", "繊細な"], ["delicious", "とてもおいしい"],
      ["dense", "密な"], ["desire", "願望"], ["detail", "細部"],
      ["different", "ちがう"], ["dig", "ほる"], ["direct", "直接の"],
      ["discover", "発見する"], ["dive", "飛びこむ"], ["divide", "分ける"],
      ["dolphin", "イルカ"], ["double", "2倍にする"], ["drag", "引きずる"],
      ["drama", "劇"], ["dress", "ドレス"], ["drop", "落とす"],
      ["dry", "かわいた"], ["dull", "退屈な"], ["eager", "熱心な"],
      ["earn", "かせぐ"], ["edge", "へり"], ["effort", "努力"],
      ["elder", "年上の"], ["empty", "空の"], ["energy", "エネルギー"],
      ["engine", "エンジン"], ["enough", "十分な"], ["envelope", "封筒"],
      ["equal", "等しい"], ["error", "まちがい"], ["exact", "正確な"],
      ["exam", "試験"], ["example", "例"], ["exciting", "わくわくする"],
      ["excuse", "許す"], ["exit", "出口"], ["expensive", "高価な"],
      ["explain", "説明する"], ["fact", "事実"], ["fail", "失敗する"],
      ["fair", "公平な"], ["false", "まちがった"], ["famous", "有名な"],
      ["fault", "責任"], ["favorite", "お気に入りの"], ["fear", "おそれる"],
      ["fee", "料金"], ["feed", "えさをやる"], ["feel", "感じる"],
      ["festival", "祭り"], ["fever", "熱"], ["fight", "戦う"],
      ["fill", "満たす"], ["finish", "終える"], ["fix", "修理する"],
      ["flag", "旗"], ["flight", "飛行"], ["float", "うかぶ"],
      ["flood", "洪水"], ["flour", "小麦粉"], ["fog", "きり"],
      ["follow", "ついていく"], ["fond", "好きな"], ["force", "力"],
      ["forget", "忘れる"], ["form", "形式"], ["former", "前の"],
      ["fortunate", "幸運な"], ["fortune", "幸運"], ["frank", "率直な"],
      ["friendly", "友好的な"], ["frozen", "こおった"], ["fry", "いためる"],
      ["fun", "楽しみ"], ["future", "未来"], ["gate", "門"],
      ["gentle", "やさしい"], ["gift", "贈り物"], ["glad", "うれしい"],
      ["goods", "商品"], ["grade", "学年・成績"], ["gradual", "段階的な"],
      ["grain", "穀物"], ["grand", "壮大な"], ["grateful", "感謝して"],
      ["greet", "あいさつする"], ["grow", "育つ"], ["guess", "推測する"],
      ["guide", "案内人"], ["guilty", "有罪の"], ["gun", "銃"],
      ["hall", "会館"], ["handle", "あつかう"], ["handy", "便利な"],
      ["hang", "かける"], ["happen", "起こる"], ["harm", "害"],
      ["harmful", "有害な"], ["heal", "いやす"], ["healthy", "健康な"],
      ["heat", "熱"], ["helpful", "役に立つ"], ["hide", "かくす"],
      ["hold", "持つ"], ["hole", "穴"], ["hollow", "中が空の"],
      ["hope", "望む"], ["horrible", "恐ろしい"], ["hug", "抱きしめる"],
      ["human", "人間"], ["humble", "けんそんな"], ["hunger", "飢え"],
      ["hunt", "狩り"], ["hurry", "急ぐ"], ["hurt", "傷つける"],
      ["ill", "病気の"], ["imagine", "想像する"], ["immediate", "即座の"],
      ["important", "重要な"], ["improve", "改善する"], ["income", "収入"],
      ["ink", "インク"], ["innocent", "無罪の"], ["instant", "瞬間"],
      ["intelligent", "頭のよい"], ["interesting", "おもしろい"], ["interview", "面接"],
      ["invite", "招待する"], ["iron", "鉄"], ["jail", "刑務所"],
      ["join", "参加する"], ["joke", "冗談"], ["journal", "日記"],
      ["joy", "喜び"], ["judgment", "判断"], ["juice", "ジュース"],
      ["juicy", "汁の多い"], ["keep", "保つ"], ["kill", "殺す"],
      ["knot", "結び目"], ["ladder", "はしご"], ["laugh", "笑う"],
      ["lawyer", "弁護士"], ["lay", "横たえる"], ["lead", "導く"],
      ["leather", "革"], ["legend", "伝説"], ["lend", "貸す"],
      ["level", "水準"], ["library", "図書館"], ["lid", "ふた"],
      ["lie", "うそ"], ["line", "線"], ["link", "つながり"],
      ["liquid", "液体"], ["list", "一覧"], ["lively", "元気な"],
      ["load", "荷物"], ["lock", "かぎをかける"], ["log", "丸太"],
      ["lonely", "さびしい"], ["loose", "ゆるい"], ["lose", "失う"],
      ["loss", "損失"], ["loud", "大きな音の"], ["luck", "運"],
      ["lucky", "幸運な"], ["lung", "肺"], ["machine", "機械"],
      ["mad", "おこった"], ["magazine", "雑誌"], ["magic", "魔法"],
      ["mail", "郵便"], ["mark", "しるし"], ["marry", "結婚する"],
      ["mass", "かたまり"], ["mate", "仲間"], ["matter", "事がら"],
      ["measure", "測る"], ["medicine", "薬"], ["memory", "記憶"],
      ["metal", "金属"], ["midnight", "真夜中"], ["mild", "おだやかな"],
      ["mind", "心"], ["minor", "小さい"], ["mistake", "まちがい"],
      ["mix", "まぜる"], ["model", "模型"], ["modern", "現代の"],
      ["motion", "動き"], ["move", "動かす"], ["mud", "どろ"],
      ["mystery", "なぞ"], ["narrow", "せまい"], ["nation", "国家"],
      ["natural", "自然の"], ["nature", "自然"], ["nearby", "近くの"],
      ["neat", "きちんとした"], ["needle", "針"], ["neighborhood", "近所"],
      ["nervous", "緊張した"], ["net", "ネット"], ["noise", "物音"],
      ["note", "メモ"], ["notice", "気づく"], ["novel", "小説"],
      ["obedient", "従順な"], ["obey", "従う"], ["object", "物"],
      ["ocean", "大洋"], ["odd", "奇妙な"], ["order", "順序・注文"],
      ["oven", "オーブン"], ["owe", "借りがある"], ["owner", "持ち主"],
      ["pack", "つめる"], ["pain", "痛み"], ["painful", "痛い"],
      ["painting", "絵"], ["pair", "一対"], ["palace", "宮殿"],
      ["pale", "青白い"], ["pass", "通り過ぎる"], ["paste", "はりつける"],
      ["patient", "忍耐強い"], ["pattern", "模様"], ["pause", "中断"],
      ["pay", "支払う"], ["peace", "平和"], ["peaceful", "平和な"],
      ["peak", "頂上"], ["percent", "パーセント"], ["perfect", "完ぺきな"],
      ["pick", "選ぶ"], ["pipe", "管"], ["pity", "あわれみ"],
      ["plain", "質素な"], ["plant", "植える"], ["pleasant", "心地よい"],
      ["plenty", "たくさんの"], ["pocket", "ポケット"], ["poem", "詩"],
      ["point", "指さす"], ["poison", "毒"], ["polite", "ていねいな"],
      ["popular", "人気のある"], ["pot", "なべ"], ["pour", "注ぐ"],
      ["powder", "粉"], ["power", "力"], ["praise", "称賛"],
      ["pray", "いのる"], ["prayer", "いのり"], ["precise", "正確な"],
      ["prepare", "準備する"], ["press", "押す"], ["price", "値段"],
      ["pride", "ほこり"], ["print", "印刷する"], ["printer", "印刷機"],
      ["prison", "刑務所"], ["product", "製品"], ["profit", "利益"],
      ["program", "番組"], ["project", "計画"], ["promise", "約束する"],
      ["proof", "証拠"], ["protect", "守る"], ["proud", "ほこりに思う"],
      ["pull", "引く"], ["pump", "ポンプ"], ["punish", "罰する"],
      ["pure", "純すいな"], ["push", "押す"], ["quarrel", "口論"],
      ["question", "質問"], ["quick", "すばやい"], ["quiz", "小テスト"],
      ["race", "競走"], ["raise", "上げる"], ["rate", "割合"],
      ["raw", "生の"], ["ray", "光線"], ["reach", "着く"],
      ["real", "本当の"], ["realize", "気づく"], ["reason", "理由"],
      ["receive", "受け取る"], ["recipe", "レシピ"], ["record", "記録"],
      ["relief", "安心"], ["remember", "覚えている"], ["rent", "家賃"],
      ["repeat", "くり返す"], ["reply", "返事する"], ["report", "報告"],
      ["rescue", "救助する"], ["restaurant", "レストラン"], ["result", "結果"],
      ["return", "戻る"], ["rice", "米・ごはん"], ["ring", "指輪"],
      ["ripe", "熟した"], ["rise", "のぼる"], ["risk", "危険"],
      ["river", "川"], ["roll", "ころがる"], ["rope", "ロープ"],
      ["rough", "あらい"], ["route", "道すじ"], ["row", "列"],
      ["rub", "こする"], ["rubber", "ゴム"], ["rude", "失礼な"],
      ["rush", "急ぐ"], ["sail", "帆"], ["sample", "見本"],
      ["save", "救う"], ["scholar", "学者"], ["scream", "さけぶ"],
      ["screen", "画面"], ["sea", "海"], ["search", "さがす"],
      ["seat", "座席"], ["section", "部分"], ["seem", "〜に見える"],
      ["sell", "売る"], ["seminar", "セミナー"], ["sense", "感覚"],
      ["sensitive", "敏感な"], ["series", "連続"], ["serious", "まじめな・重大な"],
      ["serve", "給仕する"], ["service", "サービス"], ["set", "置く"],
      ["sew", "ぬう"], ["shade", "日かげ"], ["shadow", "かげ"],
      ["shake", "ふる"], ["shallow", "浅い"], ["share", "分け合う"],
      ["sharp", "するどい"], ["sheet", "1枚"], ["shelter", "避難所"],
      ["shine", "かがやく"], ["shoot", "うつ"], ["shore", "岸"],
      ["shot", "一発"], ["shoulder", "肩"], ["shout", "さけぶ"],
      ["show", "見せる"], ["shut", "閉める"], ["sight", "光景"],
      ["sign", "標識"], ["signal", "合図"], ["silk", "絹"],
      ["similar", "似ている"], ["simple", "簡単な"], ["singer", "歌手"],
      ["sink", "しずむ"], ["site", "場所"], ["skip", "とばす"],
      ["skirt", "スカート"], ["sleepy", "ねむい"], ["slide", "すべる"],
      ["slip", "すべる"], ["slope", "坂"], ["smoke", "けむり"],
      ["smooth", "なめらかな"], ["sneeze", "くしゃみをする"], ["society", "社会"],
      ["soil", "土"], ["soldier", "兵士"], ["solid", "固体の"],
      ["solve", "解決する"], ["sometimes", "ときどき"], ["sore", "痛い"],
      ["sorrow", "悲しみ"], ["sorry", "すまなく思って"], ["soul", "たましい"],
      ["spare", "予備の"], ["special", "特別な"], ["speed", "急ぐ"],
      ["spend", "費やす"], ["spill", "こぼす"], ["split", "割る"],
      ["spot", "地点"], ["spread", "広げる"], ["spring", "春"],
      ["staff", "職員"], ["stamp", "切手"], ["steady", "安定した"],
      ["steal", "ぬすむ"], ["steam", "蒸気"], ["steel", "鋼鉄"],
      ["steep", "急な"], ["step", "一歩"], ["stick", "棒"],
      ["stiff", "かたい"], ["still", "静かな"], ["stir", "かき混ぜる"],
      ["storm", "あらし"], ["strange", "奇妙な"], ["stream", "小川"],
      ["strict", "厳しい"], ["strike", "打つ"], ["string", "ひも"],
      ["studio", "スタジオ"], ["stupid", "おろかな"], ["style", "様式"],
      ["subject", "教科"], ["substance", "物質"], ["sudden", "突然の"],
      ["sunny", "晴れた"], ["sunrise", "日の出"], ["sunset", "日ぼつ"],
      ["supper", "夕食"], ["sure", "確信して"], ["surprise", "おどろかせる"],
      ["surprised", "おどろいた"], ["survival", "生存"], ["swallow", "のみこむ"],
      ["sweep", "はく"], ["swing", "ブランコ"], ["system", "仕組み"],
      ["tame", "飼いならされた"], ["tape", "テープ"], ["task", "仕事"],
      ["taste", "味がする"], ["tax", "税金"], ["tear", "引きさく"],
      ["tender", "やわらかい"], ["tent", "テント"], ["term", "期間"],
      ["theme", "主題"], ["thread", "糸"], ["throat", "のど"],
      ["thunder", "雷"], ["tide", "潮"], ["tie", "結ぶ"],
      ["tight", "きつい"], ["tip", "助言"], ["title", "題名"],
      ["tool", "道具"], ["topic", "話題"], ["total", "合計"],
      ["touch", "さわる"], ["tour", "旅行"], ["tower", "塔"],
      ["track", "通り道"], ["trade", "貿易"], ["tradition", "伝統"],
      ["traffic", "交通"], ["trail", "小道"], ["train", "電車"],
      ["trap", "わな"], ["travel", "旅行する"], ["treat", "あつかう"],
      ["trial", "試み"], ["tribe", "部族"], ["trouble", "困りごと"],
      ["true", "本当の"], ["trunk", "幹"], ["trust", "信頼"],
      ["truth", "真実"], ["try", "ためす"], ["tube", "管"],
      ["tune", "曲"], ["tunnel", "トンネル"], ["turn", "曲がる"],
      ["type", "種類"], ["ugly", "みにくい"], ["understand", "理解する"],
      ["unit", "単位"], ["upset", "動揺した"], ["urgent", "緊急の"],
      ["useful", "役に立つ"], ["usual", "いつもの"], ["vacation", "休暇"],
      ["vain", "むだな"], ["valley", "谷"], ["valuable", "貴重な"],
      ["vase", "花びん"], ["view", "ながめ"], ["violent", "激しい"],
      ["virus", "ウイルス"], ["volume", "量・音量"], ["war", "戦争"],
      ["warm", "あたたかい"], ["waste", "むだにする"], ["wave", "波"],
      ["weak", "弱い"], ["wealth", "富"], ["weapon", "武器"],
      ["wear", "身につける"], ["web", "網"], ["weigh", "重さがある"],
      ["wet", "ぬれた"], ["wheel", "車輪"], ["whisper", "ささやく"],
      ["whole", "全体の"], ["width", "はば"], ["wild", "野生の"],
      ["willing", "進んで〜する"], ["win", "勝つ"], ["wing", "つばさ"],
      ["wipe", "ふく"], ["wire", "針金"], ["wish", "願い"],
      ["wonder", "ふしぎ"], ["wonderful", "すばらしい"], ["wood", "木材"],
      ["wool", "羊毛"], ["worry", "心配する"], ["worth", "価値がある"],
      ["wrap", "包む"], ["wrong", "まちがった"], ["youth", "若さ"],
    ],
  },
  {
    lv: 3, title: "中3のことば", tag: "ムズカシイ", stage: "深夜のラボ", count: 3, base: 8,
    theme: { sky1: "#5570D8", sky2: "#232F6E", floor: "#33459C", glow: "#9FD8FF", accent: "#4FD8E8", accent2: "#1B2A66" },
    char: {
      key: "robot", name: "スペルロボ",
      ask: ["ナガイゾ。オチツイテ イケ", "コノ タンゴ、カケルカ？", "ケイソク カイシ…ドウゾ"],
      ok: ["ケイサン ドオリダ！", "セイカイ。ミゴトダ", "データ ショウゴウ カンリョウ"],
      ng: ["ジカン ギレ…ザンネン", "オボエナオシ ヲ スイショウ スル"],
      typo: ["エラー。サイニュウリョク セヨ", "チガウ。モウ イチド"],
    },
    words: [
      ["abandon", "見捨てる"], ["ability", "能力"], ["absorb", "吸収する"],
      ["accept", "受け入れる"], ["acceptance", "受け入れ"], ["accompany", "同行する"],
      ["accomplish", "成しとげる"], ["accuracy", "正確さ"], ["accuse", "非難する"],
      ["acquire", "習得する"], ["active", "活発な"], ["adapt", "適応する"],
      ["adjust", "調整する"], ["admit", "認める"], ["adopt", "採用する"],
      ["advantage", "利点"], ["adventure", "冒険"], ["advertise", "広告する"],
      ["advise", "助言する"], ["affect", "影響する"], ["affection", "愛情"],
      ["agency", "代理店"], ["agreement", "合意"], ["allow", "許す"],
      ["alternative", "代案"], ["amount", "量"], ["analysis", "分析"],
      ["analyze", "分析する"], ["ancestor", "先祖"], ["ancient", "古代の"],
      ["anniversary", "記念日"], ["announce", "発表する"], ["announcement", "発表"],
      ["anticipate", "予期する"], ["anxiety", "不安"], ["appeal", "うったえる"],
      ["appear", "現れる"], ["appearance", "外見"], ["application", "応募"],
      ["apply", "応募する"], ["appreciate", "感謝する"], ["approach", "取り組み方"],
      ["approve", "承認する"], ["area", "地域"], ["argue", "議論する"],
      ["argument", "議論"], ["arrange", "手配する"], ["arrangement", "手配"],
      ["article", "記事"], ["artificial", "人工の"], ["assign", "割り当てる"],
      ["assist", "手助けする"], ["assistance", "援助"], ["association", "協会"],
      ["assume", "想定する"], ["assumption", "仮定"], ["assure", "保証する"],
      ["attach", "取りつける"], ["attempt", "試みる"], ["attention", "注意"],
      ["attitude", "態度"], ["attract", "ひきつける"], ["available", "利用できる"],
      ["average", "平均"], ["avoid", "避ける"], ["aware", "気づいている"],
      ["awareness", "意識"], ["background", "背景"], ["balance", "つり合い"],
      ["basic", "基本の"], ["basis", "基礎"], ["behavior", "ふるまい"],
      ["belief", "信念"], ["benefit", "利益"], ["biography", "伝記"],
      ["brave", "勇敢な"], ["calculate", "計算する"], ["capacity", "容量"],
      ["capital", "首都"], ["capture", "とらえる"], ["career", "職業"],
      ["category", "分類"], ["cause", "原因"], ["caution", "用心"],
      ["cease", "やめる"], ["celebrate", "祝う"], ["century", "世紀"],
      ["ceremony", "式典"], ["challenge", "挑戦"], ["chance", "機会"],
      ["character", "性格・登場人物"], ["charity", "慈善"], ["choice", "選択"],
      ["citizen", "市民"], ["classify", "分類する"], ["climate", "気候"],
      ["combination", "組み合わせ"], ["combine", "結合する"], ["comfort", "快適さ"],
      ["comment", "意見"], ["commerce", "商業"], ["commit", "委ねる"],
      ["commitment", "献身"], ["community", "地域社会"], ["comparison", "比較"],
      ["compete", "競争する"], ["competition", "競争"], ["competitor", "競争相手"],
      ["complaint", "苦情"], ["complete", "完成させる"], ["complex", "複雑な"],
      ["compose", "構成する"], ["concentrate", "集中する"], ["concept", "概念"],
      ["conclude", "結論づける"], ["conclusion", "結論"], ["condition", "状態"],
      ["conduct", "行う"], ["conference", "会議"], ["confidence", "自信"],
      ["confirm", "確認する"], ["conflict", "対立"], ["confront", "立ち向かう"],
      ["connection", "つながり"], ["conquer", "征服する"], ["conservation", "保護"],
      ["conserve", "保存する"], ["consider", "よく考える"], ["consist", "成り立つ"],
      ["construct", "建設する"], ["construction", "建設"], ["consult", "相談する"],
      ["consume", "消費する"], ["consumer", "消費者"], ["contact", "連絡"],
      ["contain", "ふくむ"], ["content", "中身"], ["context", "文脈"],
      ["contract", "契約"], ["contrast", "対照"], ["contribute", "貢献する"],
      ["contribution", "貢献"], ["conversation", "会話"], ["conversion", "転換"],
      ["convert", "変える"], ["convince", "納得させる"], ["cooperate", "協力する"],
      ["cooperation", "協力"], ["correspond", "一致する"], ["courage", "勇気"],
      ["create", "創造する"], ["crisis", "危機"], ["criticism", "批評"],
      ["criticize", "批判する"], ["crowded", "こみ合った"], ["cultural", "文化の"],
      ["cure", "治療"], ["curious", "好奇心の強い"], ["custom", "習慣"],
      ["damage", "損害"], ["danger", "危険"], ["dangerous", "危険な"],
      ["decade", "10年間"], ["decision", "決定"], ["declare", "宣言する"],
      ["decrease", "減少する"], ["defeat", "打ち負かす"], ["defend", "守る"],
      ["defense", "防衛"], ["define", "定義する"], ["definition", "定義"],
      ["degree", "程度・度"], ["delay", "遅れ"], ["delight", "喜ばせる"],
      ["deliver", "配達する"], ["delivery", "配達"], ["demand", "要求する"],
      ["demonstration", "実演"], ["deny", "否定する"], ["department", "部門"],
      ["depend", "たよる"], ["depth", "深さ"], ["derive", "引き出す"],
      ["description", "説明"], ["desert", "砂漠"], ["destination", "目的地"],
      ["destroy", "破壊する"], ["destruction", "破壊"], ["determine", "決定する"],
      ["development", "発展"], ["device", "装置"], ["devote", "ささげる"],
      ["diet", "食事"], ["difference", "ちがい"], ["difficult", "難しい"],
      ["digital", "デジタルの"], ["diploma", "卒業証書"], ["direction", "方向"],
      ["disadvantage", "不利"], ["disaster", "災害"], ["discovery", "発見"],
      ["discuss", "話し合う"], ["discussion", "話し合い"], ["disease", "病気"],
      ["dismiss", "解雇する"], ["disorder", "混乱"], ["display", "展示"],
      ["dispute", "論争"], ["distance", "きょり"], ["distinguish", "区別する"],
      ["distribute", "分配する"], ["distribution", "分配"], ["disturb", "じゃまする"],
      ["diversity", "多様性"], ["document", "書類"], ["domain", "領域"],
      ["donate", "寄付する"], ["duty", "義務"], ["ecology", "生態学"],
      ["economy", "経済"], ["edition", "版"], ["editor", "編集者"],
      ["educate", "教育する"], ["education", "教育"], ["effect", "効果"],
      ["effective", "効果的な"], ["election", "選挙"], ["electric", "電気の"],
      ["element", "要素"], ["eliminate", "取り除く"], ["embrace", "抱きしめる"],
      ["emerge", "現れる"], ["emergency", "非常事態"], ["emission", "排出"],
      ["emotion", "感情"], ["emphasis", "強調"], ["employ", "雇う"],
      ["employee", "従業員"], ["employment", "雇用"], ["enable", "可能にする"],
      ["encounter", "出会い"], ["endure", "耐える"], ["engagement", "約束"],
      ["enhance", "高める"], ["ensure", "確実にする"], ["enterprise", "事業"],
      ["entertain", "もてなす"], ["entertainment", "娯楽"], ["entry", "参加"],
      ["environment", "環境"], ["equality", "平等"], ["equipment", "設備"],
      ["era", "時代"], ["escape", "にげる"], ["essential", "不可欠な"],
      ["establish", "設立する"], ["estimate", "見積もり"], ["evaluate", "評価する"],
      ["evaluation", "評価"], ["event", "出来事"], ["evidence", "証拠"],
      ["evolution", "進化"], ["evolve", "進化する"], ["examine", "調べる"],
      ["exceed", "超える"], ["excellent", "すぐれた"], ["exception", "例外"],
      ["exchange", "交換する"], ["excitement", "興奮"], ["exclude", "除外する"],
      ["exhibition", "展覧会"], ["exist", "存在する"], ["expand", "拡大する"],
      ["expansion", "拡大"], ["expect", "期待する"], ["expectation", "期待"],
      ["expense", "費用"], ["experiment", "実験する"], ["expert", "専門家"],
      ["explanation", "説明"], ["explode", "爆発する"], ["exploration", "探検"],
      ["explore", "探検する"], ["export", "輸出する"], ["expose", "さらす"],
      ["expression", "表現"], ["extend", "延ばす"], ["extension", "延長"],
      ["extract", "引き出す"], ["facility", "施設"], ["factor", "要因"],
      ["failure", "失敗"], ["familiar", "よく知っている"], ["fantasy", "空想"],
      ["fashion", "流行"], ["feature", "特徴"], ["fiction", "小説"],
      ["figure", "姿・数字"], ["finance", "財政"], ["firm", "会社"],
      ["flavor", "風味"], ["flexible", "柔軟な"], ["focus", "集中する"],
      ["forbid", "禁じる"], ["forecast", "予報"], ["formation", "形成"],
      ["found", "設立する"], ["foundation", "基礎"], ["fraction", "分数"],
      ["frame", "わく"], ["freedom", "自由"], ["frequency", "頻度"],
      ["fuel", "燃料"], ["function", "機能"], ["gather", "集める"],
      ["gene", "遺伝子"], ["generate", "生み出す"], ["generation", "世代"],
      ["gesture", "身ぶり"], ["global", "世界的な"], ["goal", "目標"],
      ["govern", "統治する"], ["graduate", "卒業する"], ["grammar", "文法"],
      ["growth", "成長"], ["guidance", "指導"], ["habit", "習慣"],
      ["harvest", "収穫"], ["heritage", "遺産"], ["hesitate", "ためらう"],
      ["honor", "名誉"], ["horizon", "地平線"], ["household", "世帯"],
      ["huge", "巨大な"], ["humanity", "人類"], ["ideal", "理想的な"],
      ["identify", "見分ける"], ["identity", "身元"], ["ignorance", "無知"],
      ["ignore", "無視する"], ["illustrate", "説明する"], ["illustration", "挿絵"],
      ["image", "印象・画像"], ["imitation", "まね"], ["immigrant", "移民"],
      ["immigration", "移住"], ["impact", "影響"], ["imply", "ほのめかす"],
      ["import", "輸入する"], ["importance", "重要性"], ["impose", "課す"],
      ["impossible", "不可能な"], ["impress", "感動させる"], ["impression", "印象"],
      ["improvement", "改善"], ["incident", "出来事"], ["include", "ふくむ"],
      ["inclusion", "包含"], ["increase", "増加"], ["independence", "独立"],
      ["indicate", "示す"], ["indication", "兆候"], ["individual", "個人"],
      ["industrial", "産業の"], ["industry", "産業"], ["infection", "感染"],
      ["influence", "影響"], ["inform", "知らせる"], ["information", "情報"],
      ["initial", "最初の"], ["initiate", "始める"], ["initiative", "主導権"],
      ["injure", "傷つける"], ["injury", "けが"], ["innovation", "革新"],
      ["input", "入力"], ["insect", "昆虫"], ["insight", "洞察"],
      ["insist", "主張する"], ["inspect", "検査する"], ["inspection", "検査"],
      ["inspiration", "ひらめき"], ["inspire", "奮い立たせる"], ["install", "設置する"],
      ["installation", "設置"], ["institution", "機関"], ["instruct", "指示する"],
      ["instruction", "指示"], ["instrument", "楽器・器具"], ["insurance", "保険"],
      ["intelligence", "知能"], ["intend", "意図する"], ["intention", "意図"],
      ["interact", "交流する"], ["interaction", "交流"], ["interest", "興味"],
      ["interpretation", "解釈"], ["interval", "間かく"], ["introduce", "紹介する"],
      ["introduction", "紹介"], ["invention", "発明"], ["investigate", "調査する"],
      ["investment", "投資"], ["involve", "巻きこむ"], ["involvement", "関与"],
      ["isolation", "孤立"], ["issue", "問題"], ["item", "品物"],
      ["joint", "継ぎ目"], ["journalism", "報道"], ["journalist", "記者"],
      ["journey", "旅"], ["judge", "判断する"], ["justice", "正義"],
      ["justify", "正当化する"], ["labor", "労働"], ["lack", "不足"],
      ["landscape", "風景"], ["language", "言語"], ["launch", "開始"],
      ["layer", "層"], ["leadership", "指導力"], ["league", "連盟"],
      ["lecture", "講義"], ["legal", "法律の"], ["liberty", "自由"],
      ["lifestyle", "生活様式"], ["limit", "限界"], ["literature", "文学"],
      ["local", "地元の"], ["locate", "位置を示す"], ["location", "位置"],
      ["logic", "論理"], ["loyalty", "忠誠"], ["maintain", "維持する"],
      ["major", "主要な"], ["majority", "大多数"], ["manage", "何とかやりとげる"],
      ["manner", "作法"], ["manufacturer", "製造業者"], ["margin", "余白"],
      ["marriage", "結婚"], ["material", "材料"], ["meaning", "意味"],
      ["measurement", "測定"], ["mechanism", "仕組み"], ["medical", "医療の"],
      ["medium", "手段"], ["membership", "会員"], ["mental", "精神の"],
      ["mention", "言及する"], ["merit", "長所"], ["method", "方法"],
      ["minority", "少数派"], ["mission", "任務"], ["mixture", "混合"],
      ["modification", "修正"], ["modify", "修正する"], ["moment", "瞬間"],
      ["motivate", "やる気にさせる"], ["motivation", "動機"], ["movement", "動き"],
      ["murder", "殺人"], ["mutual", "相互の"], ["narrative", "物語"],
      ["native", "母国の"], ["negative", "否定的な"], ["negotiation", "交渉"],
      ["network", "網の目"], ["normal", "標準の"], ["notion", "考え"],
      ["nutrition", "栄養"], ["obligation", "義務"], ["observation", "観察"],
      ["observe", "観察する"], ["obtain", "手に入れる"], ["obvious", "明らかな"],
      ["occasion", "場合"], ["occupation", "職業"], ["occur", "起こる"],
      ["offer", "申し出る"], ["operate", "操作する"], ["operation", "運営"],
      ["opinion", "意見"], ["opponent", "相手"], ["opposite", "反対の"],
      ["opposition", "反対"], ["option", "選択肢"], ["organization", "組織"],
      ["organize", "組織する"], ["orientation", "方向づけ"], ["origin", "起源"],
      ["original", "最初の"], ["outcome", "結果"], ["outline", "概要"],
      ["output", "産出"], ["overcome", "克服する"], ["ownership", "所有権"],
      ["participate", "参加する"], ["participation", "参加"], ["particular", "特定の"],
      ["partnership", "提携"], ["passage", "一節"], ["patience", "忍耐"],
      ["pension", "年金"], ["perception", "認識"], ["perform", "演じる"],
      ["performance", "演技"], ["period", "期間"], ["permanent", "永久の"],
      ["permission", "許可"], ["permit", "許可証"], ["persist", "固執する"],
      ["personal", "個人の"], ["personality", "個性"], ["perspective", "見方"],
      ["phase", "段階"], ["phrase", "句"], ["physical", "身体の"],
      ["plastic", "プラスチック"], ["platform", "台"], ["policy", "方針"],
      ["political", "政治の"], ["pollution", "汚染"], ["population", "人口"],
      ["portion", "部分"], ["position", "位置"], ["positive", "前向きな"],
      ["possess", "所有する"], ["possibility", "可能性"], ["potential", "可能性"],
      ["poverty", "貧困"], ["powerful", "力強い"], ["practical", "実用的な"],
      ["practice", "練習する"], ["precaution", "用心"], ["precious", "貴重な"],
      ["predict", "予測する"], ["prefer", "より好む"], ["preference", "好み"],
      ["preparation", "準備"], ["presence", "存在"], ["preservation", "保存"],
      ["preserve", "保存する"], ["pressure", "圧力"], ["pretend", "ふりをする"],
      ["prevent", "防ぐ"], ["previous", "以前の"], ["principle", "原則"],
      ["priority", "優先事項"], ["privacy", "私生活"], ["private", "私的な"],
      ["procedure", "手順"], ["proceed", "進む"], ["process", "過程"],
      ["produce", "生産する"], ["production", "生産"], ["profession", "職業"],
      ["professor", "教授"], ["progress", "進歩"], ["promote", "促進する"],
      ["proportion", "割合"], ["proposal", "提案"], ["propose", "提案する"],
      ["prospect", "見こみ"], ["protection", "保護"], ["protest", "抗議"],
      ["provide", "提供する"], ["public", "公共の"], ["publication", "出版"],
      ["publish", "出版する"], ["punishment", "罰"], ["purpose", "目的"],
      ["pursue", "追い求める"], ["qualify", "資格を得る"], ["quality", "質"],
      ["quantity", "量"], ["range", "範囲"], ["rank", "順位"],
      ["rapid", "急速な"], ["rare", "まれな"], ["ratio", "比率"],
      ["react", "反応する"], ["reaction", "反応"], ["reality", "現実"],
      ["reasonable", "妥当な"], ["recall", "思い出す"], ["recognition", "認識"],
      ["recognize", "見分ける"], ["recommend", "すすめる"], ["recover", "回復する"],
      ["recovery", "回復"], ["reduce", "減らす"], ["reduction", "削減"],
      ["reference", "参照"], ["reflect", "反射する"], ["reflection", "反射"],
      ["reform", "改革"], ["refusal", "拒否"], ["refuse", "断る"],
      ["regard", "みなす"], ["region", "地域"], ["register", "登録する"],
      ["registration", "登録"], ["regret", "後悔する"], ["regular", "規則的な"],
      ["regulation", "規則"], ["reject", "拒否する"], ["rejection", "拒絶"],
      ["relate", "関係づける"], ["relation", "関係"], ["release", "解放"],
      ["reliance", "たより"], ["religion", "宗教"], ["religious", "宗教の"],
      ["rely", "たよる"], ["remain", "とどまる"], ["remark", "発言"],
      ["remote", "遠い"], ["removal", "除去"], ["remove", "取り除く"],
      ["render", "与える"], ["repair", "修理"], ["replace", "取りかえる"],
      ["replacement", "交代"], ["represent", "表す"], ["reputation", "評判"],
      ["require", "必要とする"], ["requirement", "必要条件"], ["research", "研究"],
      ["resemble", "似ている"], ["reservation", "予約"], ["reserve", "予約する"],
      ["resist", "抵抗する"], ["resistance", "抵抗"], ["resolution", "決意"],
      ["resolve", "解決する"], ["resource", "資源"], ["respect", "尊敬"],
      ["respond", "応答する"], ["response", "反応"], ["responsible", "責任がある"],
      ["restore", "回復する"], ["restrict", "制限する"], ["restriction", "制限"],
      ["retire", "引退する"], ["retirement", "引退"], ["reveal", "明らかにする"],
      ["revenue", "収入"], ["reverse", "逆にする"], ["revise", "改訂する"],
      ["revision", "改訂"], ["revolution", "革命"], ["reward", "ほうび"],
      ["rhyme", "韻"], ["role", "役割"], ["routine", "決まった手順"],
      ["rule", "規則"], ["sacrifice", "ぎせい"], ["safety", "安全"],
      ["sandwich", "サンドイッチ"], ["satisfaction", "満足"], ["satisfy", "満足させる"],
      ["scale", "規模"], ["scene", "場面"], ["scholarship", "奨学金"],
      ["scientific", "科学の"], ["scientist", "科学者"], ["sculpture", "彫刻"],
      ["secure", "確保する"], ["security", "安全"], ["seek", "探し求める"],
      ["select", "選ぶ"], ["selection", "選択"], ["separate", "分ける"],
      ["sequence", "順序"], ["session", "会合"], ["settle", "解決する"],
      ["settlement", "解決"], ["severe", "厳しい"], ["shift", "移す"],
      ["shortage", "不足"], ["shortcut", "近道"], ["significance", "重要性"],
      ["significant", "重要な"], ["similarity", "類似"], ["simulate", "模擬する"],
      ["sincerity", "誠実さ"], ["skill", "技能"], ["slavery", "奴隷制"],
      ["social", "社会の"], ["solution", "解決策"], ["source", "源"],
      ["specialist", "専門家"], ["specific", "具体的な"], ["specify", "明確に述べる"],
      ["speculation", "推測"], ["standard", "基準"], ["statement", "発言"],
      ["statistics", "統計"], ["status", "地位"], ["stimulate", "刺激する"],
      ["stimulus", "刺激"], ["storage", "保管"], ["strain", "緊張"],
      ["stranger", "見知らぬ人"], ["strategy", "戦略"], ["strength", "強さ"],
      ["strengthen", "強くする"], ["stress", "圧力"], ["stretch", "のばす"],
      ["structure", "構造"], ["struggle", "もがく"], ["submit", "提出する"],
      ["substitute", "代わり"], ["succeed", "成功する"], ["success", "成功"],
      ["suffer", "苦しむ"], ["sufficient", "十分な"], ["suggest", "提案する"],
      ["suggestion", "提案"], ["summarize", "要約する"], ["summary", "要約"],
      ["supervision", "監督"], ["supply", "供給する"], ["support", "支援"],
      ["supporter", "支持者"], ["suppose", "想定する"], ["surplus", "余り"],
      ["surround", "取り囲む"], ["survey", "調査"], ["survive", "生き残る"],
      ["suspect", "疑う"], ["suspicion", "疑い"], ["sustain", "持続させる"],
      ["symbol", "象徴"], ["talent", "才能"], ["technical", "技術の"],
      ["technique", "技術"], ["tendency", "傾向"], ["tension", "緊張"],
      ["territory", "領土"], ["theory", "理論"], ["therapy", "治療"],
      ["thesis", "論文"], ["threat", "おどし"], ["tourist", "観光客"],
      ["trace", "あと"], ["transfer", "移動"], ["transform", "変える"],
      ["transformation", "変化"], ["transition", "移り変わり"], ["translate", "翻訳する"],
      ["translation", "翻訳"], ["transmit", "伝える"], ["transport", "輸送"],
      ["transportation", "交通機関"], ["treasure", "宝物"], ["treatment", "治療"],
      ["treaty", "条約"], ["trend", "傾向"], ["typical", "典型的な"],
      ["undergo", "経験する"], ["union", "組合"], ["unique", "独特の"],
      ["unite", "団結させる"], ["unity", "団結"], ["universal", "普遍的な"],
      ["universe", "宇宙"], ["urban", "都市の"], ["urge", "うながす"],
      ["urgency", "緊急"], ["usage", "使い方"], ["utilize", "利用する"],
      ["vacancy", "空き"], ["value", "価値"], ["variety", "多様性"],
      ["various", "さまざまな"], ["vary", "変化する"], ["vehicle", "乗り物"],
      ["verify", "確かめる"], ["version", "版"], ["victory", "勝利"],
      ["violate", "違反する"], ["violence", "暴力"], ["visible", "目に見える"],
      ["vision", "視力"], ["vocabulary", "語い"], ["volunteer", "ボランティア"],
      ["warmth", "あたたかさ"], ["warn", "警告する"], ["warning", "警告"],
      ["wealthy", "裕福な"], ["welfare", "福祉"], ["wisdom", "知恵"],
      ["withdraw", "引き出す"], ["withdrawal", "撤退"], ["witness", "目撃者"],
      ["worship", "崇拝"],
    ],
  },
  {
    lv: 4, title: "最終問題", tag: "ゲキムズ", stage: "つづりの魔王城", count: 1, base: 7,
    theme: { sky1: "#7A34A0", sky2: "#2A0E3E", floor: "#5A1F73", glow: "#FF9AD0", accent: "#FF3B6B", accent2: "#3E1152" },
    char: {
      key: "dragon", name: "つづりの魔王",
      ask: ["我を倒せるかな…？", "この一問、書けるものなら書いてみよ", "フハハ！これが最後だ！"],
      ok: ["見事だ…認めよう！", "まさか書けるとは…！"],
      ng: ["フハハ、我の勝ちだ！", "まだまだ甘いわ！"],
      typo: ["ちがうな。もう一度だ", "焦るでない"],
    },
    words: [
      ["accommodation", "宿泊施設"], ["achievement", "業績"], ["acknowledge", "認める"],
      ["administration", "運営"], ["agriculture", "農業"], ["answer", "答え"],
      ["appreciation", "感謝"], ["architecture", "建築"], ["atmosphere", "大気"],
      ["autumn", "秋"], ["biology", "生物学"], ["bureaucracy", "官僚制"],
      ["business", "商売"], ["calendar", "カレンダー"], ["ceiling", "天井"],
      ["cemetery", "墓地"], ["characteristic", "特徴"], ["chocolate", "チョコレート"],
      ["circumstance", "状況"], ["civilization", "文明"], ["colleague", "同僚"],
      ["column", "柱"], ["comfortable", "快適な"], ["committee", "委員会"],
      ["communication", "意思の伝達"], ["conscience", "良心"], ["conscious", "意識している"],
      ["consequence", "結果"], ["convenience", "便利さ"], ["convenient", "便利な"],
      ["cough", "せき"], ["curiosity", "好奇心"], ["debt", "借金"],
      ["definitely", "確実に"], ["democracy", "民主主義"], ["desperate", "必死の"],
      ["disappear", "姿を消す"], ["disappoint", "失望させる"], ["discipline", "規律"],
      ["doubt", "疑い"], ["efficiency", "効率"], ["embarrass", "恥ずかしい思いをさせる"],
      ["emphasize", "強調する"], ["encyclopedia", "百科事典"], ["entrepreneur", "起業家"],
      ["environmental", "環境の"], ["especially", "とくに"], ["exaggerate", "誇張する"],
      ["exhausted", "つかれ果てた"], ["existence", "存在"], ["experience", "経験"],
      ["extraordinary", "並はずれた"], ["fascinating", "魅力的な"], ["February", "2月"],
      ["foreign", "外国の"], ["fulfill", "果たす"], ["ghost", "ゆうれい"],
      ["gorgeous", "とても美しい"], ["government", "政府"], ["guarantee", "保証する"],
      ["height", "高さ"], ["hierarchy", "階層"], ["hippopotamus", "カバ"],
      ["honest", "正直な"], ["humorous", "ユーモアのある"], ["hypothesis", "仮説"],
      ["imagination", "想像力"], ["immediately", "すぐに"], ["independent", "独立した"],
      ["indispensable", "不可欠な"], ["inevitable", "避けられない"], ["interfere", "じゃまする"],
      ["international", "国際的な"], ["interpret", "通訳する"], ["island", "島"],
      ["jealous", "しっとした"], ["jewelry", "宝石類"], ["knee", "ひざ"],
      ["knife", "ナイフ"], ["knock", "ノックする"], ["knowledge", "知識"],
      ["laboratory", "実験室"], ["legitimate", "正当な"], ["leisure", "余暇"],
      ["license", "免許"], ["luxury", "ぜいたく"], ["magnificent", "壮大な"],
      ["maintenance", "維持"], ["manufacture", "製造する"], ["mathematics", "数学"],
      ["Mediterranean", "地中海の"], ["millennium", "千年間"], ["miscellaneous", "種々雑多な"],
      ["mischievous", "いたずら好きな"], ["muscle", "筋肉"], ["mysterious", "神秘的な"],
      ["necessary", "必要な"], ["necessity", "必要性"], ["negotiate", "交渉する"],
      ["neighbor", "近所の人"], ["noticeable", "目立つ"], ["occasionally", "ときどき"],
      ["occurrence", "出来事"], ["omission", "省略"], ["onomatopoeia", "擬音語"],
      ["opportunity", "機会"], ["orchestra", "管弦楽団"], ["parallel", "平行の"],
      ["parliament", "議会"], ["particularly", "とくに"], ["perceive", "知覚する"],
      ["perseverance", "忍耐"], ["persuade", "説得する"], ["phenomenon", "現象"],
      ["philosophy", "哲学"], ["physician", "内科医"], ["playwright", "劇作家"],
      ["possession", "所有"], ["precede", "先に立つ"], ["prejudice", "偏見"],
      ["privilege", "特権"], ["professional", "専門的な"], ["pronunciation", "発音"],
      ["psychology", "心理学"], ["publicly", "公然と"], ["qualification", "資格"],
      ["questionnaire", "アンケート"], ["queue", "列"], ["receipt", "領収書"],
      ["recommendation", "推薦"], ["refrigerator", "冷蔵庫"], ["relationship", "関係"],
      ["relevant", "関連のある"], ["representative", "代表"], ["responsibility", "責任"],
      ["rhythm", "リズム"], ["ridiculous", "ばかげた"], ["satellite", "衛星"],
      ["scent", "香り"], ["schedule", "予定表"], ["scissors", "はさみ"],
      ["secretary", "秘書"], ["silhouette", "影絵"], ["sincerely", "心から"],
      ["souvenir", "おみやげ"], ["stomach", "胃"], ["straight", "まっすぐな"],
      ["subtle", "微妙な"], ["sustainability", "持続可能性"], ["sword", "剣"],
      ["technology", "科学技術"], ["temperature", "気温・温度"], ["thorough", "徹底的な"],
      ["though", "だけれども"], ["thought", "考え"], ["threshold", "敷居"],
      ["through", "〜を通りぬけて"], ["tongue", "舌"], ["tough", "厳しい"],
      ["tournament", "トーナメント"], ["traditional", "伝統的な"], ["tragedy", "悲劇"],
      ["tremendous", "ものすごい"], ["twelfth", "12番目の"], ["unconscious", "意識のない"],
      ["unfortunately", "残念ながら"], ["vacuum", "真空"], ["vegetable", "野菜"],
      ["veterinarian", "獣医"], ["villain", "悪役"], ["vulnerable", "傷つきやすい"],
      ["Wednesday", "水曜日"], ["weight", "重さ"], ["weird", "奇妙な"],
      ["whether", "〜かどうか"], ["whistle", "口笛"], ["wrist", "手首"],
      ["yacht", "ヨット"], ["zealous", "熱心な"],
    ],
  },
];

const TOTAL_Q = LEVELS.reduce((s, l) => s + l.count, 0);
const CELL_COLORS = ["#2E86FF", "#12A9E8", "#0FC4B0", "#2FD061", "#7ED321", "#A9DC1B", "#D9DC12", "#F5B912", "#FF8A1E", "#FF3B4E"];
const timeFor = (level, word) => (level.base + word.length * 0.5) * 2;
const shuffle = (a) => {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
};
const pick = (a) => a[Math.floor(Math.random() * a.length)];

/* ============================================================
   キャラクター
   ============================================================ */
const OUT = "#2A1B45";

function Eye({ x, y, mood, r = 13, look = 0 }) {
  if (mood === "happy")
    return <path d={`M${x - r},${y + 3} q${r},-${r + 4} ${r * 2},0`} fill="none" stroke={OUT} strokeWidth="7" strokeLinecap="round" />;
  if (mood === "sad")
    return <path d={`M${x - r},${y - 3} q${r},${r + 2} ${r * 2},0`} fill="none" stroke={OUT} strokeWidth="7" strokeLinecap="round" />;
  return (
    <g>
      <ellipse cx={x} cy={y} rx={r} ry={r + 3} fill="#fff" stroke={OUT} strokeWidth="4.5" />
      <ellipse cx={x + look} cy={y + 2} rx={r * 0.55} ry={r * 0.68} fill="#2A1B45" />
      <circle cx={x + look - r * 0.2} cy={y - r * 0.35} r={r * 0.26} fill="#fff" />
    </g>
  );
}

function Character({ ckey, mood = "idle", className = "" }) {
  const cls = `char char-${mood} ${className}`;
  const uid = ckey;

  if (ckey === "chick") {
    return (
      <svg viewBox="0 0 200 210" className={cls} preserveAspectRatio="xMidYMax meet" aria-hidden="true">
        <defs>
          <linearGradient id={`${uid}-body`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFF0A8" /><stop offset="1" stopColor="#FFC42E" />
          </linearGradient>
          <linearGradient id={`${uid}-wing`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFDE6E" /><stop offset="1" stopColor="#F3A712" />
          </linearGradient>
        </defs>
        <ellipse cx="100" cy="196" rx="58" ry="11" fill="#00000030" />
        {/* あし */}
        <g stroke="#E8781A" strokeWidth="8" strokeLinecap="round" fill="none">
          <path d="M82,178 v12 M82,190 l-12,8 M82,190 l12,8" />
          <path d="M120,178 v12 M120,190 l-12,8 M120,190 l12,8" />
        </g>
        {/* からだ */}
        <path d="M100,26 c44,0 72,38 72,84 c0,44 -32,72 -72,72 c-40,0 -72,-28 -72,-72 c0,-46 28,-84 72,-84 z"
          fill={`url(#${uid}-body)`} stroke={OUT} strokeWidth="7" />
        <path d="M100,182 c-40,0 -72,-28 -72,-72 c0,-8 1,-16 3,-23 c10,52 40,74 84,74 c18,0 34,-6 45,-16 c-11,23 -35,37 -60,37 z"
          fill="#E8A00E" opacity=".35" />
        <ellipse cx="72" cy="70" rx="20" ry="26" fill="#ffffff" opacity=".38" transform="rotate(-18 72 70)" />
        {/* 頭の毛 */}
        <path d="M100,28 c-4,-16 6,-24 16,-26 c-8,8 -6,16 2,22" fill="none" stroke={OUT} strokeWidth="7" strokeLinecap="round" />
        {/* つばさ */}
        <path d="M30,108 c-16,4 -22,26 -8,40 c10,10 22,6 26,-4 z" fill={`url(#${uid}-wing)`} stroke={OUT} strokeWidth="7" strokeLinejoin="round" className="wing-l" />
        <path d="M170,108 c16,4 22,26 8,40 c-10,10 -22,6 -26,-4 z" fill={`url(#${uid}-wing)`} stroke={OUT} strokeWidth="7" strokeLinejoin="round" className="wing-r" />
        {/* かお */}
        <Eye x={78} y={92} mood={mood} r={14} look={2} />
        <Eye x={126} y={92} mood={mood} r={14} look={2} />
        <ellipse cx="54" cy="118" rx="12" ry="8" fill="#FF97AE" opacity=".75" />
        <ellipse cx="148" cy="118" rx="12" ry="8" fill="#FF97AE" opacity=".75" />
        {mood === "happy" ? (
          <path d="M86,116 q14,22 30,0 q-14,10 -30,0" fill="#D9544F" stroke={OUT} strokeWidth="5" strokeLinejoin="round" />
        ) : (
          <path d="M86,114 l14,14 l16,-14 l-16,-6 z" fill="#F58A1F" stroke={OUT} strokeWidth="5" strokeLinejoin="round" />
        )}
        {/* えんぴつ */}
        <g transform="rotate(20 172 150)">
          <rect x="164" y="120" width="16" height="62" rx="4" fill="#FF6B6B" stroke={OUT} strokeWidth="6" />
          <path d="M164,182 l8,16 l8,-16 z" fill="#FFE0B8" stroke={OUT} strokeWidth="5" strokeLinejoin="round" />
        </g>
      </svg>
    );
  }

  if (ckey === "cat") {
    return (
      <svg viewBox="0 0 200 210" className={cls} preserveAspectRatio="xMidYMax meet" aria-hidden="true">
        <defs>
          <linearGradient id={`${uid}-body`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFCB8E" /><stop offset="1" stopColor="#EE8A34" />
          </linearGradient>
        </defs>
        <ellipse cx="100" cy="196" rx="54" ry="11" fill="#00000030" />
        {/* しっぽ */}
        <path d="M150,168 c34,-4 34,-40 14,-52" fill="none" stroke={OUT} strokeWidth="20" strokeLinecap="round" className="tail" />
        <path d="M150,168 c34,-4 34,-40 14,-52" fill="none" stroke="#EE8A34" strokeWidth="12" strokeLinecap="round" className="tail" />
        {/* からだ */}
        <path d="M100,110 c34,0 52,26 52,50 c0,20 -22,30 -52,30 c-30,0 -52,-10 -52,-30 c0,-24 18,-50 52,-50 z"
          fill={`url(#${uid}-body)`} stroke={OUT} strokeWidth="7" />
        <ellipse cx="100" cy="172" rx="26" ry="16" fill="#FFF0DA" />
        {/* 耳 */}
        <path d="M48,52 l-6,-40 l40,20 z" fill="#EE8A34" stroke={OUT} strokeWidth="7" strokeLinejoin="round" />
        <path d="M152,52 l6,-40 l-40,20 z" fill="#EE8A34" stroke={OUT} strokeWidth="7" strokeLinejoin="round" />
        <path d="M54,44 l-2,-18 l18,9 z" fill="#FF9CB0" />
        <path d="M146,44 l2,-18 l-18,9 z" fill="#FF9CB0" />
        {/* 頭 */}
        <ellipse cx="100" cy="82" rx="60" ry="52" fill={`url(#${uid}-body)`} stroke={OUT} strokeWidth="7" />
        <ellipse cx="74" cy="58" rx="20" ry="14" fill="#fff" opacity=".33" transform="rotate(-20 74 58)" />
        <g stroke="#C96A18" strokeWidth="6" strokeLinecap="round">
          <path d="M84,40 l6,14 M100,36 l0,15 M116,40 l-6,14" />
        </g>
        {/* めがね */}
        <g fill="none" stroke={OUT} strokeWidth="5">
          <circle cx="76" cy="84" r="24" fill="#BFE9FF" fillOpacity=".35" />
          <circle cx="124" cy="84" r="24" fill="#BFE9FF" fillOpacity=".35" />
          <path d="M100,84 h0 M52,80 l-14,-6 M148,80 l14,-6" />
        </g>
        <Eye x={76} y={84} mood={mood} r={12} />
        <Eye x={124} y={84} mood={mood} r={12} />
        <ellipse cx="100" cy="108" rx="22" ry="15" fill="#FFEBD2" stroke={OUT} strokeWidth="4" />
        <path d="M100,102 l-8,6 l16,0 z" fill="#E0637A" stroke={OUT} strokeWidth="4" strokeLinejoin="round" />
        {mood === "happy"
          ? <path d="M86,116 q14,18 28,0 q-14,8 -28,0" fill="#D9544F" stroke={OUT} strokeWidth="4" />
          : <path d="M92,114 q8,9 16,0" fill="none" stroke={OUT} strokeWidth="5" strokeLinecap="round" />}
        <g stroke={OUT} strokeWidth="4" strokeLinecap="round">
          <path d="M62,104 l-26,-8 M62,112 l-26,6 M138,104 l26,-8 M138,112 l26,6" />
        </g>
        {/* マフラー */}
        <path d="M56,128 q44,26 88,0 q-4,20 -44,20 q-40,0 -44,-20 z" fill="#5FC7C0" stroke={OUT} strokeWidth="6" strokeLinejoin="round" />
      </svg>
    );
  }

  if (ckey === "robot") {
    return (
      <svg viewBox="0 0 200 210" className={cls} preserveAspectRatio="xMidYMax meet" aria-hidden="true">
        <defs>
          <linearGradient id={`${uid}-metal`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#E6EEFB" /><stop offset="1" stopColor="#9FB2D2" />
          </linearGradient>
          <linearGradient id={`${uid}-head`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8FE4FF" /><stop offset="1" stopColor="#37A8DC" />
          </linearGradient>
        </defs>
        <ellipse cx="100" cy="196" rx="52" ry="11" fill="#00000030" />
        {/* アンテナ */}
        <path d="M100,34 v-16" stroke={OUT} strokeWidth="7" strokeLinecap="round" />
        <circle cx="100" cy="12" r="10" fill="#FF6B6B" stroke={OUT} strokeWidth="6" className="blip" />
        {/* あし */}
        <rect x="66" y="164" width="26" height="26" rx="8" fill={`url(#${uid}-metal)`} stroke={OUT} strokeWidth="6" />
        <rect x="108" y="164" width="26" height="26" rx="8" fill={`url(#${uid}-metal)`} stroke={OUT} strokeWidth="6" />
        {/* からだ */}
        <rect x="52" y="108" width="96" height="66" rx="18" fill={`url(#${uid}-metal)`} stroke={OUT} strokeWidth="7" />
        <rect x="70" y="122" width="60" height="34" rx="7" fill="#16305A" stroke={OUT} strokeWidth="5" />
        <text x="100" y="147" textAnchor="middle" fontSize="22" fontWeight="800" fill="#6FF0D0" fontFamily="ui-monospace,monospace">ABC</text>
        {/* うで */}
        <rect x="20" y="112" width="26" height="52" rx="13" fill="#8497B8" stroke={OUT} strokeWidth="6" className="arm-l" />
        <rect x="154" y="112" width="26" height="52" rx="13" fill="#8497B8" stroke={OUT} strokeWidth="6" className="arm-r" />
        {/* あたま */}
        <rect x="44" y="32" width="112" height="76" rx="26" fill={`url(#${uid}-head)`} stroke={OUT} strokeWidth="7" />
        <rect x="58" y="44" width="84" height="52" rx="16" fill="#16305A" stroke={OUT} strokeWidth="5" />
        <path d="M62,50 q30,-10 60,0 q-30,10 -60,0" fill="#ffffff" opacity=".18" />
        {mood === "happy" ? (
          <g fill="none" stroke="#6FF0D0" strokeWidth="8" strokeLinecap="round">
            <path d="M74,72 q10,-14 20,0" /><path d="M106,72 q10,-14 20,0" />
          </g>
        ) : mood === "sad" ? (
          <g fill="none" stroke="#FF8A9B" strokeWidth="8" strokeLinecap="round">
            <path d="M74,62 l20,18 M94,62 l-20,18" /><path d="M106,72 h20" />
          </g>
        ) : (
          <g fill="#6FF0D0">
            <rect x="72" y="60" width="18" height="18" rx="5" className="pix" />
            <rect x="110" y="60" width="18" height="18" rx="5" className="pix" />
          </g>
        )}
        <rect x="86" y="86" width="28" height="6" rx="3" fill="#6FF0D0" opacity=".8" />
        {/* ねじ */}
        <g fill="#7C8FB0" stroke={OUT} strokeWidth="4">
          <circle cx="60" cy="120" r="5" /><circle cx="140" cy="120" r="5" />
        </g>
      </svg>
    );
  }

  /* dragon */
  return (
    <svg viewBox="0 0 200 210" className={cls} preserveAspectRatio="xMidYMax meet" aria-hidden="true">
      <defs>
        <linearGradient id={`${uid}-body`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#C08BF0" /><stop offset="1" stopColor="#6B2FB0" />
        </linearGradient>
        <linearGradient id={`${uid}-wing`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5A2090" /><stop offset="1" stopColor="#33105E" />
        </linearGradient>
      </defs>
      <ellipse cx="100" cy="196" rx="58" ry="11" fill="#00000040" />
      {/* つばさ */}
      <path d="M52,96 C10,66 4,26 16,16 C30,34 44,44 60,50 C48,30 46,18 52,10 C62,34 78,52 96,62 z"
        fill={`url(#${uid}-wing)`} stroke={OUT} strokeWidth="7" strokeLinejoin="round" className="wing-l" />
      <path d="M148,96 C190,66 196,26 184,16 C170,34 156,44 140,50 C152,30 154,18 148,10 C138,34 122,52 104,62 z"
        fill={`url(#${uid}-wing)`} stroke={OUT} strokeWidth="7" strokeLinejoin="round" className="wing-r" />
      {/* からだ */}
      <path d="M100,108 c32,0 50,26 50,48 c0,20 -20,32 -50,32 c-30,0 -50,-12 -50,-32 c0,-22 18,-48 50,-48 z"
        fill={`url(#${uid}-body)`} stroke={OUT} strokeWidth="7" />
      <path d="M100,146 c16,0 26,10 26,22 c0,10 -10,16 -26,16 c-16,0 -26,-6 -26,-16 c0,-12 10,-22 26,-22 z" fill="#E7CBFA" opacity=".55" />
      {/* つの */}
      <path d="M56,42 l-16,-32 l34,18 z" fill="#F2D34C" stroke={OUT} strokeWidth="7" strokeLinejoin="round" />
      <path d="M144,42 l16,-32 l-34,18 z" fill="#F2D34C" stroke={OUT} strokeWidth="7" strokeLinejoin="round" />
      {/* あたま */}
      <ellipse cx="100" cy="80" rx="58" ry="50" fill={`url(#${uid}-body)`} stroke={OUT} strokeWidth="7" />
      <ellipse cx="74" cy="54" rx="20" ry="13" fill="#fff" opacity=".28" transform="rotate(-20 74 54)" />
      <ellipse cx="100" cy="104" rx="30" ry="20" fill="#B487E8" stroke={OUT} strokeWidth="5" />
      <g fill={OUT}><circle cx="90" cy="98" r="4" /><circle cx="110" cy="98" r="4" /></g>
      {mood === "happy" ? (
        <g>
          <path d="M78,64 q12,-12 24,-4" fill="none" stroke={OUT} strokeWidth="7" strokeLinecap="round" />
          <path d="M122,64 q-12,-12 -24,-4" fill="none" stroke={OUT} strokeWidth="7" strokeLinecap="round" />
          <path d="M82,110 q18,18 36,0 q-18,10 -36,0" fill="#7A2244" stroke={OUT} strokeWidth="5" strokeLinejoin="round" />
        </g>
      ) : (
        <g>
          <Eye x={78} y={72} mood={mood === "sad" ? "sad" : "idle"} r={12} look={2} />
          <Eye x={122} y={72} mood={mood === "sad" ? "sad" : "idle"} r={12} look={-2} />
          <path d="M60,52 l26,10 M140,52 l-26,10" stroke={OUT} strokeWidth="7" strokeLinecap="round" fill="none" />
          <path d="M82,112 q18,10 36,0" fill="none" stroke={OUT} strokeWidth="5" strokeLinecap="round" />
          <path d="M88,113 l4,11 l5,-11 M112,113 l-4,11 l-5,-11" fill="#fff" stroke={OUT} strokeWidth="3.5" strokeLinejoin="round" />
        </g>
      )}
      {/* 魔導書 */}
      <g className="book">
        <rect x="150" y="130" width="42" height="34" rx="4" fill="#B03A55" stroke={OUT} strokeWidth="6" transform="rotate(-12 171 147)" />
        <path d="M156,140 h28 M156,150 h22" stroke="#FFE6B0" strokeWidth="4" strokeLinecap="round" transform="rotate(-12 171 147)" />
      </g>
    </svg>
  );
}

/* ---------------- 効果音 ---------------- */
function useBeeps(enabled) {
  const ctxRef = useRef(null);
  return useCallback((kind) => {
    if (!enabled) return;
    try {
      if (!ctxRef.current) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ctxRef.current = new AC();
      }
      const ctx = ctxRef.current;
      if (ctx.state === "suspended") ctx.resume();
      /* --- モンスター撃破：かわいい爆発音 --- */
      if (kind === "boom") {
        const now = ctx.currentTime;
        /* ポン！(音程が下がるポップ) */
        const pop = ctx.createOscillator(); const pg = ctx.createGain();
        pop.type = "sine";
        pop.frequency.setValueAtTime(820, now);
        pop.frequency.exponentialRampToValueAtTime(90, now + 0.24);
        pg.gain.setValueAtTime(0.28, now);
        pg.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);
        pop.connect(pg).connect(ctx.destination);
        pop.start(now); pop.stop(now + 0.36);
        /* ふわっとした破裂ノイズ */
        const len = Math.floor(ctx.sampleRate * 0.5);
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2);
        const src = ctx.createBufferSource(); src.buffer = buf;
        const lp = ctx.createBiquadFilter(); lp.type = "lowpass";
        lp.frequency.setValueAtTime(2600, now);
        lp.frequency.exponentialRampToValueAtTime(360, now + 0.42);
        const ng = ctx.createGain();
        ng.gain.setValueAtTime(0.22, now);
        ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.46);
        src.connect(lp).connect(ng).connect(ctx.destination);
        src.start(now);
        /* きらきら(撃破のごほうび) */
        [[1046, 0.2], [1318, 0.28], [1568, 0.36], [2093, 0.44]].forEach(([f, t]) => {
          const o = ctx.createOscillator(); const g = ctx.createGain();
          o.type = "triangle"; o.frequency.value = f;
          g.gain.setValueAtTime(0.0001, now + t);
          g.gain.exponentialRampToValueAtTime(0.14, now + t + 0.01);
          g.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.2);
          o.connect(g).connect(ctx.destination);
          o.start(now + t); o.stop(now + t + 0.22);
        });
        return;
      }
      const seq =
        kind === "ok" ? [[880, 0], [1320, 0.07]] :
        kind === "timeup" ? [[220, 0], [165, 0.12]] :
        kind === "typo" ? [[300, 0]] :
        kind === "clear" ? [[660, 0], [880, 0.09], [1320, 0.18]] : [[440, 0]];
      seq.forEach(([f, t]) => {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.type = kind === "ok" || kind === "clear" ? "square" : "sawtooth";
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
        g.gain.exponentialRampToValueAtTime(0.09, ctx.currentTime + t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.16);
        o.connect(g).connect(ctx.destination);
        o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.18);
      });
    } catch (e) {}
  }, [enabled]);
}

/* ============================================================
   BGM（ステージごとの自動生成ループ）
   ============================================================ */
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const BGM = [
  { /* Lv1 あさの草原：明るいが急かすような8ビート */
    tempo: 132, wave: "square", lead: 0.05, bassWave: "triangle",
    bass: [45, null, null, 45, null, 45, null, null, 50, null, null, 50, null, 48, null, null],
    arp: [69, 72, 76, 72, 69, 72, 76, 72, 74, 77, 81, 77, 72, 76, 79, 76],
    kick: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0],
    hat: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1],
  },
  { /* Lv2 ゆうやけ商店街：マイナー7のせわしないグルーヴ */
    tempo: 140, wave: "square", lead: 0.05, bassWave: "triangle",
    bass: [41, null, 41, null, 44, null, null, 41, 39, null, 39, null, 43, null, null, 43],
    arp: [65, 68, 72, 75, 72, 68, 65, 68, 63, 67, 70, 74, 70, 67, 63, 67],
    kick: [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0],
    hat: [1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 1],
  },
  { /* Lv3 深夜のラボ：暗いマイナーの高速アルペジオ */
    tempo: 150, wave: "sawtooth", lead: 0.042, bassWave: "square",
    bass: [38, 38, null, 38, null, 38, null, 38, 36, 36, null, 36, null, 36, null, 41],
    arp: [62, 65, 69, 65, 74, 69, 65, 69, 60, 63, 67, 63, 72, 67, 63, 67],
    kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1],
    hat: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  },
  { /* Lv4 魔王城：ハーモニックマイナーの重いボス曲 */
    tempo: 162, wave: "sawtooth", lead: 0.05, bassWave: "sawtooth",
    bass: [33, 33, 34, 33, 33, null, 36, 35, 33, 33, 34, 33, 40, null, 39, 38],
    arp: [57, 60, 64, 68, 68, 64, 60, 64, 56, 59, 63, 68, 71, 68, 64, 59],
    kick: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1],
    hat: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  },
];

/* ゲームオーバー：残念な気持ちになる曲（ゆっくり下がるマイナー） */
const BGM_OVER = {
  tempo: 74, wave: "triangle", lead: 0.075, bassWave: "sine",
  bass: [45, null, null, null, 43, null, null, null, 41, null, null, null, 40, null, null, null],
  arp: [72, null, 71, null, 69, null, null, 67, 65, null, 64, null, 62, null, null, null],
  kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
  hat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
};
/* クリア：称えるファンファーレ（明るいメジャー） */
const BGM_WIN = {
  tempo: 150, wave: "square", lead: 0.06, bassWave: "triangle",
  bass: [41, null, 41, null, 46, null, 46, null, 48, null, 48, null, 53, null, 53, null],
  arp: [77, 81, 84, 89, 84, 89, 88, 84, 81, 84, 88, 91, 88, 84, 81, 84],
  kick: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1],
  hat: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
};

function useBgm() {
  const eng = useRef({ ctx: null, master: null, timer: null, next: 0, step: 0, cfg: null, urgent: false });

  const schedule = (step, t) => {
    const e = eng.current, ctx = e.ctx, cfg = e.cfg;
    if (!ctx || !cfg) return;
    const boost = e.urgent ? 1.35 : 1;
    const note = (m, wave, dur, vol, detune = 0) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = wave; o.frequency.value = mtof(m); o.detune.value = detune;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol * boost, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(e.master);
      o.start(t); o.stop(t + dur + 0.02);
    };
    if (cfg.bass[step] != null) note(cfg.bass[step], cfg.bassWave, 0.2, 0.16);
    if (cfg.arp[step] != null) note(cfg.arp[step], cfg.wave, 0.12, cfg.lead);
    if (cfg.kick[step]) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(140, t);
      o.frequency.exponentialRampToValueAtTime(46, t + 0.1);
      g.gain.setValueAtTime(0.22 * boost, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      o.connect(g).connect(e.master);
      o.start(t); o.stop(t + 0.18);
    }
    if (cfg.hat[step]) {
      const len = Math.floor(ctx.sampleRate * 0.03);
      const b = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource(); src.buffer = b;
      const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 7000;
      const g = ctx.createGain(); g.gain.value = 0.05 * boost;
      src.connect(hp).connect(g).connect(e.master);
      src.start(t);
    }
    /* 焦り演出：残り時間が少ないと裏で秒針が鳴る */
    if (e.urgent && step % 4 === 2) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "square"; o.frequency.value = 1760;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.05, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
      o.connect(g).connect(e.master);
      o.start(t); o.stop(t + 0.09);
    }
  };

  const stop = useCallback(() => {
    const e = eng.current;
    if (e.timer) { clearInterval(e.timer); e.timer = null; }
    if (e.master && e.ctx) {
      try { e.master.gain.setTargetAtTime(0.0001, e.ctx.currentTime, 0.08); } catch (err) {}
    }
  }, []);

  const start = useCallback((cfg) => {
    const e = eng.current;
    try {
      if (!e.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        e.ctx = new AC();
        e.master = e.ctx.createGain();
        e.master.connect(e.ctx.destination);
      }
      if (e.ctx.state === "suspended") e.ctx.resume();
      if (e.timer) clearInterval(e.timer);
      e.cfg = cfg; e.step = 0; e.urgent = false;
      e.master.gain.cancelScheduledValues(e.ctx.currentTime);
      e.master.gain.setValueAtTime(0.0001, e.ctx.currentTime);
      e.master.gain.setTargetAtTime(0.5, e.ctx.currentTime, 0.3);
      e.next = e.ctx.currentTime + 0.08;
      e.timer = setInterval(() => {
        const cur = eng.current;
        if (!cur.ctx || !cur.cfg) return;
        const stepDur = 60 / (cur.cfg.tempo * (cur.urgent ? 1.16 : 1)) / 4;
        while (cur.next < cur.ctx.currentTime + 0.14) {
          schedule(cur.step, cur.next);
          cur.next += stepDur;
          cur.step = (cur.step + 1) % 16;
        }
      }, 25);
    } catch (err) {}
  }, []);

  const setUrgent = useCallback((v) => { eng.current.urgent = v; }, []);
  useEffect(() => () => { const e = eng.current; if (e.timer) clearInterval(e.timer); }, []);
  return { start, stop, setUrgent };
}

/* ---------------- 背景 ---------------- */
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
function Scene({ theme }) {
  return (
    <div className="scene" aria-hidden="true"
      style={{ "--sky1": theme.sky1, "--sky2": theme.sky2, "--floor": theme.floor, "--glow": theme.glow }}>
      <div className="sky" />
      <div className="sunglow" />
      <div className="hills" />
      <div className="floorwrap"><div className="floor" /></div>
      <div className="letters">
        {Array.from({ length: 12 }).map((_, i) => (
          <span key={i} style={{
            left: `${(i * 8.3 + 4) % 96}%`,
            animationDelay: `${(i * 1.7) % 14}s`,
            animationDuration: `${13 + (i % 5) * 2.5}s`,
            fontSize: `${16 + (i % 4) * 12}px`,
          }}>{LETTERS[(i * 7) % 26]}</span>
        ))}
      </div>
      <div className="vignette" />
    </div>
  );
}

function EnglishDeGo() {
  const [screen, setScreen] = useState("title");
  const [showSlots, setShowSlots] = useState(true);
  const [sound, setSound] = useState(true);
  const [bgmOn, setBgmOn] = useState(true);
  const [imeWarn, setImeWarn] = useState(false);
  const [isFs, setIsFs] = useState(false);

  const [lvIndex, setLvIndex] = useState(0);
  const [pool, setPool] = useState([]);
  const [current, setCurrent] = useState(null);
  const [solved, setSolved] = useState(0);
  const [qid, setQid] = useState(0);

  const [typed, setTyped] = useState("");
  const [limit, setLimit] = useState(20);
  const [left, setLeft] = useState(20);
  const [timeouts, setTimeouts] = useState(0);
  const [typos, setTypos] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [shake, setShake] = useState(false);
  const [mood, setMood] = useState("idle");
  const [line, setLine] = useState("");
  const [notice, setNotice] = useState({ text: "", tone: "" });
  const [flash, setFlash] = useState(null);
  const [missedList, setMissedList] = useState([]);
  const [clearedQ, setClearedQ] = useState(0);
  const [defeat, setDefeat] = useState(false);

  const inputRef = useRef(null);
  const rafRef = useRef(null);
  const endAtRef = useRef(0);
  const lockRef = useRef(false);
  const moodTimer = useRef(null);
  const imeTimer = useRef(null);
  const rootRef = useRef(null);
  const bgm = useBgm();
  const beep = useBeeps(sound);
  const level = LEVELS[lvIndex];
  const theme = level.theme;

  /* --- BGM：ステージが変わったら曲も変わる --- */
  useEffect(() => {
    if (!bgmOn) { bgm.stop(); return; }
    if (screen === "play") bgm.start(BGM[lvIndex] || BGM[0]);
    else if (screen === "clear" || screen === "result") bgm.start(BGM_WIN);
    else if (screen === "over") bgm.start(BGM_OVER);
    else bgm.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, lvIndex, bgmOn]);
   
/* --- まなびの基板へ記録を送る --- */
useEffect(() => {
  if (!window.manabiReport) return;
  if (screen !== "clear" && screen !== "result" && screen !== "over") return;
  const done = screen === "result" ? LEVELS.length
             : screen === "clear" ? lvIndex + 1 : lvIndex;
  window.manabiReport({
    app: "english-go",
    done,
    total: LEVELS.length,
    best: Math.round((clearedQ / TOTAL_Q) * 1000), // クリアした問題の割合を1000点満点で
    note: screen === "result" ? `全ステージ制覇 ${score.toLocaleString()}点`
        : screen === "clear"  ? `STAGE ${lvIndex + 1} クリア`
        : `STAGE ${lvIndex + 1} でゲームオーバー`,
  });
}, [screen]);
   
  /* --- 残り時間が少なくなるとテンポと音量が上がる --- */
  const urgent = screen === "play" && limit > 0 && left / limit < 0.3;
  useEffect(() => { bgm.setUrgent(urgent); }, [urgent, bgm]);

  /* --- 全画面表示 --- */
  const fsSupported = typeof document !== "undefined" &&
    (document.fullscreenEnabled || document.webkitFullscreenEnabled);
  useEffect(() => {
    const h = () => setIsFs(!!(document.fullscreenElement || document.webkitFullscreenElement));
    document.addEventListener("fullscreenchange", h);
    document.addEventListener("webkitfullscreenchange", h);
    return () => {
      document.removeEventListener("fullscreenchange", h);
      document.removeEventListener("webkitfullscreenchange", h);
    };
  }, []);
  const toggleFs = () => {
    const el = rootRef.current;
    if (!el) return;
    const isOn = document.fullscreenElement || document.webkitFullscreenElement;
    try {
      if (!isOn) (el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen)?.call(el);
      else (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
    } catch (e) {}
  };

  /* --- 入力は半角英数のみ。IMEが日本語のときは弾いて知らせる --- */
  const warnIme = () => {
    setImeWarn(true);
    clearTimeout(imeTimer.current);
    imeTimer.current = setTimeout(() => setImeWarn(false), 2600);
  };
  const handleInput = (e) => {
    const raw = e.target.value;
    const v = raw.replace(/[^A-Za-z' -]/g, "");
    if (v !== raw) warnIme();
    setTyped(v);
  };

  const drawFrom = (arr, lv) => {
    if (arr.length > 0) return [arr[0], arr.slice(1)];
    const fresh = shuffle(LEVELS[lv].words);
    return [fresh[0], fresh.slice(1)];
  };
  const startLevel = (idx) => {
    const p = shuffle(LEVELS[idx].words);
    setLvIndex(idx); setPool(p.slice(1)); setCurrent(p[0]);
    setSolved(0); setQid((n) => n + 1); setScreen("play");
  };
  const nextWord = () => {
    const [w, rest] = drawFrom(pool, lvIndex);
    setPool(rest); setCurrent(w); setQid((n) => n + 1);
  };
  const startGame = () => {
    setTimeouts(0); setTypos(0); setScore(0); setCombo(0);
    setMissedList([]); setClearedQ(0); setNotice({ text: "", tone: "" });
    startLevel(0);
  };

  useEffect(() => {
    if (screen !== "play" || !current) return;
    lockRef.current = false;
    setTyped(""); setMood("idle"); setLine(pick(level.char.ask));
    const t = timeFor(level, current[0]);
    setLimit(t); setLeft(t);
    endAtRef.current = performance.now() + t * 1000;
    const tick = () => {
      const rest = (endAtRef.current - performance.now()) / 1000;
      setLeft(rest > 0 ? rest : 0);
      if (rest <= 0) { finishMiss(false); return; }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    const f = setTimeout(() => inputRef.current && inputRef.current.focus(), 30);
    return () => { cancelAnimationFrame(rafRef.current); clearTimeout(f); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, qid]);

  const advance = (nowSolved) => {
    if (nowSolved >= level.count) {
      beep("boom");
      setDefeat(true);
      setTimeout(() => {
        setDefeat(false);
        setScreen(lvIndex + 1 >= LEVELS.length ? "result" : "clear");
      }, 1500);
    } else nextWord();
  };

  const submit = () => {
    if (lockRef.current || !current) return;
    const [answer, meaning] = current;
    const val = typed.trim().toLowerCase();
    if (val === "q" && answer.toLowerCase() !== "q") { finishMiss(true); return; }
    if (val !== answer.toLowerCase()) {
      setTypos((n) => n + 1); setTyped(""); setShake(true); beep("typo");
      setNotice({ text: `${typed.trim()} → ちがいます！`, tone: "warn" });
      setLine(pick(level.char.typo)); setMood("sad");
      clearTimeout(moodTimer.current);
      moodTimer.current = setTimeout(() => setMood("idle"), 700);
      setTimeout(() => setShake(false), 320);
      return;
    }
    lockRef.current = true;
    cancelAnimationFrame(rafRef.current);
    const rest = Math.max(0, (endAtRef.current - performance.now()) / 1000);
    setScore((s) => s + 100 * level.lv + Math.round(rest * 10) + combo * 30);
    setCombo((c) => c + 1);
    setClearedQ((n) => n + 1);
    const nowSolved = solved + 1;
    setSolved(nowSolved);
    beep("ok"); setMood("happy"); setLine(pick(level.char.ok));
    setNotice({ text: `${answer} ＝ ${meaning}`, tone: "ok" });
    setFlash({ ok: true, answer, meaning });
    setTimeout(() => { setFlash(null); advance(nowSolved); }, 1500);
  };

  const finishMiss = (gaveUp) => {
    if (lockRef.current || !current) return;
    lockRef.current = true;
    cancelAnimationFrame(rafRef.current);
    const [answer, meaning] = current;
    const n = timeouts + 1;
    setTimeouts(n); setCombo(0);
    setMissedList((w) => (w.some((x) => x[0] === answer) ? w : [...w, [answer, meaning]]));
    beep("timeup"); setMood("sad"); setLine(pick(level.char.ng));
    setNotice({ text: `${answer} ＝ ${meaning}`, tone: "ng" });
    setFlash({ ok: false, answer, meaning, gaveUp, last: n >= MAX_LIFE });
    setTimeout(() => {
      setFlash(null);
      if (n >= MAX_LIFE) setScreen("over"); else nextWord();
    }, 2000);
  };

  const onKeyDown = (e) => { if (e.key === "Enter") { e.preventDefault(); if (typed.trim()) submit(); } };

  const ratio = limit > 0 ? Math.max(0, Math.min(1, left / limit)) : 0;
  const barColor = ratio > 0.5 ? "#4BE07A" : ratio > 0.25 ? "#FFD43B" : "#FF4D62";
  const life = MAX_LIFE - timeouts;

  return (
    <div className="edg" ref={rootRef}>
      <style>{CSS}</style>

      {/* ================= タイトル ================= */}
      {screen === "title" && (
        <div className="stage" style={{ "--accent": theme.accent, "--accent2": theme.accent2 }}>
          <Scene theme={LEVELS[0].theme} />
          <div className="layer center-col">
            <div className="logo">
              <span className="logo-jp out">英語で</span><span className="logo-go out">GO!</span>
            </div>
            <div className="castrow">
              {LEVELS.map((l) => (
                <div key={l.lv} className="cast" style={{ "--c": l.theme.accent }}>
                  <div className="castart"><Character ckey={l.char.key} mood="idle" className="char-sm" /></div>
                  <b>STAGE {l.lv}</b>
                  <span>{l.char.name}</span>
                  <i>{l.stage} / {l.count}問</i>
                </div>
              ))}
            </div>
            <div className="board">
              打ちまちがえてもノーカウント。<b>時間切れ3回でゲームオーバー。</b>『q』でギブアップ。
            </div>
            <div className="pills">
              <button className={"pill" + (showSlots ? " pill-on" : "")} onClick={() => setShowSlots(!showSlots)}>マスひょうじ {showSlots ? "ON" : "OFF"}</button>
              <button className={"pill" + (sound ? " pill-on" : "")} onClick={() => setSound(!sound)}>効果音 {sound ? "ON" : "OFF"}</button>
              <button className={"pill" + (bgmOn ? " pill-on" : "")} onClick={() => setBgmOn(!bgmOn)}>BGM {bgmOn ? "ON" : "OFF"}</button>
            </div>
            <div className="btnrow">
              <button className="gobtn" onClick={startGame}>スタート</button>
              {fsSupported && (
                <button className="gobtn sub" onClick={toggleFs}>
                  {isFs ? "全画面をやめる" : "全画面表示"}
                </button>
              )}
            </div>
            <p className="note">入力は半角英数です。開始時に自動で入力欄が選ばれます</p>
          </div>
        </div>
      )}

      {/* ================= プレイ ================= */}
      {screen === "play" && current && (
        <div className="stage" style={{ "--accent": theme.accent, "--accent2": theme.accent2 }}>
          <Scene theme={theme} />
          <div className="layer play">

            {/* --- 上段HUD --- */}
            <div className="topbar">
              <div className="hud-tl">
                <div className="capsule">
                  {Array.from({ length: TOTAL_Q }).map((_, i) => (
                    <span key={i}
                      className={"cell" + (i < clearedQ ? " cell-done" : "") + (i === clearedQ ? " cell-now" : "")}
                      style={i < clearedQ ? { background: CELL_COLORS[i] } : undefined}>{i + 1}</span>
                  ))}
                </div>
                <div className="pills">
                  <button className={"pill" + (showSlots ? " pill-on" : "")} onClick={() => { setShowSlots(!showSlots); inputRef.current?.focus(); }}>マスひょうじ</button>
                  <button className={"pill" + (sound ? " pill-on" : "")} onClick={() => { setSound(!sound); inputRef.current?.focus(); }}>効果音</button>
                  <button className={"pill" + (bgmOn ? " pill-on" : "")} onClick={() => { setBgmOn(!bgmOn); inputRef.current?.focus(); }}>BGM</button>
                </div>
              </div>
              <div className="hud-tr">
                <div className="diff"><em>STAGE {level.lv}</em>{level.tag}</div>
                <div className="stagename">{level.stage}</div>
                <div className="hudrow">
                  <div className="lifebox">
                    {Array.from({ length: MAX_LIFE }).map((_, i) => (
                      <svg key={i} viewBox="0 0 24 22" className={"hp" + (i < life ? " hp-on" : "")}>
                        <path d="M12,20 C2,13 1,7 5,4 C8,1.5 11,3 12,5.5 C13,3 16,1.5 19,4 C23,7 22,13 12,20 z" />
                      </svg>
                    ))}
                  </div>
                  <div className="scorebox">{score.toLocaleString()}<small>pt</small></div>
                </div>
              </div>
            </div>

            {/* --- 中段：キャラ＋出題 --- */}
            <div className="mid">
              <div className="charcol">
                <div className="bubble">{line}<i /></div>
                <div className="charbox"><Character ckey={level.char.key} mood={mood} className="char-stage" /></div>
                <div className="nameplate">{level.char.name}</div>
              </div>
              <div className="qcol">
                <div className="qlabel">この意味の英単語は？</div>
                <div className="qbox">
                  <div className="qslab" />
                  <div className={"meaning out" + (ratio < 0.25 ? " danger" : "")}>{current[1]}</div>
                </div>
              </div>
            </div>

            {/* --- 下段：解答欄 --- */}
            <div className="bottom">
              <div className={"notice notice-" + (notice.tone || "none")}>
                <em>直前の解答</em><span className="ntext">{notice.text || "—"}</span>
              </div>
              <div className="timerrow">
                <div className="timerbar">
                  <div className="timerfill" style={{ width: `${ratio * 100}%`, background: barColor }} />
                  <div className="timerticks" />
                </div>
                <div className="timernum" style={{ color: barColor }}>{left.toFixed(1)}</div>
              </div>
              {showSlots && (
                <div className="slots">
                  {current[0].split("").map((c, i) => (<span key={i} className={"slot" + (typed[i] ? " slot-on" : "")} />))}
                </div>
              )}
              {imeWarn && <div className="imewarn">半角英数で入力してください（半角/全角キー）</div>}
              <div className={"inputwrap" + (shake ? " shake" : "")}>
                <input ref={inputRef} className="inputbox" value={typed}
                  onChange={handleInput}
                  onCompositionEnd={handleInput}
                  onKeyDown={onKeyDown}
                  type="text" inputMode="latin" lang="en" enterKeyHint="done"
                  autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false"
                  style={{ imeMode: "disabled" }}
                  placeholder="英語のつづりを入力"
                  aria-label="英単語を入力" />
                <button className="enterchip" onClick={() => typed.trim() && submit()}>決定</button>
              </div>
              <div className="giveup">『q』と入力するとギブアップ</div>
            </div>

            {/* --- 判定 --- */}
            {flash && !defeat && (
              <div className={"flash " + (flash.ok ? "f-ok" : "f-ng")}>
                <div className="rays" />
                <Character ckey={level.char.key} mood={flash.ok ? "happy" : "sad"} className="char-md" />
                <div className="fhead out">{flash.ok ? "せいかい！" : flash.gaveUp ? "ギブアップ" : "時間切れ"}</div>
                <div className="fans out">{flash.answer}</div>
                <div className="fmean">{flash.meaning}</div>
                {!flash.ok && !flash.last && <div className="fnext">同じステージの別の問題へ</div>}
              </div>
            )}

            {/* --- 撃破演出 --- */}
            {defeat && (
              <div className="flash defeat">
                <div className="rays" />
                <div className="boomwrap">
                  <Character ckey={level.char.key} mood="sad" className="char-md char-blast" />
                  <span className="burst" />
                  {Array.from({ length: 10 }).map((_, i) => (
                    <span key={i} className="spark" style={{ "--a": `${i * 36}deg`, animationDelay: `${i * 0.012}s` }} />
                  ))}
                  <span className="pow out">POP!</span>
                </div>
                <div className="fhead out">{level.char.name} を たおした！</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= ステージクリア ================= */}
      {screen === "clear" && (
        <div className="stage" style={{ "--accent": theme.accent, "--accent2": theme.accent2 }}>
          <Scene theme={theme} />
          <div className="layer center-col">
            <div className="big out ok">STAGE {level.lv} CLEAR</div>
            <div className="vsrow">
              <div className="cast" style={{ "--c": theme.accent }}>
                <div className="castart"><Character ckey={level.char.key} mood="sad" className="char-sm" /></div>
                <span>{level.char.name}</span><i>クリア！</i>
              </div>
              <div className="vs out">NEXT</div>
              <div className="cast" style={{ "--c": LEVELS[lvIndex + 1].theme.accent }}>
                <div className="castart"><Character ckey={LEVELS[lvIndex + 1].char.key} mood="idle" className="char-sm" /></div>
                <span>{LEVELS[lvIndex + 1].char.name}</span>
                <i>{LEVELS[lvIndex + 1].stage}</i>
              </div>
            </div>
            <div className="board">
              スコア <b>{score.toLocaleString()}</b> ／ 残り <b>{life}</b>ライフ ／ つぎは <b>{LEVELS[lvIndex + 1].count}問</b>
            </div>
            <button className="gobtn" onClick={() => startLevel(lvIndex + 1)} autoFocus>つぎのステージへ</button>
          </div>
        </div>
      )}

      {/* ================= 終了 ================= */}
      {(screen === "over" || screen === "result") && (
        <div className="stage" style={{ "--accent": theme.accent, "--accent2": theme.accent2 }}>
          <Scene theme={theme} />
          <div className="layer center-col">
            <Character ckey={level.char.key} mood={screen === "over" ? "happy" : "sad"} className="char-sm" />
            <div className={"big out " + (screen === "over" ? "ng" : "ok")}>
              {screen === "over" ? "GAME OVER" : "ALL CLEAR!"}
            </div>
            <div className="board wide">
              <div className="stats">
                <div className="stat"><span>スコア</span><b>{score.toLocaleString()}</b></div>
                <div className="stat"><span>正解</span><b>{clearedQ}/{TOTAL_Q}</b></div>
                <div className="stat"><span>到達</span><b>STAGE {level.lv}</b></div>
                <div className="stat"><span>打ちまちがえ</span><b>{typos}</b></div>
              </div>
              <h3>復習リスト(答えられなかった単語)</h3>
              {missedList.length === 0 ? (<p>ミスなし。文句なしです。</p>) : (
                <ul className="rlist">
                  {missedList.map(([w, m]) => (<li key={w}><span className="rw">{w}</span><span className="rm">{m}</span></li>))}
                </ul>
              )}
            </div>
            <div className="btnrow">
              <button className="gobtn" onClick={startGame}>もう一度</button>
              <button className="gobtn sub" onClick={() => setScreen("title")}>タイトルへ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================ CSS ============================ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@700;800;900&family=Baloo+2:wght@700;800&display=swap');

.edg{
  --out:#2A1B45; --paper:#FFF8EA; --yellow:#FFD43B; --red:#FF4D62; --green:#4BE07A;
  --round:"M PLUS Rounded 1c","Hiragino Maru Gothic ProN","Hiragino Kaku Gothic ProN","Yu Gothic UI","Noto Sans JP",sans-serif;
  --disp:"Baloo 2","M PLUS Rounded 1c",var(--round);
  --mono:ui-monospace,SFMono-Regular,Menlo,Consolas,"Courier New",monospace;
  font-family:var(--round); color:#fff; -webkit-font-smoothing:antialiased;
}
.edg *{box-sizing:border-box;}
.stage{position:relative; width:100%; max-width:1000px; margin:0 auto; aspect-ratio:16/9;
  max-height:var(--appvh, 100vh); overflow:hidden; border-radius:14px; background:#3A2A6E;
  border:4px solid var(--out); box-shadow:0 10px 0 #00000035;}
/* 縦長の画面（タブレット縦持ち・スマホ）は高さいっぱいに */
@media (max-aspect-ratio:1/1){
  .stage{aspect-ratio:auto; height:calc(var(--appvh, 100vh) - 24px); max-height:none;}
}
/* ホーム画面から起動したとき（アプリ表示）＝親の高さいっぱい。vh は使わない */
.is-app .stage{max-width:none; width:100%; height:100%; max-height:none; aspect-ratio:auto;
  border-radius:0; border:none; box-shadow:none; margin:0;}
@media (display-mode:standalone){
  .stage{max-width:none; width:100%; height:100%; max-height:none; aspect-ratio:auto;
    border-radius:0; border:none; box-shadow:none; margin:0;}
}
@media (display-mode:fullscreen){
  .stage{max-width:none; width:100%; height:100%; max-height:none; aspect-ratio:auto;
    border-radius:0; border:none; box-shadow:none; margin:0;}
}
.is-app .edg, .is-app #root > .edg{width:100%; height:100%;}
.layer{position:absolute; inset:0; padding:14px 16px;}
.center-col{display:flex; flex-direction:column; align-items:center; justify-content:center;
  gap:11px; padding:16px; overflow:auto;}
.sticker{border:3px solid var(--out); box-shadow:0 4px 0 var(--out);}

/* ================= 背景シーン ================= */
.scene{position:absolute; inset:0; overflow:hidden;}
.sky{position:absolute; inset:0; background:linear-gradient(180deg,var(--sky1) 0%,var(--sky2) 62%);}
.sunglow{position:absolute; left:50%; top:36%; width:70%; height:46%; transform:translate(-50%,-50%);
  background:radial-gradient(closest-side,var(--glow),transparent 72%); opacity:.7;}
.hills{position:absolute; left:-6%; right:-6%; top:46%; height:20%;
  background:
    radial-gradient(closest-side at 18% 100%, #00000030 0 100%, transparent) no-repeat,
    radial-gradient(closest-side at 52% 100%, #00000038 0 100%, transparent) no-repeat,
    radial-gradient(closest-side at 84% 100%, #00000030 0 100%, transparent) no-repeat;
  background-size:44% 200%,56% 240%,40% 180%; opacity:.55;}
.floorwrap{position:absolute; left:0; right:0; bottom:0; height:46%; perspective:300px; overflow:hidden;}
.floor{position:absolute; left:-60%; right:-60%; bottom:0; height:200%;
  transform:rotateX(66deg); transform-origin:bottom center; background-color:var(--floor);
  background-image:
    repeating-linear-gradient(90deg,#ffffff2e 0 3px,transparent 3px 84px),
    repeating-linear-gradient(0deg,#ffffff24 0 3px,transparent 3px 84px);
  animation:road 4.5s linear infinite;}
@keyframes road{from{background-position:0 0}to{background-position:0 84px}}
.letters{position:absolute; inset:0; overflow:hidden;}
.letters span{position:absolute; bottom:-8%; font-family:var(--disp); font-weight:800; color:#fff;
  opacity:0; text-shadow:0 3px 0 #00000022; animation:float linear infinite;}
@keyframes float{0%{transform:translateY(0) rotate(-12deg); opacity:0}
  12%{opacity:.42} 88%{opacity:.42} 100%{transform:translateY(-560px) rotate(14deg); opacity:0}}
.vignette{position:absolute; inset:0; pointer-events:none;
  background:radial-gradient(120% 90% at 50% 45%, transparent 55%, #1A0F3388 100%);}

/* ================= キャラクター ================= */
.char{width:clamp(112px,19vw,196px); height:auto; display:block;
  filter:drop-shadow(0 8px 5px #00000035); animation:bob 2.6s ease-in-out infinite;}
@keyframes bob{0%,100%{transform:translateY(0) rotate(-1.2deg)}50%{transform:translateY(-10px) rotate(1.2deg)}}
.char-happy{animation:jump .5s cubic-bezier(.3,1.4,.5,1) 2;}
@keyframes jump{0%{transform:translateY(0) scale(1)}35%{transform:translateY(-30px) scale(1.06)}100%{transform:translateY(0) scale(1)}}
.char-sad{animation:wob .42s ease-in-out 2;}
@keyframes wob{0%,100%{transform:rotate(0) translateY(0)}25%{transform:rotate(-8deg) translateY(4px)}75%{transform:rotate(8deg) translateY(4px)}}
.char-sm{width:clamp(70px,12vw,116px);} .char-md{width:clamp(104px,16vw,150px);}
.wing-l{transform-origin:70% 60%; animation:flap 1.6s ease-in-out infinite;}
.wing-r{transform-origin:30% 60%; animation:flap 1.6s ease-in-out infinite reverse;}
@keyframes flap{0%,100%{transform:rotate(-5deg)}50%{transform:rotate(9deg)}}
.tail{transform-origin:150px 168px; animation:flap 2.4s ease-in-out infinite;}
.arm-l,.arm-r{transform-origin:center 20%; animation:flap 2.2s ease-in-out infinite;}
.blip{animation:blip 1.1s ease-in-out infinite;}
@keyframes blip{0%,100%{opacity:1}50%{opacity:.35}}
.pix{animation:pix 3.4s steps(1) infinite;}
@keyframes pix{0%,92%{height:18px}94%,100%{height:4px}}
.book{transform-origin:170px 148px; animation:bob 3s ease-in-out infinite;}

.charcol{flex:0 0 clamp(118px,23%,224px); display:flex; flex-direction:column;
  align-items:center; justify-content:flex-end; min-height:0; gap:5px;}
.charbox{flex:1; min-height:0; width:100%; display:flex; align-items:flex-end; justify-content:center;}
.char-stage{width:100%; height:100%;}
.bubble{position:relative; flex:none; max-width:100%; background:var(--paper); color:var(--out);
  font-size:clamp(10px,1.4vw,13px); font-weight:800; padding:8px 13px; border-radius:16px;
  border:3px solid var(--out); box-shadow:0 4px 0 var(--out); text-align:center;
  line-height:1.4; margin-bottom:5px; animation:popin .24s cubic-bezier(.3,1.5,.5,1);}
.bubble i{position:absolute; left:50%; bottom:-14px; margin-left:-9px; width:0; height:0;
  border:9px solid transparent; border-top-color:var(--out);}
@keyframes popin{from{transform:scale(.6) translateY(8px); opacity:0}to{transform:none; opacity:1}}
.nameplate{flex:none; background:var(--out); border:3px solid var(--paper); border-radius:999px;
  font-size:11px; font-weight:900; padding:3px 14px; box-shadow:0 4px 0 #00000040; white-space:nowrap;}

/* ================= HUD ================= */
.play{display:flex; flex-direction:column; gap:8px;}
.topbar{flex:none; display:flex; justify-content:space-between; align-items:flex-start; gap:12px; z-index:4;}
.mid{flex:1; min-height:120px; display:flex; align-items:stretch; gap:14px; z-index:3;}
.hud-tl{display:flex; flex-direction:column; gap:8px; min-width:0;}
.capsule{display:flex; background:var(--paper); border:3px solid var(--out); box-shadow:0 4px 0 var(--out);
  border-radius:999px; padding:5px; gap:3px; width:fit-content;}
.cell{width:26px; height:26px; display:flex; align-items:center; justify-content:center;
  font-family:var(--disp); font-size:13px; font-weight:800; color:#9A8FB8; background:#E7E0F0;
  border-radius:7px; transition:transform .2s; flex:none;}
.cell-done{color:#fff; text-shadow:0 1px 0 #00000040;}
.cell-now{background:var(--yellow); color:var(--out); transform:scale(1.14); box-shadow:0 0 0 3px #ffffffAA;}
.pills{display:flex; gap:8px; flex-wrap:wrap;}
.pill{border:3px solid var(--out); box-shadow:0 4px 0 var(--out); cursor:pointer; font-family:inherit;
  font-size:12px; font-weight:800; padding:5px 14px; border-radius:999px; color:var(--out); background:#E9E2F2;}
.pill-on{background:var(--yellow);}
.pill:active{transform:translateY(3px); box-shadow:0 1px 0 var(--out);}
.pill:focus-visible{outline:3px solid #fff; outline-offset:2px;}

.hud-tr{display:flex; flex-direction:column; align-items:flex-end; gap:6px; flex:none;}
.hudrow{display:flex; align-items:center; gap:8px;}
.diff{display:flex; align-items:center; gap:9px; background:var(--accent); color:#fff;
  border:3px solid var(--out); box-shadow:0 4px 0 var(--out); font-size:16px; font-weight:900;
  padding:5px 18px; border-radius:999px; letter-spacing:.06em; text-shadow:0 2px 0 #00000030; white-space:nowrap;}
.diff em{font-style:normal; font-family:var(--disp); font-size:11px; background:var(--out);
  padding:2px 8px; border-radius:999px;}
.stagename{font-size:12px; font-weight:800; color:#fff; text-shadow:0 2px 4px #00000070;}
.lifebox{display:flex; gap:5px; background:#ffffff2E; border:3px solid var(--out);
  box-shadow:0 4px 0 var(--out); border-radius:999px; padding:5px 11px;}
.hp{width:20px; height:19px; fill:#00000038; stroke:var(--out); stroke-width:1.6;}
.hp-on{fill:var(--red); filter:drop-shadow(0 2px 0 #00000030);}
.scorebox{font-family:var(--disp); font-size:16px; font-weight:800; color:#fff;
  background:#00000055; border-radius:999px; padding:3px 13px; text-shadow:0 2px 3px #00000060;}
.scorebox small{font-size:10px; opacity:.75; margin-left:3px;}

/* ================= 出題 ================= */
.qcol{flex:1; min-width:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px;}
.qlabel{flex:none; font-size:12px; font-weight:800; color:#fff; background:#00000055; border-radius:999px;
  padding:3px 14px; text-shadow:0 1px 2px #00000060;}
.qbox{position:relative; flex:1; min-height:0; width:100%; display:flex; align-items:center; justify-content:center;}
.qslab{position:absolute; left:-2%; right:-2%; top:4%; bottom:4%; border-radius:40px;
  background:radial-gradient(closest-side,#1B0F33A6,transparent 78%); filter:blur(6px);}
.meaning{position:relative; font-size:clamp(28px,7.2vw,80px); font-weight:900; color:#FFC13D;
  text-align:center; line-height:1.12; word-break:break-word;
  animation:drop .3s cubic-bezier(.3,1.4,.5,1);}
.meaning.danger{animation:pulse .5s ease-in-out infinite alternate;}
@keyframes drop{from{transform:translateY(-22px) scale(.9); opacity:0}to{transform:none; opacity:1}}
@keyframes pulse{from{color:#FFC13D}to{color:#FF6B4A}}
.out{-webkit-text-stroke:10px var(--out); paint-order:stroke fill; text-shadow:0 7px 0 #00000030;}

/* ================= 下部 ================= */
.bottom{flex:none; z-index:4;}
.notice{display:flex; align-items:center; gap:10px; justify-content:center;
  background:#1B0F33C4; border:3px solid var(--out); border-radius:999px; padding:5px 18px;
  font-size:clamp(13px,2.1vw,20px); font-weight:900; margin:0 auto 8px; width:fit-content;
  max-width:100%; box-shadow:0 4px 0 #00000035;}
.notice em{font-style:normal; font-size:10px; font-weight:800; color:#C9BEEA;
  background:#00000055; border-radius:999px; padding:2px 9px; flex:none;}
.ntext{overflow:hidden; text-overflow:ellipsis; white-space:nowrap;}
.notice-none{color:#ffffff70;} .notice-ok{color:var(--green);}
.notice-ng{color:#FF9AA8;} .notice-warn{color:var(--yellow);}
.timerrow{display:flex; align-items:center; gap:10px; margin-bottom:7px;}
.timerbar{position:relative; flex:1; height:16px; background:#1B0F33AA; border:3px solid var(--out);
  border-radius:999px; overflow:hidden; box-shadow:0 4px 0 #00000030;}
.timerfill{height:100%; border-radius:999px; box-shadow:inset 0 -4px 0 #00000025, inset 0 4px 0 #ffffff40;}
.timerticks{position:absolute; inset:0; background:repeating-linear-gradient(90deg,transparent 0 44px,#00000022 44px 46px);}
.timernum{font-family:var(--disp); font-size:19px; font-weight:800; width:52px; text-align:right;
  text-shadow:0 2px 0 var(--out);}
.slots{display:flex; gap:5px; justify-content:center; margin-bottom:7px; flex-wrap:wrap;}
.slot{width:24px; height:6px; border-radius:3px; background:#ffffff60; border:1px solid #00000030;}
.slot-on{background:var(--yellow);}
.inputwrap{position:relative; display:flex; align-items:center;}
.inputbox{flex:1; width:100%; min-height:56px; text-align:center; background:var(--paper);
  border:4px solid var(--out); border-radius:14px; box-shadow:0 5px 0 var(--out);
  padding:8px 86px 8px 18px; font-family:var(--mono); font-size:clamp(18px,3.4vw,30px);
  font-weight:700; color:var(--out); letter-spacing:.05em; caret-color:var(--out);
  ime-mode:disabled; -webkit-appearance:none; appearance:none; outline:none;}
.inputbox::placeholder{color:#B6A9C9; font-size:15px; font-family:var(--round); letter-spacing:0;}
.inputbox:focus{border-color:var(--accent); box-shadow:0 5px 0 var(--out),0 0 0 4px #ffffff70;}
.enterchip{position:absolute; right:12px; font-family:inherit; font-size:14px; font-weight:900;
  color:#fff; background:var(--accent); border:3px solid var(--out); border-radius:10px;
  padding:6px 13px; cursor:pointer; box-shadow:0 3px 0 var(--out); touch-action:manipulation;}
.enterchip:active{transform:translateY(2px); box-shadow:0 1px 0 var(--out);}
.imewarn{margin:0 auto 6px; width:fit-content; max-width:100%; background:var(--red); color:#fff;
  border:3px solid var(--out); border-radius:999px; font-size:12px; font-weight:900;
  padding:4px 14px; box-shadow:0 4px 0 var(--out); animation:popin .2s;}
.shake{animation:shake .3s;}
@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-10px)}75%{transform:translateX(10px)}}
.giveup{text-align:right; font-size:11px; font-weight:800; color:#ffffffD0; margin-top:4px; text-shadow:0 2px 3px #00000070;}
.note{font-size:11px; font-weight:700; color:#ffffffC0; margin:0; z-index:2; text-shadow:0 1px 2px #00000060;}

/* ================= 判定 ================= */
.flash{position:absolute; inset:0; z-index:6; display:flex; flex-direction:column;
  align-items:center; justify-content:center; gap:5px; background:#170C2ED9; animation:fade .16s;}
@keyframes fade{from{opacity:0}to{opacity:1}}
.rays{position:absolute; inset:-20%; opacity:.22;
  background:repeating-conic-gradient(from 0deg at 50% 50%, #fff 0deg 7deg, transparent 7deg 14deg);
  animation:spin 14s linear infinite;}
@keyframes spin{to{transform:rotate(360deg)}}
.fhead{font-size:clamp(26px,6.4vw,58px); font-weight:900; z-index:1;}
.f-ok .fhead{color:var(--yellow);} .f-ng .fhead{color:#FF8090;}
.fans{font-family:var(--disp); font-size:clamp(26px,5.6vw,54px); font-weight:800; color:#fff; z-index:1;
  -webkit-text-stroke:8px var(--out); paint-order:stroke fill; letter-spacing:.02em;}
.fmean{font-size:15px; font-weight:800; color:#EFE9FF; z-index:1;}
.fnext{margin-top:8px; font-size:13px; font-weight:800; color:var(--yellow); z-index:1;}

/* ================= 撃破演出 ================= */
.defeat{gap:14px;}
.boomwrap{position:relative; z-index:1; display:flex; align-items:center; justify-content:center;}
.char-blast{animation:blast 1.1s cubic-bezier(.4,0,.6,1) forwards;}
@keyframes blast{
  0%{transform:scale(1) rotate(0); opacity:1}
  18%{transform:scale(1.22) rotate(-8deg)}
  34%{transform:scale(.9) rotate(9deg)}
  55%{transform:scale(1.05) rotate(-6deg); opacity:1}
  100%{transform:scale(.2) rotate(30deg); opacity:0}}
.burst{position:absolute; width:56px; height:56px; border-radius:50%; background:#FFF3C4;
  box-shadow:0 0 0 6px #FFD43B, 0 0 0 12px #FF9A3Cbb; animation:burst .9s ease-out .35s both;}
@keyframes burst{0%{transform:scale(.1); opacity:0}
  25%{transform:scale(2.6); opacity:1} 100%{transform:scale(5.4); opacity:0}}
.spark{position:absolute; width:16px; height:16px; border-radius:50%; background:var(--yellow);
  border:3px solid var(--out); animation:spark .85s ease-out .4s both;
  transform:rotate(var(--a)) translateY(0);}
@keyframes spark{0%{transform:rotate(var(--a)) translateY(0) scale(.3); opacity:0}
  25%{opacity:1} 100%{transform:rotate(var(--a)) translateY(-135px) scale(.85); opacity:0}}
.pow{position:absolute; font-family:var(--disp); font-size:clamp(26px,5vw,46px); font-weight:800;
  color:#FF6B6B; animation:pow .8s cubic-bezier(.3,1.5,.5,1) .38s both;}
@keyframes pow{0%{transform:scale(.2) rotate(-18deg); opacity:0}
  40%{transform:scale(1.15) rotate(-8deg); opacity:1}
  100%{transform:scale(1) rotate(-8deg) translateY(-14px); opacity:0}}
.defeat .fhead{animation:drop .4s cubic-bezier(.3,1.4,.5,1) .8s both; color:var(--yellow);}

/* ================= タイトル/結果 ================= */
.logo{display:flex; align-items:baseline; gap:5px; z-index:2;}
.logo-jp{font-size:clamp(30px,7vw,60px); font-weight:900; color:#fff;}
.logo-go{font-family:var(--disp); font-size:clamp(38px,8.4vw,74px); font-weight:800; color:#FFC13D; font-style:italic;}
.castrow{display:flex; gap:9px; flex-wrap:wrap; justify-content:center; z-index:2;}
.cast{display:flex; flex-direction:column; align-items:center; gap:1px; background:#FFF8EAF0;
  border:3px solid var(--out); box-shadow:0 5px 0 var(--out); border-radius:14px; padding:7px 10px 8px;
  min-width:104px; color:var(--out);}
.castart{height:76px; display:flex; align-items:flex-end; justify-content:center; overflow:visible;}
.castart .char{height:100%; width:auto;}
.castart .char{animation-duration:3.4s;}
.cast b{font-family:var(--disp); font-size:10px; color:#fff; background:var(--c);
  border-radius:999px; padding:1px 9px; letter-spacing:.06em;}
.cast span{font-size:12px; font-weight:900;}
.cast i{font-size:10px; font-style:normal; opacity:.7;}
.vsrow{display:flex; align-items:center; gap:16px; z-index:2;}
.vs{font-family:var(--disp); font-size:22px; font-weight:800; color:var(--yellow);}
.big{font-family:var(--disp); font-size:clamp(28px,6.6vw,60px); font-weight:800; z-index:2; text-align:center;}
.big.ok{color:var(--yellow);} .big.ng{color:#FF8090;}
.board{background:#1B0F33D8; border:3px solid var(--out); box-shadow:0 5px 0 #00000035; border-radius:14px;
  padding:11px 18px; max-width:640px; width:100%; text-align:center; font-size:13px; font-weight:700;
  line-height:1.8; z-index:2;}
.board.wide{overflow:visible;}
.board b{color:var(--yellow);}
.stats{display:flex; gap:8px; justify-content:center; flex-wrap:wrap; margin-bottom:11px;}
.stat{background:#ffffff18; border:2px solid #ffffff40; border-radius:10px; padding:6px 15px;}
.stat span{display:block; font-size:10px; opacity:.8;}
.stat b{font-family:var(--disp); font-size:18px; color:var(--yellow);}
.board h3{font-size:12px; margin:0 0 8px; color:#C9BEEA; letter-spacing:.08em;}
.rlist{list-style:none; padding:0; margin:0; display:grid; grid-template-columns:repeat(auto-fill,minmax(190px,1fr)); gap:5px;}
.rlist li{display:flex; justify-content:space-between; gap:8px; background:#ffffff16;
  border-left:4px solid var(--red); border-radius:6px; padding:5px 10px; font-size:12px;}
.rw{font-family:var(--mono); font-weight:800;} .rm{opacity:.82;}
.btnrow{display:flex; gap:10px; flex-wrap:wrap; justify-content:center; z-index:2;}
.gobtn{font-family:inherit; font-size:18px; font-weight:900; color:var(--out); background:var(--yellow);
  border:4px solid var(--out); border-radius:999px; padding:10px 38px; cursor:pointer;
  box-shadow:0 6px 0 var(--out); z-index:2;}
.gobtn:active{transform:translateY(4px); box-shadow:0 2px 0 var(--out);}
.gobtn:focus-visible{outline:3px solid #fff; outline-offset:3px;}
.gobtn.sub{background:#E9E2F2;}

/* ================= 端末互換・全画面 ================= */
.edg{touch-action:manipulation; -webkit-tap-highlight-color:transparent; width:100%; height:100%;
  display:flex; align-items:center; justify-content:center;}
.edg button{touch-action:manipulation;}
.edg:fullscreen{display:flex; align-items:center; justify-content:center;
  width:100vw; height:100vh; background:#150C2B; padding:0;}
.edg:fullscreen .stage{max-width:none; width:100%; height:100%; aspect-ratio:auto;
  max-height:none; border-radius:0; border:none; box-shadow:none;}
.edg:-webkit-full-screen{display:flex; align-items:center; justify-content:center;
  width:100vw; height:100vh; background:#150C2B; padding:0;}
.edg:-webkit-full-screen .stage{max-width:none; width:100%; height:100%; aspect-ratio:auto;
  max-height:none; border-radius:0; border:none; box-shadow:none;}

/* タブレット */
@media (max-width:900px){
  .meaning{font-size:clamp(28px,6.6vw,64px);}
  .charcol{flex:0 0 clamp(104px,20%,168px);}
  .diff{font-size:14px; padding:4px 14px;}
  .cell{width:23px; height:23px; font-size:12px;}
}
/* 横向きで高さが足りない端末 */
@media (max-height:520px) and (orientation:landscape){
  .stage{height:calc(var(--appvh, 100vh) - 20px); aspect-ratio:auto; max-height:none;}
  .qlabel{display:none;}
  .bubble{display:none;}
  .giveup{display:none;}
  .meaning{font-size:clamp(24px,6vw,52px);}
  .inputbox{min-height:44px;}
}
@media (max-width:640px){
  .layer{padding:10px 11px;}
  .cell{width:19px; height:19px; font-size:10px;}
  .out{-webkit-text-stroke-width:6px;}
  .topbar{flex-direction:column; align-items:stretch; gap:7px;}
  .hud-tr{flex-direction:row; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:6px;}
  .charcol{flex:0 0 92px;}
  .bubble{font-size:10px; padding:6px 9px;}
  .nameplate{font-size:10px; padding:2px 9px;}
  .diff{font-size:12px; padding:4px 12px;}
  .hp{width:15px; height:14px;}
  .castart{height:56px;}
  .inputbox{min-height:50px; padding:6px 76px 6px 12px; font-size:18px;}
  .enterchip{font-size:13px; padding:5px 10px;}
  .pills{gap:6px;}
  .pill{font-size:11px; padding:4px 10px;}
  .btnrow{width:100%;}
  .gobtn{font-size:16px; padding:9px 24px;}
}
@media (prefers-reduced-motion:reduce){ .edg *{animation:none !important;} }
`;


/* ---- マウント ---- */
ReactDOM.createRoot(document.getElementById("root")).render(<EnglishDeGo />);
