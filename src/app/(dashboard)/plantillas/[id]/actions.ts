'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import {
  updatePlantilla,
  deletePlantilla,
  getPlantillaById,
} from '@/modules/plantillas/services/plantillas.service'
import type { Pregunta } from '@/modules/plantillas/types/plantilla.types'
import { chequearRol, requireRol } from '@/lib/auth/session'

export async function actualizarPlantillaAction(
  _prev: { error?: string; success?: boolean },
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const permiso = await chequearRol('admin')
  if (!permiso.ok) return { error: permiso.error }

  const id = formData.get('id') as string
  const nombre = (formData.get('nombre') as string | null)?.trim()
  const introduccion = (formData.get('introduccion') as string | null)?.trim() ?? ''
  const preguntasRaw = formData.get('preguntas_json') as string | null

  if (!id || !nombre) return { error: 'Datos incompletos.' }

  let preguntas: Pregunta[] = []
  try {
    preguntas = preguntasRaw ? JSON.parse(preguntasRaw) : []
  } catch {
    return { error: 'Error al procesar las preguntas.' }
  }

  try {
    await updatePlantilla(id, { nombre, introduccion, preguntas })
    revalidatePath(`/plantillas/${id}/editar`)
    return { success: true }
  } catch {
    return { error: 'No se pudo guardar. Intentá de nuevo.' }
  }
}

export async function eliminarPlantillaAction(id: string): Promise<void> {
  // Devuelve void: no hay `{ error }` que mostrar, así que acá se tira.
  await requireRol('admin')

  const plantilla = await getPlantillaById(id)
  if (!plantilla || plantilla.es_sistema) throw new Error('No se puede eliminar esta plantilla.')
  await deletePlantilla(id)
  revalidatePath('/plantillas')
  redirect('/plantillas')
}
