const CACHE_NAME = 'element-master-3d-v7'; // ManabiBox の games/ に統合。ハブ共通スクリプトを通信優先に変更
// v6: // 2人対戦モード(同一端末)を廃止しオンライン対戦に一本化したためバージョンを上げる

// 事前キャッシュするのは「同一オリジン（自分のリポジトリ内）」のファイルのみに限定する。
// three.js のような外部CDNのURLをここに混ぜると、cache.addAll() は
// 「1つでも取得に失敗したら全体が失敗する」という仕様のため、
// 外部CDN側の一時的な失敗やCORSの都合でService Worker自体の
// インストールが丸ごと失敗し、PWAとして正しくインストールできなく
// なる原因になっていた。外部CDNは下のfetchイベント側で
// 実際に読み込まれたタイミングで自動的にキャッシュする。
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
  './apple-touch-icon.png',
  './favicon-32.png'
];

// インストール時にアプリ本体（HTML/アイコン）をキャッシュしておく。
// 1ファイルごとに個別にcatchすることで、万が一どれか1つの取得に
// 失敗してもService Worker全体のインストールが失敗しないようにする。
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        APP_SHELL.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('[service-worker] precache failed:', url, err);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// 古いバージョンのキャッシュを削除
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// キャッシュ優先、キャッシュになければネットワークから取得して追加キャッシュ
// （three.js CDNなどの外部リソースもここで初回アクセス時にキャッシュされる）
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // ハブ共通スクリプト（../../config.js など）は接続先の変更をすぐ反映したいので
  // 通信優先にし、切れているときだけキャッシュを使う
  const path = new URL(event.request.url).pathname;
  if (/\/(config|hub-progress|manabi-connect)\.js$/.test(path)) {
    event.respondWith(
      fetch(event.request).then((response) => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        if (response && (response.status === 200 || response.type === 'opaque')) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
    })
  );
});
