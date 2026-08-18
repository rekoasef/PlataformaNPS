'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServer } from '@/lib/supabase/server'
import { marcarTodasLeidas } from '@/modules/notificaciones/services/notificaciones.service'

export async function marcarTodasLeidasAction(rol: string): Promise<void> {
  if (rol !== 'admin' && rol !== 'rambla') return

  // La autenticación sigue en Supabase Auth por ahora (fase aparte de la
  // migración, todavía sin decidir/migrar) — solo la query de datos pasó a Drizzle.
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await marcarTodasLeidas(rol)

  revalidatePath('/', 'layout')
}
