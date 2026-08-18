# Migración: Supabase Cloud → Infraestructura Self-Hosted

## 1. Objetivo y motivación

Dejar de depender de Supabase Cloud y llevar toda la infraestructura (base de datos, autenticación, jobs automáticos) a la VPS propia de la empresa, donde ya corre la app con Docker + Watchtower.

**Por qué:**
- Estamos en el plan free de Supabase (no se va a pagar Pro).
- La empresa quiere que todo viva en infraestructura propia, sin depender de terceros.

Este documento es la fuente de verdad del **estado actual** de la migración. Se actualiza a medida que se avanza — no es un plan estático.

## 2. Alcance

La migración reemplaza, en este orden:

1. **Base de datos**: Postgres propio en la VPS, reemplazando el Postgres de Supabase.
2. **Autenticación**: reemplaza Supabase Auth. En evaluación: NextAuth/Auth.js vs Better Auth (sin decidir todavía).
3. **Jobs automáticos**: los 2 jobs de `pg_cron` que existen hoy (`sync-encuestas-necesidad-llamado` cada 15 min, `check-campanas-sin-actividad` diario a las 9am UTC) pasan a ser endpoints de la app, disparados por cron a nivel de sistema operativo en la VPS.
4. **RLS**: las políticas de Row Level Security de Supabase se reemplazan por validación en la capa de aplicación (patrón estándar en Next.js + Postgres self-hosted sin PostgREST) — es un cambio de modelo de seguridad consciente, no una omisión.

## 3. Estrategia de trabajo

Todo el desarrollo de la migración se hace **en paralelo a producción, sin tocarla**, hasta el cutover final:

