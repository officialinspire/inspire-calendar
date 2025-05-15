// Enhanced Service Worker for INSPIRE HQ Calendar
const CACHE_NAME = 'inspire-calendar-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/login.html',
  '/offline.html',
  '/css/styles.css',
  '/js/app.js',
  '/js/db.js',
  '/js/sync.js',
  '/js/ui.js',
  '/js/lib/fullcalendar.min.js',
  '/css/lib/fullcalendar.min.css',
  '/manifest.json',
  '/inspire.png'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting(); // Ensures the newest service worker activates immediately
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching app shell and content');
        return cache.addAll(STATIC_ASSETS);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  const currentCaches = [CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return cacheNames.filter((cacheName) => !currentCaches.includes(cacheName));
    }).then((cachesToDelete) => {
      return Promise.all(cachesToDelete.map((cacheToDelete) => {
        console.log('Deleting old cache:', cacheToDelete);
        return caches.delete(cacheToDelete);
      }));
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache or network with improved strategies
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // For API requests, use network-first strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(event.request));
    return;
  }
  
  // For page navigations (HTML requests), use network-first with offline fallback
  if (event.request.mode === 'navigate' || (event.request.method === 'GET' && event.request.headers.get('accept').includes('text/html'))) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // If main page fails, serve offline page
          return caches.match('offline.html');
        })
    );
    return;
  }
  
  // For all other assets, use cache-first strategy
  event.respondWith(cacheFirstStrategy(event.request));
});

// Network-first strategy for API requests
async function networkFirstStrategy(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // If successful, clone the response to cache it
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // If network fails, try cache
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If nothing in cache for API, return appropriate JSON
    if (request.url.includes('/api/events')) {
      return new Response(JSON.stringify([]), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Otherwise we're truly offline
    throw error;
  }
}

// Cache-first strategy for static assets
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    // If not in cache, try to fetch
    const networkResponse = await fetch(request);
    
    // If successful, add to cache
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Network failed and no cache - truly offline
    console.error('Fetch failed:', error);
    
    // If it's an image, could return a fallback
    if (request.url.match(/\.(jpg|jpeg|png|gif|svg)$/)) {
      return caches.match('/inspire.png');
    }
    
    throw error;
  }
}