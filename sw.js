const CACHE = 'heroes-v1';
const PRECACHE = [
  '/',
  '/index.html',
  '/assets/css/style.css',
  '/assets/css/heroes-scoreboard.css',
  '/assets/js/app.js',
  '/assets/js/heroes-scoreboard.js',
  '/assets/img/heroes-logo.jpg',
  '/assets/img/icon-192.png',
  '/assets/img/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => clients.claim())
  );
});

// Network-first, fall back to cache
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // Don't intercept Supabase or external API calls
  if (e.request.url.includes('supabase.co') || e.request.url.includes('api.groupme.com')) return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
