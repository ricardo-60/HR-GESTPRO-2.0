const CACHE_NAME = 'hr-gestpro-v2.1.6';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/manifest.webmanifest',
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    // Ignorar pedidos do Supabase (dados dinâmicos via SDK)
    if (event.request.url.includes('supabase.co')) return;

    // Estratégia: Stale-While-Revalidate para Assets Locais
    if (event.request.url.startsWith(self.location.origin) && event.request.method === 'GET') {
        event.respondWith(
            caches.open(CACHE_NAME).then((cache) => {
                return cache.match(event.request).then((cachedResponse) => {
                    const fetchPromise = fetch(event.request).then((networkResponse) => {
                        // Atualizar cache com a nova versão
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });

                    // Retorna cache se existir, senão espera pela rede
                    return cachedResponse || fetchPromise;
                });
            })
        );
        return;
    }

    // Default: Cache First fallthrough
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
