import { createSupabaseServer } from '@/lib/supabase/server'
import type { ClienteFormData } from '../types/cliente.types'

const PAGE_SIZE = 20

export async function getClientes(search?: string, page = 1) {
  const supabase = await createSupabaseServer()
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('clientes')
    .select('*', { count: 'exact' })
    .order('nombre')
    .range(from, to)

  if (search) {
    query = query.or(`nombre.ilike.%${search}%,concesionario.ilike.%${search}%,tecnologia.ilike.%${search}%`)
  }

  const { data, error, count } = await query
  if (error) throw error
  return { data: data ?? [], count: count ?? 0, pageSize: PAGE_SIZE }
}

export async function getClienteById(id: string) {
  const supabase = await createSupabaseServer()
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createCliente(data: ClienteFormData) {
  const supabase = await createSupabaseServer()
  const { data: cliente, error } = await supabase
    .from('clientes')
    .insert(data)
    .select()
    .single()
  if (error) throw error
  return cliente
}

export async function getClientesByCampana(campanaId: string) {
  const supabase = await createSupabaseServer()
  const { data, error } = await supabase
    .from('encuestas')
    .select('cliente_id, estado, token, clientes(id, nombre, telefono, telefono_2, telefono_3, concesionario, orden_fabricacion, tecnologia)')
    .eq('campana_id', campanaId)
    .order('created_at')
  if (error) throw error
  return data
}
