#!/bin/bash
# Publica RIVERLAPP en GitHub Pages.
# Antes de esto tienes que haber hecho una vez:  gh auth login
set -e

CARPETA="$(cd "$(dirname "$0")" && pwd)"
REPO="riverlapp"
cd "$CARPETA"

echo ""
echo "  RIVERLAPP → GitHub Pages"
echo "  ────────────────────────"
echo ""

# ── 1. ¿Estás identificado? ────────────────────────────────────────────
if ! gh auth status >/dev/null 2>&1; then
  echo "  ✗ No has iniciado sesión en GitHub."
  echo ""
  echo "    Ejecuta primero:   gh auth login"
  echo ""
  echo "    Responde: GitHub.com → HTTPS → Y → Login with a web browser"
  echo "    Te dará un código, lo pegas en el navegador que se abre, y ya."
  echo ""
  exit 1
fi

USUARIO=$(gh api user --jq .login)
echo "  Identificado como: $USUARIO"
echo ""

# ── 2. Crear el repo (o reutilizarlo si ya existe) ─────────────────────
if gh repo view "$USUARIO/$REPO" >/dev/null 2>&1; then
  echo "  · El repo $USUARIO/$REPO ya existe, lo reutilizo"
  git remote remove origin 2>/dev/null || true
  git remote add origin "https://github.com/$USUARIO/$REPO.git"
else
  echo "  · Creando el repo $USUARIO/$REPO (público)..."
  gh repo create "$REPO" --public --source . --remote origin \
    --description "Tu horario de Riverland Asturias 2026, montado a tu medida"
fi

# ── 3. Subir ───────────────────────────────────────────────────────────
echo "  · Subiendo los archivos (son 5,5 MB, tarda un poco)..."
git push -u origin main --quiet
echo "    ✓ subido"

# ── 4. Activar GitHub Pages ────────────────────────────────────────────
echo "  · Activando GitHub Pages..."
if gh api "repos/$USUARIO/$REPO/pages" >/dev/null 2>&1; then
  echo "    ✓ ya estaba activado"
else
  gh api -X POST "repos/$USUARIO/$REPO/pages" \
    -f "source[branch]=main" -f "source[path]=/" >/dev/null 2>&1 \
    && echo "    ✓ activado" \
    || echo "    ! no se pudo activar solo — actívalo en Settings → Pages"
fi

URL="https://$USUARIO.github.io/$REPO/"

# ── 5. Esperar a que publique ──────────────────────────────────────────
echo "  · Esperando a que GitHub la publique (1-3 min)..."
for i in $(seq 1 40); do
  CODIGO=$(curl -s -o /dev/null -w "%{http_code}" "$URL" || echo "000")
  if [ "$CODIGO" = "200" ]; then
    echo "    ✓ ya está en el aire"
    break
  fi
  printf "\r    ... %s s" $((i * 10))
  sleep 10
done
echo ""

echo ""
echo "  ────────────────────────────────────────────────"
echo "   $URL"
echo "  ────────────────────────────────────────────────"
echo ""
echo "  En el iPHONE, con SAFARI (en Chrome no funciona):"
echo "    1. Abre esa dirección"
echo "    2. Botón compartir → Añadir a pantalla de inicio"
echo "    3. Ábrela y déjala unos segundos CON DATOS:"
echo "       ahí se descarga las 69 fotos para el modo sin cobertura"
echo ""
echo "  Para comprobar que quedó bien: modo avión y ábrela."
echo "  Debe cargar entera."
echo ""

command -v qrencode >/dev/null 2>&1 && { echo "  Para el grupo:"; qrencode -t ANSIUTF8 "$URL"; }
