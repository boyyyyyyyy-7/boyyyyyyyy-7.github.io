// ─── Brayden is Tall Games — Service Worker ──────────────────────────────────
// Strategy:
//   • Shell assets (JS, CSS, icons, fonts)  → Cache-first  (instant repeat loads)
//   • HTML pages                             → Network-first, fall back to cache
// This is especially important on school WiFi and low-end Chromebooks.
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_NAME = 'bitg-v4';
const FONT_CACHE = 'bitg-fonts-v1'; // separate so we never bust font caches

// Static shell — cached on install so the site loads offline after first visit
const PRECACHE = [
  '/',
  '/index.html',
  '/background-loader.js',
  '/settings-panel.js',
  '/manifest.json',
  '/img/flame-icon.png',
];

// ── Install: pre-cache shell ────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())  // activate immediately
  );
});

// ── Activate: delete old caches ─────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== FONT_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())  // take control of open tabs immediately
  );
});

// ── Fetch: route every request through the right strategy ───────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // External game iframes: never intercept (they have their own origins)
  if (url.origin !== self.location.origin &&
      !url.hostname.includes('fonts.googleapis.com') &&
      !url.hostname.includes('fonts.gstatic.com')) {
    return;
  }

  // Google Fonts: cache-first with a dedicated long-lived cache
  if (url.hostname.includes('fonts.googleapis.com') ||
      url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.open(FONT_CACHE).then(cache =>
        cache.match(request).then(cached => {
          if (cached) return cached;
          return fetch(request).then(response => {
            if (response && (response.status === 200 || response.type === 'opaque')) {
              cache.put(request, response.clone());
            }
            return response;
          });
        })
      )
    );
    return;
  }

  // JS / CSS / images / manifest → cache-first
  if (
    request.destination === 'script'   ||
    request.destination === 'style'    ||
    request.destination === 'image'    ||
    request.destination === 'manifest' ||
    url.pathname.endsWith('.js')       ||
    url.pathname.endsWith('.css')      ||
    url.pathname.endsWith('.png')      ||
    url.pathname.endsWith('.ico')      ||
    url.pathname.endsWith('.json')
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(request).then(cached => {
          if (cached) return cached;
          return fetch(request).then(response => {
            if (response && response.status === 200) {
              cache.put(request, response.clone());
            }
            return response;
          });
        })
      )
    );
    return;
  }

  // HTML pages → network-first, fall back to cache on flaky school WiFi
  event.respondWith(
    caches.open(CACHE_NAME).then(cache =>
      fetch(request)
        .then(response => {
          if (response && response.status === 200) {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => cache.match(request))
    )
  );
});
