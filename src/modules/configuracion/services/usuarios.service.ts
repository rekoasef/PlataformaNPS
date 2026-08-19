import { desc, eq, max } from 'drizzle-orm'

import { db } from '@/lib/db/client'
import { authSession, authUser } from '@/lib/db/auth-schema'
import { auth, type UserRole } from '@/lib/auth'

export type { UserRole }

export interface AppUser {
  id: string
  email: string
  role: UserRole
  created_at: string
  last_sign_in_at: string | null
}

/**
 * ABM de usuarios sobre las tablas de Better Auth.
 *
 * Antes esto era la admin API de Supabase Auth y fue el último módulo que quedó
 * sin migrar. Se mantiene el mismo contrato hacia afuera (mismos nombres de
 * campo, mismas firmas) para no tocar los componentes de configuración.
 */

export async function listUsers(): Promise<AppUser[]> {
  // Supabase traía `last_sign_in_at` como campo del usuario. Acá no existe: se
  // deriva de la sesión más reciente, que es de donde salía ese dato igual.
  const ultimaSesion = db
    .select({
      userId: authSession.userId,
      ultima: max(authSession.createdAt).as('ultima'),
    })
    .from(authSession)
    .groupBy(authSession.userId)
    .as('ultima_sesion')

  const filas = await db
    .select({
      id: authUser.id,
      email: authUser.email,
      role: authUser.role,
      createdAt: authUser.createdAt,
      lastSignInAt: ultimaSesion.ultima,
    })
    .from(authUser)
    .leftJoin(ultimaSesion, eq(ultimaSesion.userId, authUser.id))
    .orderBy(desc(authUser.createdAt))

  return filas.map((u) => ({
    id: u.id,
    email: u.email,
    role: (u.role ?? 'admin') as UserRole,
    created_at: u.createdAt.toISOString(),
    last_sign_in_at: u.lastSignInAt ? new Date(u.lastSignInAt).toISOString() : null,
  }))
}

export async function createUser(email: string, password: string, role: UserRole) {
  // Se crea vía la API de Better Auth y no con un INSERT directo: así la
  // contraseña se hashea con el mismo algoritmo y formato que usa el login.
  const { user } = await auth.api.signUpEmail({
    body: { email, password, name: email },
  })

  // El rol no se puede mandar en el alta (`input: false` en la config, para que
  // nadie se auto-asigne uno); se setea acá, ya del lado del servidor.
  await db
    .update(authUser)
    .set({ role, emailVerified: true, updatedAt: new Date() })
    .where(eq(authUser.id, user.id))

  return { ...user, role }
}

export async function updateUserRole(userId: string, role: UserRole) {
  const [actualizado] = await db
    .update(authUser)
    .set({ role, updatedAt: new Date() })
    .where(eq(authUser.id, userId))
    .returning()

  if (!actualizado) throw new Error('Usuario no encontrado')
  return actualizado
}

export async function deleteUser(userId: string) {
  // `auth_session` y `auth_account` tienen ON DELETE CASCADE, así que borrar el
  // usuario cierra sus sesiones abiertas de paso.
  const borrados = await db.delete(authUser).where(eq(authUser.id, userId)).returning({ id: authUser.id })
  if (borrados.length === 0) throw new Error('Usuario no encontrado')
}

