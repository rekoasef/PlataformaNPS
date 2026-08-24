'use server'

import { redirect } from 'next/navigation'
import { createPlantilla } from '@/modules/plantillas/services/plantillas.service'
import type { Pregunta } from '@/modules/plantillas/types/plantilla.types'
import { chequearRol } from '@/lib/auth/session'

export async function crearPlantillaAction(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const permiso = await chequearRol('admin')
  if (!permiso.ok) return { error: permiso.error }

  const nombre = (formData.get('nombre') as string | null)?.trim()
  const introduccion = (formData.get('introduccion') as string | null)?.trim() ?? ''
  const preguntasRaw = formData.get('preguntas_json') as string | null

  if (!nombre) return { error: 'El nombre de la plantilla es obligatorio.' }

  let preguntas: Pregunta[] = []
  try {
    preguntas = preguntasRaw ? JSON.parse(preguntasRaw) : []
  } catch {
    return { error: 'Error al procesar las preguntas. Intentá de nuevo.' }
  }

  try {
    const nueva = await createPlantilla({ nombre, introduccion, preguntas })
    redirect(`/plantillas/${nueva.id}/editar`)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'NEXT_REDIRECT') throw e
    return { error: 'No se pudo crear la plantilla. Intentá de nuevo.' }
  }
}
