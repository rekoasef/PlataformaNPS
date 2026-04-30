'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import {
  crearRecordatorio,
  marcarRecordatorioEnviado,
  puedeCrearRecordatorio,
} from '@/modules/recordatorios/services/recordatorios.service'

type ActionState = { error?: string }

const CampanaIdSchema = z.object({
  campanaId: z.string().uuid('Campaña inválida.'),
})

const ConfirmarSchema = z.object({
  campanaId: z.string().uuid('Campaña inválida.'),
  numeroRecordatorio: z.coerce.number().int().min(1).max(3),
})

export async function crearRecordatorioAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = CampanaIdSchema.safeParse({
    campanaId: formData.get('campanaId'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }
  }

  const permiso = await puedeCrearRecordatorio(parsed.data.campanaId)
  if (!permiso.allowed || !permiso.nextNumero) {
    return { error: permiso.reason ?? 'No se puede crear el recordatorio.' }
  }

  try {
    await crearRecordatorio(parsed.data.campanaId, permiso.nextNumero)
  } catch {
    return { error: 'No se pudo crear el recordatorio.' }
  }

  revalidatePath(`/campanas/${parsed.data.campanaId}`)
  revalidatePath(`/campanas/${parsed.data.campanaId}/recordatorio`)
  redirect(`/campanas/${parsed.data.campanaId}/recordatorio`)
}

export async function confirmarEnvioRecordatorioAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = ConfirmarSchema.safeParse({
    campanaId: formData.get('campanaId'),
    numeroRecordatorio: formData.get('numeroRecordatorio'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }
  }

  try {
    await marcarRecordatorioEnviado(parsed.data.campanaId, parsed.data.numeroRecordatorio)
  } catch {
    return { error: 'No se pudo confirmar el envío del recordatorio.' }
  }

  revalidatePath(`/campanas/${parsed.data.campanaId}`)
  revalidatePath(`/campanas/${parsed.data.campanaId}/recordatorio`)
  redirect(`/campanas/${parsed.data.campanaId}`)
}
