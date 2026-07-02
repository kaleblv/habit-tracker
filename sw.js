/* =============================================
   HÁBITOS — SERVICE WORKER
   Cache-first strategy · offline-ready
   ============================================= */

const CACHE = 'habitos-v3';

const PRECACHE = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.json',
  '/icon.svg',
];

// Install: pre-cache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch: cache-first for same-origin + Google Fonts, network-only for rest
self.addEventListener('fetch', event => {
  const url = event.request.url;
  const isLocal  = url.startsWith(self.location.origin);
  const isFonts  = url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com');

  if (!isLocal && !isFonts) return;

  event.respondWith(
    caches.open(CACHE).then(cache =>
      cache.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response && response.status === 200 && response.type !== 'opaque') {
            cache.put(event.request, response.clone());
          }
          return response;
        });
      })
    )
  );
});
