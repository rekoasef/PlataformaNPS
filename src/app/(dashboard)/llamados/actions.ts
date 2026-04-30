'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createSupabaseServer } from '@/lib/supabase/server'
import { marcarEncuestaSinRespuesta } from '@/modules/recordatorios/services/recordatorios.service'

type ActionState = { error?: string; success?: boolean }

const Schema = z.object({
  encuestaId: z.string().uuid('Encuesta inválida.'),
  comentario: z
    .string()
    .trim()
    .min(3, 'Indicá brevemente el motivo (mínimo 3 caracteres).')
    .max(2000, 'El comentario es demasiado largo.'),
})

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

  const supabase = await createSupabaseServer()
  const { data: userData } = await supabase.auth.getUser()
  const marcadoPor = userData.user?.id ?? null

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
