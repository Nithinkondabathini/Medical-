/* Odisha Health Assistant SW — versioned cache, cleanup, SWR */
const CACHE_NAME = 'health-cache-v3';
const CORE_ASSETS = [
  './',
  './index.html',
  './register.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => {
      if (k !== CACHE_NAME) return caches.delete(k);
    }));
    await self.clients.claim();
  })());
});

/* Stale-while-revalidate strategy for all GET requests */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req);
    const networkFetch = fetch(req).then((res) => {
      if (res && res.status === 200 && res.type === 'basic') {
        cache.put(req, res.clone());
      }
      return res;
    }).catch(() => null);

    return cached || networkFetch || (async () => {
      // Fallback: if HTML request fails, serve index for basic offline UX
      if (req.headers.get('accept')?.includes('text/html')) {
        return cache.match('./index.html');
      }
      // Otherwise a minimal Response
      return new Response('Offline', { status: 503, statusText: 'Offline' });
    })();
  })());
});
