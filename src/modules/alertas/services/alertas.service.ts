import { db } from '@/lib/db/client'
import { campanas, clientes, encuestas, systemConfig } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { sendEmail } from '@/lib/email/send-email'
import { buildAlertaNpsTemplate } from '@/lib/email/templates/alerta-nps'
import { buildRamblaRegaloTemplate } from '@/lib/email/templates/rambla-regalo'

type RespuestaCriticaData = {
  encuestaId: string
  npsProducto: number
  npsEmpresa: number
  npsConcesionario: number
  comentarioProducto: string | null
  comentarioConcesionario: string | null
  comentarioEmpresa: string | null
  comentarioGeneral: string | null
}

export async function enviarAlertaNpsCritico({
  encuestaId,
  npsProducto,
  npsEmpresa,
  npsConcesionario,
  comentarioProducto,
  comentarioConcesionario,
  comentarioEmpresa,
  comentarioGeneral,
}: RespuestaCriticaData) {
  const [[config], [encuesta]] = await Promise.all([
    db.select({ emailsNotificacion: systemConfig.emailsNotificacion }).from(systemConfig).limit(1),
    db
      .select({
        id: encuestas.id,
        campanaNombre: campanas.nombre,
        clienteNombre: clientes.nombre,
        clienteConcesionario: clientes.concesionario,
      })
      .from(encuestas)
      .innerJoin(campanas, eq(encuestas.campanaId, campanas.id))
      .innerJoin(clientes, eq(encuestas.clienteId, clientes.id))
      .where(eq(encuestas.id, encuestaId))
      .limit(1),
  ])

  const recipients = config?.emailsNotificacion ?? []
  if (recipients.length === 0) return

  const email = buildAlertaNpsTemplate({
    clienteNombre: encuesta?.clienteNombre ?? 'Cliente sin nombre',
    concesionario: encuesta?.clienteConcesionario ?? 'Sin concesionario',
    campanaNombre: encuesta?.campanaNombre ?? 'Campaña sin nombre',
    npsProducto,
    npsEmpresa,
    npsConcesionario,
    comentarioProducto,
    comentarioConcesionario,
    comentarioEmpresa,
    comentarioGeneral,
  })

  // BCC: cada destinatario recibe el mail sin ver a los demás
  await sendEmail({
    bcc: recipients,
    subject: email.subject,
    html: email.html,
    text: email.text,
  })
}

type DatosEnvioRambla = {
  nombreApellido: string
  calleNumero: string
  pisoDepartamento: string | null
  localidad: string
  codigoPostal: string
  provincia: string
  email: string
  telefono: string
  concesionario: string
}

export async function enviarNotificacionRambla(datos: DatosEnvioRambla) {
  const [config] = await db.select({ emailsRambla: systemConfig.emailsRambla }).from(systemConfig).limit(1)

  const recipients = config?.emailsRambla ?? []
  if (recipients.length === 0) return

  const emailContent = buildRamblaRegaloTemplate(datos)

  await sendEmail({
    bcc: recipients,
    subject: emailContent.subject,
    html: emailContent.html,
    text: emailContent.text,
  })
}
