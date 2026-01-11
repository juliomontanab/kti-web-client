// Incrementa esta versión cada vez que hagas cambios
const VERSION = '2.0.0';
const CACHE_NAME = `trading-analysis-v${VERSION}`;
const urlsToCache = [
    '/',
    '/index.html',
    '/app.js',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png'
];

// Install: cachea los archivos
self.addEventListener('install', event => {
    console.log('[SW] Installing version:', VERSION);
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('[SW] Cache opened');
            return cache.addAll(urlsToCache);
        }).then(() => {
            // Fuerza la activación inmediata del nuevo service worker
            return self.skipWaiting();
        })
    );
});

// Activate: limpia cachés antiguos
self.addEventListener('activate', event => {
    console.log('[SW] Activating version:', VERSION);
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            // Toma control de todas las páginas inmediatamente
            return self.clients.claim();
        })
    );
});

// Fetch: estrategia Network First para archivos HTML/JS/CSS, Cache First para otros
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Solo cachear peticiones del mismo origen
    if (url.origin !== location.origin) {
        return;
    }

    // Network First para HTML, JS, CSS (siempre trae la última versión)
    if (event.request.url.includes('.html') ||
        event.request.url.includes('.js') ||
        event.request.url.includes('.css')) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // Cachear la nueva versión
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                    return response;
                })
                .catch(() => {
                    // Si falla la red, usar caché como fallback
                    return caches.match(event.request);
                })
        );
    } else {
        // Cache First para imágenes y otros recursos
        event.respondWith(
            caches.match(event.request).then(response => {
                return response || fetch(event.request).then(response => {
                    if (!response || response.status !== 200) {
                        return response;
                    }
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                    return response;
                });
            })
        );
    }
});
