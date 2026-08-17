#!/usr/bin/env python3
"""Genera una hoja de contactos con todos los artistas del cartel y la foto que
usa la app, para revisar de un vistazo cuáles están mal.

    python3 revisar-fotos.py

Deja revision-fotos-1.jpg, -2.jpg… en la carpeta del proyecto.
Cada foto lleva su número, el nombre del artista y el nombre del fichero.
"""

import re
import unicodedata
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

RAIZ = Path(__file__).parent
FOTOS = RAIZ / "artistas"

COLS, FILAS = 5, 7          # 35 artistas por hoja
CELDA = 300                 # lado de la foto
PIE = 76                    # alto del texto bajo la foto
MARGEN = 34
FONDO = (10, 7, 22)
MAGENTA = (255, 46, 154)
BLANCO = (255, 255, 255)
GRIS = (150, 142, 168)


def fuente(tam, negrita=False):
    candidatas = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if negrita
        else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ]
    for c in candidatas:
        try:
            return ImageFont.truetype(c, tam)
        except Exception:
            continue
    return ImageFont.load_default()


def slugify(s):
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"^-|-$", "", re.sub(r"[^a-z0-9]+", "-", s.lower()))


def artistas_del_cartel():
    txt = (RAIZ / "data.js").read_text(encoding="utf-8")
    bloque = txt[txt.index("const LINEUP"):txt.index("/* ---- normalización ---- */")]
    nombres = re.findall(r"\['([^']+)'\s*,\s*'\d\d:\d\d'", bloque)
    nombres += re.findall(r'\["([^"]+)"\s*,\s*\'\d\d:\d\d\'', bloque)
    vistos, fuera = set(), []
    for n in nombres:
        if n not in vistos:
            vistos.add(n)
            fuera.append(n)
    return fuera


def recortar(texto, f, ancho, draw):
    if draw.textlength(texto, font=f) <= ancho:
        return texto
    while texto and draw.textlength(texto + "…", font=f) > ancho:
        texto = texto[:-1]
    return texto + "…"


def main():
    nombres = artistas_del_cartel()
    por_hoja = COLS * FILAS
    hojas = (len(nombres) + por_hoja - 1) // por_hoja

    f_num = fuente(20, True)
    f_nom = fuente(21, True)
    f_fich = fuente(16)
    f_tit = fuente(30, True)

    generadas = []

    for h in range(hojas):
        trozo = nombres[h * por_hoja:(h + 1) * por_hoja]
        filas = (len(trozo) + COLS - 1) // COLS
        ancho = MARGEN * 2 + COLS * CELDA + (COLS - 1) * MARGEN
        alto = MARGEN * 2 + 86 + filas * (CELDA + PIE) + (filas - 1) * MARGEN

        hoja = Image.new("RGB", (ancho, alto), FONDO)
        d = ImageDraw.Draw(hoja)

        d.text((MARGEN, MARGEN), "RIVERLAPP · REVISIÓN DE FOTOS", font=f_tit, fill=BLANCO)
        d.text((MARGEN, MARGEN + 40),
               f"Hoja {h + 1} de {hojas} · dime el número de las que estén mal",
               font=f_fich, fill=GRIS)

        for i, nombre in enumerate(trozo):
            idx = h * por_hoja + i + 1
            col, fila = i % COLS, i // COLS
            x = MARGEN + col * (CELDA + MARGEN)
            y = MARGEN + 86 + fila * (CELDA + PIE + MARGEN)

            slug = slugify(nombre)
            ruta = FOTOS / f"{slug}.jpg"

            if ruta.exists():
                im = Image.open(ruta).convert("RGB")
                lado = min(im.size)
                im = im.crop(((im.width - lado) // 2, 0,
                              (im.width - lado) // 2 + lado, lado))
                hoja.paste(im.resize((CELDA, CELDA), Image.LANCZOS), (x, y))
                pie_txt = f"{slug}.jpg"
                color_pie = GRIS
            else:
                d.rectangle([x, y, x + CELDA, y + CELDA], fill=(26, 18, 44),
                            outline=(70, 55, 100), width=2)
                ini = "".join(p[0] for p in re.split(r"\s+", nombre)[:2]).upper()
                f_ini = fuente(96, True)
                w = d.textlength(ini, font=f_ini)
                d.text((x + (CELDA - w) / 2, y + CELDA / 2 - 62), ini,
                       font=f_ini, fill=(70, 55, 100))
                pie_txt = "SIN FOTO — portada generada"
                color_pie = MAGENTA

            # número en una esquina
            d.rectangle([x, y, x + 52, y + 34], fill=MAGENTA)
            d.text((x + 12, y + 7), str(idx), font=f_num, fill=(255, 255, 255))

            d.text((x, y + CELDA + 12), recortar(nombre, f_nom, CELDA, d),
                   font=f_nom, fill=BLANCO)
            d.text((x, y + CELDA + 42), recortar(pie_txt, f_fich, CELDA, d),
                   font=f_fich, fill=color_pie)

        salida = RAIZ / f"revision-fotos-{h + 1}.jpg"
        hoja.save(salida, "JPEG", quality=88, optimize=True)
        generadas.append(salida)
        print(f"{salida.name}  ({hoja.width}×{hoja.height})")

    print(f"\n{len(nombres)} artistas en {hojas} hoja(s).")


if __name__ == "__main__":
    main()
