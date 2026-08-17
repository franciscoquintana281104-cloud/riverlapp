#!/usr/bin/env python3
"""Sustituye la foto de un artista en la app.

    python3 cambiar-foto.py "Cybernene" ~/Downloads/loquesea.jpg
    python3 cambiar-foto.py "soto asa" ~/Desktop/foto.heic
    python3 cambiar-foto.py --quitar "Tarchi"          # vuelve a la portada generada
    python3 cambiar-foto.py --carpeta ~/Desktop/nuevas  # varias de golpe

El nombre del artista no hace falta que sea exacto: busca el más parecido del
cartel y te lo confirma antes de tocar nada. Acepta cualquier formato de imagen,
incluido el HEIC del iPhone. La recorta y la deja al tamaño que usa la app.
"""

import json
import re
import subprocess
import sys
import tempfile
import unicodedata
from pathlib import Path

from PIL import Image

RAIZ = Path(__file__).parent
DESTINO = RAIZ / "artistas"
LADO = 720
CALIDAD = 82
EXTS = {".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif", ".tif", ".tiff", ".bmp", ".gif"}


def normalizar(s):
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]", "", s.lower())


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


def buscar_artista(consulta):
    """Exacto → empieza por → contiene → error con sugerencias."""
    nombres = artistas_del_cartel()
    q = normalizar(consulta)
    if not q:
        return None, nombres
    exactos = [n for n in nombres if normalizar(n) == q]
    if exactos:
        return exactos[0], None
    empiezan = [n for n in nombres if normalizar(n).startswith(q)]
    if len(empiezan) == 1:
        return empiezan[0], None
    contienen = [n for n in nombres if q in normalizar(n)]
    if len(contienen) == 1:
        return contienen[0], None
    candidatos = empiezan or contienen
    return None, candidatos or nombres


def abrir_imagen(ruta):
    """PIL no lee HEIC; en macOS tiramos de sips para convertirlo."""
    try:
        return Image.open(ruta).convert("RGB")
    except Exception:
        if ruta.suffix.lower() not in {".heic", ".heif"}:
            raise
    tmp = Path(tempfile.mkdtemp()) / "conv.jpg"
    subprocess.run(
        ["sips", "-s", "format", "jpeg", str(ruta), "--out", str(tmp)],
        check=True, capture_output=True,
    )
    return Image.open(tmp).convert("RGB")


def instalar(nombre, origen):
    slug = slugify(nombre)
    img = abrir_imagen(origen)

    # recorte cuadrado, tirando hacia arriba: ahí suele estar la cara
    lado = min(img.size)
    izq = (img.width - lado) // 2
    arr = max(0, (img.height - lado) // 4)
    img = img.crop((izq, arr, izq + lado, arr + lado))
    img = img.resize((LADO, LADO), Image.LANCZOS)

    DESTINO.mkdir(exist_ok=True)
    salida = DESTINO / f"{slug}.jpg"
    nueva = not salida.exists()
    img.save(salida, "JPEG", quality=CALIDAD, optimize=True)
    actualizar_fotos_js()
    kb = salida.stat().st_size // 1024
    print(f"  ✓ {nombre}  →  artistas/{slug}.jpg  ({kb} KB)" + ("  [nueva]" if nueva else "  [sustituida]"))
    return True


def quitar(nombre):
    slug = slugify(nombre)
    f = DESTINO / f"{slug}.jpg"
    if not f.exists():
        print(f"  · {nombre} ya no tenía foto")
        return False
    f.unlink()
    actualizar_fotos_js()
    print(f"  ✓ {nombre}: foto quitada, vuelve a la portada generada")
    return True


def actualizar_fotos_js():
    """fotos.js se reconstruye a partir de lo que hay en artistas/."""
    presentes = {}
    for n in artistas_del_cartel():
        s = slugify(n)
        if (DESTINO / f"{s}.jpg").exists():
            presentes[s] = f"{s}.jpg"
    cab = (
        "/* Fotos de artistas — generado por bajar-fotos.py y cambiar-foto.py.\n"
        "   Clave = slug del artista, valor = fichero dentro de artistas/.\n"
        "   Los que no están aquí usan su portada generada por código. */\n\n"
    )
    cuerpo = "window.FOTOS = {\n" + "".join(
        f"  {json.dumps(k)}: {json.dumps(v)},\n" for k, v in sorted(presentes.items())
    ) + "};\n"
    (RAIZ / "fotos.js").write_text(cab + cuerpo, encoding="utf-8")


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        return

    cambios = 0

    # ── varias de golpe: cada fichero se llama como el artista ──
    if args[0] == "--carpeta":
        if len(args) < 2:
            sys.exit("Falta la carpeta.")
        carpeta = Path(args[1]).expanduser()
        if not carpeta.is_dir():
            sys.exit(f"No existe la carpeta: {carpeta}")
        ficheros = [f for f in sorted(carpeta.iterdir()) if f.suffix.lower() in EXTS]
        if not ficheros:
            sys.exit(f"No hay imágenes en {carpeta}")
        print(f"\n{len(ficheros)} imágenes en {carpeta}\n")
        for f in ficheros:
            nombre, cand = buscar_artista(f.stem)
            if not nombre:
                print(f"  ✗ {f.name}: no sé de quién es")
                if cand and len(cand) <= 6:
                    print(f"      ¿querías decir? {', '.join(cand)}")
                continue
            try:
                if instalar(nombre, f):
                    cambios += 1
            except Exception as e:
                print(f"  ✗ {f.name}: {e}")

    # ── quitar una ──
    elif args[0] == "--quitar":
        if len(args) < 2:
            sys.exit("Falta el nombre del artista.")
        nombre, cand = buscar_artista(args[1])
        if not nombre:
            print(f"No encuentro «{args[1]}» en el cartel.")
            if cand and len(cand) <= 10:
                print("¿Querías decir? " + ", ".join(cand))
            sys.exit(1)
        print("")
        if quitar(nombre):
            cambios += 1

    # ── una suelta ──
    else:
        if len(args) < 2:
            sys.exit('Uso: python3 cambiar-foto.py "Artista" ruta/a/la/foto.jpg')
        nombre, cand = buscar_artista(args[0])
        if not nombre:
            print(f"No encuentro «{args[0]}» en el cartel.")
            if cand and len(cand) <= 10:
                print("¿Querías decir? " + ", ".join(cand))
            sys.exit(1)
        origen = Path(args[1]).expanduser()
        if not origen.exists():
            sys.exit(f"No existe el fichero: {origen}")
        print("")
        if instalar(nombre, origen):
            cambios += 1

    if cambios:
        print(f"\n{cambios} foto(s) cambiada(s). Para verlo en el móvil:")
        print('  ./actualizar.sh "fotos nuevas"\n')
    else:
        print("\nNo se cambió nada.\n")


if __name__ == "__main__":
    main()
