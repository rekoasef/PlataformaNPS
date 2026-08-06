import { createSupabaseServer } from '@/lib/supabase/server'
import type {
  PlantillaWhatsapp,
  PlantillaInsert,
  PlantillaUpdate,
  WhatsappJob,
  JobConPlantilla,
  JobConDetalle,
} from '../types/whatsapp.types'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

// ─── Plantillas ──────────────────────────────────────────────────────────────

export async function getPlantillas(): Promise<PlantillaWhatsapp[]> {
  const supabase = await createSupabaseServer()
  const { data, error } = await supabase
    .from('plantillas_whatsapp')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function getPlantillaById(id: string): Promise<PlantillaWhatsapp | null> {
  const supabase = await createSupabaseServer()
  const { data, error } = await supabase
    .from('plantillas_whatsapp')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data
}

export async function createPlantilla(input: PlantillaInsert): Promise<PlantillaWhatsapp> {
  const supabase = await createSupabaseServer()
  const { data, error } = await supabase
    .from('plantillas_whatsapp')
    .insert(input)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updatePlantilla(id: string, input: PlantillaUpdate): Promise<PlantillaWhatsapp> {
  const supabase = await createSupabaseServer()
  const { data, error } = await supabase
    .from('plantillas_whatsapp')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function duplicarPlantilla(id: string): Promise<PlantillaWhatsapp> {
  const original = await getPlantillaById(id)
  if (!original) throw new Error('Plantilla no encontrada')
  return createPlantilla({
    nombre:      `${original.nombre} (copia)`,
    tipo:        original.tipo,
    lineas:      original.lineas,
    ruta_imagen: original.ruta_imagen,
    activa:      false,
  })
}

export async function archivarPlantilla(id: string): Promise<void> {
  const supabase = await createSupabaseServer()
  const { error } = await supabase
    .from('plantillas_whatsapp')
    .update({ activa: false, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function desarchivarPlantilla(id: string): Promise<void> {
  const supabase = await createSupabaseServer()
  const { error } = await supabase
    .from('plantillas_whatsapp')
    .update({ activa: true, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

// ─── Jobs ────────────────────────────────────────────────────────────────────

export async function getJobsByCampana(campanaId: string): Promise<JobConPlantilla[]> {
  const supabase = await createSupabaseServer()
  const { data, error } = await supabase
    .from('envios_whatsapp_jobs')
    .select(`*, plantilla:plantillas_whatsapp(nombre, tipo)`)
    .eq('campana_id', campanaId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as JobConPlantilla[]
}

export interface JobConCampana extends JobConPlantilla {
  campana: { nombre: string }
}

export async function getAllJobs(): Promise<JobConCampana[]> {
  const supabase = await createSupabaseServer()
  const { data, error } = await supabase
    .from('envios_whatsapp_jobs')
    .select(`*, plantilla:plantillas_whatsapp(nombre, tipo), campana:campanas(nombre)`)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as unknown as JobConCampana[]
}

export async function getJobConDetalle(jobId: string): Promise<JobConDetalle | null> {
  const supabase = await createSupabaseServer()
  const { data, error } = await supabase
    .from('envios_whatsapp_jobs')
    .select(`*, plantilla:plantillas_whatsapp(nombre, tipo), detalles:envios_whatsapp_detalle(*)`)
    .eq('id', jobId)
    .single()
  if (error) return null
  return data as JobConDetalle
}

// ─── Crear job ───────────────────────────────────────────────────────────────

export async function crearJob(
  campanaId: string,
  plantillaId: string,
  soloRespondibles: boolean = false,
): Promise<WhatsappJob> {
  const supabase = await createSupabaseServer()

  // Obtener contactos pendientes de la campaña (no respondidos)
  type EncuestaEstado = 'pendiente' | 'respondida' | 'recordatorio_enviado' | 'necesidad_de_llamado' | 'sin_respuesta'
  const estadosIncluidos: EncuestaEstado[] = soloRespondibles
    ? ['pendiente', 'recordatorio_enviado']
    : ['pendiente', 'recordatorio_enviado', 'necesidad_de_llamado']

  const { data: encuestas, error: encError } = await supabase
    .from('encuestas')
    .select(`id, token, estado, cliente:clientes(nombre, telefono)`)
    .eq('campana_id', campanaId)
    .in('estado', estadosIncluidos)

  if (encError) throw encError
  if (!encuestas || encuestas.length === 0) throw new Error('No hay contactos pendientes para esta campaña')

  // Crear el job
  const { data: job, error: jobError } = await supabase
    .from('envios_whatsapp_jobs')
    .insert({
      campana_id:      campanaId,
      plantilla_id:    plantillaId,
      estado:          'pendiente',
      total_contactos: encuestas.length,
    })
    .select()
    .single()

  if (jobError) throw jobError

  // Crear detalle por cada contacto
  const detalles = encuestas.map((e) => {
    const cliente = e.cliente as { nombre: string; telefono: string }
    return {
      job_id:       job.id,
      encuesta_id:  e.id,
      celular:      cliente.telefono,
      nombre:       cliente.nombre,
      url_encuesta: `${APP_URL}/encuesta?token=${e.token}`,
      estado:       'pendiente' as const,
    }
  })

  const { error: detalleError } = await supabase
    .from('envios_whatsapp_detalle')
    .insert(detalles)

  if (detalleError) throw detalleError

  return job
}

export async function detenerJob(jobId: string): Promise<void> {
  const supabase = await createSupabaseServer()
  const { error } = await supabase
    .from('envios_whatsapp_jobs')
    .update({ estado: 'interrumpido' })
    .eq('id', jobId)
    .in('estado', ['en_progreso', 'pendiente'])
  if (error) throw error
}

export { renderizarMensaje } from '../utils/renderizar'
