import { db } from '@/lib/db/client'
import { campanas, clientes, encuestaMedidas, encuestas, envios, tiposEncuesta } from '@/lib/db/schema'
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm'
import type {
  ClientePendienteRecordatorio,
  EncuestaMedida,
  EncuestaNecesidadLlamado,
  EncuestaSinRespuesta,
  PuedeCrearRecordatorioResult,
  RecordatorioResumen,
} from '../types/recordatorio.types'
import { syncWorkflowEstados } from './workflow.service'

function mapMedida(m: { id: string; comentario: string; createdAt: string; createdBy: string | null; updatedAt: string }): EncuestaMedida {
  return { id: m.id, comentario: m.comentario, createdAt: m.createdAt, createdBy: m.createdBy, updatedAt: m.updatedAt }
}

async function getMedidasByEncuestaIds(encuestaIds: string[]): Promise<Map<string, EncuestaMedida[]>> {
  const map = new Map<string, EncuestaMedida[]>()
  if (encuestaIds.length === 0) return map

  const rows = await db
    .select({
      encuestaId: encuestaMedidas.encuestaId,
      id: encuestaMedidas.id,
      comentario: encuestaMedidas.comentario,
      createdAt: encuestaMedidas.createdAt,
      createdBy: encuestaMedidas.createdBy,
      updatedAt: encuestaMedidas.updatedAt,
    })
    .from(encuestaMedidas)
    .where(inArray(encuestaMedidas.encuestaId, encuestaIds))
    .orderBy(asc(encuestaMedidas.createdAt))

  for (const row of rows) {
    const list = map.get(row.encuestaId) ?? []
    list.push(mapMedida(row))
    map.set(row.encuestaId, list)
  }
  return map
}

export async function getRecordatoriosByCampana(campanaId: string): Promise<RecordatorioResumen[]> {
  await syncWorkflowEstados()

  const data = await db
    .select({
      numero_recordatorio: envios.numeroRecordatorio,
      estado_envio: envios.estadoEnvio,
      fecha_envio: envios.fechaEnvio,
    })
    .from(envios)
    .where(eq(envios.campanaId, campanaId))
    .orderBy(asc(envios.numeroRecordatorio))

  const resumenMap = new Map<number, RecordatorioResumen>()

  for (const envio of data) {
    const actual = resumenMap.get(envio.numero_recordatorio)

    if (!actual) {
      resumenMap.set(envio.numero_recordatorio, {
        numero_recordatorio: envio.numero_recordatorio,
        estado_envio: envio.estado_envio,
        fecha_envio: envio.fecha_envio,
        total_clientes: 1,
      })
      continue
    }

    actual.total_clientes += 1

    if (envio.estado_envio === 'pendiente_envio') {
      actual.estado_envio = 'pendiente_envio'
      actual.fecha_envio = null
    } else if (!actual.fecha_envio && envio.fecha_envio) {
      actual.fecha_envio = envio.fecha_envio
    }
  }

  return Array.from(resumenMap.values()).sort((a, b) => a.numero_recordatorio - b.numero_recordatorio)
}

export async function getClientesPendientes(campanaId: string): Promise<ClientePendienteRecordatorio[]> {
  await syncWorkflowEstados()

  return db
    .select({
      id: encuestas.id,
      token: encuestas.token,
      estado: encuestas.estado,
      clientes: {
        id: clientes.id,
        nombre: clientes.nombre,
        telefono: clientes.telefono,
        telefono_2: clientes.telefono2,
        telefono_3: clientes.telefono3,
        concesionario: clientes.concesionario,
        orden_fabricacion: clientes.ordenFabricacion,
      },
    })
    .from(encuestas)
    .innerJoin(clientes, eq(encuestas.clienteId, clientes.id))
    .where(and(eq(encuestas.campanaId, campanaId), eq(encuestas.estado, 'pendiente')))
    .orderBy(asc(encuestas.createdAt))
}

export async function getRecordatorioActivo(campanaId: string) {
  const recordatorios = await getRecordatoriosByCampana(campanaId)
  return [...recordatorios].reverse().find(
    (item) => item.numero_recordatorio > 0 && item.estado_envio === 'pendiente_envio'
  )
}

