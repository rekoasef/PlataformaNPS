# CLAUDE.md — NPS Survey Platform

Este archivo es la guía principal para trabajar en este proyecto. Leer completamente antes de tocar cualquier archivo. La carpeta `/docs` contiene la documentación completa del sistema.

---

## 📚 Documentación de Referencia

| Archivo | Contenido |
|---------|-----------|
| `docs/01-documentacion-proyecto.md` | Funcionalidad completa, flujos y reglas de negocio |
| `docs/02-arquitectura.md` | Estructura de carpetas, módulos, rutas y flujo de datos |
| `docs/03-base-de-datos.md` | Schema SQL, relaciones, índices, triggers y RLS |
| `docs/04-seguridad.md` | Políticas RLS, manejo de claves y checklist de seguridad |

---

## 🎯 Qué es este proyecto

Plataforma interna para gestionar encuestas de satisfacción NPS. Reemplaza Google Forms + Google Sheets con una solución centralizada con trazabilidad completa, métricas en tiempo real y alertas automáticas.

**Stack:**
- Next.js 15 (App Router, Server Components, Server Actions)
- TypeScript estricto
- Tailwind CSS v4
- Supabase (Auth + PostgreSQL + Edge Functions + pg_cron)
- Resend (emails transaccionales)

---

## 🗺️ Fases de Desarrollo

El proyecto se desarrolla en 12 fases secuenciales. **No avanzar a la siguiente fase hasta completar y verificar la actual.** Marcar cada subfase como completada con ✅ a medida que se avanza.

---

### FASE 1 — Setup e Infraestructura

**Objetivo:** tener el proyecto corriendo localmente con todas las herramientas configuradas.

- [ ] **1.1** Crear proyecto Next.js 15 con TypeScript: `npx create-next-app@latest --typescript --tailwind --app --src-dir`
- [ ] **1.2** Instalar dependencias principales:
  ```bash
  npm install @supabase/supabase-js @supabase/ssr
  npm install resend
  npm install zod
  npm install @supabase/cli --save-dev
  ```
- [ ] **1.3** Crear estructura de carpetas según `docs/02-arquitectura.md` (sección 3)
- [ ] **1.4** Configurar `tsconfig.json` con paths alias (`@/*` → `./src/*`) y modo estricto
- [ ] **1.5** Configurar variables de entorno: copiar `.env.example` a `.env.local` y completar valores
- [ ] **1.6** Crear proyecto en Supabase Dashboard y obtener URL + keys
- [ ] **1.7** Inicializar Supabase CLI: `npx supabase init`
- [ ] **1.8** Verificar que `npm run dev` corre sin errores

**Verificación:** app en `localhost:3000` sin errores en consola.

---

### FASE 2 — Base de Datos

**Objetivo:** schema completo en Supabase con todas las tablas, relaciones, triggers y RLS.

- [ ] **2.1** Crear migración `001_initial_schema.sql` con todas las tablas (ver `docs/03-base-de-datos.md` sección 3):
  - Extensiones (`uuid-ossp`, `pg_cron`)
  - Tipos enum (`campana_estado`, `encuesta_estado`, `envio_estado`)
  - Tablas: `clientes`, `campanas`, `encuestas`, `respuestas`, `envios`, `system_config`
  - Constraints, checks e índices
- [ ] **2.2** Crear migración `002_triggers.sql`:
  - Trigger `trg_marcar_encuesta_respondida` (insertar en `respuestas` → actualiza `encuestas.estado`)
  - Trigger `trg_system_config_updated_at`
- [ ] **2.3** Crear migración `003_rls_policies.sql` con todas las políticas (ver `docs/04-seguridad.md` sección 4):
  - Habilitar RLS en todas las tablas
  - Policies por tabla (admin autenticado + acceso anónimo solo por token)
- [ ] **2.4** Crear `supabase/seed.sql` con la fila inicial de `system_config`
- [ ] **2.5** Aplicar migraciones: `npx supabase db reset`
- [ ] **2.6** Generar tipos TypeScript: `npx supabase gen types typescript --local > src/types/database.types.ts`
- [ ] **2.7** Crear vistas `v_encuestas_completas` y `v_nps_por_campana` (ver `docs/03-base-de-datos.md` sección 5)

