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

# Hay algo que entregar si el árbol está sucio O si hay commits sin subir.
# (Mirar solo el árbol dejaba colgados los commits ya hechos pero sin push.)
SUCIO="$(git status --porcelain)"
git fetch -q origin 2>/dev/null || true
PENDIENTES=$(git rev-list --count origin/main..HEAD 2>/dev/null || echo 0)

if [ -z "$SUCIO" ] && [ "$PENDIENTES" -eq 0 ]; then
  echo "  Todo está ya publicado. No hay nada que subir."
  echo ""
  exit 0
fi

if [ -n "$SUCIO" ]; then
  echo "  Cambios sin guardar:"
  git status --short | sed 's/^/    /'
fi
if [ "$PENDIENTES" -gt 0 ]; then
  echo "  Commits hechos pero sin subir: $PENDIENTES"
fi
echo ""

# ── Subir la versión de la caché ───────────────────────────────────────
VIEJA=$(grep -o "riverlapp-v[0-9]*" sw.js | head -1)
NUM=${VIEJA##*-v}
NUEVA="riverlapp-v$((NUM + 1))"
sed -i '' "s/$VIEJA/$NUEVA/" sw.js
echo "  · Versión de caché: $VIEJA → $NUEVA"

# ── Commit y push ──────────────────────────────────────────────────────
git add -A
if git diff --cached --quiet; then
  echo "  · Nada nuevo que commitear, solo queda subir lo pendiente"
else
  git commit -q -m "$MENSAJE"
  echo "  · Commit hecho"
fi

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
