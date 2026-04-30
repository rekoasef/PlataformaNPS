'use server'

import { z } from 'zod'
import { createSupabaseAdmin } from '@/lib/supabase/server'
import { parseClientesCSV } from '@/lib/utils/csv'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const CampanaSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(200),
  fecha: z.string().min(1, 'La fecha es requerida'),
})

const CambiarEstadoSchema = z.object({
  id: z.string().uuid('Campaña inválida.'),
  estado: z.enum(['activa', 'completada', 'archivada']),
})

type ActionState = { error?: string }

export async function crearCampanaAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const raw = {
    nombre: formData.get('nombre') as string,
    fecha:  formData.get('fecha') as string,
  }

  const result = CampanaSchema.safeParse(raw)
  if (!result.success) return { error: result.error.issues[0].message }

  const file = formData.get('archivo') as File | null
  if (!file || file.size === 0) return { error: 'Selecciona el archivo CSV con los clientes.' }

  let rows: ReturnType<typeof parseClientesCSV>
  try {
    rows = parseClientesCSV(await file.text())
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error al leer el CSV.' }
  }
  if (rows.length === 0) return { error: 'El CSV no contiene clientes validos.' }

  const supabase = createSupabaseAdmin()

  // 1. Crear campaña
  const { data: campana, error: errCampana } = await supabase
    .from('campanas')
    .insert({ nombre: result.data.nombre, fecha: result.data.fecha })
    .select()
    .single()
  if (errCampana) return { error: 'Error al crear la campaña.' }

  // 2. Crear clientes en batch
  const { data: clientes, error: errClientes } = await supabase
    .from('clientes')
    .insert(rows)
    .select('id, orden_fabricacion')
  if (errClientes || !clientes) {
    // Rollback: eliminar campaña creada
    await supabase.from('campanas').delete().eq('id', campana.id)
    return { error: 'Error al crear los clientes.' }
  }

  // 3. Crear encuestas en batch (token lo genera la DB automáticamente)
  const encuestasInsert = clientes.map((c) => ({
    cliente_id: c.id,
    campana_id: campana.id,
  }))
  const { error: errEncuestas } = await supabase
    .from('encuestas')
    .insert(encuestasInsert)
  if (errEncuestas) return { error: 'Error al crear las encuestas.' }

  // 4. Crear envíos iniciales en batch (1 por OF)
  const fechaEnvioInicial = new Date().toISOString()
  const enviosInsert = clientes.map((c) => ({
    cliente_id: c.id,
    campana_id: campana.id,
    numero_recordatorio: 0,
    estado_envio: 'enviado' as const,
    fecha_envio: fechaEnvioInicial,
  }))
  const { error: errEnvios } = await supabase.from('envios').insert(enviosInsert)
  if (errEnvios) return { error: 'Error al crear los envios.' }

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
