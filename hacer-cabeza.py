#!/usr/bin/env python3
"""Recorta una cara sobre fondo blanco y genera el icono de la pestaña EL DAÑO
más la cabeza que flota por la pantalla.

    python3 hacer-cabeza.py ~/Desktop/cara.png

Genera cabeza.png (transparente, recortada a la cabeza). El fondo se quita por
relleno desde los bordes, no por umbral global: así los blancos de dentro de la
cara (brillos, dientes, ojos) no se convierten en agujeros.
"""

import sys
from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter

RAIZ = Path(__file__).parent
SALIDA = RAIZ / "cabeza.png"
LADO = 320
TOLERANCIA = 38        # cuánto puede alejarse del blanco y seguir siendo fondo


def quitar_fondo(img):
    img = img.convert("RGBA")
    an, al = img.size
    px = img.load()

    fondo = bytearray(an * al)          # 1 = es fondo
    cola = deque()

    def parecido_a_blanco(p):
        r, g, b = p[0], p[1], p[2]
        return r > 255 - TOLERANCIA and g > 255 - TOLERANCIA and b > 255 - TOLERANCIA

    # se siembra desde todo el borde
    for x in range(an):
        for y in (0, al - 1):
            if parecido_a_blanco(px[x, y]) and not fondo[y * an + x]:
                fondo[y * an + x] = 1
                cola.append((x, y))
    for y in range(al):
        for x in (0, an - 1):
            if parecido_a_blanco(px[x, y]) and not fondo[y * an + x]:
                fondo[y * an + x] = 1
                cola.append((x, y))

    while cola:
        x, y = cola.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < an and 0 <= ny < al and not fondo[ny * an + nx]:
                if parecido_a_blanco(px[nx, ny]):
                    fondo[ny * an + nx] = 1
                    cola.append((nx, ny))

    alfa = Image.new("L", (an, al), 255)
    ap = alfa.load()
    for y in range(al):
        fila = y * an
        for x in range(an):
            if fondo[fila + x]:
                ap[x, y] = 0

    # suaviza el borde: sin esto queda un halo blanco de un píxel
    alfa = alfa.filter(ImageFilter.GaussianBlur(0.8))
    alfa = alfa.point(lambda v: 0 if v < 110 else (255 if v > 200 else v))

    img.putalpha(alfa)
    return img


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    origen = Path(sys.argv[1]).expanduser()
    if not origen.exists():
        sys.exit(f"No existe: {origen}")

    img = Image.open(origen)
    # a tamaño manejable antes del relleno, que si no tarda una eternidad
    if max(img.size) > 900:
        f = 900 / max(img.size)
        img = img.resize((round(img.width * f), round(img.height * f)), Image.LANCZOS)

    img = quitar_fondo(img)

    caja = img.getbbox()
    if not caja:
        sys.exit("Ha salido todo transparente: prueba a subir TOLERANCIA")
    img = img.crop(caja)

    # cuadrado, centrado, con un poco de aire
    lado = max(img.size)
    aire = round(lado * 0.06)
    lienzo = Image.new("RGBA", (lado + aire * 2, lado + aire * 2), (0, 0, 0, 0))
    lienzo.paste(img, ((lienzo.width - img.width) // 2, (lienzo.height - img.height) // 2), img)
    lienzo = lienzo.resize((LADO, LADO), Image.LANCZOS)
    lienzo.save(SALIDA, "PNG", optimize=True)

    opacos = sum(1 for p in lienzo.getdata() if p[3] > 20)
    print(f"{SALIDA.name}  {LADO}×{LADO}  ·  {opacos * 100 // (LADO * LADO)}% de la imagen es cabeza")
    print(f"  {SALIDA.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
