/* RIVERLAPP — service worker.
   Cachea todo al instalar para que funcione sin cobertura en el recinto. */

const CACHE = 'riverlapp-v3';
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

/* Una instalación a medias es peor que no actualizar: al activarse se borraría
   la caché anterior y te quedarías sin app justo donde no hay cobertura.
   Por eso, si algo esencial falla, la instalación falla y se conserva lo viejo. */
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);

    // el núcleo de la app es obligatorio: si cae uno, se aborta
    await Promise.all(BASE.map(u => c.add(u)));

    // las fotos son prescindibles de una en una, pero no a montones
    const fotos = await fotosDelCartel();
    const res = await Promise.allSettled(fotos.map(u => c.add(u)));
    const fallos = res.filter(r => r.status === 'rejected').length;
    if (fotos.length && fallos > fotos.length * 0.15) {
      throw new Error(
        `${fallos}/${fotos.length} fotos sin cachear: se conserva la versión anterior`
      );
    }

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
