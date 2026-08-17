#!/usr/bin/env python3
"""Convierte los dibujos del cubata y el porro en iconos recortados.

Los originales son tinta negra sobre fondo claro. Aquí se les quita el fondo
(la luminancia pasa a ser el canal alfa) y se dejan blancos y cuadrados.

En la app se pintan como máscara CSS, no como imagen: así el icono toma el
color del texto que lo rodea. Con un blanco fijo desaparecía en la diapositiva
del wrapped, que va sobre fondo claro.
"""

from PIL import Image

LADO = 128     # se muestran a 1em; 128 sobra para pantallas 3x
MARGEN = 0.05  # aire alrededor, para que no toque el borde del cuadrado

FUENTES = {
    'ic-cubata.png': 'ic-cubata-origen.avif',
    'ic-porro.png':  'ic-porro-origen.jpg',
}


def nivel_fondo(g):
    """Luminancia del fondo, leída del marco exterior.

    No vale suponer blanco puro: el porro viene sobre un gris claro y
    restando 255 quedaba un halo gris por toda la imagen.
    """
    px = g.load()
    w, h = g.size
    borde = ([px[x, 0] for x in range(w)] + [px[x, h - 1] for x in range(w)]
             + [px[0, y] for y in range(h)] + [px[w - 1, y] for y in range(h)])
    borde.sort()
    return borde[len(borde) // 2]   # mediana: aguanta motas y compresión


def alfa(g):
    """Lo oscuro se vuelve opaco; el fondo, transparente."""
    fondo = nivel_fondo(g)
    piso = max(fondo - 12, 1)       # margen para el ruido del JPEG
    return g.point(lambda v: 0 if v >= piso else round(255 * (piso - v) / piso))


def icono(ruta):
    g = Image.open(ruta).convert('L')
    a = alfa(g)

    caja = a.point(lambda v: 255 if v > 24 else 0).getbbox()
    if caja is None:
        raise SystemExit(f'{ruta}: no se ve ningún dibujo, solo fondo')
    a = a.crop(caja)

    # el dibujo entra en un cuadrado sin deformarse: el vaso es alto y el
    # porro apaisado, y estirarlos los dejaba ridículos
    hueco = round(LADO * (1 - MARGEN * 2))
    esc = min(hueco / a.width, hueco / a.height)
    a = a.resize((max(1, round(a.width * esc)), max(1, round(a.height * esc))),
                 Image.LANCZOS)

    lienzo = Image.new('L', (LADO, LADO), 0)
    lienzo.paste(a, ((LADO - a.width) // 2, (LADO - a.height) // 2))

    img = Image.new('RGBA', (LADO, LADO), (255, 255, 255, 0))
    img.putalpha(lienzo)
    return img, caja, a.size


for salida, origen in FUENTES.items():
    img, caja, tam = icono(origen)
    img.save(salida)
    print(f'{salida}  recorte {caja} -> {tam[0]}x{tam[1]} en {LADO}x{LADO}')
