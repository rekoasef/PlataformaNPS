# Jobs programados (reemplazo de `pg_cron`)

Supabase corría dos jobs con `pg_cron`. Al pasar a Postgres self-hosted la extensión
no está, pero **las dos funciones son SQL puro y ya viven en la base** — se portaron
con el schema. Lo único que hubo que reemplazar es el que las llama.

| Job | Función | Frecuencia | Qué hace |
|---|---|---|---|
| `sync` | `sync_encuestas_necesidad_llamado()` | cada 15 min | Pasa encuestas de `recordatorio_enviado` a `necesidad_de_llamado` cuando vence el plazo de `system_config.dias_hasta_llamado`. Devuelve cuántas actualizó. |
| `notificaciones` | `check_campanas_sin_actividad()` | diario 09:00 **UTC** | Inserta una notificación por campaña activa que lleva +7 días sin respuestas nuevas. Tiene guarda de 24h para no repetir. |

No hay endpoint HTTP de por medio a propósito: la lógica ya está en la base, así que
un endpoint solo agregaría un salto de red, un secreto que proteger y la dependencia
de que la app esté levantada.

## Instalación en la VPS

```bash
# 1. Copiar el script (desde la máquina de desarrollo)
scp -P 5399 -i ~/.ssh/id_ed25519_rasef_vps \
    scripts/cron/nps-jobs.sh posventa@200.58.99.137:/tmp/nps-jobs.sh

# 2. En la VPS, dejarlo en su lugar
sudo install -m 755 -o root -g root /tmp/nps-jobs.sh /usr/local/bin/nps-jobs.sh
sudo touch /var/log/nps-jobs.log

# 3. Probar a mano ANTES de programarlo
sudo /usr/local/bin/nps-jobs.sh sync
sudo /usr/local/bin/nps-jobs.sh notificaciones
sudo cat /var/log/nps-jobs.log
```

Recién cuando esas dos corridas loguean `ok`, programarlo con `sudo crontab -e`:

```cron
CRON_TZ=UTC

*/15 * * * * /usr/local/bin/nps-jobs.sh sync
0 9    * * * /usr/local/bin/nps-jobs.sh notificaciones
```

## Dos cosas que lo rompen callado

**El huso horario.** `pg_cron` corría en **UTC**; el cron del sistema usa la hora local
de la VPS. Sin la línea `CRON_TZ=UTC`, el job diario se corre a una hora distinta de la
que venía. No falla: simplemente pasa a otro horario y nadie se entera.

**Los permisos de Docker.** El acceso a la VPS es usuario con sudo, **sin** grupo `docker`
(fue una decisión, ver sección 5 del doc de migración). Por eso el crontab va en el de
**root** (`sudo crontab -e`) y no en el del usuario: desde un crontab de usuario,
`docker exec` falla y el error se va al mail de cron, que nadie lee.

## Verificar que está andando

```bash
sudo tail -20 /var/log/nps-jobs.log
```

Cada línea es `<timestamp UTC> [job] ok` — y `sync` agrega `-> N` con las filas que
actualizó. `-> 0` es normal y esperado la mayor parte del tiempo.

**Ojo:** `-> 0` también es lo que se ve si el job está roto de una forma que no da error.
Si `system_config` no tiene fila, `sync` no actualiza nada y **no se queja** (la función
hace `CROSS JOIN` contra esa config). Si sospechás, verificá:

```bash
docker exec <contenedor> psql -U <user> -d <db> -tAc "SELECT dias_hasta_llamado FROM system_config"
```

## Desactivar

```bash
sudo crontab -e   # comentar las dos líneas
```

## Configuración

Los defaults del script apuntan a **staging**. Se sobreescriben por variables de entorno:

| Variable | Default |
|---|---|
| `NPS_PG_CONTAINER` | `npsplatform_postgres_staging` |
| `NPS_DB_USER` | `nps_staging` |
| `NPS_DB_NAME` | `npsplatform_staging` |
| `NPS_LOG` | `/var/log/nps-jobs.log` |
| `NPS_LOCK_DIR` | `/var/lock` |

En el crontab se ponen antes del comando: `NPS_PG_CONTAINER=... /usr/local/bin/nps-jobs.sh sync`.

## En el cutover

1. Apuntar las variables al Postgres de **producción** self-hosted.
2. El `pg_cron` viejo deja de correr solo cuando se apague el proyecto de Supabase.
   **Mientras los dos existan, los dos jobs corren contra bases distintas** — inofensivo
   antes del cutover (son bases separadas), pero hay que apagar Supabase para que no
   quede nada corriendo sobre datos viejos.
3. Verificar el log al día siguiente: el job diario tiene que haber corrido a las 09:00 UTC.

## Verificación hecha (2026-08-20)

- Las dos funciones se ejecutaron **contra staging** dentro de una transacción con
  `ROLLBACK`: `sync` devolvió `1` sobre un caso fabricado y `0` en la segunda corrida;
  `check_campanas_sin_actividad` insertó 6 notificaciones y `0` en la segunda (guarda de
  24h). Staging quedó intacto.
- El script se probó contra un Postgres descartable con el mismo schema: argumento
  inválido → exit 64, contenedor inexistente → loguea el error y sale distinto de 0,
  dos corridas simultáneas → la segunda se saltea por el `flock`, y el log muestra
  `ok -> 1` cuando hay cambios y `ok -> 0` cuando no.
- **Ensayo en la VPS (2026-08-20)**: el script corrió contra staging desde la VPS de verdad
  (sin root, ver abajo) y logueó `[sync] ok -> 0` y `[notificaciones] ok`. `sync -> 0` es el
  resultado correcto: no hay encuestas en `recordatorio_enviado` en staging. Y como
  `check_campanas_sin_actividad()` no devuelve valor, se confirmó su efecto en la base:
  **insertó las 6 notificaciones** esperadas. Quedaron en staging a propósito, como evidencia
  del ensayo.
- **Sin probar todavía**: el crontab de root y `CRON_TZ` — necesitan la contraseña de `posventa`,
  pendiente de que IT la resetee.

## Nota sobre permisos (2026-08-20)

En el ensayo apareció que el usuario `posventa` está en el grupo `docker`
(`groups=1001(posventa),990(docker)`), así que `docker exec` anda **sin sudo**. Eso permitió
hacer el ensayo sin root, pero **contradice la decisión de acceso documentada** (sección 5 del
doc de migración): se había descartado el grupo `docker` justamente porque equivale a root en el
host y no deja auditoría individual. Consultado con IT; hasta que se resuelva, el crontab va
igual en el de root, que es lo correcto independientemente de esto.
