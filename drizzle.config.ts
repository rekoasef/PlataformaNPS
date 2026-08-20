import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

config({ path: '.env.staging' })

const { STAGING_DB_USER, STAGING_DB_PASSWORD, STAGING_DB_NAME } = process.env

// Puerto local del túnel SSH a staging (el lado remoto siempre es 5433).
// Es 5434 por defecto porque el 5433 suele estar ocupado por otro proyecto;
// override con STAGING_TUNNEL_PORT si hiciera falta otro.
const TUNNEL_PORT = process.env.STAGING_TUNNEL_PORT ?? '5434'

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/lib/db/schema.ts',
  out: './src/lib/db/migrations',
  // `auth-schema.ts` se mantiene a mano (ver sección 13 del doc de migración).
  // Sin este filtro, un `pull` traería las tablas de Better Auth a `schema.ts`
  // y quedarían definidas dos veces.
  tablesFilter: ['!auth_*'],
  dbCredentials: {
    url: `postgresql://${STAGING_DB_USER}:${STAGING_DB_PASSWORD}@127.0.0.1:${TUNNEL_PORT}/${STAGING_DB_NAME}`,
  },
})
