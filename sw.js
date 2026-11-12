const CACHE_NAME = 'lucroapp-v3'; // Mude a versão sempre que alterar CSS/JS/HTML

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
  './js/modules/cofrinho.js',
  './js/modules/vehicles.js',
  './js/modules/fuel.js',
  './js/modules/reports.js',
  './js/modules/backup.js',
  './js/utils/money.js',
  './js/utils/validation.js',
  './js/utils/dates.js'
];

// Instalação: baixa os novos arquivos para o cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  // Força o novo Service Worker a se tornar ativo imediatamente
  self.skipWaiting();
});

// Ativação: apaga caches antigos (ex: lucroapp-v1)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] Apagando cache antigo:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim()) // Assume o controle das abas abertas imediatamente
  );
});

// Interceptação de requisições (Estratégia Network First para HTML / Cache First para assets)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Atualiza o cache dinamicamente se a rede responder com sucesso
        if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        }
        return networkResponse;
      })
      .catch(() => {
        // Se estiver offline, entrega a versão em cache
        return caches.match(event.request);
      })
  );
});
