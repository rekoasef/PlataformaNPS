import { createSupabaseServer } from '@/lib/supabase/server'
import type { RegaloStats, RespuestaRambla, RamblaFiltros, RamblaPage } from '../types/rambla.types'

export const RAMBLA_PAGE_SIZE = 25

const SELECT_COLS =
  'id, fecha_respuesta, nombre_apellido, calle_numero, piso_departamento, localidad, codigo_postal, provincia, email, telefono, maquina_modelo, regalo_estado, numero_seguimiento, fecha_seguimiento, fecha_envio'

export async function getRespuestasRambla(
  filtros?: RamblaFiltros,
  page = 1
): Promise<RamblaPage> {
  const supabase = await createSupabaseServer()
  const from = (page - 1) * RAMBLA_PAGE_SIZE
  const to = from + RAMBLA_PAGE_SIZE - 1
  const columnaFecha = filtros?.tipo === 'envio' ? 'fecha_envio' : 'fecha_respuesta'

  let query = supabase
    .from('v_respuestas_rambla')
    .select(SELECT_COLS, { count: 'exact' })
    .order('fecha_respuesta', { ascending: false })
    .range(from, to)

  if (filtros?.desde) query = query.gte(columnaFecha, filtros.desde + 'T00:00:00-03:00')
  if (filtros?.hasta) query = query.lte(columnaFecha, filtros.hasta + 'T23:59:59-03:00')

  const { data, error, count } = await query
  if (error) throw error

  return {
    data: (data ?? []) as RespuestaRambla[],
    total: count ?? 0,
    page,
    pageSize: RAMBLA_PAGE_SIZE,
  }
}

export async function getRegaloStats(filtros?: RamblaFiltros): Promise<RegaloStats> {
  const supabase = await createSupabaseServer()
  const columnaFecha = filtros?.tipo === 'envio' ? 'fecha_envio' : 'fecha_respuesta'

  if (filtros?.tipo === 'envio') {
    // En modo envío solo hay registros con estado=enviado (fecha_envio solo existe para esos)
    let q = supabase
      .from('v_respuestas_rambla')
      .select('*', { count: 'exact', head: true })
      .eq('regalo_estado', 'enviado')

    if (filtros.desde) q = q.gte('fecha_envio', filtros.desde + 'T00:00:00-03:00')
    if (filtros.hasta) q = q.lte('fecha_envio', filtros.hasta + 'T23:59:59-03:00')

    const { count, error } = await q
    if (error) throw error
    const e = count ?? 0
    return { pendientes: 0, enviados: e, total: e }
  }

  // Modo respuesta (default): filtrar por fecha_respuesta
  let qPendientes = supabase
    .from('v_respuestas_rambla')
    .select('*', { count: 'exact', head: true })
    .eq('regalo_estado', 'pendiente_envio')

  let qEnviados = supabase
    .from('v_respuestas_rambla')
    .select('*', { count: 'exact', head: true })
    .eq('regalo_estado', 'enviado')

  if (filtros?.desde) {
    qPendientes = qPendientes.gte(columnaFecha, filtros.desde + 'T00:00:00-03:00')
    qEnviados = qEnviados.gte(columnaFecha, filtros.desde + 'T00:00:00-03:00')
  }
  if (filtros?.hasta) {
    qPendientes = qPendientes.lte(columnaFecha, filtros.hasta + 'T23:59:59-03:00')
    qEnviados = qEnviados.lte(columnaFecha, filtros.hasta + 'T23:59:59-03:00')
  }

  const [{ count: pendientes, error: e1 }, { count: enviados, error: e2 }] = await Promise.all([
    qPendientes,
    qEnviados,
  ])

  if (e1) throw e1
  if (e2) throw e2

  const p = pendientes ?? 0
  const e = enviados ?? 0
  return { pendientes: p, enviados: e, total: p + e }
}

export async function exportarRespuestasRambla(filtros?: RamblaFiltros): Promise<RespuestaRambla[]> {
  const supabase = await createSupabaseServer()
  const columnaFecha = filtros?.tipo === 'envio' ? 'fecha_envio' : 'fecha_respuesta'

  let query = supabase
    .from('v_respuestas_rambla')
    .select(SELECT_COLS)
    .order('fecha_respuesta', { ascending: false })

  if (filtros?.desde) query = query.gte(columnaFecha, filtros.desde + 'T00:00:00-03:00')
  if (filtros?.hasta) query = query.lte(columnaFecha, filtros.hasta + 'T23:59:59-03:00')

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as RespuestaRambla[]
}