**Verificación:** todas las tablas visibles en Supabase Dashboard, tipos generados sin errores.

---

### FASE 3 — Autenticación y Layout Base

**Objetivo:** login funcional y todas las rutas del dashboard protegidas.

- [ ] **3.1** Crear clientes de Supabase en `src/lib/supabase/`:
  - `client.ts` (browser)
  - `server.ts` (server + admin con service_role)
- [ ] **3.2** Crear `middleware.ts` en raíz — proteger todas las rutas excepto `/login` y `/encuesta`
- [ ] **3.3** Crear página `/login` con formulario email + password usando Supabase Auth
- [ ] **3.4** Crear layout del dashboard `app/(dashboard)/layout.tsx` con Sidebar + Header
- [ ] **3.5** Crear componentes de layout en `src/components/layout/`: `Sidebar.tsx`, `Header.tsx`, `PageContainer.tsx`
- [ ] **3.6** Crear componentes UI base en `src/components/ui/`: `Button.tsx`, `Input.tsx`, `Card.tsx`, `Badge.tsx`, `Table.tsx`
- [ ] **3.7** Implementar logout

**Verificación:** acceder a `/` sin login redirige a `/login`. Login correcto redirige al dashboard. Logout funciona.

---

### FASE 4 — Módulo Clientes

**Objetivo:** gestión básica de clientes.

- [ ] **4.1** Crear tipos en `src/modules/clientes/types/cliente.types.ts`
- [ ] **4.2** Crear servicio `src/modules/clientes/services/clientes.service.ts` con:
  - `getClientes()`
  - `getClienteById(id)`
  - `createCliente(data)`
  - `getClientesByCampana(campanaId)`
- [ ] **4.3** Crear componentes: tabla de clientes, formulario de carga
- [ ] **4.4** Crear página `/clientes` con listado y búsqueda por nombre/concesionario

**Verificación:** crear un cliente desde la UI y que aparezca en la tabla.

---

### FASE 5 — Módulo Campañas

**Objetivo:** crear campañas, cargar clientes, generar tokens y exportar datos.

- [ ] **5.1** Crear tipos en `src/modules/campanas/types/campana.types.ts`
- [ ] **5.2** Crear servicio `src/modules/campanas/services/campanas.service.ts` con:
  - `getCampanas()`
  - `getCampanaById(id)`
  - `createCampana(data)`
  - `updateCampanaEstado(id, estado)`
- [ ] **5.3** Crear utilidad `src/lib/utils/tokens.ts` para generar UUIDs de tokens
- [ ] **5.4** Crear Server Action `crearCampanaAction`:
  - Crea la campaña
  - Por cada cliente, crea una `encuesta` con token UUID único
  - Crea un `envio` con `numero_recordatorio = 0`
- [ ] **5.5** Crear página `/campanas` con lista de campañas y estado
- [ ] **5.6** Crear página `/campanas/nueva`:
  - Formulario nombre + fecha
  - Carga de clientes (nombre, teléfono, concesionario)
  - Preview antes de confirmar
- [ ] **5.7** Crear funcionalidad de exportación en `src/lib/utils/exportar.ts`:
  - CSV con: nombre, teléfono, concesionario, link completo (`APP_URL/encuesta?token=xxx`)
- [ ] **5.8** Crear página `/campanas/[id]` con:
  - Métricas (respondidos / pendientes / tasa de respuesta)
  - Tabla de clientes con estado
  - Botón "Exportar pendientes"

**Verificación:** crear campaña con 3 clientes → 3 tokens únicos en `encuestas`. Exportación genera CSV correcto.

---

### FASE 6 — Formulario Público de Encuesta

**Objetivo:** formulario accesible por token, con validaciones y bloqueo de doble respuesta.

