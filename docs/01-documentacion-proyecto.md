# Documentación del Proyecto

## 1. Objetivo

Plataforma interna para gestionar campañas de encuestas NPS de Crucianelli.

El sistema reemplaza el flujo manual basado en:

- Google Sheets para preparar contactos
- envíos externos por script
- Google Forms para responder
- seguimiento manual de pendientes

La unidad operativa actual no es el teléfono ni la persona, sino la `OF` dentro de una campaña.

## 2. Conceptos del negocio

### 2.1 OF

`OF` significa orden de fabricación. En el sistema, una `OF` representa la unidad encuestable.

Regla principal:

- una `OF` tiene una sola encuesta por campaña
- una `OF` puede tener hasta `3` teléfonos
- todos los teléfonos de la misma `OF` comparten el mismo link
- si cualquiera responde, la `OF` queda cerrada como `respondida`

### 2.2 Campaña

Una campaña agrupa un conjunto de `OF` que serán contactadas.

Cada campaña tiene:

- nombre
- fecha
- estado administrativo: `activa`, `completada`, `archivada`

### 2.3 Cliente

Por nomenclatura histórica, la tabla `clientes` sigue llamándose así. En la práctica, hoy almacena una fila por `OF` cargada en una campaña tipo:

- cliente o razón social
- concesionario
- `OF`
- teléfono 1
- teléfono 2
- teléfono 3
- tecnología

No funciona como un CRM general.

## 3. Flujo operativo actual

## 3.1 Carga de campaña

Paso a paso:

1. Un usuario autenticado crea una campaña.
2. Sube un CSV con `CONCESIONARIO`, `CLIENTE`, `OF`, teléfonos y tecnología opcional.
3. El parser agrupa filas por `OF`.
4. Si una misma `OF` aparece repetida con teléfonos distintos, el sistema los unifica.
5. Se crea una fila en `clientes` por cada `OF`.
6. Se crea una fila en `encuestas` por cada `OF`.
7. Se crea un envío inicial en `envios` con `numero_recordatorio = 0`.
8. Ese envío inicial queda registrado ya como `enviado`.

Resultado:

- una sola encuesta por `OF`
- un solo token por `OF`
- hasta tres teléfonos asociados a esa misma encuesta

## 3.2 Exportación para envío inicial

La campaña exporta un CSV con una fila por teléfono.

Ejemplo:

- OF `12345`
- teléfono 1 `341...`
- teléfono 2 `349...`

Exportación:

- fila 1 -> teléfono 1 -> link `X`
- fila 2 -> teléfono 2 -> link `X`

Ese comportamiento es intencional. Permite que el script externo envíe más de un mensaje por `OF` sin permitir más de una respuesta.

## 3.3 Respuesta de encuesta

El link público tiene formato:

```text
/encuesta?token=<uuid>
```

Reglas:

- si el token no existe, la página no responde la encuesta
- si la encuesta ya fue respondida, se muestra mensaje de cierre
- si la encuesta fue marcada como `sin_respuesta`, también queda cerrada

Cuando el formulario se envía:

1. se valida el payload con Zod
2. se revalida el token en servidor
3. se inserta la fila en `respuestas`
4. un trigger actualiza `encuestas.estado = 'respondida'`
5. si alguno de los NPS es menor a `6`, se envía alerta SMTP

## 3.4 Recordatorios

Los recordatorios son manuales.

Eso significa:

1. el usuario entra al detalle de campaña
2. crea un recordatorio
3. el sistema incluye solo `OF` con estado `pendiente`
4. se generan registros en `envios` con `numero_recordatorio = 1`, `2` o `3`
5. el usuario exporta esos pendientes
6. realiza el envío externo
7. confirma manualmente el recordatorio como enviado

Cuando se confirma:

- `envios.estado_envio` pasa a `enviado`
- `envios.fecha_envio` se completa
- las `OF` incluidas pasan de `pendiente` a `recordatorio_enviado`

Restricciones:

- máximo `3` recordatorios por campaña
- no se puede crear un nuevo recordatorio si el anterior todavía no fue confirmado como enviado
- el envío inicial no requiere confirmación manual

## 3.5 Necesidad de llamado

Después de que un recordatorio fue marcado como enviado, la `OF` puede pasar automáticamente a `necesidad_de_llamado`.

Regla:

- si la `OF` sigue en `recordatorio_enviado`
- y ya venció el plazo configurado
- entonces pasa a `necesidad_de_llamado`

Esta transición se hace por dos mecanismos:

- defensivo en la app al consultar algunos servicios
- automático real en base de datos mediante `pg_cron`

La automatización definitiva corre en Supabase cada `15` minutos.

## 3.6 Gestión de llamados

Existe una vista operativa `/llamados`.

Ahí se listan todas las `OF` con estado `necesidad_de_llamado`, mostrando:

- campaña
- cliente
- `OF`
- concesionario
- teléfono 1
- teléfono 2
- teléfono 3

Acciones disponibles:

- abrir la encuesta para completarla por teléfono junto al cliente
- marcar `sin_respuesta`

Si el operador abre la encuesta y la completa:

- la `OF` pasa a `respondida`

Si no obtiene respuesta:

