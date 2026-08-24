#!/bin/bash
#
# Deploy a PRODUCCIÓN.
#
# Buildea y pushea a crucianelli/npsplatform:latest, que es el tag que mira
# Watchtower en la VPS: pushear acá **es** deployar a producción, sin
# confirmación intermedia. Por eso el guard de rama de abajo.
#
# Para staging usar ./deploy-staging.sh, que no toca Docker Hub.
#
set -euo pipefail

IMAGE_NAME="crucianelli/npsplatform"
TAG="latest"
APP_URL="https://posventa.portalcrucianelli.site"

CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo "Error: estás en la rama '$CURRENT_BRANCH', no en 'main'."
  echo "Este script pushea a '$IMAGE_NAME:$TAG', que Watchtower despliega directo a producción."
  echo "Cambiá a 'main' antes de correr deploy.sh, o usá ./deploy-staging.sh."
  exit 1
fi

echo "→ Buildeando imagen $IMAGE_NAME:$TAG (APP_URL=$APP_URL)..."
docker build \
  --build-arg NEXT_PUBLIC_APP_URL="$APP_URL" \
  -t "$IMAGE_NAME:$TAG" \
  .

echo "→ Pusheando a Docker Hub..."
docker push "$IMAGE_NAME:$TAG"

echo "✓ Listo. Watchtower actualizará la VPS en menos de 5 minutos."
