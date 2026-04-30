# Arquitectura

## 1. Resumen técnico

La aplicación está construida con:

- Next.js 15 App Router
- React 19
- TypeScript estricto
- Tailwind CSS v4
- Supabase para Auth y PostgreSQL
- Nodemailer para SMTP

El enfoque general es server-first:

- lectura de datos desde Server Components y servicios
- escritura mediante Server Actions
- validación de formularios con Zod
- acceso privilegiado a Supabase solo desde servidor

## 2. Capas del sistema

## 2.1 Capa de interfaz

Ubicación principal:

- `src/app/`
- `src/components/`
- `src/modules/*/components`

Responsabilidades:

- renderizar vistas
- tomar input del usuario
- invocar Server Actions
- mostrar estados operativos y métricas

## 2.2 Capa de aplicación

Ubicación principal:

- `src/app/**/actions.ts`
- `src/modules/*/services`

Responsabilidades:

- validación de reglas de negocio
- lectura y escritura contra Supabase
- composición de operaciones
- revalidación de rutas

## 2.3 Capa de infraestructura

Ubicación principal:

- `src/lib/supabase`
- `src/lib/utils`
- `src/lib/email`
- `supabase/migrations`

Responsabilidades:

- clientes Supabase
- utilidades de parseo y exportación
- envío SMTP
- definición del schema y automatizaciones SQL

## 3. Estructura de carpetas

```text
src/
  app/
    (dashboard)/
      campanas/
      clientes/
      configuracion/
      llamados/
      nps/
      respuestas/
      layout.tsx
      page.tsx
    api/
      campanas/[id]/exportar/
      respuestas/exportar/
    encuesta/
    login/
  components/
    layout/
    ui/
  lib/
    email/
    supabase/
    utils/
  modules/
    alertas/
    campanas/
    clientes/
    configuracion/
    dashboard/
    recordatorios/
  types/
```

## 4. Responsabilidad por módulo

## 4.1 `modules/campanas`

Contiene la lógica de:

- listado de campañas
- detalle de campaña
- carga de campaña vía CSV
- creación de encuestas
- creación de envíos iniciales

Archivo clave:

- `src/app/(dashboard)/campanas/actions.ts`

## 4.2 `modules/clientes`

Contiene:

- alta manual
- importación CSV
- tabla de registros cargados

Observación:

- el nombre del módulo quedó histórico; hoy representa registros por `OF`

## 4.3 `modules/recordatorios`

Contiene:

- timeline de envíos por campaña
- reglas para crear recordatorios
- confirmación manual de envío
- sincronización hacia `necesidad_de_llamado`
- vista de llamados

Archivos clave:

- `services/recordatorios.service.ts`
- `services/workflow.service.ts`

## 4.4 `modules/dashboard`

Contiene:

- construcción de datasets de respuestas
- filtros
- cálculo de NPS
- distribución de promotores, pasivos y detractores
- ranking de concesionarios
- detalle expandido de respuestas
- vistas `/respuestas` y `/nps`

## 4.5 `modules/alertas`

Contiene:

- disparo de emails cuando hay NPS crítico

## 4.6 `modules/configuracion`

Contiene:

- lectura y actualización de `system_config`
- prueba de email SMTP

## 5. Rutas principales

## 5.1 Dashboard autenticado

- `/`
- `/campanas`
- `/campanas/nueva`
- `/campanas/[id]`
- `/campanas/[id]/recordatorio`
- `/clientes`
- `/configuracion`
- `/llamados`
- `/respuestas`
- `/nps`

Todas estas rutas requieren usuario autenticado.

## 5.2 Público

- `/login`
- `/encuesta?token=...`

## 5.3 API interna

- `/api/campanas/[id]/exportar`
- `/api/respuestas/exportar`

Ambas verifican autenticación antes de responder.

## 6. Flujo técnico de creación de campaña

1. El usuario sube un CSV en `/campanas/nueva`.
2. `parseClientesCSV()` normaliza encabezados, valida tecnología opcional y agrupa por `OF`.
3. La Server Action inserta:
   - campaña
   - clientes
   - encuestas
   - envíos iniciales
