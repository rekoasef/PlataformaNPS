import { db } from '@/lib/db/client'
import { notificaciones } from '@/lib/db/schema'
import { and, desc, eq, sql } from 'drizzle-orm'
import type { Notificacion } from '../types/notificacion.types'

const notificacionSelect = {
  id: notificaciones.id,
  tipo: notificaciones.tipo,
  titulo: notificaciones.titulo,
  mensaje: notificaciones.mensaje,
  leida: notificaciones.leida,
  para_rol: notificaciones.paraRol,
  metadata: notificaciones.metadata,
  created_at: notificaciones.createdAt,
}

export async function getNotificaciones(rol: string): Promise<Notificacion[]> {
  try {
    const data = await db
      .select(notificacionSelect)
      .from(notificaciones)
      .where(eq(notificaciones.paraRol, rol))
      .orderBy(desc(notificaciones.createdAt))
      .limit(20)
    return data as Notificacion[]
  } catch {
    return []
  }
}

export async function getUnreadCount(rol: string): Promise<number> {
  try {
    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(notificaciones)
      .where(and(eq(notificaciones.paraRol, rol), eq(notificaciones.leida, false)))
    return total
  } catch {
    return 0
  }
}

export async function marcarTodasLeidas(rol: string): Promise<void> {
  await db
    .update(notificaciones)
    .set({ leida: true })
    .where(and(eq(notificaciones.paraRol, rol), eq(notificaciones.leida, false)))
}
