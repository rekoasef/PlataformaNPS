#!/bin/bash
#
# Deploy a STAGING (la VPS, contra el Postgres self-hosted).
#
# Diferencia clave con deploy.sh: **este script no toca Docker Hub**. La imagen
# viaja punto a punto por SSH (docker save | ssh docker load), así que Watchtower
# —que mira crucianelli/npsplatform:latest en el registro— no puede verla ni
# desplegarla a producción por accidente. Es a propósito: mientras dure la
# migración, staging no debe poder pisar producción de ninguna forma.
#
# Por qué se buildea aparte y no se reusa la imagen de producción: Next reemplaza
# NEXT_PUBLIC_APP_URL por su valor en tiempo de build (ver Dockerfile), así que
# una imagen buildeada para posventa.portalcrucianelli.site genera links a
# producción aunque la corras en staging.
#
# Uso:
#   ./deploy-staging.sh
#
# Variables (los defaults apuntan a la VPS de staging):
#   STAGING_APP_URL   URL pública desde la que se accede    (default: https://staging.portalcrucianelli.site)
#   STAGING_SSH_HOST  usuario@ip de la VPS                  (default: posventa@200.58.99.137)
#   STAGING_SSH_PORT  puerto SSH                            (default: 5399)
#
# OJO mientras el subdominio no exista: si vas a probar por túnel SSH contra
# 127.0.0.1, hay que buildear con esa URL o los links salen apuntando a un host
# que todavía no resuelve:
#   STAGING_APP_URL=http://localhost:3001 ./deploy-staging.sh
#
set -euo pipefail

IMAGE_NAME="crucianelli/npsplatform"
TAG="staging"
APP_URL="${STAGING_APP_URL:-https://staging.portalcrucianelli.site}"
SSH_HOST="${STAGING_SSH_HOST:-posventa@200.58.99.137}"
SSH_PORT="${STAGING_SSH_PORT:-5399}"

CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" = "main" ]; then
  echo "Error: estás en 'main'. Este script es para la rama de migración."
  echo "Para deployar producción usá ./deploy.sh."
  exit 1
fi

# Fallar acá y no después de esperar el build entero.
echo "→ Verificando acceso SSH a $SSH_HOST..."
if ! ssh -p "$SSH_PORT" -o BatchMode=yes -o ConnectTimeout=15 "$SSH_HOST" "docker info >/dev/null"; then
  echo "Error: no se pudo conectar por SSH o el usuario no puede usar docker."
  echo "Si la clave tiene passphrase, cargala primero en el agent:"
  echo '  eval "$(ssh-agent -s)" && ssh-add ~/.ssh/id_ed25519_rasef_vps'
  exit 1
fi

echo "→ Buildeando $IMAGE_NAME:$TAG (rama '$CURRENT_BRANCH', APP_URL=$APP_URL)..."
docker build \
  --build-arg NEXT_PUBLIC_APP_URL="$APP_URL" \
  -t "$IMAGE_NAME:$TAG" \
  .

echo "→ Enviando la imagen por SSH (sin pasar por Docker Hub)..."
docker save "$IMAGE_NAME:$TAG" \
  | gzip \
  | ssh -p "$SSH_PORT" "$SSH_HOST" "gunzip | docker load"

echo
echo "✓ Imagen $IMAGE_NAME:$TAG disponible en la VPS."
echo
echo "  Todavía NO está corriendo: levantarla es el paso siguiente y necesita"
echo "  las variables de runtime (DATABASE_URL, BETTER_AUTH_SECRET,"
echo "  BETTER_AUTH_URL, SMTP_*, WHATSAPP_AGENTE_TOKEN) en la VPS."
echo
echo "  OJO con SMTP: system_config de staging tiene destinatarios reales de"
echo "  producción. Neutralizar el SMTP antes de navegar la app, o salen"
echo "  alertas de verdad a gente de la empresa."
