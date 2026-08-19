/**
 * Migra los usuarios de Supabase Auth a las tablas de Better Auth.
 *
 * Lee `auth.users` de Supabase y escribe `auth_user` + `auth_account` en el
 * Postgres self-hosted, **en la misma corrida**: los hashes de contraseña nunca
 * tocan el disco ni la pantalla. Cada persona conserva su contraseña, su id y
 * su rol.
 *
 * Es idempotente: si un usuario ya existe en destino, lo saltea. Se puede
 * correr varias veces (útil en el cutover, para arrastrar altas de último
 * momento sin duplicar nada).
 *
 * Uso:
 *   npx tsx scripts/migrar-usuarios-auth.ts           # simulacro, no escribe
 *   npx tsx scripts/migrar-usuarios-auth.ts --aplicar # escribe de verdad
 *
 * Variables necesarias (de .env.local):
 *   SUPABASE_DB_POOLER_URL  origen (usar el Session Pooler, no el de transacción)
 *   DATABASE_URL            destino
 */
import { randomUUID } from 'node:crypto'
import postgres from 'postgres'

const APLICAR = process.argv.includes('--aplicar')

const ORIGEN = process.env.SUPABASE_DB_POOLER_URL
const DESTINO = process.env.DATABASE_URL

const ROLES_VALIDOS = new Set(['admin', 'rambla', 'fabrica'])

/** Better Auth 1.7 busca la cuenta por este valor exacto; con 'credential' a secas el login falla. */
const ISSUER = 'local:credential'

type UsuarioOrigen = {
  id: string
  email: string
  encrypted_password: string | null
  role: string | null
  email_confirmed_at: Date | null
  created_at: Date
}

async function main() {
  if (!ORIGEN) throw new Error('Falta SUPABASE_DB_POOLER_URL')
  if (!DESTINO) throw new Error('Falta DATABASE_URL')

  console.log(APLICAR ? '⚠️  MODO APLICAR: se va a escribir en destino\n' : '🔍 SIMULACRO (agregá --aplicar para escribir)\n')

  const origen = postgres(ORIGEN, { max: 1 })
  const destino = postgres(DESTINO, { max: 1 })

  try {
    const usuarios = await origen<UsuarioOrigen[]>`
      SELECT id::text,
             email,
             encrypted_password,
             raw_app_meta_data->>'role' AS role,
             email_confirmed_at,
             created_at
      FROM auth.users
      WHERE deleted_at IS NULL
      ORDER BY created_at
    `
    console.log(`Usuarios en Supabase: ${usuarios.length}`)

    let creados = 0, saltados = 0, sinPassword = 0
    const rolesRaros: string[] = []

    for (const u of usuarios) {
      const [existe] = await destino`SELECT 1 FROM auth_user WHERE id = ${u.id} OR email = ${u.email} LIMIT 1`
      if (existe) { saltados++; continue }

      // Sin hash no hay forma de conservar la contraseña: esa persona va a tener
      // que usar "olvidé mi contraseña". Se migra igual para no perder el usuario.
      if (!u.encrypted_password) sinPassword++

      const rol = u.role && ROLES_VALIDOS.has(u.role) ? u.role : 'admin'
      if (u.role && !ROLES_VALIDOS.has(u.role)) rolesRaros.push(u.role)

      if (APLICAR) {
        await destino.begin(async (tx) => {
          await tx`
            INSERT INTO auth_user (id, name, email, email_verified, role, created_at, updated_at)
            VALUES (${u.id}, ${u.email}, ${u.email}, ${u.email_confirmed_at !== null}, ${rol}, ${u.created_at}, NOW())
          `
          if (u.encrypted_password) {
            await tx`
              INSERT INTO auth_account (id, issuer, account_id, provider_id, user_id, password, created_at, updated_at)
              VALUES (${randomUUID()}, ${ISSUER}, ${u.id}, 'credential', ${u.id}, ${u.encrypted_password}, ${u.created_at}, NOW())
            `
          }
        })
      }
      creados++
    }

    console.log(`\n  a crear/creados : ${creados}`)
    console.log(`  ya existían     : ${saltados}`)
    console.log(`  sin contraseña  : ${sinPassword}  (van a necesitar "olvidé mi contraseña")`)
    if (rolesRaros.length) {
      console.log(`  ⚠️  roles desconocidos, se les puso 'admin': ${[...new Set(rolesRaros)].join(', ')}`)
    }

    if (APLICAR) {
      const [t] = await destino`SELECT count(*)::int AS n FROM auth_user`
      const [c] = await destino`SELECT count(*)::int AS n FROM auth_account WHERE password IS NOT NULL`
      console.log(`\n  ✅ en destino: ${t.n} usuarios, ${c.n} con contraseña`)
    }
  } finally {
    await origen.end()
    await destino.end()
  }
}

main().catch((e) => { console.error('💥', e.message); process.exit(1) })
