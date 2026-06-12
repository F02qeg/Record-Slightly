const CACHE_NAME = 'qingji-v2';
const PRECACHE = [
  './',
  './index.html'
];

// 允许“网络回退”的外部域名（FA 图标字体）
const ALLOWED_ORIGINS = [
  'cdnjs.cloudflare.com'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // 1) 本地资源：cache-first（保证离线可开）
  if (!url.protocol.startsWith('http')) return;
  if (url.origin === location.origin) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async cache => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        try {
          const resp = await fetch(event.request);
          if (resp && resp.status === 200) {
            cache.put(event.request, resp.clone());
          }
          return resp;
        } catch (e) {
          return new Response('离线不可用', { status: 503 });
        }
      })
    );
    return;
  }

  // 2) 外链资源（FA）：network-first（不硬塞进 cache，避免 opaque response 坑）
  if (ALLOWED_ORIGINS.some(o => url.hostname.includes(o))) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // 3) 其它外链：直接 network
});