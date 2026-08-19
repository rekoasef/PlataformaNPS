import type { UserRole } from './index'

/**
 * Reglas de acceso por rol.
 *
 * Antes vivían en el middleware, que podía leer el rol del JWT de Supabase. Con
 * Better Auth el rol está en la base y el middleware corre en el edge runtime,
 * sin acceso a Postgres — así que la decisión se toma en el layout del
 * dashboard, que es un Server Component y sí puede consultarlo.
 *
 * Es un solo lugar a propósito: cada action sensible revalida por su cuenta con
 * `requireRol()`, pero esto es lo que evita que una página se renderice siquiera.
 */

/** Rutas permitidas por rol. `admin` no figura: tiene acceso a todo. */
const RUTAS_POR_ROL: Record<Exclude<UserRole, 'admin'>, string[]> = {
  rambla: ['/rambla'],
  fabrica: ['/', '/nps', '/respuestas'],
}

function coincide(pathname: string, permitida: string): boolean {
  // '/' tiene que ser exacta: si no, habilitaría el sitio entero.
  return permitida === '/' ? pathname === '/' : pathname.startsWith(permitida)
}

export function puedeAcceder(role: UserRole, pathname: string): boolean {
  if (role === 'admin') return true
  const permitidas = RUTAS_POR_ROL[role]
  if (!permitidas) return false // rol desconocido: se niega, no se asume acceso
  return permitidas.some((r) => coincide(pathname, r))
}

/** A dónde mandar a quien pidió una ruta que no le corresponde. */
export function rutaInicial(role: UserRole): string {
  return role === 'rambla' ? '/rambla' : '/'
}
