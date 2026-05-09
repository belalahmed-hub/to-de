'use strict';

const CACHE_NAME = 'hayah-v1';
const STATIC_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './db.js',
  './utils.js',
  './prayer.js',
  './dashboard.js',
  './tasks.js',
  './kanban.js',
  './calendar.js',
  './ai.js',
  './analytics.js',
  './team.js',
  './settings.js',
  './manifest.json'
];

const API_DOMAINS = [
  'api.aladhan.com',
  'api.groq.com'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .catch((err) => console.warn('[SW] Cache install failed:', err))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);
  const isApiCall = API_DOMAINS.some((domain) => url.hostname.includes(domain));

  if (isApiCall) {
    e.respondWith(networkFirst(e.request));
  } else {
    e.respondWith(cacheFirst(e.request));
  }
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    return new Response('Offline — الميزات المحلية شغالة', {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({
      error: 'offline',
      message: 'لا يوجد اتصال بالإنترنت'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

self.addEventListener('sync', (e) => {
  if (e.tag === 'sync-data') {
    e.waitUntil(syncData());
  }
});

async function syncData() {
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({ type: 'SYNC_COMPLETE' });
  });
}

self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
