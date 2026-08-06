'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import {
  createPlantilla,
  updatePlantilla,
  archivarPlantilla,
  desarchivarPlantilla,
  duplicarPlantilla,
  crearJob,
  detenerJob,
} from '@/modules/whatsapp/services/whatsapp.service'

type ActionState = { error?: string; success?: boolean; id?: string }

// ─── Schemas ─────────────────────────────────────────────────────────────────

const PlantillaSchema = z.object({
  nombre:      z.string().min(1, 'El nombre es requerido').max(100),
  tipo:        z.enum(['inicial', 'recordatorio', 'personalizado']),
  ruta_imagen: z.string().optional(),
  activa:      z.boolean().optional(),
})

const CrearJobSchema = z.object({
  campana_id:        z.string().uuid(),
  plantilla_id:      z.string().uuid(),
  solo_respondibles: z.boolean().optional(),
})

// ─── Plantillas ──────────────────────────────────────────────────────────────

export async function crearPlantillaAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const lineasRaw = formData.get('lineas') as string
  let lineas: string[]
  try {
    lineas = JSON.parse(lineasRaw)
    if (!Array.isArray(lineas)) throw new Error()
  } catch {
    return { error: 'Formato de líneas inválido' }
  }

  const parsed = PlantillaSchema.safeParse({
    nombre:      formData.get('nombre'),
    tipo:        formData.get('tipo'),
    ruta_imagen: formData.get('ruta_imagen') || undefined,
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  try {
    const plantilla = await createPlantilla({ ...parsed.data, lineas })
    revalidatePath('/whatsapp/plantillas')
    return { success: true, id: plantilla.id }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Error al crear plantilla' }
  }
}

export async function editarPlantillaAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = formData.get('id') as string
  if (!id) return { error: 'ID requerido' }

  const lineasRaw = formData.get('lineas') as string
  let lineas: string[]
  try {
    lineas = JSON.parse(lineasRaw)
    if (!Array.isArray(lineas)) throw new Error()
  } catch {
    return { error: 'Formato de líneas inválido' }
  }

  const parsed = PlantillaSchema.safeParse({
    nombre:      formData.get('nombre'),
    tipo:        formData.get('tipo'),
    ruta_imagen: formData.get('ruta_imagen') || undefined,
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  try {
    await updatePlantilla(id, { ...parsed.data, lineas })
    revalidatePath('/whatsapp/plantillas')
    revalidatePath(`/whatsapp/plantillas/${id}/editar`)
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Error al actualizar plantilla' }
  }
}

export async function archivarPlantillaAction(id: string): Promise<ActionState> {
  try {
    await archivarPlantilla(id)
    revalidatePath('/whatsapp/plantillas')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Error al archivar plantilla' }
  }
}

export async function desarchivarPlantillaAction(id: string): Promise<ActionState> {
  try {
    await desarchivarPlantilla(id)
    revalidatePath('/whatsapp/plantillas')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Error al desarchivar plantilla' }
  }
}

export async function duplicarPlantillaAction(id: string): Promise<ActionState> {
  try {
    const nueva = await duplicarPlantilla(id)
    revalidatePath('/whatsapp/plantillas')
    return { success: true, id: nueva.id }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Error al duplicar plantilla' }
  }
}

// ─── Jobs ────────────────────────────────────────────────────────────────────

export async function crearJobAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = CrearJobSchema.safeParse({
    campana_id:        formData.get('campana_id'),
    plantilla_id:      formData.get('plantilla_id'),
    solo_respondibles: formData.get('solo_respondibles') === 'true',
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  try {
    const job = await crearJob(
      parsed.data.campana_id,
      parsed.data.plantilla_id,
      parsed.data.solo_respondibles,
    )
    revalidatePath(`/campanas/${parsed.data.campana_id}`)
    revalidatePath('/whatsapp')
    return { success: true, id: job.id }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Error al crear el job' }
  }
}

export async function detenerJobAction(jobId: string): Promise<ActionState> {
  try {
    await detenerJob(jobId)
    revalidatePath(`/whatsapp/jobs/${jobId}`)
    revalidatePath('/whatsapp')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Error al detener el job' }
  }
}