export async function puedeCrearRecordatorio(campanaId: string): Promise<PuedeCrearRecordatorioResult> {
  const recordatorios = await getRecordatoriosByCampana(campanaId)
  const recordatoriosReales = recordatorios.filter((item) => item.numero_recordatorio > 0)
  const ultimoRecordatorioReal = recordatoriosReales.at(-1)

  if (recordatoriosReales.length >= 3) {
    return { allowed: false, nextNumero: null, reason: 'Máximo de 3 recordatorios alcanzado.' }
  }

  if (recordatorios.length === 0) {
    return { allowed: false, nextNumero: null, reason: 'La campaña no tiene envío inicial.' }
  }

  if (ultimoRecordatorioReal && ultimoRecordatorioReal.estado_envio !== 'enviado') {
    return {
      allowed: false,
      nextNumero: null,
      reason: `El ${getNombreRecordatorio(ultimoRecordatorioReal.numero_recordatorio)} anterior todavía no fue marcado como enviado.`,
    }
  }

  const pendientes = await getClientesPendientes(campanaId)
  if (pendientes.length === 0) {
    return { allowed: false, nextNumero: null, reason: 'No hay clientes pendientes para recordar.' }
  }

  return {
    allowed: true,
    nextNumero: recordatoriosReales.length + 1,
  }
}

export async function crearRecordatorio(campanaId: string, numeroRecordatorio: number) {
  const pendientes = await getClientesPendientes(campanaId)

  if (pendientes.length === 0) {
    throw new Error('No hay clientes pendientes para crear un recordatorio.')
  }

  const payload = pendientes
    .filter((encuesta) => encuesta.clientes?.id)
    .map((encuesta) => ({
      campanaId,
      clienteId: encuesta.clientes!.id,
      numeroRecordatorio,
    }))

  await db.insert(envios).values(payload)

  return { total: payload.length }
}

export async function marcarRecordatorioEnviado(campanaId: string, numeroRecordatorio: number) {
  const timestamp = new Date().toISOString()

  await db.transaction(async (tx) => {
    const enviosDelRecordatorio = await tx
      .select({ clienteId: envios.clienteId })
      .from(envios)
      .where(and(eq(envios.campanaId, campanaId), eq(envios.numeroRecordatorio, numeroRecordatorio)))

    await tx
      .update(envios)
      .set({ estadoEnvio: 'enviado', fechaEnvio: timestamp })
      .where(and(eq(envios.campanaId, campanaId), eq(envios.numeroRecordatorio, numeroRecordatorio)))

    const clienteIds = Array.from(new Set(enviosDelRecordatorio.map((e) => e.clienteId)))
    if (clienteIds.length === 0) return

    await tx
      .update(encuestas)
      .set({ estado: 'recordatorio_enviado' })
      .where(and(eq(encuestas.campanaId, campanaId), inArray(encuestas.clienteId, clienteIds), eq(encuestas.estado, 'pendiente')))
  })
}

export const LLAMADOS_PAGE_SIZE = 25

export async function getEncuestasNecesidadLlamado(
  page = 1,
  tipoEncuestaId?: string
): Promise<{ data: EncuestaNecesidadLlamado[]; total: number }> {
  await syncWorkflowEstados()
  const from = (page - 1) * LLAMADOS_PAGE_SIZE

  const whereClause = tipoEncuestaId
    ? and(eq(encuestas.estado, 'necesidad_de_llamado'), eq(campanas.tipoEncuestaId, tipoEncuestaId))
    : eq(encuestas.estado, 'necesidad_de_llamado')

  const [rows, totalResult] = await Promise.all([
    db
      .select({
        id: encuestas.id,
        token: encuestas.token,
        campanaId: campanas.id,
        campanaNombre: campanas.nombre,
        campanaFecha: campanas.fecha,
        tipoNombre: tiposEncuesta.nombre,
        tipoSlug: tiposEncuesta.slug,
        clienteId: clientes.id,
        clienteNombre: clientes.nombre,
        clienteTelefono: clientes.telefono,
        clienteTelefono2: clientes.telefono2,
        clienteTelefono3: clientes.telefono3,
        clienteConcesionario: clientes.concesionario,
        clienteOrdenFabricacion: clientes.ordenFabricacion,
        clienteTipoMaquina: clientes.tipoMaquina,
      })
      .from(encuestas)
      .innerJoin(campanas, eq(encuestas.campanaId, campanas.id))
      .leftJoin(tiposEncuesta, eq(campanas.tipoEncuestaId, tiposEncuesta.id))
      .innerJoin(clientes, eq(encuestas.clienteId, clientes.id))
      .where(whereClause)
      .orderBy(asc(encuestas.createdAt))
      .limit(LLAMADOS_PAGE_SIZE)
      .offset(from),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(encuestas)
      .innerJoin(campanas, eq(encuestas.campanaId, campanas.id))
      .where(whereClause),
  ])

  const medidasByEncuesta = await getMedidasByEncuestaIds(rows.map((r) => r.id))

  return {
    data: rows.map((r) => ({
      id: r.id,
      token: r.token,
      estado: 'necesidad_de_llamado' as const,
      campana: {
        id: r.campanaId,
        nombre: r.campanaNombre,
        fecha: r.campanaFecha,
        tipoNombre: r.tipoNombre,
        tipoSlug: r.tipoSlug,
      },
      cliente: {
        id: r.clienteId,
        nombre: r.clienteNombre,
        telefono: r.clienteTelefono,
        telefono_2: r.clienteTelefono2,
        telefono_3: r.clienteTelefono3,
        concesionario: r.clienteConcesionario,
        orden_fabricacion: r.clienteOrdenFabricacion,
        tipo_maquina: r.clienteTipoMaquina,
      },
      medidas: medidasByEncuesta.get(r.id) ?? [],
    })),
    total: totalResult[0].total,
  }
}

