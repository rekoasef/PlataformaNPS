import { createSupabaseServer } from '@/lib/supabase/server'
import type { SystemConfigUpdate } from '../types/configuracion.types'

export async function getSystemConfig() {
  const supabase = await createSupabaseServer()
  const { data, error } = await supabase
    .from('system_config')
    .select('*')
    .limit(1)
    .maybeSingle()

  if (error) throw error
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
