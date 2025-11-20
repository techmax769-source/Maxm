const CACHE = 'maxmovies-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/css/main.css',
  '/css/components.css',
  '/js/app.js',
  '/mock/search.json'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener('activate', e => self.clients.claim());

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // network-first for API requests, fallback to cache
  if(url.pathname.startsWith('/api/') || url.pathname.endsWith('.m3u8')){
    e.respondWith(fetch(e.request).catch(()=> caches.match(e.request)));
    return;
  }
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
