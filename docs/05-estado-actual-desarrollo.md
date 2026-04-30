# Estado Actual del Desarrollo

Documento consolidado del estado de la plataforma NPS al 28 de abril de 2026.

## 1. Resumen del producto

La plataforma reemplaza el flujo manual de encuestas NPS de Crucianelli basado en planillas, formularios externos y seguimiento manual.

El sistema permite:

- crear campañas de encuestas
- importar registros desde CSV
- generar un link único por `OF`
- enviar y reenviar links por fuera de la plataforma
- registrar respuestas desde un formulario público
- consultar detalle completo de cada respuesta
- exportar respuestas y pendientes en CSV
- calcular NPS general, por producto, por empresa y por concesionario
- gestionar recordatorios
- derivar casos sin respuesta a llamados
- marcar casos como `sin_respuesta`
- disparar alertas por NPS crítico

La unidad operativa principal es la `OF` dentro de una campaña.

## 2. Stack técnico

La aplicación está desarrollada con:

- Next.js 15 con App Router
- React 19
- TypeScript estricto
- Tailwind CSS v4
- Supabase Auth
- Supabase PostgreSQL
- Supabase RLS
- Supabase `pg_cron`
- Server Components
- Server Actions
- Zod para validación
- Nodemailer para SMTP

El enfoque general es server-first:

- las lecturas principales salen desde Server Components y servicios
- las escrituras pasan por Server Actions
- el formulario público revalida token y estado desde servidor
- la clave `service role` solo se usa en servidor

## 3. Conceptos funcionales

## 3.1 Campaña

Una campaña agrupa el universo de `OF` a contactar.

Cada campaña tiene:

- `nombre`
- `fecha`
- `estado`: `activa`, `completada`, `archivada`

Rutas relacionadas:

- `/campanas`
- `/campanas/nueva`
- `/campanas/[id]`
- `/campanas/[id]/recordatorio`

## 3.2 OF

`OF` significa orden de fabricación.

Reglas actuales:

- una `OF` genera una sola encuesta por campaña
- una `OF` puede tener hasta tres teléfonos
- todos los teléfonos de una misma `OF` comparten el mismo link
- si cualquiera de esos teléfonos responde, la encuesta queda cerrada como `respondida`
- si no se obtiene respuesta luego del circuito de recordatorios y llamado, puede cerrarse como `sin_respuesta`

## 3.3 Clientes

La tabla y el módulo se llaman `clientes` por decisión histórica.

En la práctica, hoy cada fila representa una unidad encuestable cargada desde CSV o alta manual:

- cliente o razón social
- teléfono 1
- teléfono 2
- teléfono 3
- concesionario
- `OF`
- tecnología

No funciona todavía como CRM maestro.

## 3.4 Tecnología

Se agregó soporte para tecnología asociada a la `OF`.

Valores aceptados:

- `Leaf`
- `Precision Planting`

Representación interna:

- `leaf`
- `precision_planting`

La tecnología se usa como filtro en:

- `/respuestas`
- `/nps`

También se muestra en:

- listado de clientes
- detalle de campaña
- tabla de respuestas
- detalle expandido de respuesta
- exportación CSV de respuestas

## 4. Importación CSV

## 4.1 CSV de campaña

Desde `/campanas/nueva` se carga un CSV para crear campaña, clientes, encuestas y envíos iniciales.

Columnas esperadas o soportadas:

- `CONCESIONARIO`
- `CLIENTE` o `NOMBRE`
- `ORDEN DE FABRICACION`
- `Teléfono del Cliente`
- `Teléfono del Cliente 2`
- `Teléfono del Cliente 3`
- `TECNOLOGIA` o `TECNOLOGÍA`

La columna de tecnología es opcional.

## 4.2 Normalización

El parser:

- normaliza encabezados sin distinguir mayúsculas, minúsculas ni acentos
- detecta separador `;` o `,`
- agrupa filas por `OF`
- unifica teléfonos repetidos
- permite hasta tres teléfonos por `OF`
- valida que una misma `OF` no tenga más de una tecnología distinta
- valida que la tecnología sea `Leaf` o `Precision Planting`

Archivo principal:

- `src/lib/utils/csv.ts`

## 4.3 Alta manual

