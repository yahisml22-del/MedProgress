const CACHE_NAME = 'medprogress-v8';

const APP_SHELL = [
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
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

/* تفعيل النسخة الجديدة وحذف الكاش القديم */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(names =>
        Promise.all(
          names
            .filter(name =>
              name.startsWith('medprogress-') &&
              name !== CACHE_NAME
            )
            .map(name => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

/*
  مهم:
  index.html و sw.js يتم جلبهما من الشبكة أولاً.
  لذلك عند رفع نسخة HTML جديدة على GitHub Pages
  لن يبقى التطبيق عالقاً على HTML القديم.
*/
self.addEventListener('fetch', event => {

  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  /* HTML الرئيسي */
  if (
    request.mode === 'navigate' ||
    url.pathname.endsWith('/index.html')
  ) {

    event.respondWith(
      fetch(request, {
        cache: 'no-store'
      })
      .then(response => {

        if (response && response.ok) {

          const copy = response.clone();

          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put('./index.html', copy);
            });

          return response;
        }

        return caches.match('./index.html');
      })
      .catch(() =>
        caches.match('./index.html')
      )
    );

    return;
  }

  /*
    sw.js نفسه دائماً من الشبكة.
    هذا يسمح باكتشاف CACHE_NAME الجديد.
  */
  if (url.pathname.endsWith('/sw.js')) {

    event.respondWith(
      fetch(request, {
        cache: 'no-store'
      })
    );

    return;
  }

  /*
    باقي الملفات:
    الشبكة أولاً، ثم الكاش عند عدم وجود إنترنت.
  */
  event.respondWith(

    fetch(request)
      .then(response => {

        if (response && response.ok) {

          const copy = response.clone();

          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(request, copy);
            });

          return response;
        }

        return caches.match(request);
      })

      .catch(() =>
        caches.match(request)
      )

  );

});
