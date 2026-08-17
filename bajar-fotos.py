#!/usr/bin/env python3
"""Descarga las fotos oficiales de los artistas del cartel desde la API pública de Deezer
y genera fotos.js. No necesita credenciales.

Solo acepta una foto si el nombre que devuelve Deezer coincide de verdad con el del
cartel: más vale una portada generada que la cara de otro artista.

    python3 bajar-fotos.py
"""

import io
import json
import re
import ssl
import sys
import time
import unicodedata
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image

# Python instalado desde python.org no trae los certificados raíz del sistema.
try:
    import certifi
    CTX = ssl.create_default_context(cafile=certifi.where())
except ImportError:
    CTX = ssl.create_default_context()

RAIZ = Path(__file__).parent
DESTINO = RAIZ / "artistas"
LADO = 720
CALIDAD = 82
UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"}

# Artistas cuyo nombre en el cartel no es el nombre con el que están dados de alta.
ALIAS = {
    "STICKY M.A.": "Sticky M.A.",
    "D.PALERMO": "D Palermo",
    "D.VALENTINO": "D Valentino",
    "OLIVIA BABE Y GIGI284": "Olivia Babe",
    "MARCE Y DLOMALO": "Marce",
    "BLUNTZ B2B TASUIK": "Bluntz",
    "SHAKEDABLOCK!": "Shakedablock",
    "LADIFERENCIA 2006": "Ladiferencia",
    "ABHIR": "Abhir Hathi",
    "NICO MISERIA": "Nico Miseria",
    "IZA TKM": "Iza TKM",
    "YUNG BRANDY": "Yung Brandy",
    "C MARÍ": "C Marí",
    "BEA PELEA": "Bea Pelea",
    "JAY DIME": "Jay Dime",
    "SNEAKY WH": "Sneaky WH",
    "MAIN COSTA": "Main Costa",
    "TK MAMI": "Tk Mami",
    "VEI HABACHE": "Vei Habache",
    "RAUL CLYDE": "Raul Clyde",
    "XINA MORA": "Xina Mora",
    "BEN YART": "Ben Yart",
    "SOTO ASA": "Soto Asa",
    "JESSE BAEZ": "Jesse Baez",
    "JUICY BAE": "Juicy Bae",
    "FANTA ROSARIO": "Fanta Rosario",
    "NATALIA LACUNZA": "Natalia Lacunza",
    "RALPHIE CHOO": "Ralphie Choo",
    "CECILIO G": "Cecilio G",
}

# Colectivos, sesiones y nombres demasiado genéricos: no se buscan.
SALTAR = {"CASA PEPA", "NICO", "AMORE", "SELECTA", "UGLY", "METRIKA", "ZELL", "GATTI", "TAWA"}


def normalizar(s):
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]", "", s.lower())


def slugify(s):
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"^-|-$", "", re.sub(r"[^a-z0-9]+", "-", s.lower()))


def artistas_del_cartel():
    """Saca los nombres únicos de data.js sin duplicar la lista aquí."""
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


def buscar(consulta):
    url = "https://api.deezer.com/search/artist?limit=5&q=" + urllib.parse.quote(consulta)
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=15, context=CTX) as r:
            return json.load(r).get("data", [])
    except Exception as e:
        print(f"    error de red: {e}", file=sys.stderr)
        return []


def coincide(cartel, deezer):
    a, b = normalizar(cartel), normalizar(deezer)
    if not a or not b:
        return False
    if a == b:
        return True
    # "Cecilio G" vs "Cecilio G." — uno contiene al otro y la diferencia es mínima
    if (a in b or b in a) and abs(len(a) - len(b)) <= 3:
        return True
    return False


def descargar(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=25, context=CTX) as r:
        return r.read()


def main():
    DESTINO.mkdir(exist_ok=True)
    nombres = artistas_del_cartel()
    print(f"{len(nombres)} artistas únicos en el cartel\n")

    fotos, sin_foto = {}, []

    for i, nombre in enumerate(nombres, 1):
        etiqueta = f"[{i:>2}/{len(nombres)}] {nombre}"
        if nombre in SALTAR:
            print(f"{etiqueta:<44} saltado (nombre ambiguo)")
            sin_foto.append(nombre)
            continue

        consulta = ALIAS.get(nombre, nombre)
        elegido = None
        for cand in buscar(consulta):
            pic = cand.get("picture_xl") or ""
            if "/artist//" in pic or not pic:      # Deezer sin foto real
                continue
            if coincide(consulta, cand.get("name", "")) or coincide(nombre, cand.get("name", "")):
                elegido = cand
                break

        if not elegido:
            print(f"{etiqueta:<44} sin coincidencia fiable")
            sin_foto.append(nombre)
            time.sleep(.2)
            continue

        slug = slugify(nombre)
        try:
            img = Image.open(io.BytesIO(descargar(elegido["picture_xl"]))).convert("RGB")
            lado = min(img.size)
            izq = (img.width - lado) // 2
            arr = max(0, (img.height - lado) // 4)      # encuadre hacia arriba: ahí está la cara
            img = img.crop((izq, arr, izq + lado, arr + lado)).resize((LADO, LADO), Image.LANCZOS)
            img.save(DESTINO / f"{slug}.jpg", "JPEG", quality=CALIDAD, optimize=True)
            fotos[slug] = f"{slug}.jpg"
            print(f"{etiqueta:<44} ✓ {elegido['name']}")
        except Exception as e:
            print(f"{etiqueta:<44} fallo al bajar: {e}")
            sin_foto.append(nombre)
        time.sleep(.2)

    cab = (
        "/* Fotos de artistas — generado por bajar-fotos.py (API pública de Deezer).\n"
        "   Clave = slug del artista, valor = fichero dentro de artistas/.\n"
        "   Los que no están aquí usan su portada generada por código.\n"
        "   Para añadir una a mano: mete el archivo en artistas/ y añade la línea. */\n\n"
    )
    cuerpo = "window.FOTOS = {\n" + "".join(
        f"  {json.dumps(k)}: {json.dumps(v)},\n" for k, v in sorted(fotos.items())
    ) + "};\n"
    (RAIZ / "fotos.js").write_text(cab + cuerpo, encoding="utf-8")

    print(f"\n{len(fotos)} fotos descargadas, {len(sin_foto)} sin foto")
    if sin_foto:
        print("Sin foto (portada generada): " + ", ".join(sin_foto))


if __name__ == "__main__":
    main()
