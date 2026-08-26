const CACHE_PREFIX = 'medprogress-';
const CACHE_NAME = CACHE_PREFIX + 'v13-1';

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192-v3.png',
  './icons/icon-512-v3.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names => Promise.all(
      names
        .filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
        .map(name => caches.delete(name))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if(event.data==='SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;

  const alwaysFresh =
    request.mode==='navigate' ||
    request.destination==='document' ||
    url.pathname.endsWith('/index.html') ||
    url.pathname.endsWith('/manifest.json') ||
    url.pathname.endsWith('/sw.js');

  event.respondWith(alwaysFresh ? networkFirst(request) : cacheFirst(request));
});

async function networkFirst(request){
  try{
    const response=await fetch(request,{cache:'no-store'});
    if(response&&response.ok){
      const cache=await caches.open(CACHE_NAME);
      await cache.put(request,response.clone());
    }
    return response;
  }catch(error){
    const cached=await caches.match(request);
    if(cached)return cached;
    if(request.mode==='navigate'){
      const fallback=await caches.match('./index.html');
      if(fallback)return fallback;
    }
    throw error;
  }
}

async function cacheFirst(request){
  const cached=await caches.match(request);
  const update=fetch(request,{cache:'no-cache'}).then(response=>{
    if(response&&response.ok){
      return caches.open(CACHE_NAME).then(cache=>{
        cache.put(request,response.clone());
        return response;
      });
    }
    return response;
  }).catch(()=>null);
  if(cached){update.catch(()=>{});return cached;}
  const fresh=await update;
  return fresh||Response.error();
}
