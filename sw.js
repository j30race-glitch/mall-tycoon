/* Mall Tycoon service worker. Registered by index.html only when served over http(s) (never on file://).
   Precaches the app shell on install, then serves those files cache-first (network fallback for anything else).
   Only the files listed in APP_FILES are ever cached: never index.txt, the index.v*.html / *.bak backups or other pages.
   Bump CACHE_VERSION whenever index.html, manifest.json or the icons change so players get the new version. */
const CACHE_VERSION = 'mall-tycoon-v2';
const APP_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon-180.png'
];
const SHELL = new Set(APP_FILES.map(f => new URL(f, self.location).href));

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(APP_FILES.map(f => new Request(f, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('mall-tycoon-') && k !== CACHE_VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  url.search = ''; url.hash = '';
  if (SHELL.has(url.href)) {
    // app shell: cache first, network fallback
    event.respondWith(caches.open(CACHE_VERSION).then(c => c.match(url.href)).then(hit => hit || fetch(req)));
  } else if (req.mode === 'navigate') {
    // other pages in scope (e.g. index.txt, mall_tycoon_app.html): network, and offline fall back to the cached game
    event.respondWith(fetch(req).catch(() => caches.open(CACHE_VERSION).then(c => c.match(new URL('./index.html', self.location).href))));
  }
  // everything else goes straight to the network and is never cached
});
