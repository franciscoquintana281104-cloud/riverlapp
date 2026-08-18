/* RIVERLAPP — service worker.
   Cachea todo al instalar para que funcione sin cobertura en el recinto.

   Van en DOS cachés a propósito. Con una sola, cada publicación re-descargaba
   los 5 MB de fotos junto al código, y como la instalación es todo o nada, en
   el móvil no llegaba a terminar nunca: te quedabas con la versión vieja sin
   enterarte. Ahora el código pesa ~700 KB y entra a la primera; las fotos se
   quedan donde están y solo se rehacen si sube FOTOS_REV. */

const CACHE = 'riverlapp-v27';
const CACHE_FOTOS = 'riverlapp-fotos';
/* Súbelo SOLO cuando cambien las fotos de artistas/: obliga a rehacerlas. */
const FOTOS_REV = 2;
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

    // A partir de aquí la app ya está actualizada. Las fotos van en su propia
    // caché y NO pueden tumbar la instalación: si fallan, se conservan las que
    // ya hubiera y se reintenta al abrir la próxima vez. Antes un mal momento
    // de cobertura dejaba el código viejo también.
    await self.skipWaiting();
    await ponerFotosAlDia();
  })());
});

/* Descarga solo las fotos que falten. Si FOTOS_REV ha subido, empieza de cero:
   es la única forma de traerse una foto que ha cambiado sin cambiar de nombre. */
async function ponerFotosAlDia() {
  try {
    const c = await caches.open(CACHE_FOTOS);
    const marca = './__rev';
    const previa = await c.match(marca);
    if (!previa || +(await previa.text()) !== FOTOS_REV) {
      await caches.delete(CACHE_FOTOS);
    }
    const cache = await caches.open(CACHE_FOTOS);
    const fotos = await fotosDelCartel();
    const faltan = [];
    for (const u of fotos) if (!(await cache.match(u))) faltan.push(u);

    const res = await Promise.allSettled(faltan.map(u => cache.add(u)));
    const fallos = res.filter(r => r.status === 'rejected').length;
    // la marca solo se pone si están TODAS: si no, se reintenta la próxima vez
    if (!fallos) await cache.put(marca, new Response(String(FOTOS_REV)));
  } catch (_) {
    /* sin red: se queda como esté y se reintenta al abrir */
  }
}

/* Al abrir la app se completan las que falten, sin bloquear nada. */
self.addEventListener('message', e => {
  if (e.data === 'fotos') e.waitUntil(ponerFotosAlDia());
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      /* nunca se borra la de fotos: es la que evita volver a bajar los 5 MB */
      .then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== CACHE_FOTOS).map(k => caches.delete(k))))
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
    const hit = await cache.match(e.request) || await (await caches.open(CACHE_FOTOS)).match(e.request);
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
