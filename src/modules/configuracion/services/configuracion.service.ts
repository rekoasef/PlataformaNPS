import { createSupabaseAdmin, createSupabaseServer } from '@/lib/supabase/server'
import type { SystemConfigUpdate } from '../types/configuracion.types'

export async function getSystemConfig() {
  const supabase = await createSupabaseServer()
  const { data, error } = await supabase
    .from('system_config')
    .select('*')
    .limit(1)
    .maybeSingle()

  if (error) throw error

  if (!data) {
    const { data: created, error: insertError } = await supabase
      .from('system_config')
      .insert({
        dias_notificacion_inicial: 2,
        dias_notificacion_recordatorio: 2,
        dias_hasta_llamado: 2,
        emails_notificacion: [],
      })
      .select()
      .single()

    if (insertError) throw insertError
    return created
  }

  return data
}

export async function updateSystemConfig(id: string, values: SystemConfigUpdate) {
  const supabase = await createSupabaseServer()
  const { data, error } = await supabase
    .from('system_config')
    .update(values)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getTiposEncuesta() {
  const supabase = await createSupabaseServer()
  const { data, error } = await supabase
    .from('tipos_encuesta')
    .select('*')
    .order('created_at')

  if (error) throw error
  return data
}

export async function updateEnviaRegalo(id: string, enviaRegalo: boolean) {
  const supabase = createSupabaseAdmin()
  const { error } = await supabase
    .from('tipos_encuesta')
    .update({ envia_regalo: enviaRegalo })
    .eq('id', id)

  if (error) throw error
}