export async function getEncuestasSinRespuesta(): Promise<EncuestaSinRespuesta[]> {
  const rows = await db
    .select({
      id: encuestas.id,
      token: encuestas.token,
      comentario: encuestas.comentarioSinRespuesta,
      marcadoAt: encuestas.marcadoSinRespuestaAt,
      campanaId: campanas.id,
      campanaNombre: campanas.nombre,
      campanaFecha: campanas.fecha,
      clienteId: clientes.id,
      clienteNombre: clientes.nombre,
      clienteTelefono: clientes.telefono,
      clienteTelefono2: clientes.telefono2,
      clienteTelefono3: clientes.telefono3,
      clienteConcesionario: clientes.concesionario,
      clienteOrdenFabricacion: clientes.ordenFabricacion,
    })
    .from(encuestas)
    .innerJoin(campanas, eq(encuestas.campanaId, campanas.id))
    .innerJoin(clientes, eq(encuestas.clienteId, clientes.id))
    .where(eq(encuestas.estado, 'sin_respuesta'))
    .orderBy(desc(encuestas.marcadoSinRespuestaAt))

  const medidasByEncuesta = await getMedidasByEncuestaIds(rows.map((r) => r.id))

  return rows.map((r) => ({
    id: r.id,
    token: r.token,
    estado: 'sin_respuesta' as const,
    comentario: r.comentario,
    marcadoAt: r.marcadoAt,
    campana: { id: r.campanaId, nombre: r.campanaNombre, fecha: r.campanaFecha },
    cliente: {
      id: r.clienteId,
      nombre: r.clienteNombre,
      telefono: r.clienteTelefono,
      telefono_2: r.clienteTelefono2,
      telefono_3: r.clienteTelefono3,
      concesionario: r.clienteConcesionario,
      orden_fabricacion: r.clienteOrdenFabricacion,
    },
    medidas: medidasByEncuesta.get(r.id) ?? [],
  }))
}

export async function agregarMedidaLlamado(encuestaId: string, comentario: string, creadoPor: string | null) {
  await db.insert(encuestaMedidas).values({ encuestaId, comentario, createdBy: creadoPor })
}

export async function actualizarMedidaLlamado(medidaId: string, comentario: string) {
  await db.update(encuestaMedidas).set({ comentario }).where(eq(encuestaMedidas.id, medidaId))
}

export async function eliminarMedidaLlamado(medidaId: string) {
  await db.delete(encuestaMedidas).where(eq(encuestaMedidas.id, medidaId))
}

export async function marcarEncuestaSinRespuesta(encuestaId: string, comentario: string, marcadoPor: string | null) {
  await db
    .update(encuestas)
    .set({
      estado: 'sin_respuesta',
      comentarioSinRespuesta: comentario,
      marcadoSinRespuestaAt: new Date().toISOString(),
      marcadoSinRespuestaPor: marcadoPor,
    })
    .where(and(eq(encuestas.id, encuestaId), eq(encuestas.estado, 'necesidad_de_llamado')))
}

export async function revertirEncuestaANecesidadLlamado(encuestaId: string, comentario: string, revertidoPor: string | null) {
  await db.transaction(async (tx) => {
    const actualizadas = await tx
      .update(encuestas)
      .set({
        estado: 'necesidad_de_llamado',
        comentarioSinRespuesta: null,
        marcadoSinRespuestaAt: null,
        marcadoSinRespuestaPor: null,
      })
      .where(and(eq(encuestas.id, encuestaId), eq(encuestas.estado, 'sin_respuesta')))
      .returning({ id: encuestas.id })

    if (actualizadas.length === 0) {
      throw new Error('La OF ya no está marcada como sin respuesta.')
    }

    await tx.insert(encuestaMedidas).values({ encuestaId, comentario, createdBy: revertidoPor })
  })
}

function getNombreRecordatorio(numeroRecordatorio: number) {
  return numeroRecordatorio === 0 ? 'envío inicial' : `recordatorio ${numeroRecordatorio}`
}
