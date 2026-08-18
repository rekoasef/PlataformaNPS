import { db } from '@/lib/db/client'
import { campanas, encuestas, envios, notificaciones, systemConfig } from '@/lib/db/schema'
import { and, desc, eq, gte, inArray, sql } from 'drizzle-orm'
import { sendEmail } from '@/lib/email/send-email'
import { buildAvisoRecordatorioTemplate } from '@/lib/email/templates/aviso-recordatorio'

const DAY_MS = 1000 * 60 * 60 * 24

export async function checkAvisosRecordatorio() {
  const [config] = await db
    .select({ diasNotificacionInicial: systemConfig.diasNotificacionInicial })
    .from(systemConfig)
    .limit(1)

  const campanasActivas = await db
    .select({ id: campanas.id, nombre: campanas.nombre })
    .from(campanas)
    .where(eq(campanas.estado, 'activa'))

  if (!config || campanasActivas.length === 0) return

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const now = Date.now()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  for (const campana of campanasActivas) {
    try {
      const enviosCampana = await db
        .select({ numeroRecordatorio: envios.numeroRecordatorio, estadoEnvio: envios.estadoEnvio, fechaEnvio: envios.fechaEnvio })
        .from(envios)
        .where(eq(envios.campanaId, campana.id))
        .orderBy(desc(envios.numeroRecordatorio))

      if (enviosCampana.length === 0) continue

      // Si hay un recordatorio sin confirmar (pendiente de envío externo), saltar
      const tieneRecordatorioPendiente = enviosCampana.some(
        (e) => e.numeroRecordatorio > 0 && e.estadoEnvio === 'pendiente_envio'
      )
      if (tieneRecordatorioPendiente) continue

      // Último recordatorio confirmado (enviado)
      const ultimoConfirmado = enviosCampana.find((e) => e.estadoEnvio === 'enviado')
      if (!ultimoConfirmado || !ultimoConfirmado.fechaEnvio) continue

      // Máximo de recordatorios ya alcanzado
      if (ultimoConfirmado.numeroRecordatorio >= 3) continue

      // ¿Pasaron suficientes días desde el último envío confirmado?
      const diasTranscurridos = (now - new Date(ultimoConfirmado.fechaEnvio).getTime()) / DAY_MS
      if (diasTranscurridos < config.diasNotificacionInicial) continue

      // ¿Hay clientes pendientes de responder?
      const [{ pendientes }] = await db
        .select({ pendientes: sql<number>`count(*)::int` })
        .from(encuestas)
        .where(and(eq(encuestas.campanaId, campana.id), inArray(encuestas.estado, ['pendiente', 'recordatorio_enviado'])))

      if (pendientes === 0) continue

      // Deduplicación: ya notificamos hoy para esta campaña?
      const [{ notifHoy }] = await db
        .select({ notifHoy: sql<number>`count(*)::int` })
        .from(notificaciones)
        .where(
          and(
            eq(notificaciones.tipo, 'campana_sin_actividad'),
            gte(notificaciones.createdAt, todayStart.toISOString()),
            sql`${notificaciones.metadata}->>'campana_id' = ${campana.id}`
          )
        )

      if (notifHoy > 0) continue

      const nextNumero = ultimoConfirmado.numeroRecordatorio + 1
      const mensaje = `Campaña "${campana.nombre}" tiene ${pendientes} cliente${pendientes !== 1 ? 's' : ''} sin responder. Es momento de enviar el recordatorio ${nextNumero}.`

      // Notificación interna
      await db.insert(notificaciones).values({
        tipo: 'campana_sin_actividad',
        titulo: `Recordatorio ${nextNumero} pendiente`,
        mensaje,
        paraRol: 'admin',
        metadata: {
          campana_id: campana.id,
          campana_nombre: campana.nombre,
          numero: String(nextNumero),
          pendientes: String(pendientes),
        },
      })

      // Email solo al administrador
      const recipients = ['rasef@crucianelli.com']
      if (recipients.length > 0) {
        const email = buildAvisoRecordatorioTemplate({
          campanaNombre: campana.nombre,
          nextNumero,
          pendientes,
          detalleUrl: `${appUrl}/campanas/${campana.id}`,
        })

        await sendEmail({
          bcc: recipients,
          subject: email.subject,
          html: email.html,
          text: email.text,
        })
      }
    } catch (err) {
      console.error(`[avisos] Error en campaña ${campana.id}:`, err)
    }
  }
}
