# RIVERLAPP

App para Riverland Asturias 2026 (21, 22 y 23 de agosto). Fichas a los artistas
deslizando como en Tinder y te monta el horario de los tres días, con pausas en
los huecos muertos. Funciona entera sin cobertura.

## Cómo se usa

**FICHAR** — las 83 actuaciones pasan como perfiles:

| gesto | significa | qué hace |
|---|---|---|
| ← izquierda | ME RAYA | fuera del plan |
| → derecha | ME RENTA | entra si no choca con nada |
| ↑ arriba | SÍ O SÍ | sagrado, gana siempre (y sale el "¡ES UN MATCH!") |

El botón ↺ deshace la última.

**MI PLAN** — el horario montado. Primero coloca los "sí o sí"; si dos se pisan
te lo dice y lo decides tú (es la única decisión que no puede tomar la app).
Luego encaja los "me renta" en los huecos, descontando el paseo entre escenarios.
Todo hueco libre de más de 25 min se convierte en una tarjeta de PAUSA.

**AHORA** — qué estás viendo, cuánto queda, qué viene después y el aviso
**SAL YA** cuando toca cruzar el recinto. Antes del festival muestra la cuenta
atrás; durante, es el copiloto.

**CARTEL** — el cartel completo. Cada línea rota entre ♥ / ★ / ✕ al tocarla.

## Ajustes (⚙)

- **Tiempo entre escenarios**: por defecto 6 min. Es una estimación mía, no he
  medido el recinto. Ajústalo el primer día y el plan se recalcula solo.
- **Hueco mínimo para pausa**: por defecto 25 min.
- **Modo simulación**: mueve la hora para ver cómo se comportará la app durante
  el festival sin esperar al viernes.

## Ficheros

    index.html          estructura
    styles.css          estética
    data.js             el cartel entero (83 sets, 3 escenarios, 3 días)
    app.js              lógica: baraja, algoritmo del plan, pantalla AHORA
    fotos.js            qué artistas tienen foto real
    artistas/           69 fotos
    sw.js               service worker: cachea todo para el modo sin cobertura
    bajar-fotos.py      vuelve a bajar las fotos desde Deezer
    hacer-iconos.py     regenera los iconos

## Fotos

69 de los 81 artistas tienen su foto oficial, bajada de la API pública de Deezer
(sin credenciales). Los 12 restantes usan una portada generada por código: un
degradado único derivado de su nombre, en la paleta del festival.

Sin foto: SELECTA, CASA PEPA, OLIVIA BABE Y GIGI284, NICO, AMORE, UGLY, ABHIR,
METRIKA, TAWA, GATTI, ZELL, KID GUMMY. Son nombres demasiado genéricos o
colectivos, y preferí portada generada antes que arriesgarme a poner la cara de
otro artista.

**Si alguna foto está mal**, sustitúyela: mete tu imagen en `artistas/` con el
mismo nombre de fichero y listo. Para añadir una que falta, mete el archivo y
añade la línea en `fotos.js`.

Para volver a bajarlas todas:

    python3 bajar-fotos.py

## Desarrollo

    python3 -m http.server 8126

En `localhost` el service worker **no** se registra, para no servir versiones
viejas mientras se edita. Para probar el modo sin cobertura, abre
`http://localhost:8126/?sw=1`, espera unos segundos y apaga el servidor: la app
debe seguir funcionando entera.

Al cambiar ficheros, sube el número de `CACHE` en `sw.js` (`riverlapp-v2` →
`riverlapp-v3`) para que los móviles que ya la tengan instalada se actualicen.
