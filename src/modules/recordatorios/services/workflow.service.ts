import { db } from '@/lib/db/client'
import { encuestas, envios, systemConfig } from '@/lib/db/schema'
import { and, eq, inArray } from 'drizzle-orm'

export async function syncWorkflowEstados() {
  const [config] = await db.select({ diasHastaLlamado: systemConfig.diasHastaLlamado }).from(systemConfig).limit(1)
  if (!config) return

  const enviosData = await db
    .select({
      campanaId: envios.campanaId,
      clienteId: envios.clienteId,
      numeroRecordatorio: envios.numeroRecordatorio,
      fechaEnvio: envios.fechaEnvio,
    })
    .from(envios)
    .where(eq(envios.estadoEnvio, 'enviado'))

  const now = Date.now()
  const staleRecordatorio = enviosData.filter((envio) => {
    if (envio.numeroRecordatorio <= 0 || !envio.fechaEnvio) return false
    const diffDays = (now - new Date(envio.fechaEnvio).getTime()) / (1000 * 60 * 60 * 24)
    return diffDays >= config.diasHastaLlamado
  })

  if (staleRecordatorio.length === 0) return

  const groupedByCampana = new Map<string, string[]>()
  for (const envio of staleRecordatorio) {
    const current = groupedByCampana.get(envio.campanaId) ?? []
    current.push(envio.clienteId)
    groupedByCampana.set(envio.campanaId, current)
  }

  for (const [campanaId, clienteIds] of groupedByCampana.entries()) {
    await db
      .update(encuestas)
      .set({ estado: 'necesidad_de_llamado' })
      .where(
        and(
          eq(encuestas.campanaId, campanaId),
          inArray(encuestas.clienteId, Array.from(new Set(clienteIds))),
          eq(encuestas.estado, 'recordatorio_enviado')
        )
      )
  }
}
