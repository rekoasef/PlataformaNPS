'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import {
  actualizarMedidaLlamado,
  agregarMedidaLlamado,
  eliminarMedidaLlamado,
  marcarEncuestaSinRespuesta,
  revertirEncuestaANecesidadLlamado,
} from '@/modules/recordatorios/services/recordatorios.service'
import { getUsuarioActual } from '@/lib/auth/session'

type ActionState = { error?: string; success?: boolean }

const Schema = z.object({
  encuestaId: z.string().uuid('Encuesta inválida.'),
  comentario: z
    .string()
    .trim()
    .min(3, 'Indicá brevemente el motivo (mínimo 3 caracteres).')
    .max(2000, 'El comentario es demasiado largo.'),
})

const MedidaSchema = z.object({
  encuestaId: z.string().uuid('Encuesta inválida.'),
  comentario: z
    .string()
    .trim()
    .min(3, 'Contá brevemente qué se hizo (mínimo 3 caracteres).')
    .max(2000, 'El comentario es demasiado largo.'),
})

const EditarMedidaSchema = z.object({
  medidaId: z.string().uuid('Medida inválida.'),
  comentario: z
    .string()
    .trim()
    .min(3, 'Contá brevemente qué se hizo (mínimo 3 caracteres).')
    .max(2000, 'El comentario es demasiado largo.'),
})

const EliminarMedidaSchema = z.object({
  medidaId: z.string().uuid('Medida inválida.'),
})

const RevertirSchema = z.object({
  encuestaId: z.string().uuid('Encuesta inválida.'),
  comentario: z
    .string()
    .trim()
    .min(3, 'Indicá brevemente el motivo (mínimo 3 caracteres).')
    .max(2000, 'El comentario es demasiado largo.'),
})

export async function agregarMedidaAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = MedidaSchema.safeParse({
    encuestaId: formData.get('encuestaId'),
    comentario: formData.get('comentario'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }
  }

  const creadoPor = (await getUsuarioActual())?.id ?? null

  try {
    await agregarMedidaLlamado(parsed.data.encuestaId, parsed.data.comentario, creadoPor)
  } catch {
    return { error: 'No se pudo guardar la medida.' }
  }

  revalidatePath('/llamados')
  return { success: true }
}

export async function editarMedidaAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = EditarMedidaSchema.safeParse({
    medidaId: formData.get('medidaId'),
    comentario: formData.get('comentario'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }
  }

  try {
    await actualizarMedidaLlamado(parsed.data.medidaId, parsed.data.comentario)
  } catch {
    return { error: 'No se pudo editar la medida.' }
  }

  revalidatePath('/llamados')
  revalidatePath('/sin-respuesta')
  return { success: true }
}

export async function eliminarMedidaAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = EliminarMedidaSchema.safeParse({
    medidaId: formData.get('medidaId'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }
  }

  try {
    await eliminarMedidaLlamado(parsed.data.medidaId)
  } catch {
    return { error: 'No se pudo eliminar la medida.' }
  }

  revalidatePath('/llamados')
  revalidatePath('/sin-respuesta')
  return { success: true }
}

export async function marcarSinRespuestaAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = Schema.safeParse({
    encuestaId: formData.get('encuestaId'),
    comentario: formData.get('comentario'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }
  }

  const marcadoPor = (await getUsuarioActual())?.id ?? null

  try {
    await marcarEncuestaSinRespuesta(parsed.data.encuestaId, parsed.data.comentario, marcadoPor)
  } catch {
    return { error: 'No se pudo marcar la OF como sin respuesta.' }
  }

  revalidatePath('/llamados')
  revalidatePath('/sin-respuesta')
  revalidatePath('/campanas')
  return { success: true }
}

export async function revertirNecesidadLlamadoAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = RevertirSchema.safeParse({
    encuestaId: formData.get('encuestaId'),
    comentario: formData.get('comentario'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }
  }

  const revertidoPor = (await getUsuarioActual())?.id ?? null

  try {
    await revertirEncuestaANecesidadLlamado(
      parsed.data.encuestaId,
      parsed.data.comentario,
      revertidoPor
    )
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'No se pudo revertir el estado de la OF.',
    }
  }

  revalidatePath('/llamados')
  revalidatePath('/sin-respuesta')
  revalidatePath('/campanas')
  return { success: true }
}