- [ ] **6.1** Crear página `app/encuesta/page.tsx` (Server Component):
  - Extrae `token` del query param
  - Valida token con `createSupabaseAdmin()` (service_role)
  - Si token inválido → 404 personalizado
  - Si ya respondida → "Ya completaste esta encuesta, ¡gracias!"
  - Si pendiente → renderiza formulario
- [ ] **6.2** Crear componente `FormularioEncuesta.tsx` replicando exactamente las preguntas del Google Forms actual:
  - Preguntas NPS (escala 0-10) para producto, empresa y concesionario
  - Campos adicionales según formulario actual
  - No pedir datos al usuario (vienen del token)
- [ ] **6.3** Crear Server Action `guardarRespuestaAction(token, data)`:
  - Validar con Zod
  - Re-validar token en servidor (doble check)
  - Verificar que no exista respuesta previa
  - Insertar en `respuestas` (trigger actualiza estado automáticamente)
  - Evaluar si NPS < 6 para disparar alerta (Fase 7)
- [ ] **6.4** Crear pantallas de estado: éxito, ya respondida, token inválido

**Verificación:** completar formulario → registro en `respuestas` + `encuestas.estado = 'respondida'`. Segundo intento → bloqueado.

---

### FASE 7 — Alertas NPS Crítico

**Objetivo:** enviar email automático cuando cualquier NPS < 6.

- [ ] **7.1** Configurar Resend: crear cuenta, obtener API key, agregar a `.env.local`
- [ ] **7.2** Crear cliente Resend en `src/lib/resend/client.ts`
- [ ] **7.3** Crear template `src/lib/resend/templates/alerta-nps.tsx` con:
  - Nombre del cliente y concesionario
  - Los tres valores NPS (resaltando el/los críticos)
  - Link al dashboard
- [ ] **7.4** Crear Edge Function `supabase/functions/send-alert-email/index.ts`
- [ ] **7.5** Integrar en `guardarRespuestaAction`: si cualquier NPS < 6 → llamar a la Edge Function
- [ ] **7.6** Edge Function lee `emails_notificacion` de `system_config` y envía a todos los destinatarios

**Verificación:** responder encuesta con NPS = 3 → email de alerta recibido.

---

### FASE 8 — Módulo Recordatorios

**Objetivo:** gestión completa del ciclo de recordatorios (máximo 3 por campaña).

- [ ] **8.1** Crear servicio `src/modules/recordatorios/services/recordatorios.service.ts` con:
  - `getRecordatoriosByCampana(campanaId)`
  - `getClientesPendientes(campanaId)`
  - `crearRecordatorio(campanaId)`
  - `marcarRecordatorioEnviado(campanaId, numeroRecordatorio)`
  - `puedeCrearRecordatorio(campanaId)` — verifica máximo 3 y que el anterior esté enviado
- [ ] **8.2** Crear Server Action `crearRecordatorioAction`:
  - Validar que no supere 3 recordatorios
  - Validar que el anterior esté en `enviado`
  - Crear registros en `envios` para todos los clientes pendientes (mismo token, nunca regenerar)
- [ ] **8.3** Agregar sección de recordatorios a `/campanas/[id]`:
  - Timeline de recordatorios con estado
  - Botón "Crear Recordatorio N" (deshabilitado si no corresponde o si ya hay 3)
  - Botón "Marcar como enviado"
- [ ] **8.4** Crear página `/campanas/[id]/recordatorio`:
  - Lista de clientes pendientes con datos y links
  - Botón de exportación (CSV)
  - Botón "Confirmar envío" → marca recordatorio como `enviado`

**Verificación:** ciclo completo hasta Recordatorio 3. Al 3er recordatorio enviado, botón de crear más queda deshabilitado.

---

### FASE 9 — Dashboard y Métricas

**Objetivo:** visualización centralizada de resultados con filtros.

- [ ] **9.1** Crear servicio `src/modules/dashboard/services/dashboard.service.ts` con:
  - `getNPSGeneral(filtros?)`
  - `getNPSPorConcesionario(filtros?)`
  - `getTasaRespuesta(campanaId?)`
  - `getRespuestasRecientes(filtros?)`
  - `getClientesPendientes(filtros?)`
