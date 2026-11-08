/** AUTAI ZEN AOD 2.0 — Service Worker: stale-while-revalidate */
var CACHE_NAME = 'autai-zen-v6';
var ASSETS = ['./', 'index.html', 'style.css', 'script.js', 'manifest.json', 'Nevera-Regular.otf', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) { return cache.addAll(ASSETS); })
  );
  // First install must activate so offline works immediately;
  // updates wait for the Update banner / SKIP_WAITING message.
  if (!self.registration.active) self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE_NAME) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;
  /* Network-first for navigation, stale-while-revalidate for assets */
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(function (res) {
          var copy = res.clone();
          caches.open(CACHE_NAME).then(function (c) { c.put(event.request, copy); });
          return res;
        })
        .catch(function () { return caches.match('index.html'); })
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      var net = fetch(event.request).then(function (res) {
        if (res && res.status === 200) {
          var copy = res.clone();
          caches.open(CACHE_NAME).then(function (c) { c.put(event.request, copy); });
        }
        return res;
      }).catch(function () { return cached; });
      return cached || net;
    })
  );
});
