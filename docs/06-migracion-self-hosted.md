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
2. **Autenticación**: reemplaza Supabase Auth con **Better Auth** (decidido 2026-08-19, ver sección 13).
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
- [x] Elegir ORM/data-access layer: **Drizzle**, decidido y configurado (ver sección 9).
- [x] Migrar `services/*.ts` módulo por módulo, reemplazando `supabase.from(...)` por queries propias (ver sección 10; queda `usuarios.service.ts` bloqueado por Auth).
- [x] Migrar `src/app/encuesta/*` — formulario público (ver sección 12).
- [x] Auth: **Better Auth** elegido e implementado, y las FKs a `auth_user` reconectadas (ver sección 13). Falta correr la migración de usuarios en producción durante el cutover.
- [x] Reemplazar los 2 jobs de `pg_cron`: las funciones ya estaban portadas y se verificaron contra staging; el script y el runbook están en `scripts/cron/`. Se descartó el endpoint HTTP: la lógica es SQL puro que ya vive en la base. **Instalado y corriendo en la VPS** desde el 2026-08-20, en el crontab de `posventa` (interino: no hay sudo, ver la nota de permisos del README). El 2026-08-21 se verificó que `CRON_TZ=UTC` **no funciona** en este cron y se corrigió el crontab; el job diario quedó a las 09:00 local (12:00 UTC).
- [x] Sacar a `mensajes.py` (el agente de WhatsApp) de Supabase — ver sección 14.
- [x] Auditoría de autorización de toda la superficie servidor (actions + route handlers) — ver sección 15.
- [ ] Definir estrategia de backups del Postgres de staging/producción con IT — **pedido hecho el 2026-08-24, esperando a IT** (ver sección 7.1).
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
  ssh -p 5399 -i ~/.ssh/id_ed25519_rasef_vps -N -L 5434:127.0.0.1:5433 posventa@200.58.99.137
  ```
  Dejar esa terminal abierta (no imprime nada, es normal), y en otra terminal conectar a `localhost:5434` con las credenciales de `.env.staging` (`STAGING_DB_USER`/`STAGING_DB_PASSWORD`/`STAGING_DB_NAME`). El lado local es **5434** (no 5433) por el conflicto de puertos descrito en los gotchas; el lado remoto sigue siendo 5433.
- **SSH agent (la clave tiene passphrase)**: los comandos que corre Claude arrancan cada uno en una shell nueva, así que `ssh-add` desde ahí no persiste. El flujo que funciona es que el desarrollador corra esto **en una terminal real**, todo en una línea, y le pase a Claude el valor de `SOCKET:` para que lo exporte como `SSH_AUTH_SOCK`:
  ```bash
  eval "$(ssh-agent -s)" && ssh-add ~/.ssh/id_ed25519_rasef_vps && echo "SOCKET: $SSH_AUTH_SOCK"
  ```
- **Migraciones aplicadas a staging**: se generaron localmente en `migrations-selfhosted-staging/` (raíz del repo, **no versionado en git**, es un artefacto de trabajo) — contiene `combined_selfhosted.sql` (las 31 migraciones concatenadas, con las partes de RLS/pg_cron/auth.users comentadas) y logs de qué se salteó por archivo. Útil como referencia si hay que resetear staging o para el `cutover` final a producción.

### Gotchas encontrados (para no perder tiempo de nuevo)

- **Contraseña de Postgres "pegada" a la primera inicialización**: `POSTGRES_PASSWORD` en el `.env` solo se aplica la primera vez que se crea el volumen. Si el volumen ya existía (de una prueba anterior con otra password), cambiar el `.env` después no tiene efecto — hay que `docker compose down -v` (borra el volumen) y `up -d` de nuevo, o hacer `ALTER USER ... WITH PASSWORD` a mano conectando por el socket local del contenedor (`docker exec -it <contenedor> psql -U <user> -d <db>`, que no pide password).
- **Puerto 5433 ocupado localmente (pasó dos veces, con contenedores distintos)**: si algo local ya escucha en 5433, el túnel SSH no puede "ganar" ese puerto y las conexiones caen silenciosamente en el Postgres local en vez de ir a la VPS. El síntoma es engañoso: `password authentication failed for user "nps_staging"` sin explicación aparente — la password está bien, estás hablando con la base equivocada.
  - 1ª vez: contenedor viejo `npsplatform_postgres_staging` (de validar `docker-compose.staging.yml` localmente). Resuelto con `docker stop`.
  - 2ª vez (2026-08-19): `reclamospp-db-1`, de **otro proyecto del desarrollador**, publicando `0.0.0.0:5433->5432`. Ahí parar el contenedor no era opción razonable (es otro proyecto en uso), así que **se movió el túnel al puerto local 5434** y se actualizó `DATABASE_URL` en `.env.local`. Esta es la solución preferida de ahora en más: elegir un puerto local libre en vez de pelear por el 5433.
  - Diagnóstico rápido: `ss -tlnp | grep 5433` (qué escucha realmente) y `docker ps --format '{{.Names}}\t{{.Ports}}'` (de quién es). Ojo que `docker ps -a` muestra contenedores parados que **no** son el problema — hay que mirar los que están `Up`.
- **Migraciones con referencias a Supabase**: además de RLS/`pg_cron` (ya esperado), dos columnas tenían FK a `auth.users(id)` (`encuestas.marcado_sin_respuesta_por`, `encuesta_medidas.created_by`) — quedaron como `UUID` suelto sin constraint. Hay que recordar re-agregar la FK (contra la tabla de usuarios que sea del nuevo sistema de Auth) cuando esa fase se implemente.

## 7. Próximos pasos inmediatos

**Estado al 2026-08-24.** La app entera corre contra la infraestructura propia en staging —Postgres + Drizzle + Better Auth— y **no queda nada que hable con Supabase**: ni la app (no hay un solo import), ni los jobs programados (cron de sistema en la VPS, sección 4), ni el agente de WhatsApp (sección 14, el último que faltaba). Lo que queda no es migrar código: es infraestructura y el corte.

1. **Backups del Postgres, con IT.** Es lo único que conviene resolver **antes** del cutover, no después: el momento de mayor riesgo de perder datos es justamente ese. Con Supabase los backups venían incluidos; en infra propia no existen hasta que alguien los configure.

   **Estado (2026-08-24): pedido hecho, esperando a IT.** Franco confirmó que **la VPS entera tiene backup diario** y ofreció armar un script que mande copias a un servidor SFTP. Se le pidió que lo que viaje al SFTP sea un `pg_dump` de la base, no las imágenes de la VM.

   **Por qué no alcanza con el backup de la VPS.** Sí cubre el volumen de Docker — es una copia del disco completo, y `/var/lib/docker/volumes/` está adentro. El problema no es qué agarra sino **la granularidad de la restauración**: para recuperar esta base habría que restaurar la VM entera, y en esa VPS corren también los otros servicios de la empresa. O sea que ese backup solo es usable para el desastre grande (se perdió la VPS); para un borrado accidental o un bug acotado es inutilizable en la práctica. El `pg_dump` aparte es lo que permite recuperar solo el NPS sin tocar nada más.

   **Lo pedido:** `pg_dump` diario del contenedor, enviado por SFTP fuera de la VPS, retención ~30 días.

   ```bash
   docker exec npsplatform_postgres_staging \
     pg_dump -U nps_staging -d npsplatform_staging -Fc
   ```

   Corriendo dentro del contenedor no hace falta password (conexión por socket local), así que el script no necesita el secreto.

   **Pendiente de respuesta de IT:** a qué destino SFTP, con qué retención, y si los backups de la VPS son snapshots o copia en caliente.

   **Pendiente propio, no delegable:** la **prueba de restauración**. IT puede restaurar; el único que puede decir si la base quedó *correcta* es este lado — conteos por tabla y checksum de contenido (el mismo método de la sección 8), más levantar la app contra la copia restaurada. Un backup que nunca se restauró no se sabe si sirve.

   **Interino, hecho el 2026-08-24:** `pg_dump` manual bajado por SSH a la máquina de desarrollo (`~/backups-nps/`, permisos 600, directorio 700). No es un sistema de backups (no es automático ni tiene retención), pero baja el piso de "si se muere la VPS perdemos todo" a "perdemos desde el último dump". Ojo que ese archivo lleva datos personales de clientes reales.

   No hace falta túnel: el dump se puede streamear directo por SSH sin dejar archivos intermedios en la VPS.

   ```bash
   ssh -T -p 5399 posventa@200.58.99.137 \
     "docker exec npsplatform_postgres_staging pg_dump -U nps_staging -d npsplatform_staging -Fc" \
     > npsplatform_staging_$(date +%F).dump
   ```

   **Restauración probada el 2026-08-24**, contra un `postgres:16` descartable local: restauración con exit 0 y sin warnings, las **17 tablas** (13 del schema original + 4 de Better Auth) con conteos **idénticos** a staging, las 3 vistas y las 6 funciones presentes —incluidas `sync_encuestas_necesidad_llamado` y `check_campanas_sin_actividad`, de las que dependen los jobs de cron— y `v_encuestas_completas` consultable. O sea que el camino dump → restore funciona de punta a punta; falta probar el de IT cuando lo tengan armado.

   **Gotcha de versiones, importante para el cutover:** las herramientas de Postgres de la máquina de desarrollo son **17.9** y los servidores son **16.x**. Restaurar con el `pg_restore` local falla con `unrecognized configuration parameter "transaction_timeout"` (parámetro que existe desde PG 17; lo emite el cliente 17 en su preámbulo y el servidor 16 lo rechaza). El dump está bien — el problema es la versión del cliente. Hay que correr `pg_restore` **dentro de un contenedor `postgres:16`**. Sin `--exit-on-error` esto queda como "1 error ignorado" y la restauración parece haber salido, que es la forma peligrosa de fallar.

   **Dos trampas conocidas, para no volver a discutirlas:** un backup en la misma VPS no protege contra perder la VPS, y copiar los archivos de un Postgres corriendo puede dar una copia inconsistente que no arranca (por eso `pg_dump` y no copiar el volumen).

2. **Permisos en la VPS, con IT.** Sigue sin resolverse el pedido: `posventa` no tiene sudo y sí está en el grupo `docker`, al revés de lo acordado (sección 5). Mientras tanto los jobs de cron viven en un crontab de usuario que muere sin avisar si dan de baja la cuenta. **Sumar al mismo pedido: la VPS no tiene NTP** (`System clock synchronized: no`), así que el reloj deriva y con él todos los horarios programados.

3. **Levantar la app self-hosted.** Hasta ahora solo migró Postgres: no hay contenedor de app de staging ni el subdominio `staging.portalcrucianelli.site` (línea 30). No hizo falta porque se accede a la base por túnel SSH, pero antes del cutover conviene ver la app corriendo en la VPS y no solo en la notebook.

4. **Cutover.** El orden importa:
   1. Aplicar las migraciones al Postgres de producción (la de FKs es re-ejecutable a propósito).
   2. Copia final de los datos desde Supabase, en ventana de mantenimiento corta.
   3. Correr `scripts/migrar-usuarios-auth.ts --aplicar` contra producción.
   4. Variables de entorno: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `WHATSAPP_AGENTE_TOKEN`. **Ojo con `BETTER_AUTH_SECRET`**: si cambia entre deploys, se invalidan todas las sesiones abiertas.
   5. Apuntar `scripts/cron/nps-jobs.sh` a la base de producción (variables `NPS_*`).
   6. Merge de la PR #19 y deploy.
   7. Actualizar el `.env` de la PC del operador: `PLATAFORMA_URL` a producción y el `WHATSAPP_AGENTE_TOKEN` definitivo.
   8. Verificar, y **recién ahí** apagar Supabase — mientras siga prendido hay a dónde volver.

## 10. Progreso de migración de módulos a Drizzle

Patrón seguido en cada módulo: el `service.ts` cambia de motor por dentro (Supabase → Drizzle) pero mantiene el mismo contrato de datos hacia afuera (mismos nombres de campo snake_case, mismas firmas de función) — así los componentes/tipos del módulo no necesitan tocarse. Probado contra datos reales de staging antes de cada commit.

- [x] `clientes` — `getClientes`, `getClienteById`, `createCliente`, `getClientesByCampana`. También se migró el insert de importación CSV que vivía suelto en `actions.ts` (ahora `createClientesBulk` en el service).
- [x] `notificaciones` — `getNotificaciones`, `getUnreadCount`, `marcarTodasLeidas`. La autenticación de `marcarTodasLeidasAction` (`supabase.auth.getUser()`) queda en Supabase Auth por ahora — es una fase aparte, todavía sin decidir/migrar.
- [x] `campanas` — service.ts completo, más `campanas/actions.ts` (que tenía lógica de negocio pesada viviendo fuera del service: alta completa de campaña y baja en cascada). Esta última parte ahora usa `db.transaction()` de Drizzle — mejora real sobre el comportamiento anterior con Supabase, que no podía agrupar los pasos en una transacción real y "deshacía a mano" si algo fallaba a mitad de camino (podía dejar filas huérfanas). Verificado con un caso de fallo forzado a mitad de transacción: revierte todo.
- [x] `recordatorios` (`avisos.service.ts`, `recordatorios.service.ts`, `workflow.service.ts`) — relación encuesta→medidas (uno-a-muchos) resuelta con dos queries + merge en JS. `marcarRecordatorioEnviado` y `revertirEncuestaANecesidadLlamado` en transacción.
- [x] `alertas` — enviarAlertaNpsCritico, enviarNotificacionRambla. De paso se migró el logging de email_errores en `src/lib/email/send-email.ts` (lib compartida fuera de cualquier módulo).
- [x] `configuracion` — incluido `usuarios.service.ts`, que estuvo bloqueado hasta que se decidió Auth (ver sección 13).
- [x] `plantillas`
- [x] `rambla` — consulta la vista `v_respuestas_rambla` (Drizzle la trata como una tabla de solo lectura). De paso se migró actualizarRegaloEstadoAction/guardarSeguimientoAction en rambla/actions.ts.
- [x] `whatsapp` — plantillas + jobs. `crearJob` en transacción (job + detalle por contacto). Bug propio encontrado y corregido: `.where()` encadenado dos veces no combina condiciones en Drizzle (pisa la anterior) — ver gotcha abajo.
- [x] `dashboard` (738 líneas) — solo 5 de las ~20 funciones tocaban Supabase directo (`getRespuestas`, `getDashboardFilterOptions`, `getEfectividadEnvios`, `getTiposEncuestaActivos`, `getNpsPorTipoEncuesta`); el resto es cálculo puro en JS sobre el resultado de `getRespuestas` y quedó intacto. `getRespuestas` se reescribió desde cero (join explícito en vez del embed de Supabase) — ver detalle en sección 11.

**Todos los módulos de `src/modules/*/services/` están migrados** (con la excepción a propósito de `usuarios.service.ts`, bloqueado por Auth). También se migraron los "cabos sueltos" de Supabase que vivían fuera de los services pero dentro del alcance de cada módulo: CSV bulk insert de clientes, alta/baja completa de campañas (`campanas/actions.ts`, con transacciones), actualizar regalo/seguimiento de Rambla, exportación CSV de pendientes de campaña, y el logging de `email_errores` en `send-email.ts`.

### Pendiente — fuera del alcance de "migrar módulos"

- **`src/app/encuesta/*`** (`page.tsx`, `actions.ts`, `actions-fin-garantia.ts`): el **formulario público de encuesta** — valida token, bloquea doble respuesta, inserta en `respuestas`, dispara alertas NPS crítico y notificaciones. No es parte de ningún módulo (vive en `src/app/encuesta/`), y es la superficie más sensible en seguridad de todo el proyecto (Fase 6 del `CLAUDE.md`: revalidación de token en servidor, bloqueo de doble respuesta). Amerita su propia sesión con foco extra en probar bien los casos límite, no un pase rápido como el resto.
- **`src/modules/recordatorios/services/avisos.service.ts`**: ya migrado (ver checklist arriba) — se corrige esta nota, había quedado desactualizada de una revisión anterior a la migración completa del módulo `recordatorios`.
- `usuarios.service.ts` (`configuracion`): bloqueado por Auth, ver checklist de módulos arriba.

### Gotcha: `count(*)` con Drizzle devuelve string, no number

`sql<number>\`count(*)\`` compila bien pero en runtime el valor es un **string** (`"93"`, no `93`) — Postgres devuelve `count(*)` como `bigint`, y el driver lo entrega como string en JS para no perder precisión con números grandes. `sql<number>` es solo una anotación de tipo para TypeScript, no convierte el valor real. Se detectó con un test que comparaba `=== 0` y fallaba silenciosamente.

**Solución:** castear a entero en el propio SQL, `sql<number>\`count(*)::int\``, no en JS después — con `::int` el driver sí devuelve un `number` real. Aplica a cualquier agregado (`count`, `sum`, etc.) que dependa de `bigint` en Postgres. Especialmente relevante para cuando se migre `dashboard.service.ts`.

### Gotcha: `.where()` encadenado dos veces no combina condiciones

Detectado migrando `whatsapp`: escribir `.where(cond1).where(cond2)` (el estilo fluido al que acostumbra Supabase, donde sí se combinan) en Drizzle hace que el segundo `.where()` **reemplace** al primero, no lo combine con AND — sin error, sin warning, solo un filtro incompleto que trae de más. Se revisó el resto de los módulos ya migrados y era un caso aislado.

**Solución:** combinar todo en un único `.where(and(cond1, cond2, ...))`.

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

## 9. ORM: Drizzle (2026-08-18)

Se eligió **Drizzle** como data-access layer (en vez de Prisma o queries crudas) — es SQL-first (las queries se parecen a SQL real, sin lenguaje de schema propio como Prisma), liviano (sin motor/proceso aparte), y convive bien con que el schema ya se define en SQL puro a mano en `supabase/migrations/`. No reemplaza esas migraciones: `supabase/migrations/*.sql` sigue siendo la fuente de verdad del schema; Drizzle solo agrega una capa de queries tipadas en TypeScript por encima de la misma base.

**Setup:**
- `drizzle-orm` + driver `postgres` (postgres.js) como dependencias de producción; `drizzle-kit` + `dotenv` como dev dependencies (herramientas de CLI, no corren en producción).
- `drizzle.config.ts` en la raíz: config que usa `drizzle-kit` para tareas de CLI (lee `.env.staging` vía el túnel SSH a staging). El puerto local del túnel sale de `STAGING_TUNNEL_PORT` (default **5434**, ver el gotcha del puerto 5433 en la sección 6) y `tablesFilter: ['!auth_*']` evita que un `pull` traiga las tablas de Better Auth a `schema.ts` y queden definidas dos veces con `auth-schema.ts`.
- `src/lib/db/schema.ts` y `src/lib/db/relations.ts`: generados por **introspección** (`npx drizzle-kit pull`), leyendo el schema real de staging — no se escribieron a mano. Para regenerarlos después de un cambio de schema, correr `npx drizzle-kit pull` de nuevo (requiere el túnel SSH a staging levantado).
  - **Al regenerar hay un paso manual**: `tablesFilter` saca las tablas `auth_*` del archivo, pero drizzle-kit **igual emite las FKs y relaciones que apuntan a `authUser`**. El archivo generado no compila hasta que se vuelve a agregar `import { authUser } from "./auth-schema"` arriba de `schema.ts` y de `relations.ts`. Hay un comentario en ambos archivos avisándolo.
- `src/lib/db/client.ts`: exporta `db`, el objeto que el resto de la app va a importar para hacer queries (reemplaza `supabase.from(...)`). Lee la conexión de la variable de entorno `DATABASE_URL`.
- `DATABASE_URL` en `.env.local` (gitignoreado): hoy apunta al túnel SSH hacia staging (`127.0.0.1:5433`) para desarrollo local. Cuando haya un ambiente self-hosted real corriendo la app, va a apuntar directo al Postgres de esa VPS (misma red Docker, sin túnel).

Probado end-to-end con una query de conteo contra staging — coincide con el dato real.

### Pendiente

- [ ] Configurar `supabase login` (Personal Access Token) para que el CLI pueda trackear el historial de migraciones aplicadas — hoy esta migración se aplicó por `psql` directo, no vía `supabase db push`, así que no quedó registrada en la tabla interna de tracking del CLI (`supabase migration list` puede seguir mostrándola como pendiente; es inofensivo por el `IF NOT EXISTS` pero conviene prolijarlo).
- [ ] Revisar si hay más drift de schema no detectado en otras tablas/objetos (se comparó estructura completa de columnas de las 13 tablas, pero no funciones, triggers, ni vistas).

## 11. `dashboard.service.ts`: reescrito, no traducido (2026-08-18)

Fue el módulo más grande (738 líneas) pero no el más complejo de migrar en la práctica: solo 5 de sus ~20 funciones tocaban Supabase directo, el resto es cálculo puro en JS que llama a esas 5 por debajo y quedó sin cambios.

`getRespuestas` (la función central, de la que dependen casi todas las demás) se reescribió de cero en vez de traducirse línea por línea. El original tenía un tipo `RawEncuestaConRespuesta` y funciones `pickOne`/`mapRespuesta` dedicadas exclusivamente a resolver una ambigüedad de Supabase: un recurso embebido (`campanas(...)`, `clientes(...)`) puede venir tipado como un array de un elemento o como el objeto directo, según el caso, y hay que normalizarlo a mano. Con un join explícito de Drizzle (`.innerJoin(...)`/`.leftJoin(...)`) esa ambigüedad no existe — cada fila del resultado ya trae las columnas planas, sin normalizar nada. El filtrado híbrido (algunos filtros al SQL, otros en JS sobre el resultado) se mantuvo idéntico al original.

Se verificó con cruces de suma (no solo "no explota"): conteo total de respuestas contra la tabla real, suma de NPS por concesionario == total, suma del comparativo por canal == total, efectividad de envíos contra conteo directo de `encuestas`. Todo coincidió.

## 12. `src/app/encuesta/*`: formulario público migrado (2026-08-19)

Última superficie fuera de `src/modules/*` que quedaba en Supabase, y la más sensible en seguridad de todo el proyecto: es lo único accesible sin login, donde el token es toda la credencial.

**Cambio estructural:** la lógica de seguridad (validar token → chequear estado → verificar que no haya respuesta previa) estaba **duplicada casi textual** entre `actions.ts` y `actions-fin-garantia.ts`. Se extrajo a `src/app/encuesta/encuesta.db.ts`, que es ahora el único lugar donde el formulario público toca la base. Los dos actions bajaron ~100 líneas en conjunto y quedó un solo punto para auditar.

`page.tsx` usa `getEncuestaPorToken()` (join explícito, sin el embed ambiguo de Supabase que obligaba a los `Array.isArray(...)` anidados).

### Tres correcciones, no traducción literal

1. **Token con formato inválido devolvía 500 en vez de 404.** `encuestas.token` es UUID. Con PostgREST, `?token=cualquier-cosa` devolvía error y el código caía en `notFound()`. Con Drizzle, Postgres aborta la query (`22P02 invalid input syntax for type uuid`) y eso escalaba a un 500. Se agregó un guard de formato (`esTokenConFormatoValido`) **antes** de tocar la base. Es un caso que solo aparece al cambiar de motor — vale revisarlo en cualquier otro lugar que compare un string crudo contra una columna UUID.

2. **Race condition en el bloqueo de doble respuesta.** El original hacía "¿existe respuesta?" y después "insertar", sin transacción: dos envíos simultáneos del mismo token podían pasar ambos el chequeo. Lo salvaba el UNIQUE de `respuestas.encuesta_id`, pero el segundo usuario veía *"Error al guardar, intentá nuevamente"* en vez de *"ya completaste esta encuesta"*. Ahora todo va en `db.transaction()` con `SELECT ... FOR UPDATE OF encuestas`, que serializa los envíos del mismo token; el UNIQUE queda como última red (se captura el `23505` y devuelve el mensaje correcto).

3. **`envia_regalo` salía de un embed anidado de Supabase** con doble `Array.isArray(...)`. Ahora viene del mismo join que ya valida el token, tipado.

### Verificación

Script de 36 asserts contra staging con datos reales, ejecutando los server actions de verdad (no queries sueltas): formato de token (incluido un intento de inyección), lectura del formulario por tipo, camino feliz, disparo del trigger, doble respuesta, estados `sin_respuesta`/inexistente, `canal_respuesta` según estado, **dos envíos simultáneos** (exactamente 1 gana y el perdedor recibe el mensaje correcto), notificaciones de NPS crítico y regalo, y el circuito completo de fin de garantía. 36/36. Los datos de prueba se crean y borran en la misma corrida; se verificó después que staging quedó igual que antes.

**Confirmado en staging:** el trigger `trg_marcar_encuesta_respondida` y el constraint `respuestas_encuesta_id_key` existen y están activos — todo el bloqueo de doble respuesta depende de ellos y el `combined_selfhosted.sql` había filtrado otras cosas, así que no se daba por sentado.

### Gotcha: probar esto puede mandar mails reales

`system_config` en staging tiene **18 destinatarios reales** en `emails_notificacion` y 7 en `emails_rambla` (vinieron con los datos de producción), y `sendEmail` usa SMTP configurado en `.env.local`. Una prueba del camino de NPS crítico manda alertas de verdad a gente de la empresa. Al correr pruebas que toquen ese camino, neutralizar el SMTP apuntándolo a un host muerto:

```bash
SMTP_HOST=127.0.0.1 SMTP_PORT=1 SMTP_SECURE=false SMTP_USER=noop@test.invalid SMTP_PASS=noop EMAIL_FROM=noop@test.invalid npx tsx script.ts
```

Los envíos fallan con `ECONNREFUSED`, quedan registrados en `email_errores` (limpiar después con `DELETE FROM email_errores WHERE error_mensaje LIKE '%127.0.0.1:1%'`) y **no bloquean el guardado de la respuesta** — que es justamente el comportamiento que se quería verificar.

### Nota: `formData.get()` devuelve `null`, y `.optional()` de Zod no lo acepta

Los campos de comentario son `z.string().optional()`. Si el campo no viene en el `FormData`, `formData.get()` devuelve `null` (no `undefined`) y Zod lo rechaza, haciendo fallar **toda** la validación con el mensaje genérico "Por favor completá todas las preguntas antes de enviar". En producción no pasa porque los `textarea` siempre existen en el DOM y mandan `''`. Es una fragilidad latente heredada, no introducida por la migración: si alguna vez se saca o renombra un campo del formulario, el síntoma va a ser un error confuso y global en vez de uno apuntando al campo. Al escribir pruebas, mandar todos los campos opcionales como `''`, igual que el form real.

## 13. Auth: Better Auth (2026-08-19)

Reemplaza Supabase Auth por completo. Después de esto **no queda ningún import de Supabase en `src/`** — se borraron `src/lib/supabase/{client,server,actions}.ts`.

### Por qué Better Auth y no NextAuth/Auth.js

La app necesita email/password (nada de OAuth), tres roles, ABM de usuarios y reset por email. Better Auth trae adapter de Drizzle, reset de contraseña y un plugin de admin que cubre `usuarios.service.ts` casi 1:1. NextAuth con credentials provider fuerza sesiones JWT (no de base) y no trae hash de contraseñas, ni reset, ni ABM: los tres había que escribirlos a mano.

El punto decisivo fue el de las **sesiones en base**: el rol tiene que poder cambiar y tener efecto inmediato (es lo que daba Supabase con `app_metadata`), y con sesiones JWT eso implica esperar a que expire el token o inventar un mecanismo de invalidación.

### Los 23 usuarios conservan su contraseña

Supabase hashea con **bcrypt**, Better Auth usa **scrypt**. No alcanza con copiar los hashes: hay que enseñarle a verificar los dos formatos. `src/lib/auth/password.ts` intercepta los hashes que empiezan con `$2` y los verifica con bcrypt; todo lo demás va al verificador propio. Las contraseñas **nuevas** (altas y resets) siempre se hashean con scrypt — bcrypt queda de solo lectura, para lo heredado.

`scripts/migrar-usuarios-auth.ts` mueve los usuarios: lee `auth.users` de Supabase y escribe `auth_user` + `auth_account` en el Postgres propio **en la misma corrida**, sin archivo intermedio ni salida por pantalla — los hashes nunca tocan el disco. Es idempotente (saltea los que ya existen), así que se puede volver a correr en el cutover para arrastrar altas de último momento. Simulacro por defecto; `--aplicar` para escribir.

Simulacro contra producción: 23 usuarios, **los 23 con contraseña** — nadie queda obligado a resetear.

### Dónde se autoriza ahora (cambio importante)

Antes el middleware leía el rol del JWT y decidía todo. Better Auth guarda el rol en la base y el middleware corre en el **edge runtime**, donde no hay driver de Postgres. Así que:

- **`src/middleware.ts`**: solo mira si **existe** la cookie de sesión. Es un filtro barato de primera pasada, no autorización. Pasa el pathname en el header `x-pathname`.
- **`src/app/(dashboard)/layout.tsx`**: valida la sesión **contra la base** y aplica las reglas por rol. Es Server Component, así que puede. Todas las rutas del dashboard (incluida `/rambla`) cuelgan de este layout.
- **`src/lib/auth/rutas.ts`**: las reglas por rol, en un solo lugar en vez de embebidas en el middleware.
- Cada action sensible revalida igual con `requireRol()` — defensa en profundidad.

**Esto arregla algo que antes no se validaba:** una cookie de sesión revocada o vencida ahora cae al login, porque la sesión se verifica contra la base en cada request en vez de confiar solo en la firma del token.

### Gotchas encontrados

- **El CLI de Better Auth está deprecado y quedó en 1.4.x** mientras el core va en 1.7.1. Generar el schema con él habría omitido campos nuevos. El schema de `supabase/migrations/20260819000000_better_auth_tables.sql` se derivó de `getSchema()` del paquete instalado, que es autoritativo para la versión real. **Si se actualiza better-auth, volver a derivarlo y comparar.**
- **`auth_account.issuer` tiene que valer `'local:credential'`**, no `'credential'`. Con el valor equivocado el login falla con *"User not found"* — sin error de tipos, sin warning. Se descubrió comparando una fila creada por Better Auth contra una insertada a mano.
- **`user` es palabra reservada en Postgres.** Las tablas llevan prefijo `auth_` (`auth_user`, `auth_session`, ...) vía `modelName` en la config, para no arrastrar comillas por todo el código.
- **El adapter de Drizzle busca las tablas por la clave del objeto de schema**, y esa clave tiene que coincidir con el `modelName` (`auth_user`, no `authUser`). Por eso `src/lib/db/auth-schema.ts` exporta ambos alias. Falla en runtime, no al compilar.
- **Los `id` son `TEXT`, no `UUID`** — es el tipo nativo de Better Auth. Los usuarios migrados guardan su UUID de Supabase como texto, así que conservan su id de siempre.
- `auth-schema.ts` se escribió **a mano**, no con `drizzle-kit pull`, para que regenerar el schema principal no lo pise ni al revés.

### Verificación

- 12 asserts sobre el core: alta y login con scrypt, y el caso que decidía todo — **un hash bcrypt estilo Supabase inicia sesión bien**, conservando UUID y rol.
- 30 asserts sobre ABM de usuarios y reglas de acceso de los tres roles, incluido el `ON DELETE CASCADE` que cierra sesiones al borrar un usuario.
- **Smoke test por HTTP contra el build de producción** (lo único que valida middleware + layout + cookies juntos): sin sesión redirige al login; un usuario `rambla` queda encerrado en `/rambla` (`/`, `/configuracion`, `/campanas`, `/clientes` y `/nps` lo devuelven a `/rambla`); contraseña incorrecta da 401; logout revoca de verdad; y un login desde un origen ajeno da 403 por CSRF.

### Pendiente de esta fase

- [x] Correr `scripts/migrar-usuarios-auth.ts --aplicar` contra staging — 23/23 migrados, todos con `issuer='local:credential'`, hash bcrypt y su UUID original. Login con contraseña real verificado.
- [x] Re-agregar las FKs a usuarios que quedaron sueltas desde el inicio de la migración, y aplicarlas a staging (ver más abajo).
- [x] Sacar `@supabase/ssr` y `@supabase/supabase-js` de `package.json` (`src/types/database.types.ts` se sigue usando solo para tipos, no tiene dependencia en runtime).
- [ ] Definir `BETTER_AUTH_SECRET` y `BETTER_AUTH_URL` en el entorno de producción durante el cutover. **Si `BETTER_AUTH_SECRET` cambia, todas las sesiones abiertas se invalidan** — no regenerarlo por accidente entre deploys.

### Reset de contraseña: probado de punta a punta con SMTP real (2026-08-19)

Verificado con una casilla real: el mail llega, el link abre el formulario y la contraseña queda cambiada. Antes de eso, 11 asserts sobre la lógica (token de un solo uso, vencimiento, token inventado, y que no se revele si un email existe).

**La migración perezosa de hashes funciona:** después del reset, ese usuario pasó de bcrypt a scrypt mientras los otros 22 siguen con su hash heredado de Supabase. Cada persona que resetee se va pasando sola al formato nuevo; no hay que hacer nada.

#### Por qué el link daba 404 (y por qué costó tanto encontrarlo)

Fueron **tres causas encadenadas**, y cada arreglo dejaba el síntoma igual, lo que hacía parecer que nada funcionaba:

1. **Las dos mitades del link salían de fuentes distintas.** La base sale de `BETTER_AUTH_URL`; el `callbackURL` se armaba con el header `Host`. Next levantó en `:3002` (el `:3000` estaba ocupado por otro proyecto del desarrollador) y quedó un link con base `:3000` y callback `:3002`. **Arreglo:** `redirectTo` va relativo (`/nueva-password`), así ambas mitades salen siempre de `BETTER_AUTH_URL`. Better Auth lo permite (`allowRelativePaths` en `originCheck`). Esto además cierra un vector de **host-header injection**: armar links de recuperación con el header `Host` deja que un atacante mande un `Host` falso y la víctima reciba un link a su dominio.

2. **El hot-reload de Next no relee los `.env`.** Tras el arreglo, el server seguía sirviendo con el `BETTER_AUTH_URL` viejo en memoria: recompiló el código (por eso el callback ya era relativo) pero no recargó las variables. **Hay que matar el proceso y arrancarlo de nuevo.**

3. **La causa de fondo: `set -a && source .env.local` deja las variables exportadas en esa terminal**, y en Next el entorno del proceso **le gana** a `.env.local`. Como esos comandos se habían usado antes para correr el script de migración (cuando la variable todavía decía `:3000`), cada `npm run dev` desde esa misma terminal heredaba el valor viejo — por más reinicios que se hicieran. **Se diagnostica con `tr '\0' '\n' < /proc/<pid>/environ | grep VARIABLE`**, que muestra el entorno real del proceso en vez del que uno supone. **Arreglo:** terminal nueva, o `unset BETTER_AUTH_URL`.

**Lección para el cutover:** `BETTER_AUTH_URL` es la única variable cuyo error **no se nota** — login, sesiones y roles andan igual. Solo se rompe el reset de contraseña, o sea que te enterás cuando alguien queda afuera. Verificarla explícitamente al deployar.

El script `dev` quedó fijado en el puerto **3010** (`next dev -p 3010`) porque hay varios proyectos Next en la máquina y el puerto dependía del orden de arranque.

#### Otros dos hallazgos

- **Pedir un reset nuevo no invalida los anteriores.** Si alguien pide varios, todos los links siguen sirviendo hasta que vencen (1h). Un mail reenviado o filtrado sigue siendo utilizable en esa ventana. No se cambió el comportamiento, pero conviene saberlo.
- **Cuidado al limpiar `auth_verification` en scripts de prueba:** borrar por patrón (`identifier LIKE 'reset-password:%'`) se lleva puestos los pedidos de reset **reales** que haya pendientes. Acotar siempre al usuario de prueba.

### Las FKs a `auth_user` (2026-08-20)

`encuestas.marcado_sin_respuesta_por` y `encuesta_medidas.created_by` apuntaban a `auth.users(id)` de Supabase. Al portar el schema quedaron como `UUID` sin constraint, porque esa tabla no existía. Ahora sí existe `auth_user(id)`, y `20260820000000_fks_auth_user.sql` las reconecta.

Son columnas **de auditoría** (quién marcó una OF como sin respuesta, quién escribió una medida de llamado), así que la FK va con **`ON DELETE SET NULL`**: borrar un usuario no puede borrar encuestas ni medidas, ni bloquear el borrado. Se pierde el "quién" y se conserva el registro.

**Cambio de tipo**: `auth_user.id` es `TEXT` (tipo nativo de Better Auth), así que las dos columnas pasan de `UUID` a `TEXT`. Los usuarios migrados guardan su UUID de Supabase como texto, así que los valores siguen coincidiendo y no se pierde ninguna referencia. Los índices parciales se reconstruyen solos con el opclass del tipo nuevo.

La migración es **re-ejecutable** (guardas por tipo actual y por `pg_constraint`), porque se va a aplicar de nuevo contra producción en el cutover.

#### Referencias huérfanas

Si una de esas columnas apunta a un usuario que ya no existe (borrado de Supabase Auth antes de la migración, o nunca migrado), la FK no se puede crear. La migración las pone en `NULL` e **informa cuántas** por `RAISE NOTICE` — mirar ese número al aplicarla, es dato perdido de auditoría.

#### Verificación

Probada contra una copia local del schema de staging (`combined_selfhosted.sql` + las dos migraciones posteriores) en un Postgres descartable, con datos que ejercitan los tres casos: referencia válida, huérfana y `NULL`.

- La migración corre limpia, informa `encuestas=1, encuesta_medidas=1` huérfanas, y una segunda corrida es no-op.
- La referencia válida sobrevive al cambio de tipo; los índices parciales quedan iguales.
- **10 asserts a través de los servicios reales** (`marcarEncuestaSinRespuesta`, `agregarMedidaLlamado`, `revertirEncuestaANecesidadLlamado`) apuntando a esa base: la FK rechaza un autor inexistente, la transacción de revertir sigue funcionando, y borrar el usuario deja las 3 medidas en pie sin autor.
- `npx drizzle-kit pull` contra esa base genera exactamente las mismas definiciones de columna que se editaron a mano en `schema.ts` (`text(...)` y `text_ops`).

**Aplicada a staging el 2026-08-20.** Antes de aplicar se contaron las referencias: 4 en `encuestas` y 1 en `encuesta_medidas`, **0 huérfanas**, así que no se perdió nada de auditoría. Después:

- Las dos columnas son `TEXT`, las dos FKs existen con `ON DELETE SET NULL`, y los índices parciales siguen ahí.
- Las 5 referencias resuelven por JOIN contra un usuario real (`lcarrizo@crucianelli.com`).
- `drizzle-kit pull` contra staging devuelve un `schema.ts` **idéntico** al del repo — las 22 definiciones, FKs incluidas. Las diferencias en `relations.ts` son solo orden de claves dentro de los objetos (`pull` no es determinístico en eso; una de ellas, `campanasRelations`, ya venía así).
- Round-trip por el adapter de Better Auth contra staging (alta, login, baja) para confirmar que registrar `auth-schema` en el cliente de Drizzle no lo afectó: 5 asserts, y staging vuelve a sus 23 usuarios.

#### `auth-schema` también va en el cliente de Drizzle

Las relaciones nuevas apuntan a `authUser`, pero `client.ts` solo registraba `schema` + `relations`, y `authUser` vive en `auth-schema.ts`. Con la tabla sin registrar, cualquier `db.query.*` que use esas relaciones **revienta en runtime** con `Cannot read properties of undefined (reading 'columns')` — no lo agarra el compilador. Hoy no lo notaba nadie porque toda la app usa el builder (`db.select()`) y no hay un solo `db.query.*` en `src/`, así que `relations.ts` estaba de adorno. Se agregó `...authSchema` al `drizzle()` de `client.ts`; el adapter de Better Auth no se toca, recibe su schema por separado.

### Hallazgo para el cutover: `mensajes.py` hablaba con Supabase — resuelto (2026-08-21)

La página `/whatsapp/setup` le indicaba al script externo `mensajes.py` (vive fuera de este repo, en la máquina del operador) que se configurara con `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`: leía los jobs de WhatsApp **directo de Supabase**, sin pasar por la app. Se resolvió en la sección 14.

## 14. El agente de WhatsApp sale de Supabase (2026-08-21)

`mensajes.py` ahora habla con la app por tres endpoints (`/api/whatsapp/agente/*`) autenticados con un token propio (`WHATSAPP_AGENTE_TOKEN`), en vez de leer y escribir la base directo. El script quedó versionado en `scripts/whatsapp/`, con su runbook.

**De paso se sacó la `service_role_key` de la PC del operador**, que era una llave con acceso total a la base viviendo en un `.env` en un escritorio. El token nuevo solo abre esos tres endpoints y se revoca cambiándolo en dos lados.

### Por qué el script sigue corriendo en una PC y no en el servidor

Al abrirlo se confirmó que no automatiza ninguna API de WhatsApp: abre Chrome en `web.whatsapp.com`, **mueve el mouse a coordenadas fijas** (`pg.moveTo(700, 500)`), pega la imagen por el portapapeles de Windows y tipea el mensaje tecla por tecla. Necesita pantalla, mouse y una sesión de WhatsApp abierta.

Centralizar el envío no es mudar el script a un contenedor: es **reemplazar el emisor**. Las opciones evaluadas fueron la Cloud API oficial de Meta (la única sólida para "cualquier usuario aprieta un botón y el servidor manda", pero exige verificación de la empresa, número dedicado y plantillas aprobadas) y una librería no oficial tipo Baileys en un contenedor (más barata, pero pone el número de la empresa a riesgo de baneo corriendo 24/7 desde un datacenter). **Se decidió no hacer ninguna de las dos ahora**: el apagado de Supabase tiene fecha y no puede esperar a Meta. Este cambio es deliberadamente chico para que se tire sin dolor si se va a Cloud API.

### Tres cosas que se movieron al servidor

- **El renderizado del mensaje.** El reemplazo de `{nombre}` y `{url}` estaba duplicado en Python y en `renderizar.ts`. Ahora el endpoint devuelve el texto ya armado. Verificado que las líneas que se tipean son **idénticas** a las de antes, línea por línea, renglones en blanco incluidos.

Del envío en sí solo se cambió una cosa, y a pedido: la espera de 30-60s que separa un contacto del siguiente ya no corre después del último, donde no separaba nada y solo dejaba la terminal colgada un minuto. **El espaciado entre mensajes —lo que evita parecer un robot— no se tocó.**
- **Los contadores del job.** El script leía `enviados` y lo escribía +1 en dos llamadas sueltas; ahora el servidor los recuenta desde las filas del detalle dentro de la transacción.
- **El filtro de pendientes.** El `GET` devuelve solo los contactos que faltan, así relanzar un job cortado no le vuelve a escribir a quien ya recibió el mensaje.

### Bug encontrado: los jobs detenidos figuraban como "Completado"

Al apretar Detener, el script cortaba el loop y **después marcaba el job como `completado`** igual, pisando el `interrumpido`. La plataforma mostraba campañas cortadas a la mitad como si hubieran salido enteras: en staging había dos, de 3 sobre 8 y de 1 sobre 10.

Arreglado de los dos lados a propósito: el script reporta `interrumpido`, y `marcarJobEstado` se niega a mover un job de `interrumpido` a `completado` sin importar lo que le pidan — una versión vieja del script no puede volver a romperlo. El endpoint devuelve el estado que quedó, no el que se pidió.

### Agujero de seguridad tapado de paso

`/api/whatsapp/jobs/[id]` (el que consulta la pantalla de progreso) **no verificaba la sesión**. Lo único que lo cubría era el middleware, que por diseño solo mira que *exista* la cookie, sin validarla. Con una cookie inventada y un UUID de job se filtraban celulares y las `url_encuesta` **con el token de cada encuesta adentro** — y con ese token se puede responder en nombre del cliente. Reproducido antes de arreglarlo y verificado después: ahora da 401.

Es el tipo de agujero que aparece al cambiar RLS por autorización en la aplicación (sección 5). La pasada por el resto de las superficies se hizo el 2026-08-24 y encontró bastante más de lo esperado — ver sección 15.

### Verificación

Contra staging por el túnel, con un job descartable de 3 contactos creado y borrado al final (staging quedó igual, encuestas intactas):

- Sin token, con token incorrecto y con token de otro largo → 401. Job inexistente → 404. Body inválido → 400.
- Mensaje renderizado, celular sin los espacios de la base, `ruta_imagen` devuelta tal cual (es una ruta de Windows, la resuelve la PC del operador).
- Ciclo completo: arranca, reporta un enviado y un error, y el `GET` deja de traer los ya reportados. Contadores en 1 y 1.
- La guarda del `interrumpido`: detenido desde la plataforma, el script pide `completado` y la respuesta dice `interrumpido`. Un job no interrumpido sí completa. `started_at` no se pisa al relanzar (va con `coalesce`).
- Las funciones reales del script ejercitadas contra el server con las libs de Windows stubbeadas: 13 asserts, incluido el mensaje de error del 401.

---

## 15. Auditoría de autorización: actions y route handlers (2026-08-24)

La sección 14 dejó anotado que valía la pena revisar el resto de los route handlers, después de encontrar que `/api/whatsapp/jobs/[id]` no verificaba sesión. La revisión se hizo y **el agujero grande estaba en otro lado**: los route handlers eran los que mejor estaban.

### Lo que se encontró

**Los 7 route handlers ya validaban sesión**, pero **ninguno validaba rol.** El motivo es estructural y vale la pena tenerlo claro: `puedeAcceder()` se aplica en `(dashboard)/layout.tsx`, y en el árbol de rutas **`app/api` es hermano de `app/(dashboard)`, no hijo** — ese layout nunca los envuelve, así que la regla de rol jamás corría para ellos. Cada endpoint sabía que había sesión, no de quién era. Un usuario `rambla` (cuya única página permitida es `/rambla`) llegaba a:

- `GET /api/respuestas/exportar` → CSV con email, teléfono, domicilio y provincia de todos los clientes que respondieron.
- `GET /api/campanas/<id>/exportar` → CSV cuya columna `link_encuesta` es `…/encuesta?token=<token>` de cada pendiente; con eso se responde en nombre del cliente.
- `GET /api/whatsapp/jobs/<id>` → `celular` + `url_encuesta` de cada contacto.

**Y el hallazgo mayor: los server actions casi no tenían guardas.** De 34 actions exportadas, 30 son privilegiadas y **solo 4 verificaban quién llamaba** (las 3 de `rambla` y `eliminarEncuestaAction`). Dos archivos tenían el helper ya escrito pero casi sin usar: `campanas/actions.ts` definía `getRoleOrThrow()` y lo llamaba en 1 de 4 actions; `configuracion/actions.ts` definía `requireAdmin()` y lo llamaba en 1 de 4. En `llamados/actions.ts` el patrón `(await getUsuarioActual())?.id ?? null` **parecía** una verificación pero era atribución: sin sesión seguía igual, guardando `null`.

### Por qué era alcanzable sin sesión válida

Tres piezas que se combinan:

1. `getSessionCookie()` de Better Auth (`node_modules/better-auth/dist/cookies/index.mjs:261`) **parsea la cookie y devuelve el string, sin validar nada** — no puede, corre en edge runtime sin acceso a Postgres. Una cookie inventada pasa el middleware.
2. Los action IDs salen del bundle de cliente, servido desde `/_next/static/`, que **el matcher del middleware excluye**. Los lee cualquiera sin loguearse.
3. Un Server Action es un POST a la ruta de la página con un header `Next-Action`. La protección CSRF de Next 15 compara `Origin` contra `Host`, y esos headers los controla quien arma el request con `curl`.

Lo más grave que quedaba abierto: `eliminarCampanaAction`, `crearJobAction` (dispara envíos reales de WhatsApp a clientes) y `actualizarConfiguracionAction`, que reescribe `emails_notificacion` — con eso se redirigen las alertas de NPS crítico a donde el atacante quiera.

### Lo que se hizo (commit `18fb57f`)

- **`chequearRol()` en `src/lib/auth/session.ts`** — como `requireRol` pero devuelve el error como valor en vez de tirarlo, para los actions que responden `{ error }` y lo muestran en el form. En el caso `ok` devuelve además el usuario, así `llamados` no consulta la sesión dos veces para atribuir quién hizo la operación.
- **`rechazarSiNoAutorizado()` en `src/lib/auth/api.ts`** — recibe la ruta de la **página** que el endpoint sirve y reusa `puedeAcceder()`, para que la regla de rol siga viviendo solo en `rutas.ts`. Si mañana `fabrica` gana acceso a `/campanas`, el endpoint de exportar lo hereda solo.
- **`notificaciones/actions.ts`** — el rol venía como parámetro del cliente; ahora sale de la sesión. Eso dejó sin uso la prop `rol` de `NotificacionesBell`, que se sacó también del `Topbar`.

Roles aplicados: todo lo de campañas, clientes, plantillas, whatsapp, configuración y llamados es admin; `/api/respuestas/exportar` acepta también `fabrica`, que sí tiene `/respuestas`. No hubo que decidir nada: sale de `RUTAS_POR_ROL`.

### Gotcha: la guarda va **antes** del `try`

Varios de estos actions tienen la forma `try { ... } catch (e) { return { error: e.message } }`. Una guarda puesta adentro del `try` **la agarra ese catch**: el action devuelve un error de aspecto inofensivo y sigue como si nada — o peor, parece protegido en la revisión de código sin estarlo. Van todas como primera línea del cuerpo.

### Verificación

`tsc`, `lint` y `build` pasan. Además se corrió un chequeo que recorre las 34 actions exportadas y los 7 handlers confirmando que la guarda esté en las primeras líneas del cuerpo, en vez de confiar en haberlas tocado todas a mano: 0 sin guarda, con `encuesta`/`login`/`nueva-password` marcadas como públicas a propósito.

**Pendiente:** ejercitarlo con una sesión `rambla` real contra staging. Requiere el túnel SSH y la app levantada, no se hizo todavía.

### Para el cutover

Esto es el costo de haber sacado RLS y conviene tenerlo presente como categoría, no como un bug puntual: con Supabase, la base rechazaba la operación aunque el código se olvidara de preguntar. Ahora el único que pregunta es el código. **Toda superficie nueva que toque la base —un action, un route handler— nace sin protección hasta que alguien le pone la guarda.** El chequeo automático de arriba es barato de repetir y conviene volver a correrlo antes del cutover.