Desde `/clientes` también se puede crear un registro manualmente con:

- nombre
- teléfonos
- concesionario
- `OF`
- tecnología opcional

## 5. Formulario público de encuesta

Ruta:

- `/encuesta?token=<uuid>`

El formulario público:

- valida el token
- bloquea encuestas ya respondidas
- bloquea encuestas cerradas como `sin_respuesta`
- guarda una sola respuesta por encuesta
- usa Zod para validar todo el payload
- inserta en `respuestas`
- dispara alerta SMTP si algún NPS es menor a `6`

Archivo principal:

- `src/app/encuesta/FormularioEncuesta.tsx`
- `src/app/encuesta/actions.ts`

## 5.1 Datos solicitados

El formulario registra:

- nombre y apellido
- calle y número
- piso/departamento
- localidad
- código postal
- provincia
- email
- teléfono
- concesionario sede
- producto o modelo
- tipo de máquina
- nombre o firma de facturación
- calificaciones de satisfacción
- NPS concesionario
- NPS producto
- NPS empresa
- comentarios abiertos

## 5.2 Productos disponibles

Sembradoras:

- Gringa
- Pionera
- Plantor
- Drilor
- Mixia
- Domina

Fertilizadoras:

- Corper (incorporadora)
- Raster (motriz)
- Movia (arrastre)
- Luxion

## 5.3 Lenguaje de preguntas

Las preguntas fueron adaptadas para hablar de `producto` en vez de `sembradora` cuando corresponde.

Esto permite reutilizar la misma encuesta para:

- sembradoras
- fertilizadoras

## 6. Respuestas

Ruta:

- `/respuestas`

La vista permite:

- listar todas las respuestas
- buscar por cliente, email, campaña, producto, `OF` o tecnología
- filtrar por concesionario
- filtrar por campaña
- filtrar por rango de fechas
- filtrar por tecnología
- exportar respuestas a CSV
- abrir el detalle completo de cada respuesta

## 6.1 Detalle expandido

El botón `Ver` en la tabla de respuestas despliega toda la información capturada:

- datos de contacto
- datos de domicilio
- campaña
- concesionario importado
- concesionario sede declarado en formulario
- producto
- tipo de máquina
- tecnología
- firma de facturación
- `OF`
- fecha de envío
- fecha de respuesta
- calificaciones 1 a 10
- NPS concesionario
- NPS producto
- NPS empresa
- comentarios

Componente principal:

- `src/modules/dashboard/components/RespuestasTable.tsx`

## 6.2 Exportación CSV de respuestas

La exportación está protegida por autenticación.

Ruta API:

- `/api/respuestas/exportar`

La exportación respeta filtros activos:

- búsqueda
- concesionario
- campaña
- rango de fechas
- tecnología

El CSV incluye:

- fecha de respuesta
- campaña
- cliente
- contacto
- domicilio
- concesionario
- concesionario sede
- producto
- tipo de máquina
- tecnología
- firma de facturación
- calificaciones
- NPS
- comentarios

Archivos principales:

- `src/app/api/respuestas/exportar/route.ts`
- `src/lib/utils/exportar.ts`

## 7. NPS

Ruta:

- `/nps`

La vista NPS muestra:

- indicadores generales
- NPS de producto para sembradoras
- NPS de producto para fertilizadoras
- NPS concesionario
- NPS empresa
- efectividad de encuestas
- filtros
- distribución NPS
- mejor concesionario por NPS
- peor concesionario por NPS
- concesionario con mayor volumen de respuestas
- ranking visual
- tabla completa por concesionario

## 7.1 Filtros NPS

Filtros disponibles:

- concesionario
- tipo de máquina
- tecnología
- fecha desde
- fecha hasta

## 7.2 Cálculo NPS

La fórmula usada es:

```text
NPS = % promotores - % detractores
```

Clasificación:

- detractores: `0` a `6`
- pasivos: `7` y `8`
- promotores: `9` y `10`

El resultado se redondea a un decimal.

## 7.3 Ranking de concesionarios

El ranking ordena por:

1. mayor `nps_concesionario`
2. mayor cantidad de respuestas en caso de empate

Componentes principales:

- `src/modules/dashboard/components/IndicadoresPanel.tsx`
- `src/modules/dashboard/components/NpsInsightsPanel.tsx`
- `src/modules/dashboard/components/ConcesionariosNpsTable.tsx`

