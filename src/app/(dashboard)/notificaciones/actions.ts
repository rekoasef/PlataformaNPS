'use server'

import { revalidatePath } from 'next/cache'
import { marcarTodasLeidas } from '@/modules/notificaciones/services/notificaciones.service'
import { getUsuarioActual } from '@/lib/auth/session'

export async function marcarTodasLeidasAction(rol: string): Promise<void> {
  if (rol !== 'admin' && rol !== 'rambla') return

  const usuario = await getUsuarioActual()
  if (!usuario) return

  await marcarTodasLeidas(rol)

  revalidatePath('/', 'layout')
}
