const CACHE_VERSION = 'v7';
const SHELL_CACHE = `keenbear-shell-${CACHE_VERSION}`;
const IMAGE_CACHE = `keenbear-images-${CACHE_VERSION}`;
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/js/app.js',
  '/js/ui.js',
  '/js/cleaners.js',
  '/js/history.js',
  '/js/find-replace.js',
  '/manifest.json',
  '/robots.txt',
  '/llms.txt',
  '/sitemap.xml',
];
const IMAGE_ASSETS = [
  '/keenbear.png',
  '/og-image.png',
];
const ACTIVE_CACHES = new Set([SHELL_CACHE, IMAGE_CACHE]);
const SHELL_DESTINATIONS = new Set(['document', 'script', 'style', 'manifest']);

function cacheKeyFor(request) {
  return new URL(request.url).pathname;
}

function isShellRequest(request, url) {
  return request.mode === 'navigate'
    || SHELL_DESTINATIONS.has(request.destination)
    || SHELL_ASSETS.includes(url.pathname);
}

function isImageRequest(request, url) {
  return request.destination === 'image'
    || IMAGE_ASSETS.includes(url.pathname)
    || /\.(?:png|jpe?g|svg|webp|ico)$/i.test(url.pathname);
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(SHELL_CACHE);
  const key = cacheKeyFor(request);
  const cached = await cache.match(key);
  const networkPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(key, response.clone());
    }
    return response;
  }).catch(() => null);

  if (cached) {
    return cached;
  }

  return await networkPromise || new Response('Offline', { status: 503, statusText: 'Offline' });
}

async function cacheFirst(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const key = cacheKeyFor(request);
  const cached = await cache.match(key);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    cache.put(key, response.clone());
  }
  return response;
}

self.addEventListener('install', (e) => {
  e.waitUntil(Promise.all([
    caches.open(SHELL_CACHE).then(cache => cache.addAll(SHELL_ASSETS)),
    caches.open(IMAGE_CACHE).then(cache => cache.addAll(IMAGE_ASSETS)),
  ]));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => !ACTIVE_CACHES.has(k)).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('message', (e) => {
  if (e.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  if (isShellRequest(e.request, url)) {
    e.respondWith(staleWhileRevalidate(e.request));
    return;
  }

  if (isImageRequest(e.request, url)) {
    e.respondWith(cacheFirst(e.request));
  }
});