Servicio principal:

- `src/modules/dashboard/services/dashboard.service.ts`

## 8. Recordatorios

Los recordatorios son manuales desde la interfaz.

Flujo:

1. el usuario entra al detalle de una campaña
2. crea un recordatorio
3. el sistema toma las encuestas pendientes
4. genera registros en `envios`
5. el usuario exporta pendientes
6. el envío real se hace por fuera de la plataforma
7. el usuario confirma el recordatorio como enviado

Restricciones:

- máximo tres recordatorios por campaña
- no se puede crear un nuevo recordatorio si el anterior no fue confirmado
- el envío inicial se crea automáticamente como `enviado`

Archivos principales:

- `src/modules/recordatorios/services/recordatorios.service.ts`
- `src/modules/recordatorios/components/RecordatoriosTimeline.tsx`
- `src/app/(dashboard)/campanas/[id]/recordatorio/page.tsx`

## 9. Llamados y cierre sin respuesta

Ruta:

- `/llamados`

Cuando una encuesta queda en `necesidad_de_llamado`, aparece en esta vista.

Desde ahí el operador puede:

- abrir la encuesta para completarla asistiendo al cliente por teléfono
- marcar la encuesta como `sin_respuesta`

Si se marca como `sin_respuesta`, queda cerrada y el link público ya no permite responder.

## 10. Automatización a necesidad de llamado

La transición a `necesidad_de_llamado` existe en dos niveles:

- sincronización defensiva desde código
- job real en Supabase con `pg_cron`

La base ejecuta `sync_encuestas_necesidad_llamado()` cada 15 minutos.

La regla usa:

- estado actual `recordatorio_enviado`
- fecha de último recordatorio enviado
- parámetro `dias_hasta_llamado`

## 11. Alertas NPS crítico

Cuando se guarda una respuesta, el sistema evalúa:

- `nps_producto`
- `nps_empresa`
- `nps_concesionario`

Si cualquiera es menor a `6`, se dispara una alerta por email.

La lista de destinatarios se toma desde:

- `system_config.emails_notificacion`

Archivos principales:

- `src/modules/alertas/services/alertas.service.ts`
- `src/lib/email/send-email.ts`
- `src/lib/email/transporter.ts`

## 12. Configuración

Ruta:

- `/configuracion`

Permite administrar:

- días de notificación inicial
- días entre recordatorios
- días hasta llamado
- emails para alertas
- prueba SMTP

Tabla:

- `system_config`

## 13. Base de datos

Tablas principales:

- `campanas`
- `clientes`
- `encuestas`
- `respuestas`
- `envios`
- `system_config`

Enums:

- `campana_estado`
- `encuesta_estado`
- `envio_estado`
- `tipo_maquina_enum`

## 13.1 Migraciones aplicadas al modelo

Migraciones existentes:

- `001_initial_schema.sql`
- `002_triggers.sql`
- `003_rls_policies.sql`
- `004_add_orden_fabricacion.sql`
- `005_expand_respuestas_form.sql`
- `006_of_multi_phone_flow.sql`
- `007_rename_pendiente_llamado_estado.sql`
- `008_automate_necesidad_llamado.sql`
- `009_tipo_maquina_y_sin_respuesta.sql`
- `010_security_perf_hardening.sql`
- `011_add_cliente_tecnologia.sql`

## 13.2 Cambio de tecnología

La migración `011_add_cliente_tecnologia.sql` agrega:

- columna `clientes.tecnologia`
- `CHECK` para limitar valores a `leaf` o `precision_planting`
- índice parcial `idx_clientes_tecnologia`

Esta migración también fue aplicada al proyecto Supabase activo usado por la app.

## 13.3 Trigger de respuesta

Al insertar una fila en `respuestas`, un trigger actualiza la encuesta asociada:

```text
encuestas.estado = 'respondida'
```

Esto evita que la aplicación tenga que actualizar ese estado manualmente.

## 14. Seguridad

Medidas actuales:

- rutas internas protegidas por middleware
- Supabase Auth para panel administrativo
- RLS habilitado
- APIs de exportación con verificación de sesión
- formulario público accesible solo por token
- revalidación de token en servidor
- bloqueo de doble respuesta
- service role solo desde servidor
- SMTP solo desde servidor