- la `OF` pasa a `sin_respuesta`

## 4. Estados relevantes

## 4.1 Estado de campaña

- `activa`
- `completada`
- `archivada`

## 4.2 Estado de encuesta por OF

- `pendiente`
- `recordatorio_enviado`
- `necesidad_de_llamado`
- `respondida`
- `sin_respuesta`

Interpretación:

- `pendiente`: la `OF` todavía no respondió y aún no fue llevada a llamado
- `recordatorio_enviado`: ya tuvo al menos un recordatorio confirmado
- `necesidad_de_llamado`: salió del circuito digital y entra en gestión telefónica
- `respondida`: encuesta cerrada con respuesta válida
- `sin_respuesta`: encuesta cerrada sin respuesta luego del llamado

## 5. Formulario de encuesta

El formulario público replica el formulario operativo real de Crucianelli.

Incluye:

- datos de contacto
- concesionario sede
- modelo de máquina
- tipo de máquina
- nombre o firma de facturación
- preguntas de satisfacción 1 a 10
- comentarios abiertos

Los tres NPS oficiales del sistema son:

- `nps_concesionario`
- `nps_producto`
- `nps_empresa`

Mapeo actual:

- `NPS concesionario`: recomendación del concesionario considerando entrega, capacitación y puesta en marcha
- `NPS producto`: recomendación del producto Crucianelli
- `NPS empresa`: recomendación general de la empresa Crucianelli

Productos disponibles:

- sembradoras: Gringa, Pionera, Plantor, Drilor, Mixia, Domina
- fertilizadoras: Corper (incorporadora), Raster (motriz), Movia (arrastre), Luxion

La encuesta usa lenguaje genérico de `producto` para poder reutilizar el mismo formulario con sembradoras y fertilizadoras.

## 6. Vistas disponibles

- `/` Dashboard general
- `/campanas` listado de campañas
- `/campanas/nueva` alta de campaña por CSV
- `/campanas/[id]` detalle de campaña
- `/campanas/[id]/recordatorio` gestión del recordatorio activo
- `/clientes` vista operativa de registros cargados
- `/respuestas` listado completo de encuestas respondidas, detalle expandido y exportación CSV
- `/nps` métricas NPS, gráficos, ranking y comparativo por concesionario
- `/llamados` operación de `OF` en `necesidad_de_llamado`
- `/configuracion` parámetros globales y prueba SMTP
- `/encuesta` formulario público
- `/login` acceso administrativo

## 7. Configuración del sistema

La tabla `system_config` contiene la configuración operativa.

Campos principales:

- `dias_notificacion_inicial`
- `dias_notificacion_recordatorio`
- `dias_hasta_llamado`
- `emails_notificacion`

Estado real actual:

- `dias_hasta_llamado` sí participa activamente del flujo automático a `necesidad_de_llamado`
- `emails_notificacion` sí se usa para alertas NPS críticas
- `dias_notificacion_inicial` y `dias_notificacion_recordatorio` hoy están disponibles en UI y persistencia, pero no gobiernan todavía una automatización completa del envío digital

## 8. Emails

El proyecto usa SMTP con Gmail mediante `nodemailer`.

Casos implementados:

- email de prueba desde `/configuracion`
- alerta automática cuando algún NPS es menor a `6`

No está implementado aún:

- envío automático de campañas
- envío automático de recordatorios
- notificaciones internas por cierre de etapa

## 9. Reglas de importación CSV

Columnas mínimas esperadas:

- `CONCESIONARIO`
- `CLIENTE (según factura)`
- `ORDEN DE FABRICACION MÁQUINA`
- `Teléfono del Cliente`

Columnas opcionales:

- `Teléfono del Cliente 2`
- `Teléfono del Cliente 3`

Reglas:

- se aceptan encabezados equivalentes normalizados
- el sistema agrupa por `OF`
- si una `OF` reúne más de `3` teléfonos únicos, la importación falla
- si una fila no tiene nombre, concesionario, `OF` o al menos un teléfono, se descarta

## 10. Métricas y explotación

La plataforma ya permite:

- ver respuestas completas
- filtrar por concesionario, campaña, texto y rango de fechas
- exportar respuestas a CSV
- calcular NPS general
- calcular NPS por concesionario
- ver semáforos visuales para NPS críticos

## 11. Limitaciones y deudas técnicas actuales

- la tabla `clientes` conserva un nombre histórico que hoy representa `OF`
- el circuito de recordatorios sigue siendo manual en su creación y confirmación
- la automatización actual cubre el paso a `necesidad_de_llamado`, no el disparo automático del recordatorio
- hay parámetros de configuración heredados que todavía no están conectados a lógica completa
- el proyecto mezcla documentación histórica con implementación actual; este documento y el resto de `docs/` pasan a ser la referencia vigente

## 12. Estado recomendado de uso

Flujo recomendado hoy:

1. cargar campaña por CSV
2. exportar envío inicial
3. esperar respuestas
4. crear recordatorio manual si corresponde
5. confirmar recordatorio enviado
6. dejar que el cron lleve automáticamente a `necesidad_de_llamado`
7. operar pendientes desde `/llamados`
8. analizar respuestas y NPS desde `/respuestas` y `/nps`
