'use server'

import { z } from 'zod'
import { createSupabaseAdmin, createSupabaseServer } from '@/lib/supabase/server'
import { parseClientesCSV } from '@/lib/utils/csv'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function getRoleOrThrow() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autorizado')
  const role = user.app_metadata?.role as string | undefined
  if (role && role !== 'admin') throw new Error('No autorizado')
}

const CampanaSchema = z.object({
  nombre:           z.string().min(1, 'El nombre es requerido').max(200),
  fecha:            z.string().min(1, 'La fecha es requerida'),
  tipo_encuesta_id: z.string().uuid('Tipo de encuesta inválido.'),
})

const CambiarEstadoSchema = z.object({
  id: z.string().uuid('Campaña inválida.'),
  estado: z.enum(['activa', 'completada', 'archivada']),
})

const EliminarCampanaSchema = z.object({
  id: z.string().uuid('Campaña inválida.'),
})

const EliminarEncuestaSchema = z.object({
  encuesta_id: z.string().uuid('Encuesta inválida.'),
})

type ActionState = { error?: string }

export async function crearCampanaAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const raw = {
    nombre:           formData.get('nombre') as string,
    fecha:            formData.get('fecha') as string,
    tipo_encuesta_id: formData.get('tipo_encuesta_id') as string,
  }

  const result = CampanaSchema.safeParse(raw)
  if (!result.success) return { error: result.error.issues[0].message }

  // Para fin de garantía, el CSV es opcional (puede venir del selector de OFs)
  const clienteIdsSeleccionados = formData.getAll('cliente_id') as string[]
  const file = formData.get('archivo') as File | null
  const tieneCSV = file && file.size > 0

  if (!tieneCSV && clienteIdsSeleccionados.length === 0) {
    return { error: 'Seleccioná clientes del listado de OFs o cargá un archivo CSV.' }
  }

  let rowsCSV: ReturnType<typeof parseClientesCSV> = []
  if (tieneCSV) {
    try {
      rowsCSV = parseClientesCSV(await file.text())
    } catch (e: unknown) {
      return { error: e instanceof Error ? e.message : 'Error al leer el CSV.' }
    }
    if (rowsCSV.length === 0) return { error: 'El CSV no contiene clientes válidos.' }
  }

  const supabase = createSupabaseAdmin()

  // 1. Crear campaña
  const { data: campana, error: errCampana } = await supabase
    .from('campanas')
    .insert({ nombre: result.data.nombre, fecha: result.data.fecha, tipo_encuesta_id: result.data.tipo_encuesta_id })
    .select()
    .single()
  if (errCampana) {
    console.error('Error al crear la campana', errCampana)
    return { error: 'Error al crear la campaña.' }
  }

  // 2a. Crear clientes desde CSV
  let clienteIdsParaEncuesta: string[] = [...clienteIdsSeleccionados]

  if (rowsCSV.length > 0) {
    const { data: clientesNuevos, error: errClientes } = await supabase
      .from('clientes')
      .insert(rowsCSV)
      .select('id')
    if (errClientes || !clientesNuevos) {
      console.error('Error al crear los clientes', errClientes)
      await supabase.from('campanas').delete().eq('id', campana.id)
      return { error: 'Error al crear los clientes.' }
    }
    clienteIdsParaEncuesta = [...clienteIdsParaEncuesta, ...clientesNuevos.map((c) => c.id)]
  }

  if (clienteIdsParaEncuesta.length === 0) {
    await supabase.from('campanas').delete().eq('id', campana.id)
    return { error: 'No hay clientes para agregar a la campaña.' }
  }

  // 3. Crear encuestas en batch (token lo genera la DB automáticamente)
  const encuestasInsert = clienteIdsParaEncuesta.map((id) => ({
    cliente_id: id,
    campana_id: campana.id,
  }))
  const { error: errEncuestas } = await supabase
    .from('encuestas')
    .insert(encuestasInsert)
  if (errEncuestas) {
    console.error('Error al crear las encuestas', errEncuestas)
    return { error: 'Error al crear las encuestas.' }
  }

  // 4. Crear envíos iniciales en batch (1 por cliente)
  const fechaEnvioInicial = new Date().toISOString()
  const enviosInsert = clienteIdsParaEncuesta.map((id) => ({
    cliente_id: id,
    campana_id: campana.id,
    numero_recordatorio: 0,
    estado_envio: 'enviado' as const,
    fecha_envio: fechaEnvioInicial,
  }))
  const { error: errEnvios } = await supabase.from('envios').insert(enviosInsert)
  if (errEnvios) {
    console.error('Error al crear los envios', errEnvios)
    return { error: 'Error al crear los envios.' }
  }

  revalidatePath('/campanas')
  redirect(`/campanas/${campana.id}`)
}

export async function cambiarEstadoCampanaAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = CambiarEstadoSchema.safeParse({
    id: formData.get('campana_id'),
    estado: formData.get('estado'),
  })

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos invalidos.' }

  const supabase = createSupabaseAdmin()
  const { error } = await supabase
    .from('campanas')
    .update({ estado: parsed.data.estado })
    .eq('id', parsed.data.id)
  if (error) return { error: 'No se pudo actualizar el estado.' }

  revalidatePath(`/campanas/${parsed.data.id}`)
  revalidatePath('/campanas')
  return {}
}

