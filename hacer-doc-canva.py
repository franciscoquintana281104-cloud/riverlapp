#!/usr/bin/env python3
"""Genera revision-canva.html: una página por artista con su foto, el nombre y el
nombre del fichero. Canva lo importa como diseño editable.

El nombre del fichero va impreso en cada página a propósito: es lo que permite
devolver las fotos cambiadas al sitio correcto aunque muevas o reordenes páginas.

    python3 hacer-doc-canva.py
"""

import re
import unicodedata
from pathlib import Path

from PIL import Image, ImageDraw

RAIZ = Path(__file__).parent
FOTOS = RAIZ / "artistas"
BASE_URL = "https://franciscoquintana281104-cloud.github.io/riverlapp"


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


def hacer_placeholder():
    """Una imagen para los artistas sin foto, para que en Canva también haya algo
    que sustituir."""
    ruta = RAIZ / "sin-foto.jpg"
    img = Image.new("RGB", (720, 720), (26, 18, 44))
    d = ImageDraw.Draw(img)
    for i in range(0, 720, 40):
        d.line([(i, 0), (i - 200, 720)], fill=(38, 26, 62), width=14)
    d.rectangle([12, 12, 708, 708], outline=(90, 70, 130), width=4)
    img.save(ruta, "JPEG", quality=86)
    return ruta.name


def escapar(s):
    return (s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))


def main():
    nombres = artistas_del_cartel()
    hacer_placeholder()

    con_foto = [n for n in nombres if (FOTOS / f"{slugify(n)}.jpg").exists()]
    sin_foto = [n for n in nombres if n not in con_foto]

    est = """
    body { margin:0; font-family: Helvetica, Arial, sans-serif; }
    .pagina { width:1600px; height:900px; background:#0a0716; color:#fff;
              display:flex; align-items:center; box-sizing:border-box; padding:70px; }
    .foto { width:760px; height:760px; object-fit:cover; border-radius:20px; }
    .lado { flex:1; padding-left:70px; }
    .num { font-size:26px; color:#ff2e9a; letter-spacing:6px; margin-bottom:22px; }
    .nom { font-size:86px; font-weight:bold; line-height:1; margin-bottom:34px; }
    .fich { font-size:32px; color:#a08fc0; }
    .nota { font-size:26px; color:#6f6390; margin-top:44px; line-height:1.5; }
    .portada { flex-direction:column; justify-content:center; padding:110px; }
    .portada h1 { font-size:104px; margin:0 0 30px; }
    .portada p { font-size:34px; color:#b9a9d8; line-height:1.55; margin:0 0 18px; max-width:1250px; }
    """

    partes = [
        "<!DOCTYPE html><html lang='es'><head><meta charset='utf-8'>",
        "<title>RIVERLAPP · revisión de fotos</title>",
        f"<style>{est}</style></head><body>",
        # portada
        "<div class='pagina portada' data-document-role='page' data-label='Instrucciones'>",
        "<h1>RIVERLAPP · Fotos</h1>",
        f"<p>Una página por artista: {len(nombres)} en total, {len(con_foto)} con foto "
        f"y {len(sin_foto)} sin ella.</p>",
        "<p>Cambia las fotos que estén mal usando <b>Reemplazar imagen</b> de Canva. "
        "No borres ni edites el texto pequeño del nombre del fichero: es lo que "
        "identifica a cada artista al devolver los cambios.</p>",
        "<p>Puedes reordenar o borrar páginas sin problema.</p>",
        "</div>",
    ]

    for i, nombre in enumerate(nombres, 1):
        slug = slugify(nombre)
        tiene = (FOTOS / f"{slug}.jpg").exists()
        src = f"{BASE_URL}/artistas/{slug}.jpg" if tiene else f"{BASE_URL}/sin-foto.jpg"
        nota = ("" if tiene else
                "<div class='nota'>Este artista no tiene foto todavía. "
                "Si pones una aquí, la añado a la app.</div>")
        partes.append(
            f"<div class='pagina' data-document-role='page' data-label='{escapar(nombre)}'>"
            f"<img class='foto' src='{src}' alt='{escapar(nombre)}'>"
            f"<div class='lado'>"
            f"<div class='num'>{i:02d} / {len(nombres)}</div>"
            f"<div class='nom'>{escapar(nombre)}</div>"
            f"<div class='fich'>{slug}.jpg</div>"
            f"{nota}"
            f"</div></div>"
        )

    partes.append("</body></html>")
    salida = RAIZ / "revision-canva.html"
    salida.write_text("\n".join(partes), encoding="utf-8")

    kb = salida.stat().st_size // 1024
    print(f"{salida.name} · {len(nombres) + 1} páginas · {kb} KB")
    print(f"  con foto: {len(con_foto)}   sin foto: {len(sin_foto)}")


if __name__ == "__main__":
    main()
