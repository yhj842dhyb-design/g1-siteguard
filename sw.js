// G1 SiteGuard — offline support for the hosted link. A no-op wherever service workers aren't
// available (a local file:// copy, or an older browser).
//
// Network-first for the app page itself: whenever there is a connection the agent always gets
// the newest published version (an installed iPhone/Android app used to keep showing an old
// cached copy after an update). The cached copy is only the offline fallback.
const CACHE_NAME = 'g1-siteguard-v95';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.add(new Request(self.registration.scope, { cache: 'reload' })))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const isPage = req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('.html');
  if (isPage) {
    // network first (bypassing the HTTP cache), fall back to the cached page offline
    event.respondWith(
      fetch(req, { cache: 'no-store' })
        .then((res) => {
          if (res && res.ok) { const copy = res.clone(); caches.open(CACHE_NAME).then((c) => c.put(self.registration.scope, copy)); }
          return res;
        })
        .catch(() => caches.match(self.registration.scope).then((r) => r || caches.match(req)))
    );
    return;
  }
  // icons / manifest: cache first, refresh in the background
  event.respondWith(
    caches.match(req).then((cached) => {
      const net = fetch(req).then((res) => {
        if (res && res.ok) { const copy = res.clone(); caches.open(CACHE_NAME).then((c) => c.put(req, copy)); }
        return res;
      }).catch(() => cached);
      return cached || net;
    })
  );
});
