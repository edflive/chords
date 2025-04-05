// service-worker.js

const CACHE_NAME = 'gratte-app-cache-v1'; // Versionnez votre cache !
const FILES_TO_CACHE = [
  './', // Important pour la racine et potentiellement start_url '.'
  './index.html',
  './style.css',
  './script.js',
  './chords.json', // Très important de mettre le JSON en cache !
  './icon-192.png', // Mettez en cache les icônes aussi
  './icon-512.png'
  // Ajoutez ici d'autres ressources statiques si vous en avez (images, polices...)
];

// Événement d'installation : Mise en cache des ressources de base
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installation');
  // Empêche le service worker de s'installer tant que le cache n'est pas prêt
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Mise en cache des fichiers de l\'application');
      return cache.addAll(FILES_TO_CACHE);
    })
    .then(() => {
        // Force le service worker installé à devenir actif immédiatement
        // (utile pour la première installation)
         return self.skipWaiting();
    })
  );
});

// Événement d'activation : Nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activation');
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[ServiceWorker] Suppression de l\'ancien cache', key);
          return caches.delete(key);
        }
      }));
    })
    // Prend le contrôle immédiat des clients (onglets) ouverts
    .then(() => self.clients.claim())
  );
});

// Événement fetch : Interception des requêtes réseau
self.addEventListener('fetch', (event) => {
  // console.log('[ServiceWorker] Fetch', event.request.url);

  // Stratégie "Cache First" pour les requêtes GET
  if (event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request) // Cherche dans le cache
        .then((response) => {
          if (response) {
            // console.log('[ServiceWorker] Réponse depuis le cache:', event.request.url);
            return response; // Trouvé dans le cache !
          }
          // console.log('[ServiceWorker] Réponse non trouvée dans le cache, fetch réseau:', event.request.url);
          // Non trouvé -> Va chercher sur le réseau
          return fetch(event.request)
            .then((networkResponse) => {
                // Optionnel: Mettre en cache la nouvelle ressource pour la prochaine fois ?
                // Attention avec cette approche simple, ne pas cacher n'importe quoi.
                // Pour notre cas, les fichiers essentiels sont déjà dans FILES_TO_CACHE.
                return networkResponse;
            })
            .catch(error => {
                console.error("[ServiceWorker] Erreur Fetch réseau:", error);
                // Optionnel: Retourner une page "hors ligne" générique si le fetch échoue
                // return caches.match('./offline.html');
            });
        })
    );
  } else {
      // Pour les autres méthodes (POST, PUT etc.), on laisse passer vers le réseau
      event.respondWith(fetch(event.request));
  }
});