- [ ] **9.2** Crear utilidad `src/lib/utils/nps.ts`:
  ```typescript
  // NPS = % promotores (9-10) - % detractores (0-6)
  function calcularNPS(scores: number[]): number
  function clasificar(score: number): 'promotor' | 'neutro' | 'detractor'
  ```
- [ ] **9.3** Crear componentes del dashboard:
  - `NPSCard.tsx` — score NPS con color (verde/amarillo/rojo)
  - `TasaRespuesta.tsx` — porcentaje + barra de progreso
  - `NPSPorConcesionario.tsx` — tabla NPS por concesionario
  - `RespuestasTable.tsx` — tabla de respuestas completa
- [ ] **9.4** Crear página `/` con:
  - Cards NPS (producto, empresa, concesionario)
  - Tasa de respuesta global
  - NPS por concesionario
  - Últimas respuestas
- [ ] **9.5** Agregar filtros: por campaña, concesionario, estado, rango de fechas

**Verificación:** NPS calculados coinciden con cálculo manual. Filtros funcionan correctamente.

---

### FASE 10 — Notificaciones por Email (Cron)

**Objetivo:** emails automáticos de revisión de campaña y fin de recordatorio.

- [ ] **10.1** Crear templates de email:
  - `notificacion-revision.tsx` — "Revisá la campaña X, ya pasaron N días"
  - `notificacion-recordatorio.tsx` — "Período de recordatorio N terminado"
- [ ] **10.2** Crear Edge Function `supabase/functions/check-notifications/index.ts`:
  - Lee `system_config` (días de configuración)
  - Busca envíos donde `fecha_envio + dias_config <= now()` y `notificacion_enviada = false`
  - Envía email via Resend a todos los destinatarios
  - Marca `notificacion_enviada = true`
- [ ] **10.3** Configurar pg_cron para ejecutar diariamente a las 08:00 UTC (ver `docs/03-base-de-datos.md` sección 7)
- [ ] **10.4** Deploy: `npx supabase functions deploy check-notifications`

**Verificación:** ejecutar Edge Function manualmente con campaña que pasó el plazo → email recibido. Segunda ejecución → no reenvía.

---

### FASE 11 — Configuración del Sistema

**Objetivo:** panel para gestionar los parámetros globales.

- [ ] **11.1** Crear servicio `src/modules/configuracion/services/configuracion.service.ts`:
  - `getConfig()`
  - `updateConfig(data)`
- [ ] **11.2** Crear Server Action `updateConfigAction` con validación Zod
- [ ] **11.3** Crear página `/configuracion` con formulario para:
  - Días para notificación de envío inicial (número entero > 0)
  - Días para notificación de recordatorios (número entero > 0)
  - Lista de emails destinatarios (agregar / eliminar)
- [ ] **11.4** Validar que siempre haya al menos un email antes de guardar

**Verificación:** cambiar días, guardar, verificar en DB que `system_config` se actualizó.

---

### FASE 12 — QA, Seguridad y Deploy

**Objetivo:** verificar el sistema completo, pasar el checklist de seguridad y deployar.

- [ ] **12.1** Ejecutar checklist completo de seguridad (ver `docs/04-seguridad.md` sección 11)
- [ ] **12.2** Verificar que RLS está activo en todas las tablas
- [ ] **12.3** Probar token inválido → 404
- [ ] **12.4** Probar doble respuesta → bloqueada
- [ ] **12.5** Probar dashboard sin login → redirige a `/login`
- [ ] **12.6** Verificar que `SUPABASE_SERVICE_ROLE_KEY` no aparece en ningún bundle del cliente
- [ ] **12.7** Configurar headers de seguridad en `next.config.ts`
- [ ] **12.8** Configurar variables de entorno en producción (Vercel u otro)
- [ ] **12.9** Deploy a producción
- [ ] **12.10** Smoke test en producción: crear campaña → responder encuesta → verificar alerta → verificar dashboard

