import { createSupabaseAdmin } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/send-email'
import { buildAlertaNpsTemplate } from '@/lib/email/templates/alerta-nps'

type RespuestaCriticaData = {
  encuestaId: string
  npsProducto: number
  npsEmpresa: number
  npsConcesionario: number
  comentarioProducto: string | null
  comentarioEmpresa: string | null
  comentarioGeneral: string | null
}

export async function enviarAlertaNpsCritico({
  encuestaId,
  npsProducto,
  npsEmpresa,
  npsConcesionario,
  comentarioProducto,
  comentarioEmpresa,
  comentarioGeneral,
}: RespuestaCriticaData) {
  const supabase = createSupabaseAdmin()

  const [{ data: config, error: configError }, { data: encuesta, error: encuestaError }] =
    await Promise.all([
      supabase.from('system_config').select('emails_notificacion').limit(1).maybeSingle(),
      supabase
        .from('encuestas')
        .select(`
          id,
          campanas(id, nombre),
          clientes(nombre, concesionario)
        `)
        .eq('id', encuestaId)
        .single(),
    ])

  if (configError) throw configError
  if (encuestaError) throw encuestaError

  const recipients = config?.emails_notificacion ?? []
  if (recipients.length === 0) return

  const campana = Array.isArray(encuesta.campanas) ? encuesta.campanas[0] : encuesta.campanas
  const cliente = Array.isArray(encuesta.clientes) ? encuesta.clientes[0] : encuesta.clientes

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const detalleUrl = campana?.id ? `${appUrl}/campanas/${campana.id}` : `${appUrl}/campanas`

  const email = buildAlertaNpsTemplate({
    clienteNombre: cliente?.nombre ?? 'Cliente sin nombre',
    concesionario: cliente?.concesionario ?? 'Sin concesionario',
    campanaNombre: campana?.nombre ?? 'Campaña sin nombre',
    npsProducto,
    npsEmpresa,
    npsConcesionario,
    comentarioProducto,
    comentarioEmpresa,
    comentarioGeneral,
    detalleUrl,
  })

  await sendEmail({
    to: recipients,
    subject: email.subject,
    html: email.html,
    text: email.text,
  })
}
