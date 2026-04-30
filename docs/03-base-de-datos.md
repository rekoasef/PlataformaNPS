# Base de Datos

## 1. Resumen

La base de datos vive en Supabase PostgreSQL y modela:

- campañas
- registros por `OF`
- encuestas
- respuestas
- historial de envíos
- configuración global

Además contiene:

- triggers
- políticas RLS
- jobs programados con `pg_cron`

## 2. Extensiones y tipos

## 2.1 Extensiones

- `pg_cron`

## 2.2 Enums

### `campana_estado`

- `activa`
- `completada`
- `archivada`

### `encuesta_estado`

- `pendiente`
- `recordatorio_enviado`
- `necesidad_de_llamado`
- `respondida`
- `sin_respuesta`

### `envio_estado`

- `pendiente_envio`
- `enviado`

## 3. Tablas

## 3.1 `campanas`

Propósito:

- agrupar el universo de `OF` a contactar

Campos principales:

- `id`
- `nombre`
- `fecha`
- `estado`
- `created_at`

## 3.2 `clientes`

Propósito real actual:

- almacenar una fila por `OF`

Campos principales:

- `id`
- `nombre`
- `telefono`
- `telefono_2`
- `telefono_3`
- `concesionario`
- `orden_fabricacion`
- `tecnologia`
- `created_at`

Observación importante:

- el nombre de tabla es histórico
- funcionalmente hoy representa una unidad encuestable por `OF`

## 3.3 `encuestas`

Propósito:

- representar una encuesta única por `OF` dentro de una campaña

Campos principales:

- `id`
- `cliente_id`
- `campana_id`
- `token`
- `estado`
- `created_at`

Restricción importante:

- `UNIQUE (cliente_id, campana_id)`

## 3.4 `respuestas`

Propósito:

- almacenar la respuesta completa del formulario público

Campos principales:

- `id`
- `encuesta_id`
- datos de contacto y contexto
- tres NPS
- calificaciones 1 a 10
- comentarios
- `fecha_respuesta`

Restricción importante:

- una sola respuesta por `encuesta_id`

## 3.5 `envios`

Propósito:

- historial del envío inicial y recordatorios

Campos principales:

- `id`
- `cliente_id`
- `campana_id`
- `numero_recordatorio`
- `estado_envio`
- `fecha_envio`
- `notificacion_enviada`
- `created_at`

Interpretación:

- `numero_recordatorio = 0` es envío inicial
- `1..3` son recordatorios

## 3.6 `system_config`

Propósito:

- almacenar parámetros operativos globales

Campos principales:

- `id`
- `dias_notificacion_inicial`
- `dias_notificacion_recordatorio`
- `dias_hasta_llamado`
- `emails_notificacion`
- `updated_at`

## 4. Relaciones

- `encuestas.cliente_id -> clientes.id`
- `encuestas.campana_id -> campanas.id`
- `respuestas.encuesta_id -> encuestas.id`
- `envios.cliente_id -> clientes.id`
- `envios.campana_id -> campanas.id`

## 5. Modelo funcional actual

Aunque todavía no existe una tabla `of_encuestas`, el modelo actual ya opera así:

- `clientes` guarda la `OF`
- `encuestas` guarda el token y el estado de esa `OF`
- `envios` guarda el historial del contacto digital de esa `OF`
- `respuestas` guarda la respuesta final única

## 6. Migraciones existentes

## 6.1 `001_initial_schema.sql`

Crea:

- extensiones
- enums base
- tablas principales
- índices principales

## 6.2 `002_triggers.sql`

Define triggers del sistema.

El más importante:

- al insertar en `respuestas`, la encuesta pasa a `respondida`

## 6.3 `003_rls_policies.sql`

Activa y define RLS.

## 6.4 `004_add_orden_fabricacion.sql`

Introduce `orden_fabricacion` al modelo.

## 6.5 `005_expand_respuestas_form.sql`

Expande `respuestas` para soportar el formulario real actual.

## 6.6 `006_of_multi_phone_flow.sql`

Introduce el flujo por `OF` con múltiples teléfonos:

- `telefono_2`
- `telefono_3`
- `dias_hasta_llamado`
- estados `recordatorio_enviado`, `pendiente_a_llamar`, `sin_respuesta`