Rutas públicas:

- `/login`
- `/encuesta?token=...`

Rutas internas:

- todo el dashboard
- `/api/campanas/[id]/exportar`
- `/api/respuestas/exportar`

## 15. Estructura de rutas

Rutas de panel:

- `/`
- `/campanas`
- `/campanas/nueva`
- `/campanas/[id]`
- `/campanas/[id]/recordatorio`
- `/clientes`
- `/respuestas`
- `/nps`
- `/llamados`
- `/sin-respuesta`
- `/configuracion`

Rutas públicas:

- `/login`
- `/encuesta`

APIs:

- `/api/campanas/[id]/exportar`
- `/api/respuestas/exportar`

## 16. Archivos clave

Formulario:

- `src/app/encuesta/FormularioEncuesta.tsx`
- `src/app/encuesta/actions.ts`
- `src/app/encuesta/form-options.ts`

CSV y exportaciones:

- `src/lib/utils/csv.ts`
- `src/lib/utils/exportar.ts`
- `src/lib/utils/tecnologia.ts`

Dashboard y NPS:

- `src/modules/dashboard/services/dashboard.service.ts`
- `src/modules/dashboard/components/RespuestasTable.tsx`
- `src/modules/dashboard/components/IndicadoresPanel.tsx`
- `src/modules/dashboard/components/NpsInsightsPanel.tsx`
- `src/modules/dashboard/components/ConcesionariosNpsTable.tsx`

Campañas:

- `src/app/(dashboard)/campanas/actions.ts`
- `src/modules/campanas/services/campanas.service.ts`
- `src/modules/campanas/components/NuevaCampanaForm.tsx`

Clientes:

- `src/app/(dashboard)/clientes/actions.ts`
- `src/modules/clientes/services/clientes.service.ts`
- `src/modules/clientes/components/ClienteForm.tsx`
- `src/modules/clientes/components/ClientesTable.tsx`

Recordatorios y llamados:

- `src/modules/recordatorios/services/recordatorios.service.ts`
- `src/modules/recordatorios/services/workflow.service.ts`
- `src/modules/recordatorios/components/RecordatoriosTimeline.tsx`

Configuración y alertas:

- `src/modules/configuracion/services/configuracion.service.ts`
- `src/modules/alertas/services/alertas.service.ts`
- `src/lib/email/transporter.ts`
- `src/lib/email/send-email.ts`

## 17. Validaciones ejecutadas

Última verificación técnica realizada:

```bash
npm run lint
npm run build
```

Resultado:

- lint correcto
- build correcto
- Next.js compiló y generó las rutas de producción correctamente

## 18. Deudas técnicas conocidas

Deudas o puntos a revisar:

- `clientes` debería renombrarse conceptualmente a una tabla más alineada con `OF`
- faltan tests automáticos para parser CSV, cálculo NPS, recordatorios y bloqueo de doble respuesta
- los advisors de Supabase siguen reportando políticas RLS permisivas para usuarios autenticados
- los advisors de Supabase reportan protección de passwords filtradas deshabilitada
- algunos índices aparecen como no usados por bajo volumen de datos
- `dias_notificacion_inicial` y `dias_notificacion_recordatorio` todavía no gobiernan una automatización completa de envíos
- `comentario_general` existe en base pero el formulario actual no lo solicita activamente

## 19. Operación recomendada

Para levantar el proyecto local:

```bash
npm run dev
```

Para validar antes de entregar cambios:

```bash
npm run lint
npm run build
```

Para aplicar migraciones pendientes en Supabase local o remoto:

```bash
npx supabase db push
```

Para regenerar tipos desde Supabase:

```bash
npx supabase gen types typescript --linked > src/types/database.types.ts
```

## 20. Próximos pasos sugeridos

Prioridades razonables:

1. Agregar tests de reglas críticas.
2. Ajustar políticas RLS para eliminar warnings de advisors.
3. Definir si `clientes` debe migrar a una entidad `of_clientes` o similar.
4. Sumar filtros por tecnología en otras vistas operativas si el uso lo requiere.
5. Decidir si `comentario_general` queda en el formulario o se elimina del modelo operativo.
