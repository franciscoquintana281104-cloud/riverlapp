# RIVERLAPP

App para el festival **Riverland Asturias 2026** (viernes 21, sábado 22 y domingo
23 de agosto de 2026). PWA en HTML/CSS/JS **sin build, sin dependencias y sin
framework**: se edita y se sube, no hay nada que compilar.

- **En producción**: https://franciscoquintana281104-cloud.github.io/riverlapp/
- **Repo**: `franciscoquintana281104-cloud/riverlapp` (público, GitHub Pages)
- **Aquí**: `~/Desktop/CLOUDE/riverland/`

Es de uso privado, para Fran y sus amigos. No es un producto.

---

## Cómo se trabaja

    python3 -m http.server 8126        # desarrollo
    ./actualizar.sh "lo que has tocado" # subir: sube versión de caché, commit y push

`actualizar.sh` es el único camino para publicar: **sube solo el número de
`CACHE` en `sw.js`**, y sin eso los móviles se quedan con la versión vieja
indefinidamente. También detecta commits ya hechos pero sin subir.

En `localhost` el service worker **no se registra** a propósito. Para probar el
modo sin cobertura: abrir `http://localhost:8126/?sw=1`, esperar unos segundos y
apagar el servidor; la app debe seguir funcionando entera.

**No publicar el mismo día del festival**: si algo sale mal, allí no hay
conexión decente para arreglarlo.

---

## Las cuatro pantallas

- **AHORA** — copiloto en directo. Anillo que **se cierra** + reloj con segundos.
- **MI PLAN** — el horario montado, con las pausas. Dentro, pestaña **CARTEL COMPLETO**.
- **FICHAR** — parodia de Tinder para elegir artistas.
- **EL DAÑO** — contador de sustancias y su *wrapped* al final.

---

## Decisiones que NO son obvias mirando el código

Están en este orden porque romper cualquiera de ellas ha costado ya una ronda de
depuración.

