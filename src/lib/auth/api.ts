import { NextResponse } from 'next/server'
import { getUsuarioActual } from './session'
import { puedeAcceder } from './rutas'

/**
 * Autorización por rol para los route handlers de `src/app/api/*`.
 *
 * Estos handlers **no** pasan por el layout del dashboard: en el árbol de rutas
 * `app/api` es hermano de `app/(dashboard)`, no hijo, así que `puedeAcceder()`
 * nunca corre para ellos. Sin esto un endpoint solo sabe que hay sesión, no de
 * quién es — y un rol restringido llega a datos que su rol no puede ver.
 *
 * Se le pasa la ruta de la **página** que el endpoint sirve (no la del endpoint)
 * para que la regla de rol siga viviendo en un solo lugar, `./rutas.ts`: si
 * mañana `fabrica` gana acceso a `/campanas`, el endpoint de exportar lo hereda
 * solo, sin que haya que acordarse de tocarlo acá.
 *
 * Devuelve la respuesta de rechazo, o `null` si el request puede seguir.
 */
export async function rechazarSiNoAutorizado(
  rutaEquivalente: string,
): Promise<NextResponse | null> {
  const usuario = await getUsuarioActual()

  // El middleware solo mira que la cookie exista, no que sea válida (corre en
  // edge runtime, sin acceso a Postgres). La sesión se valida acá.
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  if (!puedeAcceder(usuario.role, rutaEquivalente)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  return null
}