export async function eliminarCampanaAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = EliminarCampanaSchema.safeParse({
    id: formData.get('campana_id'),
  })

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Campaña inválida.' }

  const supabase = createSupabaseAdmin()
  const campanaId = parsed.data.id

  const { data: encuestas, error: encuestasError } = await supabase
    .from('encuestas')
    .select('id, cliente_id')
    .eq('campana_id', campanaId)

  if (encuestasError) return { error: 'No se pudo preparar la eliminación de la campaña.' }

  const encuestaIds = encuestas?.map((encuesta) => encuesta.id) ?? []
  const clienteIds = Array.from(
    new Set((encuestas ?? []).map((encuesta) => encuesta.cliente_id).filter(Boolean))
  )

  let clientesParaEliminar: string[] = []
  if (clienteIds.length > 0) {
    const [{ data: encuestasExternas, error: encuestasExternasError }, { data: enviosExternos, error: enviosExternosError }] =
      await Promise.all([
        supabase
          .from('encuestas')
          .select('cliente_id')
          .in('cliente_id', clienteIds)
          .neq('campana_id', campanaId),
        supabase
          .from('envios')
          .select('cliente_id')
          .in('cliente_id', clienteIds)
          .neq('campana_id', campanaId),
      ])

    if (encuestasExternasError || enviosExternosError) {
      return { error: 'No se pudo verificar si los clientes pertenecen a otras campañas.' }
    }

    const clientesUsados = new Set([
      ...(encuestasExternas ?? []).map((item) => item.cliente_id),
      ...(enviosExternos ?? []).map((item) => item.cliente_id),
    ])
    clientesParaEliminar = clienteIds.filter((id) => !clientesUsados.has(id))
  }

  if (encuestaIds.length > 0) {
    const { error } = await supabase.from('respuestas').delete().in('encuesta_id', encuestaIds)
    if (error) return { error: 'No se pudieron eliminar las respuestas asociadas.' }
  }

  // Eliminar jobs de WhatsApp (cascade borra envios_whatsapp_detalle automáticamente)
  const { error: waJobsError } = await supabase.from('envios_whatsapp_jobs').delete().eq('campana_id', campanaId)
  if (waJobsError) return { error: 'No se pudieron eliminar los envíos de WhatsApp asociados.' }

  const { error: enviosError } = await supabase.from('envios').delete().eq('campana_id', campanaId)
  if (enviosError) return { error: 'No se pudieron eliminar los envíos asociados.' }

  const { error: encuestasDeleteError } = await supabase.from('encuestas').delete().eq('campana_id', campanaId)
  if (encuestasDeleteError) return { error: 'No se pudieron eliminar las encuestas asociadas.' }

  const { error: campanaError } = await supabase.from('campanas').delete().eq('id', campanaId)
  if (campanaError) return { error: 'No se pudo eliminar la campaña.' }

  if (clientesParaEliminar.length > 0) {
    const { error } = await supabase.from('clientes').delete().in('id', clientesParaEliminar)
    if (error) {
      console.error('La campaña fue eliminada, pero no se pudieron limpiar clientes sin referencias.', error)
    }
  }

  revalidatePath('/campanas')
  revalidatePath('/clientes')
  revalidatePath('/respuestas')
  redirect('/campanas')
}

export async function eliminarEncuestaAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await getRoleOrThrow()
  } catch {
    return { error: 'No tenés permisos para eliminar encuestas.' }
  }

  const parsed = EliminarEncuestaSchema.safeParse({
    encuesta_id: formData.get('encuesta_id'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Encuesta inválida.' }

  const supabase = createSupabaseAdmin()
  const encuestaId = parsed.data.encuesta_id

  const { data: encuesta, error: encuestaError } = await supabase
    .from('encuestas')
    .select('id, cliente_id, campana_id')
    .eq('id', encuestaId)
    .single()

  if (encuestaError || !encuesta) return { error: 'La encuesta no existe.' }

  const { error: waDetalleError } = await supabase
    .from('envios_whatsapp_detalle')
    .delete()
    .eq('encuesta_id', encuestaId)
  if (waDetalleError) return { error: 'No se pudieron eliminar los envíos de WhatsApp asociados.' }

  const { error: respuestaError } = await supabase
    .from('respuestas')
    .delete()
    .eq('encuesta_id', encuestaId)
  if (respuestaError) return { error: 'No se pudo eliminar la respuesta asociada.' }

  const { error: enviosError } = await supabase
    .from('envios')
    .delete()
    .eq('cliente_id', encuesta.cliente_id)
    .eq('campana_id', encuesta.campana_id)
  if (enviosError) return { error: 'No se pudieron eliminar los envíos asociados.' }

  const { error: encuestaDeleteError } = await supabase
    .from('encuestas')
    .delete()
    .eq('id', encuestaId)
  if (encuestaDeleteError) return { error: 'No se pudo eliminar la encuesta.' }

  revalidatePath(`/campanas/${encuesta.campana_id}`)
  revalidatePath('/campanas')
  revalidatePath('/respuestas')
  revalidatePath('/nps')
  return {}
}
