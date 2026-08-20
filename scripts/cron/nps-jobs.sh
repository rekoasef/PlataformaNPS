#!/usr/bin/env bash
#
# Reemplazo de los jobs de pg_cron que corrían en Supabase.
#
# Las dos funciones son SQL puro y ya viven en el Postgres self-hosted; esto es
# solo el que las llama. Se instala en el crontab de root de la VPS (ver README.md).
#
# Uso:
#   nps-jobs.sh sync            -> sync_encuestas_necesidad_llamado()   (cada 15 min)
#   nps-jobs.sh notificaciones  -> check_campanas_sin_actividad()       (diario 09:00 UTC)
#
# Configuración por variables de entorno (los defaults apuntan a STAGING):
#   NPS_PG_CONTAINER  contenedor de Postgres          (default: npsplatform_postgres_staging)
#   NPS_DB_USER       usuario                          (default: nps_staging)
#   NPS_DB_NAME       base                             (default: npsplatform_staging)
#   NPS_LOG           archivo de log                   (default: /var/log/nps-jobs.log)
#   NPS_LOCK_DIR      donde dejar los lockfiles        (default: /var/lock)
#
set -euo pipefail

JOB="${1:-}"
PG_CONTAINER="${NPS_PG_CONTAINER:-npsplatform_postgres_staging}"
DB_USER="${NPS_DB_USER:-nps_staging}"
DB_NAME="${NPS_DB_NAME:-npsplatform_staging}"
LOG="${NPS_LOG:-/var/log/nps-jobs.log}"
LOCK_DIR="${NPS_LOCK_DIR:-/var/lock}"

case "$JOB" in
  sync)           FN='SELECT public.sync_encuestas_necesidad_llamado();' ;;
  notificaciones) FN='SELECT public.check_campanas_sin_actividad();' ;;
  *)
    echo "uso: $(basename "$0") <sync|notificaciones>" >&2
    exit 64
    ;;
esac

log() { printf '%s [%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$JOB" "$*" >> "$LOG"; }

# Un solo proceso por job. Si una corrida se cuelga, la siguiente no se apila:
# sale en silencio (exit 0) para no llenar el log ni el mail de cron.
LOCK="${LOCK_DIR}/nps-jobs-${JOB}.lock"
exec 9>"$LOCK"
if ! flock -n 9; then
  log "salteado: ya hay una corrida en curso"
  exit 0
fi

# Sin -it: cron no tiene TTY. Adentro del contenedor psql entra por socket local
# y no pide password.
if salida=$(docker exec "$PG_CONTAINER" \
              psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -tAc "$FN" 2>&1); then
  # `sync` devuelve la cantidad de filas actualizadas; `check` no devuelve nada.
  log "ok${salida:+ -> $salida}"
else
  codigo=$?
  log "ERROR (exit $codigo): ${salida//$'\n'/ | }"
  exit "$codigo"
fi
