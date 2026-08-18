import { db } from '@/lib/db/client'
import { systemConfig, tiposEncuesta } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import type { SystemConfigUpdate, TipoEncuesta } from '../types/configuracion.types'

const systemConfigSelect = {
  id: systemConfig.id,
  dias_notificacion_inicial: systemConfig.diasNotificacionInicial,
  dias_notificacion_recordatorio: systemConfig.diasNotificacionRecordatorio,
  emails_notificacion: systemConfig.emailsNotificacion,
  updated_at: systemConfig.updatedAt,
  dias_hasta_llamado: systemConfig.diasHastaLlamado,
  emails_rambla: systemConfig.emailsRambla,
}

const tipoEncuestaSelect = {
  id: tiposEncuesta.id,
  nombre: tiposEncuesta.nombre,
  slug: tiposEncuesta.slug,
  activo: tiposEncuesta.activo,
  created_at: tiposEncuesta.createdAt,
  envia_regalo: tiposEncuesta.enviaRegalo,
  config: tiposEncuesta.config,
  introduccion: tiposEncuesta.introduccion,
  preguntas: tiposEncuesta.preguntas,
}

export async function getSystemConfig() {
  const [existing] = await db.select(systemConfigSelect).from(systemConfig).limit(1)
  if (existing) return existing

  const [created] = await db
    .insert(systemConfig)
    .values({
      diasNotificacionInicial: 2,
      diasNotificacionRecordatorio: 2,
      diasHastaLlamado: 2,
      emailsNotificacion: [],
    })
    .returning(systemConfigSelect)
  return created
}

export async function updateSystemConfig(id: string, values: SystemConfigUpdate) {
  const [updated] = await db
    .update(systemConfig)
    .set({
      diasNotificacionInicial: values.dias_notificacion_inicial,
      diasNotificacionRecordatorio: values.dias_notificacion_recordatorio,
      diasHastaLlamado: values.dias_hasta_llamado,
      emailsNotificacion: values.emails_notificacion,
      emailsRambla: values.emails_rambla,
    })
    .where(eq(systemConfig.id, id))
    .returning(systemConfigSelect)
  return updated
}

export async function getTiposEncuesta(): Promise<TipoEncuesta[]> {
  const rows = await db.select(tipoEncuestaSelect).from(tiposEncuesta).orderBy(tiposEncuesta.createdAt)
  return rows as TipoEncuesta[]
}

export async function updateEnviaRegalo(id: string, enviaRegalo: boolean) {
  await db.update(tiposEncuesta).set({ enviaRegalo }).where(eq(tiposEncuesta.id, id))
}
