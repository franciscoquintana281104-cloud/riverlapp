#!/usr/bin/env python3
"""Genera los iconos de RIVERLAPP: R en bloques, degradado magenta->violeta sobre negro."""

from PIL import Image, ImageDraw, ImageFilter

MAGENTA = (255, 46, 154)
VIOLETA  = (140, 60, 255)
FONDO    = (6, 4, 14)

# La "R" en rejilla de bloques, al estilo del logo del festival.
R = [
    "111110",
    "111111",
    "110011",
    "110011",
    "111111",
    "111110",
    "110110",
    "110011",
    "110011",
]

def mezcla(c1, c2, t):
    return tuple(round(a + (b - a) * t) for a, b in zip(c1, c2))

def icono(px):
    S = px * 4  # supersampling
    img = Image.new("RGB", (S, S), FONDO)
    d = ImageDraw.Draw(img)

    # resplandor morado de fondo
    glow = Image.new("RGB", (S, S), FONDO)
    gd = ImageDraw.Draw(glow)
    gd.ellipse([-S * .25, -S * .35, S * .95, S * .75], fill=(70, 20, 130))
    gd.ellipse([S * .3, S * .45, S * 1.3, S * 1.25], fill=(110, 12, 70))
    glow = glow.filter(ImageFilter.GaussianBlur(S * .16))
    img = Image.blend(img, glow, .78)
    d = ImageDraw.Draw(img)

    cols, filas = len(R[0]), len(R)
    margen = S * .17
    disp = S - margen * 2
    celda = min(disp / cols, disp / filas)
    ox = (S - celda * cols) / 2
    oy = (S - celda * filas) / 2
    hueco = celda * .1

    for y, fila in enumerate(R):
        for x, c in enumerate(fila):
            if c != "1":
                continue
            t = (x / cols * .45) + (y / filas * .55)
            col = mezcla(MAGENTA, VIOLETA, t)
            x0 = ox + x * celda
            y0 = oy + y * celda
            d.rectangle([x0, y0, x0 + celda - hueco, y0 + celda - hueco], fill=col)

    return img.resize((px, px), Image.LANCZOS)

for px in (180, 192, 512):
    icono(px).save(f"icono-{px}.png")
    print(f"icono-{px}.png")
