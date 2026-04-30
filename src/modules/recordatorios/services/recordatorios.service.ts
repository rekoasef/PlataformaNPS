import { createSupabaseServer } from '@/lib/supabase/server'
import type {
  ClientePendienteRecordatorio,
  EncuestaNecesidadLlamado,
  EncuestaSinRespuesta,
  PuedeCrearRecordatorioResult,
  RecordatorioResumen,
} from '../types/recordatorio.types'
import { syncWorkflowEstados } from './workflow.service'

export async function getRecordatoriosByCampana(campanaId: string): Promise<RecordatorioResumen[]> {
  await syncWorkflowEstados()
  const supabase = await createSupabaseServer()
  const { data, error } = await supabase
    .from('envios')
    .select('numero_recordatorio, estado_envio, fecha_envio')
    .eq('campana_id', campanaId)
    .order('numero_recordatorio', { ascending: true })

  if (error) throw error

  const resumenMap = new Map<number, RecordatorioResumen>()

  for (const envio of data ?? []) {
    const actual = resumenMap.get(envio.numero_recordatorio)

    if (!actual) {
      resumenMap.set(envio.numero_recordatorio, {
        numero_recordatorio: envio.numero_recordatorio,
        estado_envio: envio.estado_envio,
        fecha_envio: envio.fecha_envio,
        total_clientes: 1,
      })
      continue
    }

    actual.total_clientes += 1

    if (envio.estado_envio === 'pendiente_envio') {
      actual.estado_envio = 'pendiente_envio'
      actual.fecha_envio = null
    } else if (!actual.fecha_envio && envio.fecha_envio) {
      actual.fecha_envio = envio.fecha_envio
    }
  }

  return Array.from(resumenMap.values()).sort(
    (a, b) => a.numero_recordatorio - b.numero_recordatorio
  )
}

export async function getClientesPendientes(
  campanaId: string
): Promise<ClientePendienteRecordatorio[]> {
  await syncWorkflowEstados()
  const supabase = await createSupabaseServer()
  const { data, error } = await supabase
    .from('encuestas')
    .select(`
      id,
      token,
      estado,
      clientes(id, nombre, telefono, telefono_2, telefono_3, concesionario, orden_fabricacion)
    `)
    .eq('campana_id', campanaId)
    .eq('estado', 'pendiente')
    .order('created_at')

  if (error) throw error
  return data
}

export async function getRecordatorioActivo(campanaId: string) {
  const recordatorios = await getRecordatoriosByCampana(campanaId)
  return [...recordatorios].reverse().find(
    (item) => item.numero_recordatorio > 0 && item.estado_envio === 'pendiente_envio'
  )
}

export async function puedeCrearRecordatorio(
  campanaId: string
): Promise<PuedeCrearRecordatorioResult> {
  const recordatorios = await getRecordatoriosByCampana(campanaId)
  const recordatoriosReales = recordatorios.filter((item) => item.numero_recordatorio > 0)
  const ultimoRecordatorioReal = recordatoriosReales.at(-1)

  if (recordatoriosReales.length >= 3) {
    return { allowed: false, nextNumero: null, reason: 'Máximo de 3 recordatorios alcanzado.' }
  }

  if (recordatorios.length === 0) {
    return { allowed: false, nextNumero: null, reason: 'La campaña no tiene envío inicial.' }
  }

  if (ultimoRecordatorioReal && ultimoRecordatorioReal.estado_envio !== 'enviado') {
    return {
      allowed: false,
      nextNumero: null,
      reason: `El ${getNombreRecordatorio(ultimoRecordatorioReal.numero_recordatorio)} anterior todavía no fue marcado como enviado.`,
    }
  }

  const pendientes = await getClientesPendientes(campanaId)
  if (pendientes.length === 0) {
    return { allowed: false, nextNumero: null, reason: 'No hay clientes pendientes para recordar.' }
  }

  return {
    allowed: true,
    nextNumero: recordatoriosReales.length + 1,
  }
}

