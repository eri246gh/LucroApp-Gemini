const CACHE_NAME = 'lucroapp-v7';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/app.css',
  './js/app.js',
  './js/router.js',
  './js/core/calculations.js',
  './js/core/traffic-light.js',
  './js/database/database.js',
  './js/database/repositories.js',
  './js/modules/dashboard.js',
  './js/modules/records.js',
  './js/modules/vehicles.js',
  './js/modules/fuel.js',
  './js/modules/reports.js',
  './js/modules/backup.js',
  './js/utils/money.js',
  './js/utils/validation.js',
  './js/utils/dates.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
