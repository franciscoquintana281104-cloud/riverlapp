#!/usr/bin/env python3
"""Genera los iconos de RIVERLAPP a partir de icono-origen.webp (la R inflada).

La imagen de origen es apaisada: se recorta al cuadrado central, que es donde
está la R. El maskable va aparte y más pequeño porque Android lo recorta en
círculo y se comía las puntas de la letra.
"""

from PIL import Image

ORIGEN = "icono-origen.webp"

# Android recorta el maskable dejando solo el 80% central garantizado.
# La R se encoge dentro de ese círculo o pierde las puntas.
ZONA_SEGURA = 0.78


def cuadrado(im):
    """Recorte cuadrado centrado."""
    lado = min(im.size)
    x = (im.width - lado) // 2
    y = (im.height - lado) // 2
    return im.crop((x, y, x + lado, y + lado))


def icono(base, px):
    return base.resize((px, px), Image.LANCZOS)


def maskable(base, px):
    """La imagen encogida, con el margen relleno estirando su propio borde.

    Rellenar con un color plano dejaba un cuadro visible: el fondo de la
    imagen es un degradado radial y cualquier tono fijo corta con él.
    Estirando la fila y la columna del borde el empalme es exacto.
    """
    dentro = round(px * ZONA_SEGURA)
    m = (px - dentro) // 2                       # margen a cada lado
    im = base.resize((dentro, dentro), Image.LANCZOS)
    fondo = Image.new("RGB", (px, px))
    fondo.paste(im, (m, m))

    arriba = im.crop((0, 0, dentro, 1))
    abajo  = im.crop((0, dentro - 1, dentro, dentro))
    izq    = im.crop((0, 0, 1, dentro))
    der    = im.crop((dentro - 1, 0, dentro, dentro))
    fondo.paste(arriba.resize((dentro, m)), (m, 0))
    fondo.paste(abajo.resize((dentro, px - dentro - m)), (m, dentro + m))
    fondo.paste(izq.resize((m, dentro)), (0, m))
    fondo.paste(der.resize((px - dentro - m, dentro)), (dentro + m, m))

    # las cuatro esquinas, con el píxel de cada vértice
    for x, y in ((0, 0), (dentro - 1, 0), (0, dentro - 1), (dentro - 1, dentro - 1)):
        col = im.getpixel((x, y))
        dx = 0 if x == 0 else dentro + m
        dy = 0 if y == 0 else dentro + m
        ancho = m if x == 0 else px - dentro - m
        alto  = m if y == 0 else px - dentro - m
        fondo.paste(Image.new("RGB", (ancho, alto), col), (dx, dy))

    return fondo


base = cuadrado(Image.open(ORIGEN).convert("RGB"))
print(f"{ORIGEN} {Image.open(ORIGEN).size} -> recorte {base.size}")

for px in (180, 192, 512):
    icono(base, px).save(f"icono-{px}.png")
    print(f"icono-{px}.png")

maskable(base, 512).save("icono-512-maskable.png")
print("icono-512-maskable.png")
