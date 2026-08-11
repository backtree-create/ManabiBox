/* まなびの基板 — 接続設定
   Apps Script をデプロイして出てきた URL と合言葉をここに入れます。
   endpoint が空のままでも、記録は端末の中だけに残る形で動きます。 */
window.MANABI_CONFIG = {

  /* Apps Script のウェブアプリURL（.../exec で終わるもの） */
  endpoint: '',

  /* code.gs の WRITE_TOKEN と同じ文字列 */
  token: 'manabi-write-2026',

  /* ランキングを何位まで出すか */
  rankLimit: 20,

  /* ハブ（この一覧画面）の場所。ゲーム画面に出る「もどる」ボタンの行き先になります */
  hubUrl: 'https://backtree-create.github.io/ManabiBox/',

  /* もどるボタンを出さないときは false */
  backLink: true
};