### Fichar es una parodia de Tinder, y los tres niveles son funcionales
**ME RAYA** (←), **ME RENTA** (→) y **SÍ O SÍ** (↑, el superlike, con su "¡ES UN
MATCH!"). No reducir a dos: los "sí o sí" son intocables y los "me renta" solo
rellenan huecos; sin esa distinción el algoritmo no puede resolver solapamientos.
El número junto al nombre es la duración del set, imitando la edad de un perfil.

### La hora simulada es un DESFASE, no un instante
`estado.sim` guarda milisegundos de diferencia con la hora real, y
`ahora() = Date.now() + estado.sim`. Cuando guardaba un instante fijo, el reloj
se quedaba congelado en simulacro y no avanzaba nada.

### El anillo mide lo que QUEDA y hay una sola función que lo calcula
`medidaAhora()` y `gradosAnillo()`. Estuvo duplicado entre la pantalla y el
latido, divergieron (uno pintaba lo transcurrido, otro lo restante) y el arco
saltaba entre 288° y 72° cada segundo. **No volver a calcularlo en otro sitio.**

### Las vistas llevan z-index explícito en cada transición
Sin él manda el orden del HTML, y **al ir hacia atrás la vista que sale se pinta
encima de la que entra**: se quedaba visible a un lado durante todo el
deslizamiento. Además cada vista es **opaca** (lleva su propio degradado); antes
eran transparentes y se veían la una a través de la otra.

### El service worker va en DOS cachés, y el código entero o nada
El núcleo (`riverlapp-vN`) y las fotos (`riverlapp-fotos`) van separados. Con una
sola caché, **cada publicación re-descargaba los 5 MB de fotos** junto al código;
como la instalación es todo o nada, en el móvil no llegaba a terminar y te
quedabas con la versión vieja sin enterarte de nada. Ahora el código pesa ~700 KB
y entra a la primera; las fotos se quedan donde están y **solo se rehacen si
sube `FOTOS_REV`** (súbelo al cambiar fotos de `artistas/`). La caché de fotos
**no se borra nunca** en el paso de activación, y un fallo bajando fotos ya no
tumba la actualización del código.

El registro va con `updateViaCache: 'none'`: sin eso el navegador se queda con su
copia de `sw.js` hasta 10 minutos (GitHub Pages lo sirve con `max-age=600`) y una
publicación tardaba en verse aunque ya estuviera arriba.

### El núcleo se instala entero o no se activa
Si falla un fichero del núcleo, o más del 15% de las fotos, la instalación
**falla a propósito** y se conserva la versión anterior. Con `Promise.allSettled`
una instalación a medias se daba por buena y el paso de activación borraba la
caché buena: con mala conexión te quedabas sin app y sin red para arreglarlo.
Por lo mismo, el `fetch` es **solo caché, sin refrescar por detrás**: refrescar
fichero a fichero dejaba mezclas de versiones (index.html nuevo con app.js
viejo, que rompe la app).

### AHORA se repinta entero solo cuando cambia algo de fondo
`latido()` corre cada segundo y **solo reescribe números**. `claveAhora()` decide
si hace falta repintar de verdad (empieza otro concierto, salta el aviso de SAL
YA). Repintar entero cada segundo perdería el scroll y reiniciaría animaciones.
El latido se para si la app no está en primer plano: son tres noches de batería.

### El arrastre de las cartas
Todo el pintado se agrupa en **un fotograma** (`requestAnimationFrame`): escribir
estilos en cada `pointermove` se notaba pastoso. Se mide velocidad para que un
golpe corto cuente, con **tope de 2,5 px/ms** porque sin él un `dt` mínimo
disparaba la proyección y decidía solo. Mientras arrastras **se congela el fondo
animado**, que competía por la GPU.

### Estética TARJETA ROSA
Marco negro sobrio, magenta **solo** donde se mira: la carta, la losa de SAL YA,
el día activo, lo sagrado, la pestaña activa. Las fotos van **a una tinta**
(`mix-blend-mode: multiply` sobre el magenta de la carta). Nombres en tipografía
grande y ligera; etiquetas en monoespaciada muy espaciada. **Nada de cajas de
colores ni degradados.**

Se eligió entre seis bocetos (ver `bocetos.html` y `bocetos2.html`, publicados).
Fran descartó explícitamente la opción clara por ser una linterna a las 4am.

**No poner estilos de color en línea dentro del JS**: se saltan la hoja de
estilos y ya hubo que limpiarlos una vez al cambiar de estética.

### Lo de las drogas se pidió quitar y luego volvió como contador
Se esbozó una función de reducción de daños, Fran pidió quitarla, y de aquello
solo quedaron las **tarjetas de PAUSA** ("hidratación y fumercio extremo" es
literalmente suya). Después pidió **EL DAÑO**: contador de cubatas, porros y las
sustancias que añada. Dice "sustancias", nunca "cosas".

Cada apunte se sella con **el artista que sonaba en ese momento**, y de ahí salen
todas las estadísticas. El ritmo medio y la racha se calculan **por noche**: de
punta a punta metían en la media las horas de sueño entre días.

Antes de que arranque el festival todo cuenta bajo un **modo prueba**; al empezar
el viernes esos apuntes pasan a descartados solos. Filtrarlos desde el principio
hacía que pulsar un botón no moviera el número y pareciera roto.

El cartel que explicaba todo esto **se quitó a petición de Fran** ("ensucia"): de
él solo queda el botón BORRAR EL ENSAYO, en negro y magenta. La explicación vive
ahora únicamente en el LEEME, así que la app ya no avisa por su cuenta de que
esos apuntes dejarán de contar. **No volver a meter cajas de color** ahí: el
aviso de apuntes fuera de fecha también era una caja cian y se pasó a la misma
estética de página.

---

## Las fotos de los artistas

**81 de 81** tienen foto. Salen de la API pública de Deezer (`bajar-fotos.py`,
sin credenciales) y Fran revisó y sustituyó unas cuantas a mano.

- `revisar-fotos.py` → hoja de contactos numerada para localizar las malas.
- `cambiar-foto.py "Artista" foto.jpg` → sustituye una (acepta HEIC del iPhone).
- `hacer-doc-canva.py` + `traer-de-canva.py` → ciclo completo con Canva: genera
  un HTML que Canva importa, y luego lee el PPTX exportado y reinstala **solo**
  las fotos cambiadas, identificándolas por el nombre de fichero impreso en cada
  página. La comparación es **perceptual (dHash)**, no byte a byte: Canva
  recomprime al exportar y si no daría por cambiadas las 81.
  - Documento en Canva: `https://www.canva.com/design/DAHSkzsHmx4/edit`
  - Ojo: los enlaces cortos que devuelve la API de Canva **caducan**; usar
    siempre la forma larga con el ID.
- `avatar-generico.jpg` y `sin-foto.jpg` están **vetados por huella**: son el
  muñeco gris de Deezer y el placeholder, y se colaron una vez como si fueran la
  foto de dos artistas.

Varias fotos son bromas deliberadas (Garfield, Padre de Familia, el conejito de
Playboy). **No "corregirlas".**

---

## Cosas del entorno

- El icono de EL DAÑO es una cara recortada (`cabeza.png`). Esa misma cabeza es
  el **botón de eructar**, y va en la **cabecera**, no flotando sobre el scroll:
  como botón se queda los toques de lo que tenga debajo, y en una esquina pisaba
  VER MI WRAPPED, BORRAR EL REGISTRO y la tarjeta de OTRA SUSTANCIA según por
  dónde fueras. Antes de ser botón derivaba por la pantalla por detrás del
  contenido, porque encima tapaba los números.
- El **QR de compartir** (mantener pulsada la cabeza) es un **SVG generado a
  fichero** por `hacer-qr.py`, no dibujado en el móvil: la dirección no cambia
  nunca, así no entra una librería en una app que presume de no tener ninguna, y
  funciona sin cobertura. Va con corrección **H** y sobre **fondo claro**: sobre
  el negro de la app no lo lee ninguna cámara. `hacer-qr.py` necesita `segno`,
  que no hace falta instalar en el sistema (basta un venv de usar y tirar).
- La cabeza distingue toque corto (eructo) de **toque largo** (QR) con eventos de
  puntero, no con `onclick`: el click salta igual al soltar y te eructaba encima
  del QR recién abierto.
- Los eructos van en **AAC mono** (`hacer-eructos.py` los saca de los WAV): en
  WAV eran 2 MB que había que precachear enteros para el modo sin cobertura.
  Se les recorta el silencio de los extremos, que retrasaba el sonido respecto
  al toque, y se igualan de volumen porque uno venía 10 dB por debajo.
- Los 6 minutos entre escenarios son una **estimación sin medir el recinto**.
  Ajustable desde ⚙ y recalcula el plan.
- El cartel entero está en `data.js`. Los sets que empiezan antes de las 12:00
  pertenecen a la madrugada del día siguiente.
- **L'HAINE** va con comillas dobles en `data.js` por el apóstrofo: cualquier
  regex que lea el cartel debe contemplar las dos formas o se lo deja fuera.
- Python de python.org **no trae certificados raíz**: los scripts que salen a
  internet usan `certifi`.

---

## Cómo verificar

No hay tests. La verificación es una **batería en la consola del navegador** que
ejercita: las 83 portadas, las bios, los planes de los tres días con distintos
ajustes, 80 momentos simulados en AHORA con su latido, 40 en el contador, el
wrapped entero, las 16 combinaciones de transición y los cinco gestos de
arrastre. Comprobar siempre que quede **una sola vista activa** y **ningún
z-index sin limpiar**.

Ojo al depurar en un panel de navegador oculto: `requestAnimationFrame` no
dispara y `visibilityState` es `hidden`, así que el latido se para y las
transiciones se aceleran. No es un fallo de la app.
