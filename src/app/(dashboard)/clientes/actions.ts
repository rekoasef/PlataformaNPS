'use server'

import { z } from 'zod'
import { createCliente } from '@/modules/clientes/services/clientes.service'
import { createSupabaseServer } from '@/lib/supabase/server'
import { parseClientesCSV } from '@/lib/utils/csv'
import { revalidatePath } from 'next/cache'

const ClienteSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(200),
  telefono: z.string().min(1, 'El telefono 1 es requerido').max(50),
  telefono_2: z.string().max(50).optional().nullable(),
  telefono_3: z.string().max(50).optional().nullable(),
  concesionario: z.string().min(1, 'El concesionario es requerido').max(200),
  orden_fabricacion: z.string().min(1, 'La OF es requerida').max(200),
  tecnologia: z.enum(['leaf', 'precision_planting']).optional().nullable(),
})

type ActionState  = { error?: string; success?: boolean }
type ImportState  = { error?: string; success?: boolean; imported?: number }

export async function crearClienteAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const raw = {
    nombre: formData.get('nombre') as string,
    telefono: formData.get('telefono') as string,
    telefono_2: (formData.get('telefono_2') as string) || null,
    telefono_3: (formData.get('telefono_3') as string) || null,
    concesionario: formData.get('concesionario') as string,
    orden_fabricacion: formData.get('orden_fabricacion') as string,
    tecnologia: (formData.get('tecnologia') as string) || null,
  }

  const result = ClienteSchema.safeParse(raw)
  if (!result.success) return { error: result.error.issues[0].message }

  try {
    await createCliente(result.data)
    revalidatePath('/clientes')
    return { success: true }
  } catch {
    return { error: 'Error al crear el cliente. Intenta nuevamente.' }
  }
}

export async function importarClientesCSVAction(
  _prevState: ImportState,
  formData: FormData
): Promise<ImportState> {
  const file = formData.get('archivo') as File | null
  if (!file || file.size === 0) return { error: 'Selecciona un archivo CSV.' }

  let rows: ReturnType<typeof parseClientesCSV>
  try {
    rows = parseClientesCSV(await file.text())
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error al leer el CSV.' }
  }

  if (rows.length === 0) return { error: 'El archivo no contiene filas validas.' }

  const supabase = await createSupabaseServer()
  const { error } = await supabase.from('clientes').insert(rows)
  if (error) return { error: 'Error al guardar los clientes. Verifica el formato del archivo.' }

  revalidatePath('/clientes')
  return { success: true, imported: rows.length }
}
