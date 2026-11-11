const CACHE_NAME = 'lucroapp-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/variables.css',
  './css/base.css',
  './css/layout.css',
  './css/components.css',
  './css/pages.css',
  './js/app.js',
  './js/router.js',
  './js/core/calculations.js',
  './js/core/traffic-light.js',
  './js/database/database.js',
  './js/database/repositories.js',
  './js/utils/money.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request))
  );
});
