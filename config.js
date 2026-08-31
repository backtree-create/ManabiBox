/* まなびの基板 — 接続設定
   Apps Script をデプロイして出てきた URL と合言葉をここに入れます。
   endpoint が空のままでも、記録は端末の中だけに残る形で動きます。 */
window.MANABI_CONFIG = {

  /* Apps Script のウェブアプリURL（.../exec で終わるもの） */
  endpoint: 'https://script.google.com/macros/s/AKfycbyKfjthpn93zNaVGmR6_5DNgv1PddrZuXcEFEeDIp7SxL-BO6SDEVPq6UMl4-bFP19u/exec',

  /* code.gs の WRITE_TOKEN と同じ文字列 */
  token: 'mb-w-lylsofsou5l4kcf7xp',

  /* ランキングを何位まで出すか */
  rankLimit: 20,

  /* ハブ（この一覧画面）の場所。
     空のままにしておくと、読み込んだファイルの位置から自動で判断します。
     リポジトリ名を変えても直す必要がないので、空を推奨します。 */
  hubUrl: '',

  /* もどるボタンを出さないときは false */
  backLink: true
};
