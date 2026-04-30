'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { sendEmail } from '@/lib/email/send-email'
import { buildTestEmailTemplate } from '@/lib/email/templates/test-email'
import { getSystemConfig, updateSystemConfig } from '@/modules/configuracion/services/configuracion.service'

const ConfigSchema = z.object({
  id: z.string().uuid('Configuración inválida.'),
  dias_notificacion_inicial: z.coerce
    .number()
    .int('Debe ser un número entero.')
    .min(1, 'Debe ser mayor a 0.'),
  dias_hasta_llamado: z.coerce
    .number()
    .int('Debe ser un número entero.')
    .min(1, 'Debe ser mayor a 0.'),
  emails_notificacion: z.string().optional(),
})

type ActionState = { error?: string; success?: boolean }
type TestActionState = { error?: string; success?: boolean; sentTo?: string }

function parseEmails(input?: string) {
  if (!input) return []

  return input
    .split(/[\n,;]/)
    .map((email) => email.trim())
    .filter(Boolean)
}

export async function actualizarConfiguracionAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const raw = {
    id: formData.get('id'),
    dias_notificacion_inicial: formData.get('dias_notificacion_inicial'),
    dias_hasta_llamado: formData.get('dias_hasta_llamado'),
    emails_notificacion: formData.get('emails_notificacion'),
  }

  const result = ConfigSchema.safeParse(raw)
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Datos inválidos.' }
  }

  const emails = parseEmails(result.data.emails_notificacion)
  const invalidEmail = emails.find((email) => !z.email().safeParse(email).success)

  if (invalidEmail) {
    return { error: `El email "${invalidEmail}" no es válido.` }
  }

  try {
    await updateSystemConfig(result.data.id, {
      dias_notificacion_inicial: result.data.dias_notificacion_inicial,
      dias_hasta_llamado: result.data.dias_hasta_llamado,
      emails_notificacion: emails,
    })
  } catch {
    return { error: 'No se pudo guardar la configuración.' }
  }

  revalidatePath('/configuracion')
  return { success: true }
}

export async function enviarEmailPruebaAction(
  _prevState: TestActionState,
  formData: FormData
): Promise<TestActionState> {
  const emailSchema = z.object({
    to: z.string().email('Ingresa un email válido para la prueba.').optional().or(z.literal('')),
  })

  const result = emailSchema.safeParse({
    to: formData.get('to'),
  })

  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Email inválido.' }
  }

  const config = await getSystemConfig()
  const fallbackRecipient = config?.emails_notificacion[0]
  const recipient = result.data.to || fallbackRecipient

  if (!recipient) {
    return { error: 'Configura al menos un email de notificación o indica un destinatario manual.' }
  }

  const email = buildTestEmailTemplate()

  try {
    await sendEmail({
      to: recipient,
      subject: email.subject,
      html: email.html,
      text: email.text,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'No se pudo enviar el email de prueba.'

    return { error: message }
  }

  return { success: true, sentTo: recipient }
}
