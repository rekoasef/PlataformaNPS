'use server'

import { revalidatePath } from 'next/cache'
import { marcarTodasLeidas } from '@/modules/notificaciones/services/notificaciones.service'
import { getUsuarioActual } from '@/lib/auth/session'

/**
 * El rol sale de la sesión, no de un parámetro: antes lo mandaba el cliente y
 * cualquiera con sesión podía pasar 'admin' y marcar leídas las que no eran suyas.
 */
export async function marcarTodasLeidasAction(): Promise<void> {
  const usuario = await getUsuarioActual()
  if (!usuario) return
  if (usuario.role !== 'admin' && usuario.role !== 'rambla') return

  await marcarTodasLeidas(usuario.role)

  revalidatePath('/', 'layout')
}
