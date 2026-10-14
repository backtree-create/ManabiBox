/* 観測塔 ― オフライン用のキャッシュ
   校内の回線が細くても、二度目以降は通信なしで起動できるようにする */
const CACHE = "science-quest-v4";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./favicon.ico"
];

self.addEventListener("install", e=>{
  e.waitUntil(
    caches.open(CACHE)
      .then(c=>Promise.allSettled(ASSETS.map(u=>c.add(u))))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener("activate", e=>{
  e.waitUntil(
    caches.keys()
      .then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

/* 本体は「通信を試し、失敗したらキャッシュ」。
   書体などの外部資源は「キャッシュ優先」で通信を減らす */
self.addEventListener("fetch", e=>{
  const req = e.request;
  if(req.method !== "GET") return;
  const sameOrigin = new URL(req.url).origin === location.origin;

  const hubScript = sameOrigin && /\/(config|hub-progress|manabi-connect)\.js$/.test(new URL(req.url).pathname);
  if(sameOrigin && (req.mode === "navigate" || hubScript)){
    e.respondWith(
      fetch(req).then(res=>{
        const copy = res.clone();
        caches.open(CACHE).then(c=>c.put(req, copy));
        return res;
      }).catch(()=>caches.match(req).then(r=>r||(hubScript?undefined:caches.match("./index.html"))))
    );
    return;
  }
  e.respondWith(
    caches.match(req).then(hit=>{
      if(hit) return hit;
      return fetch(req).then(res=>{
        if(res && (res.ok || res.type === "opaque")){
          const copy = res.clone();
          caches.open(CACHE).then(c=>c.put(req, copy));
        }
        return res;
      }).catch(()=>hit);
    })
  );
});
