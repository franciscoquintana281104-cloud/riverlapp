#!/usr/bin/env python3
"""Prepara los eructos del botón de la cabeza.

Los originales son WAV estéreo de 44 kHz: 2 MB entre los cinco, que habría que
precachear entero para que suenen sin cobertura. Aquí salen en AAC mono, que es
lo que reproduce cualquier iPhone, ocupando una fracción.

De paso se les recorta el silencio de los extremos (que retrasaba el sonido
respecto al toque) y se igualan de volumen, porque venían muy dispares.

    python3 hacer-eructos.py
"""

import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

ORIGEN = Path('audio/origen')
DESTINO = Path('audio')
PICO = -1.0        # dBFS a los que se lleva el pico de cada eructo
BITRATE = '96k'

FFMPEG = shutil.which('ffmpeg') or '/opt/homebrew/bin/ffmpeg'
FFPROBE = shutil.which('ffprobe') or '/opt/homebrew/bin/ffprobe'


def corre(args):
    r = subprocess.run(args, capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit(f'ffmpeg falló:\n{r.stderr[-800:]}')
    return r.stderr + r.stdout


def ganancia(ruta):
    """Cuántos dB hay que subir para que el pico quede en PICO."""
    salida = corre([FFMPEG, '-i', str(ruta), '-af', 'volumedetect', '-f', 'null', '-'])
    m = re.search(r'max_volume:\s*(-?\d+(?:\.\d+)?) dB', salida)
    return PICO - float(m.group(1)) if m else 0.0


def duracion(ruta):
    out = corre([FFPROBE, '-v', 'error', '-show_entries', 'format=duration',
                 '-of', 'json', str(ruta)])
    return float(json.loads(out)['format']['duration'])


DESTINO.mkdir(exist_ok=True)
fuentes = sorted(ORIGEN.glob('*.wav'))
if not fuentes:
    sys.exit(f'no hay WAV en {ORIGEN}/')

nombres = []
for i, src in enumerate(fuentes, 1):
    dst = DESTINO / f'eructo-{i}.m4a'
    g = ganancia(src)
    # silenceremove dos veces con un reverse en medio: la primera pasada come
    # el silencio de la cabeza y la segunda, tras dar la vuelta, el de la cola
    filtro = (
        f'volume={g:.1f}dB,'
        'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.02,'
        'areverse,'
        'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.02,'
        'areverse'
    )
    corre([FFMPEG, '-y', '-i', str(src), '-af', filtro,
           '-ac', '1', '-c:a', 'aac', '-b:a', BITRATE, '-movflags', '+faststart',
           str(dst)])
    nombres.append(dst.name)
    print(f'{src.name}  {duracion(src):.2f}s {src.stat().st_size // 1024} KB'
          f'  ->  {dst.name}  {duracion(dst):.2f}s {dst.stat().st_size // 1024} KB'
          f'  ({g:+.1f} dB)')

print(f'\n{len(nombres)} eructos. En app.js: N_ERUCTOS = {len(nombres)}')
