'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServer } from '@/lib/supabase/server'
import type { RegaloEstado, RamblaFiltros, RespuestaRambla } from '@/modules/rambla/types/rambla.types'
import { actualizarRegaloEstado, exportarRespuestasRambla, guardarSeguimiento } from '@/modules/rambla/services/rambla.service'

async function getRoleOrThrow() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autorizado')
  const role = user.app_metadata?.role as string | undefined
  if (role && role !== 'admin' && role !== 'rambla') throw new Error('No autorizado')
}

export async function actualizarRegaloEstadoAction(
  respuestaId: string,
  estado: RegaloEstado
): Promise<void> {
  await getRoleOrThrow()

  await actualizarRegaloEstado(respuestaId, estado)
  revalidatePath('/rambla')
}

export async function guardarSeguimientoAction(
  respuestaId: string,
  numeroSeguimiento: string
): Promise<void> {
  await getRoleOrThrow()

  const trimmed = numeroSeguimiento.trim()
  if (!trimmed) throw new Error('El número de seguimiento no puede estar vacío')

  await guardarSeguimiento(respuestaId, trimmed)
  revalidatePath('/rambla')
}

export async function exportarRamblaAction(filtros?: RamblaFiltros): Promise<RespuestaRambla[]> {
  await getRoleOrThrow()
  return exportarRespuestasRambla(filtros)
}