export async function crearRecordatorio(campanaId: string, numeroRecordatorio: number) {
  const supabase = await createSupabaseServer()
  const pendientes = await getClientesPendientes(campanaId)

  if (pendientes.length === 0) {
    throw new Error('No hay clientes pendientes para crear un recordatorio.')
  }

  const payload = pendientes
    .filter((encuesta) => encuesta.clientes?.id)
    .map((encuesta) => ({
      campana_id: campanaId,
      cliente_id: encuesta.clientes!.id,
      numero_recordatorio: numeroRecordatorio,
    }))

  const { error } = await supabase.from('envios').insert(payload)
  if (error) throw error

  return { total: payload.length }
}

export async function marcarRecordatorioEnviado(
  campanaId: string,
  numeroRecordatorio: number
) {
  const supabase = await createSupabaseServer()
  const timestamp = new Date().toISOString()
  const { data: envios, error: enviosSelectError } = await supabase
    .from('envios')
    .select('cliente_id')
    .eq('campana_id', campanaId)
    .eq('numero_recordatorio', numeroRecordatorio)

  if (enviosSelectError) throw enviosSelectError

  const { error } = await supabase
    .from('envios')
    .update({
      estado_envio: 'enviado',
      fecha_envio: timestamp,
    })
    .eq('campana_id', campanaId)
    .eq('numero_recordatorio', numeroRecordatorio)

  if (error) throw error

  const clienteIds = Array.from(new Set((envios ?? []).map((item) => item.cliente_id)))
  if (clienteIds.length === 0) return

  const { error: encuestasError } = await supabase
    .from('encuestas')
    .update({ estado: 'recordatorio_enviado' })
    .eq('campana_id', campanaId)
    .in('cliente_id', clienteIds)
    .eq('estado', 'pendiente')

  if (encuestasError) throw encuestasError
}

export async function getEncuestasNecesidadLlamado(): Promise<EncuestaNecesidadLlamado[]> {
  await syncWorkflowEstados()
  const supabase = await createSupabaseServer()
  const { data, error } = await supabase
    .from('encuestas')
    .select(`
      id,
      token,
      estado,
      campanas(id, nombre, fecha),
      clientes(id, nombre, telefono, telefono_2, telefono_3, concesionario, orden_fabricacion)
    `)
    .eq('estado', 'necesidad_de_llamado')
    .order('created_at', { ascending: true })

  if (error) throw error

  return (data ?? []).map((item) => ({
    id: item.id,
    token: item.token,
    estado: 'necesidad_de_llamado',
    campana: Array.isArray(item.campanas) ? item.campanas[0] ?? null : item.campanas,
    cliente: Array.isArray(item.clientes) ? item.clientes[0] ?? null : item.clientes,
  }))
}

export async function getEncuestasSinRespuesta(): Promise<EncuestaSinRespuesta[]> {
  const supabase = await createSupabaseServer()
  const { data, error } = await supabase
    .from('encuestas')
    .select(`
      id,
      token,
      estado,
      comentario_sin_respuesta,
      marcado_sin_respuesta_at,
      campanas(id, nombre, fecha),
      clientes(id, nombre, telefono, telefono_2, telefono_3, concesionario, orden_fabricacion)
    `)
    .eq('estado', 'sin_respuesta')
    .order('marcado_sin_respuesta_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map((item) => ({
    id: item.id,
    token: item.token,
    estado: 'sin_respuesta',
    comentario: item.comentario_sin_respuesta,
    marcadoAt: item.marcado_sin_respuesta_at,
    campana: Array.isArray(item.campanas) ? item.campanas[0] ?? null : item.campanas,
    cliente: Array.isArray(item.clientes) ? item.clientes[0] ?? null : item.clientes,
  }))
}

export async function marcarEncuestaSinRespuesta(
  encuestaId: string,
  comentario: string,
  marcadoPor: string | null
) {
  const supabase = await createSupabaseServer()
  const { error } = await supabase
    .from('encuestas')
    .update({
      estado: 'sin_respuesta',
      comentario_sin_respuesta: comentario,
      marcado_sin_respuesta_at: new Date().toISOString(),
      marcado_sin_respuesta_por: marcadoPor,
    })
    .eq('id', encuestaId)
    .eq('estado', 'necesidad_de_llamado')

  if (error) throw error
}

function getNombreRecordatorio(numeroRecordatorio: number) {
  return numeroRecordatorio === 0
    ? 'envío inicial'
    : `recordatorio ${numeroRecordatorio}`
}
