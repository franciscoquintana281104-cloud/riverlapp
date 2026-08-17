/* RIVERLAPP — service worker.
   Cachea todo al instalar para que funcione sin cobertura en el recinto. */

const CACHE = 'riverlapp-v2';
const BASE = [
  './',
  './index.html',
  './styles.css',
  './data.js',
  './fotos.js',
  './app.js',
  './manifest.webmanifest',
  './icono-180.png',
  './icono-192.png',
  './icono-512.png',
];

/* Las fotos también se precachean: en el recinto no hay red para pedirlas,
   y fotos.js es la única fuente de verdad de qué artistas tienen imagen. */
async function fotosDelCartel() {
  try {
    const txt = await (await fetch('./fotos.js', { cache: 'no-cache' })).text();
    return [...txt.matchAll(/"([^"]+\.(?:jpg|jpeg|png|webp))"/g)]
      .map(m => './artistas/' + m[1]);
  } catch (e) {
    return [];
  }
}

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.allSettled(BASE.map(u => c.add(u)));
    const fotos = await fotosDelCartel();
    await Promise.allSettled(fotos.map(u => c.add(u)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Sirve al instante desde caché y refresca por detrás.
   En el recinto (sin red) responde la caché; en casa se actualiza sola. */
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.open(CACHE).then(async cache => {
      const hit = await cache.match(e.request);
      const red = fetch(e.request).then(res => {
        if (res && res.ok && res.type === 'basic') cache.put(e.request, res.clone());
        return res;
      }).catch(() => null);
      return hit || (await red) || cache.match('./index.html');
    })
  );
});
