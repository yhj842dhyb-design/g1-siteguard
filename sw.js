// G1 SiteGuard — offline cache for the hosted link. A no-op wherever service workers aren't
// available (a local file:// copy of the standalone HTML, or an older browser) — the app runs
// fine there regardless, it just needs a connection to load. On this hosted https page it
// precaches the page itself (everything the app needs — including the PDF-export libraries —
// is inlined in that one document, so caching it is enough for full offline use) and serves
// it from cache on every later visit, falling back to a fresh network copy when one is reachable.
const CACHE_NAME = 'g1-siteguard-v76';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.add(self.registration.scope))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(
      names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request).then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
