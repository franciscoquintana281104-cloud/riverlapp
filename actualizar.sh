#!/bin/bash
# Sube los cambios de RIVERLAPP y hace que los móviles se enteren.
#
#   ./actualizar.sh "arreglada la foto de Taichu"
#
# Sube la versión del service worker (si no, los móviles siguen con lo viejo),
# commitea y hace push. GitHub Pages se reconstruye solo en 1-2 minutos.
set -e

CARPETA="$(cd "$(dirname "$0")" && pwd)"
cd "$CARPETA"

MENSAJE="${1:-Actualizar RIVERLAPP}"

echo ""
echo "  RIVERLAPP → actualizar"
echo "  ──────────────────────"
echo ""

if [ -z "$(git status --porcelain)" ]; then
  echo "  No hay ningún cambio que subir."
  echo ""
  exit 0
fi

echo "  Cambios detectados:"
git status --short | sed 's/^/    /'
echo ""

# ── Subir la versión de la caché ───────────────────────────────────────
VIEJA=$(grep -o "riverlapp-v[0-9]*" sw.js | head -1)
NUM=${VIEJA##*-v}
NUEVA="riverlapp-v$((NUM + 1))"
sed -i '' "s/$VIEJA/$NUEVA/" sw.js
echo "  · Versión de caché: $VIEJA → $NUEVA"

# ── Commit y push ──────────────────────────────────────────────────────
git add -A
git commit -q -m "$MENSAJE"
echo "  · Commit hecho"

echo "  · Subiendo..."
git push -q origin main
echo "    ✓ subido"

USUARIO=$(git remote get-url origin | sed -E 's#.*github.com[:/]([^/]+)/.*#\1#')
REPO=$(git remote get-url origin | sed -E 's#.*/([^/]+)\.git#\1#')

echo ""
echo "  GitHub Pages se reconstruye solo en 1-2 min."
echo "  https://$USUARIO.github.io/$REPO/"
echo ""
echo "  En el móvil: ábrela CON DATOS y ciérrala. Vuelve a abrirla"
echo "  y ya tendrás la versión nueva."
echo ""
