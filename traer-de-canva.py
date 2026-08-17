#!/usr/bin/env python3
"""Lee el PPTX exportado de Canva y mete en la app las fotos que hayan cambiado.

    python3 traer-de-canva.py ~/Downloads/revision.pptx
    python3 traer-de-canva.py ~/Downloads/revision.pptx --simular   # solo informa

Cada página lleva impreso el nombre del fichero (cecilio-g.jpg), y es eso lo que
usa para saber de quién es cada foto: da igual que se reordenen o se borren
páginas. Solo toca las fotos que de verdad hayan cambiado.
"""

import hashlib
import io
import re
import sys
import unicodedata
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

from PIL import Image

RAIZ = Path(__file__).parent
DESTINO = RAIZ / "artistas"
LADO = 720
CALIDAD = 82

NS = {
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "rel": "http://schemas.openxmlformats.org/package/2006/relationships",
}
R_EMBED = f"{{{NS['r']}}}embed"


def slugify(s):
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"^-|-$", "", re.sub(r"[^a-z0-9]+", "-", s.lower()))


def artistas_del_cartel():
    txt = (RAIZ / "data.js").read_text(encoding="utf-8")
    bloque = txt[txt.index("const LINEUP"):txt.index("/* ---- normalización ---- */")]
    nombres = re.findall(r"\['([^']+)'\s*,\s*'\d\d:\d\d'", bloque)
    nombres += re.findall(r'\["([^"]+)"\s*,\s*\'\d\d:\d\d\'', bloque)
    return list(dict.fromkeys(nombres))


def huella(datos):
    """dHash de 64 bits. Canva recomprime y reescala al exportar, así que comparar
    los bytes daría 'distinta' siempre; esto compara el contenido visual."""
    try:
        im = Image.open(io.BytesIO(datos)).convert("L").resize((9, 8), Image.LANCZOS)
    except Exception:
        return None
    px = list(im.getdata())
    bits = 0
    for f in range(8):
        for c in range(8):
            if px[f * 9 + c] > px[f * 9 + c + 1]:
                bits |= 1 << (f * 8 + c)
    return bits


def misma_imagen(a, b, tolerancia=8):
    """a y b son huellas. Un recomprimido difiere en 0-4 bits; una foto distinta,
    en bastantes más."""
    if a is None or b is None:
        return False
    return bin(a ^ b).count("1") <= tolerancia


def procesar(datos):
    img = Image.open(io.BytesIO(datos)).convert("RGB")
    lado = min(img.size)
    izq = (img.width - lado) // 2
    arr = max(0, (img.height - lado) // 4)
    return img.crop((izq, arr, izq + lado, arr + lado)).resize((LADO, LADO), Image.LANCZOS)


def leer_paginas(pptx):
    """[(fichero, bytes_de_la_imagen)] por cada diapositiva que tenga ambas cosas."""
    salida = []
    with zipfile.ZipFile(pptx) as z:
        slides = sorted(
            (n for n in z.namelist() if re.fullmatch(r"ppt/slides/slide\d+\.xml", n)),
            key=lambda n: int(re.search(r"(\d+)", n.rsplit("/", 1)[1]).group(1)),
        )
        for s in slides:
            raiz = ET.fromstring(z.read(s))
            textos = [t.text or "" for t in raiz.iter(f"{{{NS['a']}}}t")]
            fichero = next(
                (t.strip() for t in textos if re.fullmatch(r"[a-z0-9][a-z0-9-]*\.jpg", t.strip())),
                None,
            )
            if not fichero:
                continue

            nombre_rels = f"ppt/slides/_rels/{Path(s).name}.rels"
            if nombre_rels not in z.namelist():
                continue
            rels = ET.fromstring(z.read(nombre_rels))
            mapa = {
                r.get("Id"): r.get("Target")
                for r in rels.iter(f"{{{NS['rel']}}}Relationship")
                if "image" in (r.get("Type") or "")
            }

            imagenes = []
            for blip in raiz.iter(f"{{{NS['a']}}}blip"):
                rid = blip.get(R_EMBED)
                destino = mapa.get(rid)
                if not destino:
                    continue
                ruta = "ppt/" + destino.replace("../", "")
                if ruta in z.namelist():
                    imagenes.append(z.read(ruta))

            if not imagenes:
                continue
            # si hubiera varias, nos quedamos con la más grande: es la foto
            salida.append((fichero, max(imagenes, key=len)))
    return salida


def main():
    args = [a for a in sys.argv[1:]]
    simular = "--simular" in args
    args = [a for a in args if not a.startswith("--")]
    if not args:
        print(__doc__)
        return
    pptx = Path(args[0]).expanduser()
    if not pptx.exists():
        sys.exit(f"No existe: {pptx}")

    validos = {f"{slugify(n)}.jpg" for n in artistas_del_cartel()}
    paginas = leer_paginas(pptx)
    print(f"\n{len(paginas)} páginas con foto y nombre de fichero\n")

    # Imágenes que no son la foto de nadie y nunca deben instalarse:
    # el placeholder del documento y el avatar genérico de Deezer.
    vetadas = []
    for ref in ("sin-foto.jpg", "avatar-generico.jpg"):
        r = RAIZ / ref
        if r.exists():
            h = huella(r.read_bytes())
            if h is not None:
                vetadas.append(h)

    cambiadas, iguales, sigue_vacia, desconocidas, fallos = [], 0, 0, [], []

    for fichero, datos in paginas:
        if fichero not in validos:
            desconocidas.append(fichero)
            continue

        h_nueva = huella(datos)

        if any(misma_imagen(h_nueva, v) for v in vetadas):
            sigue_vacia += 1          # placeholder o avatar genérico: no es una foto
            continue

        actual = DESTINO / fichero
        if actual.exists() and misma_imagen(huella(actual.read_bytes()), h_nueva):
            iguales += 1
            continue
        try:
            img = procesar(datos)
            if not simular:
                DESTINO.mkdir(exist_ok=True)
                img.save(actual, "JPEG", quality=CALIDAD, optimize=True)
            cambiadas.append(fichero)
            print(f"  {'(simulado) ' if simular else ''}✓ {fichero}")
        except Exception as e:
            fallos.append((fichero, str(e)))
            print(f"  ✗ {fichero}: {e}")

    if cambiadas and not simular:
        # fotos.js se reconstruye a partir de lo que hay en artistas/
        import json
        presentes = {}
        for n in artistas_del_cartel():
            s = slugify(n)
            if (DESTINO / f"{s}.jpg").exists():
                presentes[s] = f"{s}.jpg"
        cab = ("/* Fotos de artistas — generado por bajar-fotos.py, cambiar-foto.py\n"
               "   y traer-de-canva.py. Clave = slug del artista. */\n\n")
        (RAIZ / "fotos.js").write_text(
            cab + "window.FOTOS = {\n" + "".join(
                f"  {json.dumps(k)}: {json.dumps(v)},\n" for k, v in sorted(presentes.items())
            ) + "};\n", encoding="utf-8")

    print(f"\n  cambiadas: {len(cambiadas)}   sin tocar: {iguales}   siguen sin foto: {sigue_vacia}")
    if desconocidas:
        print(f"  no reconocidas: {', '.join(desconocidas[:8])}")
    if fallos:
        print(f"  fallos: {len(fallos)}")
    if cambiadas and not simular:
        print('\nPara verlo en el móvil:  ./actualizar.sh "fotos nuevas"\n')
    else:
        print("")


if __name__ == "__main__":
    main()
