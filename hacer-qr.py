#!/usr/bin/env python3
"""Genera el QR que sale al mantener pulsada la cabeza de EL DAÑO.

Sale a SVG, sin script ni librería en la app: el QR apunta siempre a la misma
dirección, así que se dibuja una vez aquí y en el móvil solo hay que pintarlo.
Además así se ve nítido a cualquier tamaño y funciona sin cobertura.

Necesita segno, que no hace falta tener instalado para nada más:

    python3 -m venv /tmp/venv-qr && /tmp/venv-qr/bin/pip install segno
    /tmp/venv-qr/bin/python hacer-qr.py

Corrección de errores alta (H): el QR se va a leer de una pantalla con brillo,
de noche y a pulso, y con H aguanta que se coma hasta un 30% del dibujo.
"""

import segno

URL = 'https://franciscoquintana281104-cloud.github.io/riverlapp/'
SALIDA = 'qr-riverlapp.svg'

# Fondo claro obligatorio: el panel de la app es negro y un QR oscuro sobre
# oscuro no lo lee ningún móvil. omitsize deja el viewBox para escalarlo por CSS.
qr = segno.make(URL, error='h')
qr.save(SALIDA, scale=1, border=2, dark='#0a0a0c', light='#f2f0ee',
        svgclass=None, lineclass=None, omitsize=True)

print(f'{SALIDA}  version {qr.version}  {qr.symbol_size(scale=1, border=2)}  ->  {URL}')
