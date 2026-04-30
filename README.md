# Plataforma NPS

Aplicación interna para gestionar campañas de encuestas NPS, reemplazando el flujo manual basado en Google Forms y Google Sheets por una plataforma centralizada con trazabilidad de campañas, clientes, encuestas y respuestas.

## Stack

- Next.js 15 App Router
- React 19
- TypeScript estricto
- Tailwind CSS v4
- Supabase
- Zod
- Nodemailer con SMTP

## Estado actual

La implementación actual cubre estas piezas:

- Login con Supabase Auth y protección de rutas por middleware
- Dashboard base con layout interno
- Gestión de clientes con alta manual, búsqueda, paginación e importación CSV
- Creación de campañas desde CSV
- Generación de encuestas y envíos iniciales
- Exportación de clientes pendientes con link único por token
- Formulario público de encuesta con validación de token y bloqueo de doble respuesta
- Configuración global del sistema desde panel admin
- Alertas NPS críticas por email vía SMTP

Pendiente en roadmap:

- Ciclo completo de recordatorios
- Dashboard analítico con métricas NPS
- Notificaciones programadas

## Documentación

La referencia principal del proyecto está en:

- [CLAUDE.md](./CLAUDE.md)
- [docs/01-documentacion-proyecto.md](./docs/01-documentacion-proyecto.md)
- [docs/02-arquitectura.md](./docs/02-arquitectura.md)
- [docs/03-base-de-datos.md](./docs/03-base-de-datos.md)
- [docs/04-seguridad.md](./docs/04-seguridad.md)

## Requisitos

- Node.js 20+
- npm
- Proyecto Supabase configurado
- Variables de entorno cargadas en `.env.local`

## Variables de entorno

Variables esperadas por la aplicación:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=capacitaciones.crucianelli@gmail.com
SMTP_PASS=
EMAIL_FROM="Plataforma NPS <capacitaciones.crucianelli@gmail.com>"
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Instalación

```bash
npm install
```

## Desarrollo local

```bash
npm run dev
```

La aplicación queda disponible en `http://localhost:3000`.

## Base de datos

Las migraciones viven en `supabase/migrations/` y el seed inicial en `supabase/seed.sql`.

Estructura principal:

- `clientes`
- `campanas`
- `encuestas`
- `respuestas`
- `envios`
- `system_config`

También existen las vistas:

- `v_encuestas_completas`
- `v_nps_por_campana`

## Flujo operativo actual

1. Un administrador inicia sesión.
2. Crea una campaña cargando un CSV de clientes.
3. El sistema crea clientes, encuestas y envíos iniciales.
4. Se exportan los pendientes con su link único.
5. El cliente responde desde `/encuesta?token=...`.
6. La respuesta se guarda y la encuesta queda marcada como `respondida`.

## CSV esperado

La importación de clientes acepta columnas en cualquier orden, con nombres equivalentes a:

- `CONCESIONARIO`
- `CLIENTE (según factura)`
- `ORDEN DE FABRICACION MÁQUINA (grabado en chasis)`
- `Teléfono del Cliente`
- `Teléfono del Cliente 2` opcional
- `Teléfono del Cliente 3` opcional

También soporta encabezados normalizados como:

- `concesionario`
- `nombre`
- `orden_fabricacion`
- `telefono`
- `telefono_2`
- `telefono_3`

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```
# PlataformaNPS
