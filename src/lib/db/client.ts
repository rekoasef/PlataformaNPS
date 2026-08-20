import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'
import * as authSchema from './auth-schema'
import * as relations from './relations'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('Falta la variable de entorno DATABASE_URL')
}

const client = postgres(connectionString)

// `authSchema` va acá además de en el adapter de Better Auth: sin registrarlo,
// las relaciones hacia `authUser` de `relations.ts` no resuelven y cualquier
// `db.query.*` que las use revienta en runtime.
export const db = drizzle(client, { schema: { ...schema, ...authSchema, ...relations } })
