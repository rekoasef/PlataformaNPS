#!/bin/bash
set -e

IMAGE_NAME="crucianelli/npsplatform"
TAG="latest"

CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo "Error: estás en la rama '$CURRENT_BRANCH', no en 'main'."
  echo "Este script pushea a '$IMAGE_NAME:$TAG', que Watchtower despliega directo a producción."
  echo "Cambiá a 'main' antes de correr deploy.sh, o usá el script de staging."
  exit 1
fi

if [ ! -f .env.local ]; then
  echo "Error: no se encontró .env.local"
  exit 1
fi

NEXT_PUBLIC_SUPABASE_URL=$(grep '^NEXT_PUBLIC_SUPABASE_URL=' .env.local | cut -d '=' -f2-)
NEXT_PUBLIC_SUPABASE_ANON_KEY=$(grep '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' .env.local | cut -d '=' -f2-)
NEXT_PUBLIC_APP_URL="https://posventa.portalcrucianelli.site"

echo "→ Buildeando imagen $IMAGE_NAME:$TAG..."
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  --build-arg NEXT_PUBLIC_APP_URL="$NEXT_PUBLIC_APP_URL" \
  -t "$IMAGE_NAME:$TAG" \
  .

echo "→ Pusheando a Docker Hub..."
docker push "$IMAGE_NAME:$TAG"

echo "✓ Listo. Watchtower actualizará la VPS en menos de 5 minutos."
