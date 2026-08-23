const CACHE_NAME = 'medprogress-v7';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

/* تثبيت النسخة الجديدة */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

/* حذف جميع النسخ القديمة */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames =>
        Promise.all(
          cacheNames
            .filter(name => name !== CACHE_NAME)
            .map(name => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

/*
  مهم:
  index.html والملفات الرئيسية يتم جلبها من الشبكة أولاً.
  إذا لم توجد شبكة، نستخدم النسخة المخزنة.
*/
self.addEventListener('fetch', event => {

  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  /* index.html */
  if (
    url.pathname.endsWith('/') ||
    url.pathname.endsWith('/index.html')
  ) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(response => {

          const copy = response.clone();

          caches.open(CACHE_NAME)
            .then(cache => cache.put('./index.html', copy));

          return response;
        })
        .catch(() => caches.match('./index.html'))
    );

    return;
  }

  /* باقي الملفات */
  event.respondWith(
    caches.match(event.request)
      .then(cached => {

        if (cached) return cached;

        return fetch(event.request)
          .then(response => {

            if (response.ok) {
              const copy = response.clone();

              caches.open(CACHE_NAME)
                .then(cache =>
                  cache.put(event.request, copy)
                );
            }

            return response;
          });
      })
  );
});
