import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'
import * as authSchema from './auth-schema'
import * as relations from './relations'

/**
 * Cliente de Drizzle, construido **la primera vez que se usa** y no al importar
 * el módulo.
 *
 * Antes se armaba al importarlo y tiraba si faltaba `DATABASE_URL`. Eso rompe
 * el build de Docker: `.env*` está en `.dockerignore` —a propósito, para no
 * hornear secretos en la imagen— así que durante `npm run build` la variable no
 * existe, y Next importa todos los módulos de rutas para recolectar datos de
 * página. El build moría con "Failed to collect page data" en la primera ruta
 * que llegara hasta acá.
 *
 * `DATABASE_URL` es configuración de runtime: se inyecta al correr el
 * contenedor, no al construirlo. Pasarla como build arg hornearía la password
 * en el historial de capas de la imagen.
 *
 * El chequeo no se perdió, se movió: sigue tirando el mismo error, pero en la
 * primera consulta en vez de en el import.
 */

type DB = ReturnType<typeof crearDb>

function crearDb() {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error('Falta la variable de entorno DATABASE_URL')
  }

  const client = postgres(connectionString)

  // `authSchema` va acá además de en el adapter de Better Auth: sin registrarlo,
  // las relaciones hacia `authUser` de `relations.ts` no resuelven y cualquier
  // `db.query.*` que las use revienta en runtime.
  return drizzle(client, { schema: { ...schema, ...authSchema, ...relations } })
}

let instancia: DB | null = null

function obtener(): DB {
  if (!instancia) instancia = crearDb()
  return instancia
}

export const db = new Proxy({} as DB, {
  get(_target, prop) {
    const real = obtener()
    const valor = Reflect.get(real, prop)
    // Los métodos se atan a la instancia real: si se devolvieran sueltos,
    // `this` adentro apuntaría al Proxy y no al cliente de Drizzle.
    return typeof valor === 'function' ? valor.bind(real) : valor
  },
})