## 6.7 `007_rename_pendiente_llamado_estado.sql`

Renombra el estado:

- de `pendiente_a_llamar`
- a `necesidad_de_llamado`

## 6.8 `008_automate_necesidad_llamado.sql`

Crea:

- función `public.sync_encuestas_necesidad_llamado()`
- job `pg_cron` `sync-encuestas-necesidad-llamado`

Frecuencia actual:

- cada `15` minutos

## 6.9 `009_tipo_maquina_y_sin_respuesta.sql`

Crea o asegura:

- enum `tipo_maquina_enum`
- columna `respuestas.tipo_maquina`
- índice `idx_respuestas_tipo_maquina`
- campos de auditoría para `sin_respuesta`

## 6.10 `010_security_perf_hardening.sql`

Contiene ajustes de seguridad y performance sobre políticas, funciones o índices existentes.

## 6.11 `011_add_cliente_tecnologia.sql`

Agrega soporte de tecnología por `OF`:

- columna `clientes.tecnologia`
- `CHECK` para `leaf` o `precision_planting`
- índice parcial `idx_clientes_tecnologia`

## 7. Lógica de estado en datos

## 7.1 Creación de campaña

Al crear una campaña:

- se insertan encuestas con estado `pendiente`
- se insertan envíos iniciales con `numero_recordatorio = 0`
- esos envíos iniciales se guardan ya como `enviado`

## 7.2 Confirmación de recordatorio

Cuando el usuario confirma el recordatorio:

- `envios.estado_envio = 'enviado'`
- `envios.fecha_envio = NOW()`
- `encuestas.estado = 'recordatorio_enviado'` para las `OF` incluidas

## 7.3 Paso a `necesidad_de_llamado`

La función SQL hace:

1. leer `dias_hasta_llamado`
2. buscar `envios` enviados con `numero_recordatorio > 0`
3. verificar vencimiento por fecha
4. actualizar `encuestas` desde `recordatorio_enviado` a `necesidad_de_llamado`

## 7.4 Respuesta

Cuando entra una fila en `respuestas`:

- el trigger marca `encuestas.estado = 'respondida'`

## 7.5 Sin respuesta

Cuando un operador marca una encuesta como sin respuesta:

- `encuestas.estado = 'sin_respuesta'`

## 8. Seed

`supabase/seed.sql` crea la configuración base del sistema.

Valores por defecto actuales:

- `dias_notificacion_inicial = 2`
- `dias_notificacion_recordatorio = 2`
- `dias_hasta_llamado = 2`
- `emails_notificacion = '{}'`

## 9. Índices e impacto

Índices clave del diseño:

- por `estado` de encuestas
- por `campana_id`
- por `cliente_id`
- por `token`
- por `numero_recordatorio`
- por `tecnologia`

Motivo:

- acelerar consulta de pendientes
- acelerar lookup de encuesta pública por token
- acelerar procesamiento de recordatorios y llamados

## 10. Consultas operativas frecuentes

### 10.1 Pendientes de campaña

- encuestas por `campana_id` con estado `pendiente`

### 10.2 Llamados

- encuestas con estado `necesidad_de_llamado`

### 10.3 Respuestas

- encuestas `respondida` con join a `respuestas`, `campanas` y `clientes`
- filtros por concesionario, campaña, fechas, tipo de máquina y tecnología

### 10.4 Exportación

- encuestas no cerradas con join a teléfonos y token

## 11. Inconsistencias conocidas

### 11.1 Nombre de tabla `clientes`

No representa clientes maestros. Representa filas por `OF`.

### 11.2 Parámetros de notificación heredados

`dias_notificacion_inicial` y `dias_notificacion_recordatorio` siguen existiendo porque forman parte de la configuración operativa esperada, pero hoy no gobiernan una automatización completa de envíos.

### 11.3 Automatización duplicada

Existe:

- sincronización en código `workflow.service.ts`
- automatización real en SQL con `pg_cron`

La ruta recomendada de largo plazo es dejar la base como fuente principal y mantener la sincronización de aplicación solo si aporta tolerancia operativa.

## 12. Operación recomendada

Para alinear código y base:

```bash
npx supabase db push
```

Si hace falta regenerar tipos:

```bash
npx supabase gen types typescript --linked > src/types/database.types.ts
```
