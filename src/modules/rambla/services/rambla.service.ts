import { db } from '@/lib/db/client'
import { respuestas, vRespuestasRambla } from '@/lib/db/schema'
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm'
import type { RegaloEstado, RegaloStats, RespuestaRambla, RamblaFiltros, RamblaPage } from '../types/rambla.types'

export const RAMBLA_PAGE_SIZE = 25

const respuestaSelect = {
  id: vRespuestasRambla.id,
  fecha_respuesta: vRespuestasRambla.fechaRespuesta,
  nombre_apellido: vRespuestasRambla.nombreApellido,
  calle_numero: vRespuestasRambla.calleNumero,
  piso_departamento: vRespuestasRambla.pisoDepartamento,
  localidad: vRespuestasRambla.localidad,
  codigo_postal: vRespuestasRambla.codigoPostal,
  provincia: vRespuestasRambla.provincia,
  email: vRespuestasRambla.email,
  telefono: vRespuestasRambla.telefono,
  maquina_modelo: vRespuestasRambla.maquinaModelo,
  regalo_estado: vRespuestasRambla.regaloEstado,
  numero_seguimiento: vRespuestasRambla.numeroSeguimiento,
  fecha_seguimiento: vRespuestasRambla.fechaSeguimiento,
  fecha_envio: vRespuestasRambla.fechaEnvio,
}

function columnaFecha(filtros?: RamblaFiltros) {
  return filtros?.tipo === 'envio' ? vRespuestasRambla.fechaEnvio : vRespuestasRambla.fechaRespuesta
}

function buildWhere(filtros: RamblaFiltros | undefined, extra?: ReturnType<typeof eq>) {
  const col = columnaFecha(filtros)
  const conditions = [extra]
  if (filtros?.desde) conditions.push(gte(col, filtros.desde + 'T00:00:00-03:00'))
  if (filtros?.hasta) conditions.push(lte(col, filtros.hasta + 'T23:59:59-03:00'))
  const filtered = conditions.filter((c): c is NonNullable<typeof c> => !!c)
  return filtered.length > 0 ? and(...filtered) : undefined
}

export async function getRespuestasRambla(filtros?: RamblaFiltros, page = 1): Promise<RamblaPage> {
  const from = (page - 1) * RAMBLA_PAGE_SIZE
  const where = buildWhere(filtros)

  const [data, countResult] = await Promise.all([
    db
      .select(respuestaSelect)
      .from(vRespuestasRambla)
      .where(where)
      .orderBy(desc(vRespuestasRambla.fechaRespuesta))
      .limit(RAMBLA_PAGE_SIZE)
      .offset(from),
    db.select({ total: sql<number>`count(*)::int` }).from(vRespuestasRambla).where(where),
  ])

  return {
    data: data as RespuestaRambla[],
    total: countResult[0].total,
    page,
    pageSize: RAMBLA_PAGE_SIZE,
  }
}

export async function getRegaloStats(filtros?: RamblaFiltros): Promise<RegaloStats> {
  if (filtros?.tipo === 'envio') {
    // En modo envío solo hay registros con estado=enviado (fecha_envio solo existe para esos)
    const where = buildWhere(filtros, eq(vRespuestasRambla.regaloEstado, 'enviado'))
    const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(vRespuestasRambla).where(where)
    return { pendientes: 0, enviados: total, total }
  }

  // Modo respuesta (default): filtrar por fecha_respuesta
  const wherePendientes = buildWhere(filtros, eq(vRespuestasRambla.regaloEstado, 'pendiente_envio'))
  const whereEnviados = buildWhere(filtros, eq(vRespuestasRambla.regaloEstado, 'enviado'))

  const [[{ total: pendientes }], [{ total: enviados }]] = await Promise.all([
    db.select({ total: sql<number>`count(*)::int` }).from(vRespuestasRambla).where(wherePendientes),
    db.select({ total: sql<number>`count(*)::int` }).from(vRespuestasRambla).where(whereEnviados),
  ])

  return { pendientes, enviados, total: pendientes + enviados }
}

export async function actualizarRegaloEstado(respuestaId: string, estado: RegaloEstado): Promise<void> {
  await db.update(respuestas).set({ regaloEstado: estado }).where(eq(respuestas.id, respuestaId))
}

export async function guardarSeguimiento(respuestaId: string, numeroSeguimiento: string): Promise<void> {
  await db
    .update(respuestas)
    .set({ numeroSeguimiento, fechaSeguimiento: new Date().toISOString() })
    .where(eq(respuestas.id, respuestaId))
}

export async function exportarRespuestasRambla(filtros?: RamblaFiltros): Promise<RespuestaRambla[]> {
  const where = buildWhere(filtros)
  const data = await db
    .select(respuestaSelect)
    .from(vRespuestasRambla)
    .where(where)
    .orderBy(desc(vRespuestasRambla.fechaRespuesta))
  return data as RespuestaRambla[]
}
