import { headers } from 'next/headers'
import { auth, type UserRole } from './index'

/**
 * Lectura de sesión del lado del servidor.
 *
 * Reemplaza el `supabase.auth.getUser()` + `user.app_metadata.role` que estaba
 * repetido en cada página y action. El rol ahora sale de la tabla de usuarios,
 * no de un token: cambiarlo tiene efecto en el siguiente request, sin esperar a
 * que expire nada.
 */

export type UsuarioSesion = {
  id: string
  email: string
  name: string
  role: UserRole
}

/** Devuelve el usuario de la sesión, o `null` si no hay sesión válida. */
export async function getUsuarioActual(): Promise<UsuarioSesion | null> {
  const sesion = await auth.api.getSession({ headers: await headers() })
  if (!sesion?.user) return null

  const u = sesion.user as typeof sesion.user & { role?: string | null }
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    // Un usuario sin rol explícito es admin, igual que en el esquema anterior.
    role: (u.role ?? 'admin') as UserRole,
  }
}

/** Igual que `getUsuarioActual` pero falla si no hay sesión. Para actions que ya asumen login. */
export async function requireUsuario(): Promise<UsuarioSesion> {
  const usuario = await getUsuarioActual()
  if (!usuario) throw new Error('No autorizado')
  return usuario
}

/**
 * Exige que el usuario tenga uno de los roles indicados.
 * `admin` pasa siempre: es el rol con acceso total.
 */
export async function requireRol(...roles: UserRole[]): Promise<UsuarioSesion> {
  const usuario = await requireUsuario()
  if (usuario.role !== 'admin' && !roles.includes(usuario.role)) {
    throw new Error('No autorizado')
  }
  return usuario
}

/**
 * Igual que `requireRol` pero devuelve el error como valor en vez de tirarlo,
 * para los server actions que responden `{ error }` y lo muestran en el form.
 *
 * Va como primera línea del action, **antes** de cualquier `try`: adentro de un
 * `try` el `catch` se la come y el action sigue como si tuviera permiso.
 *
 *     const permiso = await chequearRol('admin')
 *     if (!permiso.ok) return { error: permiso.error }
 *
 * En el caso `ok` viene además el usuario, para los actions que necesitan
 * guardar quién hizo la operación sin volver a consultar la sesión.
 */
export async function chequearRol(
  ...roles: UserRole[]
): Promise<{ ok: false; error: string } | { ok: true; usuario: UsuarioSesion }> {
  const usuario = await getUsuarioActual()
  if (!usuario) return { ok: false, error: 'Tenés que iniciar sesión.' }
  if (usuario.role !== 'admin' && !roles.includes(usuario.role)) {
    return { ok: false, error: 'No tenés permisos para esta acción.' }
  }
  return { ok: true, usuario }
}
