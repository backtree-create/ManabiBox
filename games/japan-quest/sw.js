/* 日本一周クエスト サービスワーカー v3
   方針を変更：本体（HTML・JS）は「通信を先に試し、だめなら保存済みを使う」方式にした。
   これによりファイルを更新すれば、次に開いたときに必ず新しい版が表示される。
   通信がないときだけ保存済みで動くので、オフラインで遊べる点は変わらない。 */
const CACHE = "nihon-isshu-quest-v10";
const ASSETS = [
  "./",
  "./index.html",
  "./questions.js",
  "./manifest.webmanifest",
  "./icon-192-v2.png",
  "./icon-512-v2.png",
  "./icon-512-maskable-v2.png",
  "./apple-touch-icon-v2.png",
  "./apple-touch-icon-167-v2.png",
  "./favicon-32-v2.png",
  "./favicon.ico",
  "./apple-touch-icon.png",
  "./apple-touch-icon-precomposed.png"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(ASSETS.map(u => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* 画面から「全部消して入れ直す」と指示されたとき */
self.addEventListener("message", e => {
  if (e.data === "clear-all") {
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.matchAll())
      .then(cs => cs.forEach(c => c.navigate(c.url)));
  }
});

function fresh(req) {
  return fetch(req).then(res => {
    const copy = res.clone();
    caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
    return res;
  });
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const sameSite = url.origin === self.location.origin;

  /* 画面そのもの・本体のコード・設定ファイルは、まず最新を取りに行く */
  if (req.mode === "navigate" ||
      (sameSite && /\.(html|js|webmanifest|json)$/.test(url.pathname))) {
    e.respondWith(
      fresh(req).catch(() => caches.match(req).then(hit => hit || caches.match("./index.html")))
    );
    return;
  }

  /* 画像・フォント・地図データは保存済みを優先して素早く表示する */
  e.respondWith(caches.match(req).then(hit => hit || fresh(req).catch(() => hit)));
});
