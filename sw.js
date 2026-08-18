/* RIVERLAPP — service worker.
   Cachea todo al instalar para que funcione sin cobertura en el recinto. */

const CACHE = 'riverlapp-v24';
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
  './icono-512-maskable.png',
  './cabeza.png',
  './ic-cubata.png',
  './ic-porro.png',
  './qr-riverlapp.svg',
  './audio/eructo-1.m4a',
  './audio/eructo-2.m4a',
  './audio/eructo-3.m4a',
  './audio/eructo-4.m4a',
  './audio/eructo-5.m4a',
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

/* Solo caché, sin refrescar por detrás.
   Refrescar fichero a fichero podía dejar la caché con una mezcla de versiones
   (index.html nuevo con app.js viejo, por ejemplo, que rompe la app). La única
   forma de cambiar de versión es instalar un CACHE nuevo, que se llena entero
   o no se activa: así lo que hay dentro siempre es coherente. */
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(e.request);
    if (hit) return hit;

    // algo que no estaba precacheado (una foto añadida a mano, por ejemplo)
    try {
      const res = await fetch(e.request);
      if (res && res.ok && res.type === 'basic') cache.put(e.request, res.clone());
      return res;
    } catch (_) {
      return (await cache.match('./index.html')) || Response.error();
    }
  })());
});