---

## ⚠️ Reglas Críticas de Negocio

### 1. Un token por cliente por campaña — NUNCA se regenera

```typescript
// Siempre verificar antes de crear
const { data: existente } = await supabase
  .from('encuestas')
  .select('token')
  .eq('cliente_id', clienteId)
  .eq('campana_id', campanaId)
  .single()

if (existente) return existente.token // Reutilizar, nunca regenerar
```

### 2. Máximo 3 recordatorios por campaña

```typescript
const { count } = await supabase
  .from('envios')
  .select('*', { count: 'exact' })
  .eq('campana_id', campanaId)
  .gt('numero_recordatorio', 0)

if (count >= 3) throw new Error('Máximo de recordatorios alcanzado')
```

### 3. Una sola respuesta por token — doble validación

```typescript
// Verificar ANTES de insertar (además del UNIQUE constraint en DB)
const { data: respuestaExistente } = await supabase
  .from('respuestas')
  .select('id')
  .eq('encuesta_id', encuestaId)
  .single()

if (respuestaExistente) return { error: 'Ya completaste esta encuesta' }
```

### 4. Alerta si CUALQUIER NPS < 6

```typescript
const esNPSCritico = nps_producto < 6 || nps_empresa < 6 || nps_concesionario < 6
if (esNPSCritico) await dispararAlertaNPS({ ... })
```

### 5. service_role NUNCA al cliente

```typescript
export function createSupabaseAdmin() {
  if (typeof window !== 'undefined') throw new Error('Solo servidor')
  return createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}
```

---

## 🗄️ Tablas de la Base de Datos

| Tabla | Descripción clave |
|-------|------------------|
| `clientes` | nombre, telefono, concesionario |
| `campanas` | nombre, fecha, estado (activa/completada/archivada) |
| `encuestas` | cliente_id + campana_id + token UUID único + estado (pendiente/respondida) |
| `respuestas` | encuesta_id (UNIQUE), nps_producto, nps_empresa, nps_concesionario |
| `envios` | cliente_id + campana_id + numero_recordatorio (0-3) + fecha_envio + notificacion_enviada |
| `system_config` | dias_notificacion_inicial, dias_notificacion_recordatorio, emails_notificacion[] |

**Trigger activo:** al insertar en `respuestas` → `encuestas.estado` se actualiza a `'respondida'` automáticamente. No actualizarlo manualmente.

---

## 🔌 Convenciones de Módulos

Estructura de cada módulo en `src/modules/[nombre]/`:

```
[modulo]/
├── components/    # Componentes React del módulo
├── hooks/         # React hooks
├── services/      # Lógica de negocio + queries a Supabase
└── types/         # Tipos TypeScript
```

**Regla:** un módulo NO importa de otro módulo. Si algo se necesita en dos módulos → mover a `src/components/` o `src/lib/`.

---

## ⚙️ Variables de Entorno

```env
NEXT_PUBLIC_SUPABASE_URL=          # URL del proyecto Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # Anon key (pública, RLS activo)
SUPABASE_SERVICE_ROLE_KEY=         # Service role (SOLO servidor)
RESEND_API_KEY=                    # API key de Resend
NEXT_PUBLIC_APP_URL=               # URL de producción
```

---

## 🚀 Comandos Útiles

```bash
npm run dev
npx supabase start
npx supabase db reset
npx supabase gen types typescript --local > src/types/database.types.ts
npx supabase functions deploy check-notifications
npx supabase functions deploy send-alert-email
npx supabase functions logs check-notifications
```

---

## ❌ Antipatrones — Nunca Hacer

- Regenerar token para cliente que ya tiene uno en esa campaña
- Usar `service_role` en componentes de cliente
- Desactivar RLS aunque sea temporalmente
- Crear más de 3 recordatorios por campaña
- Insertar respuestas sin validar token en el servidor
- Hardcodear emails de notificación (siempre de `system_config`)
- Importar componentes de un módulo desde otro módulo
- Avanzar a la siguiente fase sin verificar la actual
