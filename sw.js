// AimDo Service Worker
const CACHE_NAME = 'aimdo-v2';
const OFFLINE_URL = 'offline.html';

// Base-Pfad ermitteln (funktioniert für GitHub Pages Subdirectory)
const BASE_PATH = self.location.pathname.replace(/sw\.js$/, '');

// Dateien, die beim Install gecacht werden
const PRECACHE_ASSETS = [
  './',
  './app.html',
  './start-ui.html',
  './offline.html',
  './manifest.json',
  './index.html'
];

// Install Event - Precache wichtige Assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Precaching assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        console.log('[SW] Install complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Install failed:', error);
      })
  );
});

// Activate Event - Alte Caches löschen
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Activation complete');
        return self.clients.claim();
      })
  );
});

// Fetch Event - Network-First Strategie für API, Cache-First für Assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests (außer Supabase)
  if (!url.origin.includes(self.location.origin) &&
      !url.origin.includes('supabase.co')) {
    return;
  }

  // API Requests - Network First
  if (url.pathname.includes('/functions/') ||
      url.pathname.includes('/rest/') ||
      url.pathname.includes('/auth/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Static Assets - Cache First
  event.respondWith(cacheFirst(request));
});

// Network First Strategie (für API)
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);

    // Erfolgreiche Antworten cachen
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);

    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Für Navigation: Offline-Seite zeigen
    if (request.mode === 'navigate') {
      return caches.match(OFFLINE_URL);
    }

    throw error;
  }
}

// Cache First Strategie (für Static Assets)
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    // Im Hintergrund aktualisieren
    fetchAndCache(request);
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] Fetch failed:', request.url);

    // Für Navigation: Offline-Seite zeigen
    if (request.mode === 'navigate') {
      return caches.match(OFFLINE_URL);
    }

    throw error;
  }
}

// Hintergrund-Update
async function fetchAndCache(request) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
  } catch (error) {
    // Ignore background fetch errors
  }
}

// Push Notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');

  let data = {
    title: 'AimDo',
    body: 'Du hast eine neue Benachrichtigung',
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-72.png'
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    vibrate: [100, 50, 100],
    data: {
      url: data.url || 'app.html'
    },
    actions: [
      { action: 'open', title: 'Öffnen' },
      { action: 'close', title: 'Schließen' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification Click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');

  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const url = event.notification.data?.url || 'app.html';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Existierendes Fenster fokussieren
        for (const client of clientList) {
          if (client.url.includes('aimdo') && 'focus' in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        // Neues Fenster öffnen
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Background Sync (für Offline-Actions)
self.addEventListener('sync', (event) => {
  console.log('[SW] Sync event:', event.tag);

  if (event.tag === 'sync-tasks') {
    event.waitUntil(syncTasks());
  }
});

async function syncTasks() {
  // Hier können offline gespeicherte Tasks synchronisiert werden
  console.log('[SW] Syncing tasks...');
}

console.log('[SW] Service Worker loaded');