- **Rama de git**: `feature/migracion-self-hosted` — vive todo el trabajo ahí, nunca directo en `main`.
- **PR de tracking**: [#19](https://github.com/crucianelli/PlataformaNPS/pull/19) — abierta en modo **Draft** a propósito, no se mergea hasta que la migración esté completa y validada.
- **Imagen Docker separada**: el build de esta rama usa un tag distinto a `:latest` (que es el que Watchtower vigila en producción). `deploy.sh` tiene un guard que aborta si se corre fuera de `main`, para que un deploy accidental de este trabajo a producción sea imposible.
- **Ambiente de staging**: Postgres nuevo, aislado, corriendo en la misma VPS pero en un contenedor y red separados del de producción. En la práctica, en vez de integrarlo al `docker-compose.yml` único de IT (el plan original), quedó como stack standalone: `docker-compose.staging.yml` + `.env.staging` subidos por SCP a `~/npsplatform-staging/` en la VPS y levantados ahí con `docker compose -f docker-compose.staging.yml --env-file .env.staging up -d`. Igual se preservó lo importante: volumen propio (`npsplatform-staging_postgres_staging_data`) y el puerto sin exponer a internet (`127.0.0.1:5433->5432`, no `0.0.0.0`).
- **Subdominio de staging**: `staging.portalcrucianelli.site` — pendiente, todavía no se creó/usó (no hizo falta hasta ahora porque se accede a Postgres directo por túnel SSH, no por HTTP).

## 4. Estado actual

- [x] Guard en `deploy.sh` para bloquear deploys accidentales fuera de `main`.
- [x] Rama `feature/migracion-self-hosted` creada.
- [x] `docker-compose.staging.yml` con Postgres 16 aislado — validado localmente antes de subirlo.
- [x] PR #19 abierta en Draft, con instrucciones para IT.
- [x] Mensaje inicial enviado a IT con el contexto completo y el pedido de acceso.
- [x] IT (Franco Funes) confirmó: Postgres corre en Docker, se integra a su compose único, y va a crear el subdominio `staging.portalcrucianelli.site`.
- [x] Decisión de acceso: usuario personal con sudo en la VPS (no root compartido, no grupo `docker` — ver sección 5). Clave `id_ed25519_rasef_vps` generada y enviada a IT.
- [x] IT crea el usuario con sudo y confirma: usuario `posventa`, IP `200.58.99.137`, puerto SSH `5399` (no el 22 por defecto).
- [x] Probar la conexión SSH con el usuario nuevo — conecta y responde `docker ps` correctamente.
- [x] Subir `docker-compose.staging.yml` + `.env.staging` a la VPS y levantar el contenedor de staging — `npsplatform_postgres_staging` corriendo (`postgres:16`, `Up (healthy)`, `127.0.0.1:5433->5432`, sin exponer a internet).
- [x] Aplicar `supabase/migrations/*.sql` contra el Postgres de staging — las 13 tablas del schema quedaron creadas y verificadas. Se aplicó una versión filtrada (`migrations-selfhosted-staging/combined_selfhosted.sql`, generado localmente, no versionado en git) que omite a propósito: extensión/jobs de `pg_cron`, `CREATE POLICY`/`ENABLE ROW LEVEL SECURITY` (roles `authenticated`/`anon`/`service_role` no existen sin Supabase), y dos foreign keys a `auth.users(id)` (columnas `encuestas.marcado_sin_respuesta_por` y `encuesta_medidas.created_by`, que quedaron como `UUID` sin constraint hasta que se defina el nuevo sistema de Auth).
- [x] Migrar datos reales desde Supabase (`pg_dump` → `pg_restore`) al ambiente de staging — las 13 tablas migradas y verificadas (conteos + checksum de contenido idénticos entre origen y destino).
- [ ] Elegir ORM/data-access layer (propuesta: Drizzle, por ser SQL-first y no competir con las migraciones ya existentes).
- [ ] Migrar `services/*.ts` módulo por módulo, reemplazando `supabase.from(...)` por queries propias.
- [ ] Definir y evaluar Auth (NextAuth vs Better Auth).
- [ ] Reemplazar los 2 jobs de `pg_cron` por endpoints + cron de sistema.
- [ ] Definir estrategia de backups del Postgres de staging/producción con IT.
- [ ] Cutover final: sync de datos, ventana de mantenimiento corta, merge de la PR, switch de env vars.

## 5. Decisiones tomadas

| Decisión | Motivo |
|---|---|
| Rama + tag de imagen separados durante toda la migración | Evitar que un deploy accidental lleve código a medio migrar a producción |
| Postgres vanilla (sin PostgREST/GoTrue) en vez de self-hostear el stack completo de Supabase | Menos contenedores que operar; el equipo va a escribir su propia capa de auth y de acceso a datos, con control total |
| RLS se reemplaza por validación en capa de aplicación | Es el patrón estándar para Next.js + Postgres sin PostgREST; se acepta como trade-off consciente de seguridad, a compensar con disciplina en el código |
| pg_cron se reemplaza por endpoints de la app + cron de sistema | No tiene sentido mantener pg_cron sin el resto del stack Supabase; el patrón es el mismo que usa Vercel Cron |
| Acceso a la VPS: usuario personal con sudo (no túnel SSH restringido, no root compartido, no grupo `docker`) | Se evaluó primero un túnel SSH restringido solo al puerto de Postgres (mínimo privilegio posible), pero el desarrollador va a terminar operando la VPS en general (logs, containers), no solo consultando la DB de staging — un pedido tan acotado se quedaba corto para ese uso real. Se descartó el grupo `docker` y el usuario `root` compartido porque ambos son equivalentes a acceso root total del host (cualquier miembro de `docker` puede montar el filesystem del servidor dentro de un contenedor); un usuario personal con sudo da la misma capacidad operativa pero con auditoría y revocación individual. |

## 6. Accesos y configuración

**Nunca se documentan secretos reales acá.** Este archivo se versiona en git.

- Variables de entorno del Postgres de staging: ver `.env.staging.example` en la raíz del repo (plantilla sin valores reales). El `.env.staging` real (con password) está en la raíz del repo local, gitignoreado — es el mismo archivo que se subió a la VPS.
- Password real de `.env.staging`: la maneja el desarrollador, cambiada además la password de la cuenta Unix `posventa` en la VPS (a pedido de IT, por las dudas). No están en ningún archivo de git.
- **SSH a la VPS**: `ssh -p 5399 -i ~/.ssh/id_ed25519_rasef_vps posventa@200.58.99.137`. Usuario personal con sudo (ver sección 5). Puerto SSH `5399`, no el 22 por defecto — importante no asumir el default en otros contextos (ej. scripts, otros accesos).
- **Postgres de staging** (`127.0.0.1:5433` en la VPS, no expuesto a internet): para conectarse desde la compu de desarrollo hace falta un túnel SSH:
  ```bash
  ssh -p 5399 -i ~/.ssh/id_ed25519_rasef_vps -N -L 5433:127.0.0.1:5433 posventa@200.58.99.137
  ```
  Dejar esa terminal abierta (no imprime nada, es normal), y en otra terminal conectar a `localhost:5433` con las credenciales de `.env.staging` (`STAGING_DB_USER`/`STAGING_DB_PASSWORD`/`STAGING_DB_NAME`).
- **Migraciones aplicadas a staging**: se generaron localmente en `migrations-selfhosted-staging/` (raíz del repo, **no versionado en git**, es un artefacto de trabajo) — contiene `combined_selfhosted.sql` (las 31 migraciones concatenadas, con las partes de RLS/pg_cron/auth.users comentadas) y logs de qué se salteó por archivo. Útil como referencia si hay que resetear staging o para el `cutover` final a producción.

### Gotchas encontrados (para no perder tiempo de nuevo)

- **Contraseña de Postgres "pegada" a la primera inicialización**: `POSTGRES_PASSWORD` en el `.env` solo se aplica la primera vez que se crea el volumen. Si el volumen ya existía (de una prueba anterior con otra password), cambiar el `.env` después no tiene efecto — hay que `docker compose down -v` (borra el volumen) y `up -d` de nuevo, o hacer `ALTER USER ... WITH PASSWORD` a mano conectando por el socket local del contenedor (`docker exec -it <contenedor> psql -U <user> -d <db>`, que no pide password).
- **Puerto 5433 ocupado localmente**: el desarrollador tenía un contenedor viejo (`npsplatform_postgres_staging`, de cuando se validó `docker-compose.staging.yml` en su propia compu antes de que existiera la VPS de staging) corriendo en su máquina y ocupando el puerto 5433 — el túnel SSH no podía "ganar" ese puerto, y las conexiones caían silenciosamente en el contenedor local viejo en vez de ir a la VPS (síntoma: password authentication failed sin explicación aparente). Se resolvió con `docker stop npsplatform_postgres_staging` en la compu local. Si vuelve a pasar algo raro de auth, chequear primero `docker ps -a | grep postgres` en la compu local.
- **Migraciones con referencias a Supabase**: además de RLS/`pg_cron` (ya esperado), dos columnas tenían FK a `auth.users(id)` (`encuestas.marcado_sin_respuesta_por`, `encuesta_medidas.created_by`) — quedaron como `UUID` suelto sin constraint. Hay que recordar re-agregar la FK (contra la tabla de usuarios que sea del nuevo sistema de Auth) cuando esa fase se implemente.

## 7. Próximos pasos inmediatos

1. Elegir ORM/data-access layer (Drizzle es la propuesta, sin decidir formalmente todavía).
2. Empezar a migrar `services/*.ts` módulo por módulo.

## 8. Migración de datos reales a staging (2026-08-18)

Se migraron los datos reales de producción (Supabase Cloud) al Postgres de staging con `pg_dump --data-only -Fc` (vía Session Pooler, ver gotcha de conectividad abajo) y `pg_restore --data-only --disable-triggers`. Verificado con conteo de filas y checksum de contenido (columnas clave concatenadas + `md5`, agnóstico al orden físico de columnas) — coinciden exacto entre origen y destino en las 13 tablas.

**Antes del restore se truncaron las tablas de staging** (tenían datos de seed de prueba: 2 filas en `tipos_encuesta`, 3 en `plantillas_whatsapp`, nada real) para evitar conflictos de clave primaria.

### Hallazgo importante: drift de schema no versionado

El schema aplicado a staging (`migrations-selfhosted-staging/combined_selfhosted.sql`, generado 2026-08-04) quedó desactualizado — no por falta de migraciones nuevas en el repo, sino porque **producción tiene 11 columnas que no existen en ningún archivo de `supabase/migrations/`**, agregadas en algún momento directo en Supabase (Dashboard/SQL editor) sin dejar migración commiteada:

- `tipos_encuesta`: `config` (jsonb), `introduccion` (text), `preguntas` (jsonb)
- `respuestas`: `cumplimiento_expectativas`, `respuestas_raw`, `conformidad_acompanamiento_garantia`, `necesito_asistencia_urgente`, `calificacion_tiempo_respuesta_urgente`, `tuvo_reclamo_garantia`, `calificacion_resolucion_problema_garantia`, `comentario_problema_garantia`

Es el mismo patrón de raíz que ya había causado el bug arreglado por `20260720000000_fix_missing_fin_garantia_columns.sql` (esa migración documenta explícitamente que `20260630000000_tipos_encuesta.sql` "nunca terminó de aplicarse en producción"). Se agregaron las 11 columnas a mano en staging (`ALTER TABLE`, con los mismos tipos/checks que producción) para poder completar el restore, pero **queda pendiente escribir la migración real que documente estos cambios en el repo** — sin eso, cualquier reset de staging desde `supabase/migrations/` va a volver a quedar corto.

### Gotcha: conexión directa a Supabase es IPv6-only

`db.<project-ref>.supabase.co:5432` (conexión directa) solo resuelve a una IP IPv6, y la red de desarrollo no tenía salida IPv6 → `pg_dump` fallaba con "Network is unreachable". Solución: usar el **Session Pooler** de Supabase (Dashboard → Connect → "Session pooler"), que sí soporta IPv4. Importante usar el pooler en modo **sesión** (puerto 5432), no modo **transacción** (puerto 6543/PgBouncer) — este último no soporta las funciones que `pg_dump`/`pg_restore` necesitan.

- [x] Escribir migración formal para las 11 columnas del drift: `20260818000000_fix_missing_garantia_urgencia_columns.sql` (con `ADD COLUMN IF NOT EXISTS`, idempotente). Probada contra staging y aplicada contra producción (Supabase Cloud) vía `psql` directo — no-op esperado en ambas (las columnas ya existían), queda documentada en el repo de ahora en más.

### Pendiente

- [ ] Configurar `supabase login` (Personal Access Token) para que el CLI pueda trackear el historial de migraciones aplicadas — hoy esta migración se aplicó por `psql` directo, no vía `supabase db push`, así que no quedó registrada en la tabla interna de tracking del CLI (`supabase migration list` puede seguir mostrándola como pendiente; es inofensivo por el `IF NOT EXISTS` pero conviene prolijarlo).
- [ ] Revisar si hay más drift de schema no detectado en otras tablas/objetos (se comparó estructura completa de columnas de las 13 tablas, pero no funciones, triggers, ni vistas).
