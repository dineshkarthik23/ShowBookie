const CACHE_NAME = 'showbookie-static-v1';
const ASSETS = [
  '/',
  '/html/index.html',
  '/html/movie.html',
  '/html/list.html',
  '/html/seats.html',
  '/html/payment.html',
  '/html/booking.html',
  '/html/bookinghist.html',
  '/html/profile.html',
  '/html/about.html',
  '/html/contact.html',
  '/html/help.html',
  '/html/faq.html',
  '/html/admin.html',
  '/html/terms.html',
  '/html/privacy.html',
  '/html/cancellation.html',
  '/css/app.css',
  '/js/app.js',
  '/js/api.js',
  '/js/admin.js',
  '/js/booking.js',
  '/js/config.js',
  '/js/i18n.js',
  '/js/payments-mock.js',
  '/js/state.js',
  '/js/ui.js',
  '/js/validation.js',
  '/locales/en.json',
  '/locales/ta.json',
  '/manifest.webmanifest',
  '/offline.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match('/offline.html'));
    })
  );
});
