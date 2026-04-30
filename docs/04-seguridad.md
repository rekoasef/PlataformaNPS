# Seguridad

## 1. Principios del proyecto

El proyecto sigue estas reglas:

- acceso administrativo solo con autenticación
- acceso público únicamente al formulario con token
- claves privilegiadas solo en servidor
- RLS habilitado en base
- validación siempre en servidor para operaciones críticas

## 2. Superficies de acceso

## 2.1 Dashboard interno

Protección:

- Supabase Auth
- middleware de Next

Rutas protegidas:

- todo el grupo `(dashboard)`
- APIs internas de exportación

## 2.2 Encuesta pública

Protección:

- token UUID único por encuesta
- revalidación en servidor
- bloqueo de doble respuesta

Riesgo mitigado:

- acceso anónimo sin conocer token válido

## 3. Claves y secretos

## 3.1 Variables sensibles

- `SUPABASE_SERVICE_ROLE_KEY`
- `SMTP_PASS`

Estas variables:

- no deben exponerse al cliente
- solo deben usarse desde servidor

## 3.2 Variables públicas permitidas

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL`

## 4. Clientes Supabase

## 4.1 `createSupabaseServer()`

Uso:

- rutas autenticadas
- Server Components
- Server Actions que operan con sesión de usuario

Respeta:

- cookies del usuario
- RLS de Supabase

## 4.2 `createSupabaseAdmin()`

Uso:

- operaciones que necesitan privilegio administrativo
- lookup por token en encuesta pública
- alertas internas
- exportaciones server-side

Regla:

- nunca usar en cliente

## 5. RLS

La política general del proyecto es:

- tablas internas restringidas a usuarios autenticados
- acceso anónimo solo a lo estrictamente necesario para responder encuestas

Tablas sensibles:

- `campanas`
- `clientes`
- `encuestas`
- `envios`
- `respuestas`
- `system_config`

La documentación operativa de RLS vive en migraciones, pero la regla funcional es clara:

- un usuario anónimo no debe navegar el panel
- un usuario anónimo no debe listar campañas, clientes ni respuestas
- el único flujo público permitido es completar una encuesta válida

## 6. Seguridad del flujo público

## 6.1 Token

Cada encuesta tiene un `token` UUID único.

Uso:

- construir el link público
- identificar la encuesta a responder

## 6.2 Controles aplicados

En la encuesta pública se valida:

- que el token exista
- que la encuesta no esté `respondida`
- que la encuesta no esté `sin_respuesta`
- que no exista una respuesta previa

Eso evita:

- doble respuesta accidental
- reutilización posterior del link
- cierre inconsistente del flujo

## 6.3 Reutilización del mismo link

Todos los teléfonos de una misma `OF` comparten el mismo link.

Esto no es un problema de seguridad sino una decisión funcional:

- el objetivo es una sola respuesta por máquina

## 7. Server Actions

Todas las escrituras críticas pasan por Server Actions.

Ejemplos:

- crear campaña
- crear recordatorio
- confirmar recordatorio enviado
- guardar respuesta
- actualizar configuración
- marcar `sin_respuesta`

Ventajas:

- validación centralizada
- no exponer lógica al cliente
- control de permisos en servidor

## 8. Exportaciones

Las rutas:

- `/api/campanas/[id]/exportar`
- `/api/respuestas/exportar`

verifican autenticación antes de devolver información.

No son públicas.

## 9. SMTP

El proyecto usa Gmail SMTP con `nodemailer`.

Buenas prácticas aplicadas:

- credenciales en variables de entorno
- envío ejecutado solo desde servidor
- prueba SMTP disponible solo en panel autenticado

Consideraciones:

- no usar contraseña normal de Gmail
- usar App Password
- no loguear secretos

## 10. Alertas NPS

Las alertas de NPS crítico:

- se disparan en servidor
- leen destinatarios desde `system_config`
- no exponen emails ni lógica de envío al cliente

## 11. pg_cron y automatización

La automatización a `necesidad_de_llamado` corre en base mediante `pg_cron`.

Riesgos a controlar:

- no crear jobs duplicados
- no usar funciones con privilegios excesivos sin necesidad
- mantener `SECURITY DEFINER` limitado al `search_path` correcto

En la migración actual:

- la función se define con `SET search_path = public`
- el job se reprograma si ya existía

## 12. Riesgos actuales

## 12.1 Deuda de naming

`clientes` hoy almacena `OF`.

Riesgo:

- confusión conceptual al escribir nuevas consultas o features

## 12.2 Parámetros no conectados

Hay configuración que todavía no gobierna automatizaciones completas.

Riesgo:

- creer que el sistema hace algo automático cuando hoy todavía es manual

## 12.3 Ausencia de auditoría formal

Hoy no existe una tabla específica de auditoría de acciones administrativas.

Riesgo:

- baja trazabilidad ante errores operativos

## 12.4 Dependencia de Gmail SMTP

Para el volumen actual es razonable, pero:

- puede tener límites
- puede bloquear actividad sospechosa
- no ofrece trazabilidad avanzada tipo proveedor transaccional

## 13. Recomendaciones operativas

- no compartir la `service role`
- no subir `.env.local`
- restringir quién accede al panel
- usar cuentas de correo dedicadas
- revisar periódicamente la configuración de destinatarios
- probar el SMTP desde `/configuracion` después de cambios de clave
- aplicar migraciones antes de probar flujos críticos

## 14. Checklist rápido

- `RLS` habilitado
- middleware activo
- `SUPABASE_SERVICE_ROLE_KEY` solo en servidor
- `SMTP_PASS` configurado como App Password
- migraciones `006`, `007`, `008`, `009`, `010` y `011` aplicadas
- usuarios administrativos dados de alta en Supabase Auth
