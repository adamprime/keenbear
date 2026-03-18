const CACHE_NAME = 'keenbear-v5';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/js/app.js',
  '/js/ui.js',
  '/js/cleaners.js',
  '/js/history.js',
  '/js/find-replace.js',
  '/keenbear.png',
  '/og-image.png',
  '/manifest.json',
  '/robots.txt',
  '/llms.txt',
  '/sitemap.xml',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