4. El envío inicial se registra como `enviado`.
5. El detalle de campaña muestra el universo generado.

Punto importante:

- la unicidad funcional está en `cliente_id + campana_id`, pero como el import agrupa por `OF`, en la práctica hay una encuesta por `OF` por campaña

## 7. Flujo técnico de exportación

La exportación de pendientes usa:

- token de encuesta
- datos del registro asociado
- `NEXT_PUBLIC_APP_URL`

`generarCSVPendientes()` expande una encuesta en varias filas si hay más de un teléfono.

## 8. Flujo técnico de encuesta pública

## 8.1 Lectura inicial

`app/encuesta/page.tsx`:

- toma `token` desde query string
- busca la encuesta con privilegio de admin
- verifica estado
- si está disponible, renderiza `FormularioEncuesta`

## 8.2 Escritura

`app/encuesta/actions.ts`:

- valida con Zod
- reconsulta la encuesta
- evita doble respuesta
- inserta en `respuestas`
- dispara alerta SMTP si algún NPS < 6

## 9. Flujo técnico de recordatorios

## 9.1 Creación

`crearRecordatorio()`:

- toma encuestas `pendiente`
- crea filas en `envios` para el número de recordatorio solicitado

## 9.2 Confirmación

`marcarRecordatorioEnviado()`:

- actualiza `envios`
- completa `fecha_envio`
- mueve encuestas a `recordatorio_enviado`

## 9.3 Paso a llamados

Hay dos caminos:

- `workflow.service.ts` como sincronización defensiva desde la app
- función SQL `sync_encuestas_necesidad_llamado()` + `pg_cron` como automatización real

La automatización de base es la que no depende de abrir pantallas.

## 10. Flujo técnico de llamados

La ruta `/llamados` consulta `getEncuestasNecesidadLlamado()` y muestra todas las `OF` que ya salieron del circuito digital.

Acciones:

- abrir encuesta por token
- marcar `sin_respuesta`

Eso permite usar el mismo formulario para carga asistida por teléfono.

## 11. Flujo técnico de métricas

`dashboard.service.ts`:

- consulta encuestas `respondida`
- trae campaña, cliente y respuesta
- mapea a un modelo interno plano
- aplica filtros en memoria
- calcula NPS general, por tipo de máquina y por concesionario
- calcula distribución de detractores, pasivos y promotores
- arma ranking de concesionarios por `nps_concesionario`

El cálculo actual usa la fórmula clásica:

```text
NPS = % promotores (9-10) - % detractores (0-6)
```

## 12. Supabase

## 12.1 Clientes

- `createSupabaseServer()`
  - usa cookies
  - sirve para rutas autenticadas y Server Components

- `createSupabaseAdmin()`
  - usa `SUPABASE_SERVICE_ROLE_KEY`
  - solo debe ejecutarse en servidor

## 12.2 Base de datos

La base concentra:

- modelo de negocio
- triggers
- RLS
- automatización `pg_cron`

## 13. Decisiones de diseño relevantes

### 13.1 Reutilizar el mismo link por OF

Se eligió porque el negocio requiere una sola respuesta por máquina, aunque existan varios teléfonos de contacto.

### 13.2 Mantener el nombre `clientes`

Se mantuvo para no hacer una migración semántica más grande en esta etapa. Es deuda técnica aceptada.

### 13.3 Recordatorio manual + llamado automático

Hoy el proceso humano de enviar el mensaje sigue siendo externo. Por eso:

- la creación y confirmación del recordatorio son manuales
- la transición a llamado sí quedó automatizada

### 13.4 SMTP simple

Se eligió Gmail SMTP porque el volumen es bajo y no justifica un proveedor transaccional dedicado en esta etapa.

## 14. Deudas técnicas visibles

- renombrar `clientes` a algo alineado con `OF`
- conectar realmente `dias_notificacion_inicial` y `dias_notificacion_recordatorio` a automatización operativa
- limpiar documentación histórica residual fuera de `docs/`
- agregar tests automáticos de reglas de negocio
- revisar si `comentario_general` debe exponerse en el formulario o eliminarse del modelo operativo
