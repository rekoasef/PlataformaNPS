import { db } from '@/lib/db/client'
import { campanas, clientes, encuestas, respuestas, tiposEncuesta } from '@/lib/db/schema'
import { and, desc, eq, inArray, ne, sql } from 'drizzle-orm'
import { TECNOLOGIAS, type Tecnologia } from '@/lib/utils/tecnologia'
import { getCalificacionesConfigPorSlug, type CalificacionConfigItem } from '../utils/calificaciones'
import {
  matchesNpsAnswerStatus,
  type NpsAnswerStatus,
  type NpsDimension,
} from '../utils/nps'

export type RespuestaDetalle = {
  encuestaId: string
  fechaEnvioEncuesta: string
  fechaRespuesta: string
  campanaId: string | null
  campanaNombre: string
  campanaFecha: string | null
  tipoEncuestaSlug: string | null
  tipoEncuestaNombre: string | null
  clienteNombre: string
  clienteTelefono: string
  concesionario: string
  ordenFabricacion: string | null
  tecnologia: Tecnologia | null
  nombreApellido: string | null
  calleNumero: string | null
  pisoDepartamento: string | null
  localidad: string | null
  codigoPostal: string | null
  provincia: string | null
  email: string | null
  telefono: string | null
  concesionarioSede: string | null
  maquinaModelo: string | null
  tipoMaquina: 'sembradora' | 'fertilizadora'
  nombreFirmaFactura: string | null
  calificacionEntregaPresentacion: number | null
  calificacionCapacitacion: number | null
  calificacionTecnico: number | null
  calificacionFuncionamientoAnual: number | null
  tuvoProblemasTecnicos: boolean | null
  calificacionResolucionProblemas: number | null
  comentarioProblemas: string | null
  npsProducto: number
  npsEmpresa: number
  npsConcesionario: number
  comentarioProducto: string | null
  comentarioEmpresa: string | null
  comentarioGeneral: string | null
  canalRespuesta: 'mensaje' | 'llamado'
  fechaRespuestaDate: Date
}

export type DashboardFilters = {
  concesionario?: string
  campanaId?: string
  q?: string
  fechaDesde?: string
  fechaHasta?: string
  tipoMaquina?: 'sembradora' | 'fertilizadora'
  tecnologia?: Tecnologia
  estadoNps?: NpsAnswerStatus
  npsDimension?: NpsDimension
  canal?: 'mensaje' | 'llamado'
  tipoEncuestaId?: string
}

export type NpsResumenExtendido = {
  totalRespuestas: number
  npsSembradora: number | null
  totalSembradora: number
  npsFertilizadora: number | null
  totalFertilizadora: number
  npsConcesionario: number | null
  npsEmpresa: number | null
}

export type EfectividadEnvios = {
  enviadas: number
  respondidas: number
  porcentaje: number | null
}

export type ConcesionarioNpsRow = {
  concesionario: string
  totalRespuestas: number
  npsProducto: number | null
  npsEmpresa: number | null
  npsConcesionario: number | null
}

export type NpsDistribucionRow = {
  label: string
  total: number
  promotores: number
  pasivos: number
  detractores: number
  promotoresPct: number
  pasivosPct: number
  detractoresPct: number
}

export type CalificacionResumen = {
  key: string
  label: string
  labelCorto: string
  promedio: number | null
  total: number
  distribucion: Array<{ score: number; count: number }>
}

export type ComparativoPorCanal = {
  canal: 'mensaje' | 'llamado'
  total: number
  porcentaje: number | null
  npsProducto: number | null
  npsEmpresa: number | null
  npsConcesionario: number | null
}

function calcularNps(values: number[]) {
  if (values.length === 0) return null

  const promotores = values.filter((value) => value >= 9).length
  const detractores = values.filter((value) => value <= 6).length

  return Math.round(((promotores / values.length) * 100 - (detractores / values.length) * 100) * 10) / 10
}

function getNpsValues(respuesta: RespuestaDetalle, dimension?: NpsDimension) {
  if (dimension === 'concesionario') return [respuesta.npsConcesionario]
  if (dimension === 'producto') return [respuesta.npsProducto]
  if (dimension === 'empresa') return [respuesta.npsEmpresa]

  return [respuesta.npsConcesionario, respuesta.npsProducto, respuesta.npsEmpresa]
}

export async function getRespuestas(filters: DashboardFilters = {}): Promise<RespuestaDetalle[]> {
  // Si se filtra por tipo de encuesta, pre-filtramos los campana_ids
  let campanaIdsFiltro: string[] | null = null
  if (filters.tipoEncuestaId) {
    const campanasFiltradas = await db.select({ id: campanas.id }).from(campanas).where(eq(campanas.tipoEncuestaId, filters.tipoEncuestaId))
    campanaIdsFiltro = campanasFiltradas.map((c) => c.id)
    if (campanaIdsFiltro.length === 0) return []
  }

  const conditions = [eq(encuestas.estado, 'respondida')]
  if (filters.campanaId) conditions.push(eq(encuestas.campanaId, filters.campanaId))
  if (campanaIdsFiltro !== null) conditions.push(inArray(encuestas.campanaId, campanaIdsFiltro))
  if (filters.concesionario) conditions.push(eq(clientes.concesionario, filters.concesionario))
  if (filters.tecnologia) conditions.push(eq(clientes.tecnologia, filters.tecnologia))

  const rows = await db
    .select({
      encuestaId: encuestas.id,
      fechaEnvioEncuesta: encuestas.createdAt,
      campanaId: campanas.id,
      campanaNombre: campanas.nombre,
      campanaFecha: campanas.fecha,
      tipoEncuestaSlug: tiposEncuesta.slug,
      tipoEncuestaNombre: tiposEncuesta.nombre,
      clienteNombre: clientes.nombre,
      clienteTelefono: clientes.telefono,
      concesionario: clientes.concesionario,
      ordenFabricacion: clientes.ordenFabricacion,
      tecnologia: clientes.tecnologia,
      fechaRespuesta: respuestas.fechaRespuesta,
      nombreApellido: respuestas.nombreApellido,
      calleNumero: respuestas.calleNumero,
      pisoDepartamento: respuestas.pisoDepartamento,
      localidad: respuestas.localidad,
      codigoPostal: respuestas.codigoPostal,
      provincia: respuestas.provincia,
      email: respuestas.email,
      telefono: respuestas.telefono,
      concesionarioSede: respuestas.concesionarioSede,
      maquinaModelo: respuestas.maquinaModelo,
      tipoMaquina: respuestas.tipoMaquina,
      nombreFirmaFactura: respuestas.nombreFirmaFactura,
      calificacionEntregaPresentacion: respuestas.calificacionEntregaPresentacion,
      calificacionCapacitacion: respuestas.calificacionCapacitacion,
      calificacionTecnico: respuestas.calificacionTecnico,
      calificacionFuncionamientoAnual: respuestas.calificacionFuncionamientoAnual,
      tuvoProblemasTecnicos: respuestas.tuvoProblemasTecnicos,
      calificacionResolucionProblemas: respuestas.calificacionResolucionProblemas,
      comentarioProblemas: respuestas.comentarioProblemas,
      npsProducto: respuestas.npsProducto,
      npsEmpresa: respuestas.npsEmpresa,
      npsConcesionario: respuestas.npsConcesionario,
      comentarioProducto: respuestas.comentarioProducto,
      comentarioEmpresa: respuestas.comentarioEmpresa,
      comentarioGeneral: respuestas.comentarioGeneral,
      canalRespuesta: respuestas.canalRespuesta,
    })
    .from(encuestas)
    .innerJoin(campanas, eq(encuestas.campanaId, campanas.id))
    .leftJoin(tiposEncuesta, eq(campanas.tipoEncuestaId, tiposEncuesta.id))
    .innerJoin(clientes, eq(encuestas.clienteId, clientes.id))
    // left join: 'respondida' implica que existe una respuesta (por el trigger
    // que actualiza el estado), pero se deja como left join defensivo — igual
    // que hacía el embed de Supabase — y se filtran los que no la tengan.
    .leftJoin(respuestas, eq(respuestas.encuestaId, encuestas.id))
    .where(and(...conditions))
    .orderBy(desc(encuestas.createdAt))

  let resultado: RespuestaDetalle[] = rows
    .filter((row) => row.fechaRespuesta !== null)
    .map((row) => ({
      encuestaId: row.encuestaId,
      fechaEnvioEncuesta: row.fechaEnvioEncuesta,
      fechaRespuesta: row.fechaRespuesta!,
      campanaId: row.campanaId,
      campanaNombre: row.campanaNombre ?? 'Campaña sin nombre',
      campanaFecha: row.campanaFecha,
      tipoEncuestaSlug: row.tipoEncuestaSlug,
      tipoEncuestaNombre: row.tipoEncuestaNombre,
      clienteNombre: row.clienteNombre,
      clienteTelefono: row.clienteTelefono,
      concesionario: row.concesionario,
      ordenFabricacion: row.ordenFabricacion,
      tecnologia: row.tecnologia as Tecnologia | null,
      nombreApellido: row.nombreApellido,
      calleNumero: row.calleNumero,
      pisoDepartamento: row.pisoDepartamento,
      localidad: row.localidad,
      codigoPostal: row.codigoPostal,
      provincia: row.provincia,
      email: row.email,
      telefono: row.telefono,
      concesionarioSede: row.concesionarioSede,
      maquinaModelo: row.maquinaModelo,
      tipoMaquina: row.tipoMaquina!,
      nombreFirmaFactura: row.nombreFirmaFactura,
      calificacionEntregaPresentacion: row.calificacionEntregaPresentacion,
      calificacionCapacitacion: row.calificacionCapacitacion,
      calificacionTecnico: row.calificacionTecnico,
      calificacionFuncionamientoAnual: row.calificacionFuncionamientoAnual,
      tuvoProblemasTecnicos: row.tuvoProblemasTecnicos,
      calificacionResolucionProblemas: row.calificacionResolucionProblemas,
      comentarioProblemas: row.comentarioProblemas,
      npsProducto: row.npsProducto!,
      npsEmpresa: row.npsEmpresa!,
      npsConcesionario: row.npsConcesionario!,
      comentarioProducto: row.comentarioProducto,
      comentarioEmpresa: row.comentarioEmpresa,
      comentarioGeneral: row.comentarioGeneral,
      canalRespuesta: row.canalRespuesta as 'mensaje' | 'llamado',
      fechaRespuestaDate: new Date(row.fechaRespuesta!),
    }))

  if (filters.q) {
    const needle = filters.q.toLowerCase()
    resultado = resultado.filter((item) =>
      [
        item.clienteNombre,
        item.nombreApellido ?? '',
        item.email ?? '',
        item.concesionario,
        item.campanaNombre,
        item.maquinaModelo ?? '',
        item.ordenFabricacion ?? '',
        item.tecnologia ?? '',
      ].some((field) => field.toLowerCase().includes(needle))
    )
  }

  if (filters.concesionario) {
    resultado = resultado.filter((item) => item.concesionario === filters.concesionario)
  }

  if (filters.tecnologia) {
    resultado = resultado.filter((item) => item.tecnologia === filters.tecnologia)
  }

  if (filters.fechaDesde) {
    const from = new Date(`${filters.fechaDesde}T00:00:00`)
    resultado = resultado.filter((item) => item.fechaRespuestaDate >= from)
  }

  if (filters.fechaHasta) {
    const to = new Date(`${filters.fechaHasta}T23:59:59.999`)
    resultado = resultado.filter((item) => item.fechaRespuestaDate <= to)
  }

  if (filters.tipoMaquina) {
    resultado = resultado.filter((item) => item.tipoMaquina === filters.tipoMaquina)
  }

  if (filters.estadoNps) {
    const estadoNps = filters.estadoNps
    resultado = resultado.filter((item) =>
      getNpsValues(item, filters.npsDimension).some((value) => matchesNpsAnswerStatus(value, estadoNps))
    )
  }

  if (filters.canal) {
    resultado = resultado.filter((item) => item.canalRespuesta === filters.canal)
  }

  return resultado
}

export async function getDashboardFilterOptions() {
  const [respuestasData, tiposEncuestaRows] = await Promise.all([
    getRespuestas(),
    db
      .select({ id: tiposEncuesta.id, nombre: tiposEncuesta.nombre, slug: tiposEncuesta.slug })
      .from(tiposEncuesta)
      .where(eq(tiposEncuesta.activo, true))
      .orderBy(tiposEncuesta.createdAt),
  ])

  const concesionarios = Array.from(new Set(respuestasData.map((item) => item.concesionario))).sort()
  const campanasOptions = Array.from(
    new Map(
      respuestasData.map((item) => [
        item.campanaId ?? item.campanaNombre,
        { id: item.campanaId, nombre: item.campanaNombre },
      ])
    ).values()
  ).sort((a, b) => a.nombre.localeCompare(b.nombre))

  return { concesionarios, campanas: campanasOptions, tecnologias: TECNOLOGIAS, tiposEncuesta: tiposEncuestaRows }
}

export async function getNpsPorConcesionario(filters: DashboardFilters = {}): Promise<ConcesionarioNpsRow[]> {
  const respuestasData = await getRespuestas(filters)
  const grouped = new Map<string, RespuestaDetalle[]>()

  for (const respuesta of respuestasData) {
    const current = grouped.get(respuesta.concesionario) ?? []
    current.push(respuesta)
    grouped.set(respuesta.concesionario, current)
  }

  return Array.from(grouped.entries())
    .map(([concesionario, items]) => ({
      concesionario,
      totalRespuestas: items.length,
      npsProducto: calcularNps(items.map((item) => item.npsProducto)),
      npsEmpresa: calcularNps(items.map((item) => item.npsEmpresa)),
      npsConcesionario: calcularNps(items.map((item) => item.npsConcesionario)),
    }))
    .sort((a, b) => {
      const scoreA = a.npsConcesionario ?? -101
      const scoreB = b.npsConcesionario ?? -101
      if (scoreA !== scoreB) return scoreB - scoreA
      return b.totalRespuestas - a.totalRespuestas
    })
}

export type ConcesionarioNpsPorTipo = {
  tipo: TipoEncuestaRef
  rows: ConcesionarioNpsRow[]
}

export async function getNpsPorConcesionarioPorTipoEncuesta(
  filters: DashboardFilters = {}
): Promise<ConcesionarioNpsPorTipo[]> {
  const tipos = await getTiposEncuestaActivos(filters.tipoEncuestaId)

  return Promise.all(
    tipos.map(async (tipo) => ({
      tipo,
      rows: await getNpsPorConcesionario({ ...filters, tipoEncuestaId: tipo.id }),
    }))
  )
}

function calcularDistribucion(label: string, values: number[]): NpsDistribucionRow {
  const total = values.length
  const promotores = values.filter((value) => value >= 9).length
  const pasivos = values.filter((value) => value >= 7 && value <= 8).length
  const detractores = values.filter((value) => value <= 6).length

  const pct = (value: number) => (total === 0 ? 0 : Math.round((value / total) * 1000) / 10)

  return {
    label,
    total,
    promotores,
    pasivos,
    detractores,
    promotoresPct: pct(promotores),
    pasivosPct: pct(pasivos),
    detractoresPct: pct(detractores),
  }
}

export async function getNpsDistribucion(filters: DashboardFilters = {}): Promise<NpsDistribucionRow[]> {
  const respuestasData = await getRespuestas(filters)

  const sembradoras = respuestasData.filter((item) => item.tipoMaquina === 'sembradora')
  const fertilizadoras = respuestasData.filter((item) => item.tipoMaquina === 'fertilizadora')

  return [
    calcularDistribucion('Producto · Sembradora', sembradoras.map((item) => item.npsProducto)),
    calcularDistribucion('Producto · Fertilizadora', fertilizadoras.map((item) => item.npsProducto)),
    calcularDistribucion('Concesionario', respuestasData.map((item) => item.npsConcesionario)),
    calcularDistribucion('Empresa', respuestasData.map((item) => item.npsEmpresa)),
  ]
}

export type NpsDistribucionPorTipo = {
  tipo: TipoEncuestaRef
  distribucion: NpsDistribucionRow[]
}

export async function getNpsDistribucionPorTipoEncuesta(
  filters: DashboardFilters = {}
): Promise<NpsDistribucionPorTipo[]> {
  const tipos = await getTiposEncuestaActivos(filters.tipoEncuestaId)

  return Promise.all(
    tipos.map(async (tipo) => ({
      tipo,
      distribucion: await getNpsDistribucion({ ...filters, tipoEncuestaId: tipo.id }),
    }))
  )
}

export async function getNpsResumenExtendido(filters: DashboardFilters = {}): Promise<NpsResumenExtendido> {
  const respuestasData = await getRespuestas(filters)

  const sembradoras = respuestasData.filter((item) => item.tipoMaquina === 'sembradora')
  const fertilizadoras = respuestasData.filter((item) => item.tipoMaquina === 'fertilizadora')

  return {
    totalRespuestas: respuestasData.length,
    npsSembradora: calcularNps(sembradoras.map((item) => item.npsProducto)),
    totalSembradora: sembradoras.length,
    npsFertilizadora: calcularNps(fertilizadoras.map((item) => item.npsProducto)),
    totalFertilizadora: fertilizadoras.length,
    npsConcesionario: calcularNps(respuestasData.map((item) => item.npsConcesionario)),
    npsEmpresa: calcularNps(respuestasData.map((item) => item.npsEmpresa)),
  }
}

export async function getEfectividadEnvios(filters: DashboardFilters = {}): Promise<EfectividadEnvios> {
  let campanaIdsFiltro: string[] | null = null
  if (filters.tipoEncuestaId) {
    const campanasFiltradas = await db.select({ id: campanas.id }).from(campanas).where(eq(campanas.tipoEncuestaId, filters.tipoEncuestaId))
    campanaIdsFiltro = campanasFiltradas.map((c) => c.id)
    if (campanaIdsFiltro.length === 0) return { enviadas: 0, respondidas: 0, porcentaje: null }
  }

  const baseConditions = []
  if (campanaIdsFiltro !== null) baseConditions.push(inArray(encuestas.campanaId, campanaIdsFiltro))
  if (filters.campanaId) baseConditions.push(eq(encuestas.campanaId, filters.campanaId))
  if (filters.concesionario) baseConditions.push(eq(clientes.concesionario, filters.concesionario))
  if (filters.tecnologia) baseConditions.push(eq(clientes.tecnologia, filters.tecnologia))

  const [[{ enviadas }], [{ respondidas }]] = await Promise.all([
    db
      .select({ enviadas: sql<number>`count(*)::int` })
      .from(encuestas)
      .innerJoin(clientes, eq(encuestas.clienteId, clientes.id))
      .where(and(ne(encuestas.estado, 'pendiente'), ...baseConditions)),
    db
      .select({ respondidas: sql<number>`count(*)::int` })
      .from(encuestas)
      .innerJoin(clientes, eq(encuestas.clienteId, clientes.id))
      .where(and(eq(encuestas.estado, 'respondida'), ...baseConditions)),
  ])

  return {
    enviadas,
    respondidas,
    porcentaje: enviadas === 0 ? null : Math.round((respondidas / enviadas) * 1000) / 10,
  }
}

function calcularCalificaciones(
  respuestasData: RespuestaDetalle[],
  config: CalificacionConfigItem[]
): CalificacionResumen[] {
  return config.map(({ key, label, labelCorto }) => {
    const values = respuestasData
      .map((r) => r[key] as number | null)
      .filter((v): v is number => v !== null)

    const total = values.length
    const promedio = total > 0 ? Math.round((values.reduce((acc, v) => acc + v, 0) / total) * 10) / 10 : null

    const countMap = new Map<number, number>()
    for (let s = 1; s <= 10; s++) countMap.set(s, 0)
    for (const v of values) countMap.set(v, (countMap.get(v) ?? 0) + 1)

    const distribucion = Array.from(countMap.entries())
      .map(([score, count]) => ({ score, count }))
      .sort((a, b) => a.score - b.score)

    return { key, label, labelCorto, promedio, total, distribucion }
  })
}

export type TipoEncuestaRef = { id: string; nombre: string; slug: string }

async function getTiposEncuestaActivos(tipoEncuestaId?: string): Promise<TipoEncuestaRef[]> {
  const conditions = [eq(tiposEncuesta.activo, true)]
  if (tipoEncuestaId) conditions.push(eq(tiposEncuesta.id, tipoEncuestaId))

  return db
    .select({ id: tiposEncuesta.id, nombre: tiposEncuesta.nombre, slug: tiposEncuesta.slug })
    .from(tiposEncuesta)
    .where(and(...conditions))
    .orderBy(tiposEncuesta.createdAt)
}

export type CalificacionesPorTipo = {
  tipo: TipoEncuestaRef
  calificaciones: CalificacionResumen[]
}

export async function getCalificacionesPorTipoEncuesta(
  filters: DashboardFilters = {}
): Promise<CalificacionesPorTipo[]> {
  const tipos = await getTiposEncuestaActivos(filters.tipoEncuestaId)

  return Promise.all(
    tipos.map(async (tipo) => {
      const respuestasData = await getRespuestas({ ...filters, tipoEncuestaId: tipo.id })
      const config = getCalificacionesConfigPorSlug(tipo.slug)
      return { tipo, calificaciones: calcularCalificaciones(respuestasData, config) }
    })
  )
}

export type NpsPorTipo = {
  tipo: { id: string; nombre: string; slug: string }
  resumen: NpsResumenExtendido
  efectividad: EfectividadEnvios
}

export async function getNpsPorTipoEncuesta(
  baseFiltros: Omit<DashboardFilters, 'tipoEncuestaId'> = {}
): Promise<NpsPorTipo[]> {
  const tipos = await getTiposEncuestaActivos()
  if (tipos.length === 0) return []

  return Promise.all(
    tipos.map(async (tipo) => {
      const filtros: DashboardFilters = { ...baseFiltros, tipoEncuestaId: tipo.id }
      const [resumen, efectividad] = await Promise.all([
        getNpsResumenExtendido(filtros),
        getEfectividadEnvios(filtros),
      ])
      return { tipo, resumen, efectividad }
    })
  )
}

export async function getComparativoPorCanal(filters: DashboardFilters = {}): Promise<ComparativoPorCanal[]> {
  const respuestasData = await getRespuestas(filters)
  const total = respuestasData.length

  const canales: Array<'mensaje' | 'llamado'> = ['mensaje', 'llamado']

  return canales.map((canal) => {
    const grupo = respuestasData.filter((item) => item.canalRespuesta === canal)
    return {
      canal,
      total: grupo.length,
      porcentaje: total === 0 ? null : Math.round((grupo.length / total) * 1000) / 10,
      npsProducto: calcularNps(grupo.map((item) => item.npsProducto)),
      npsEmpresa: calcularNps(grupo.map((item) => item.npsEmpresa)),
      npsConcesionario: calcularNps(grupo.map((item) => item.npsConcesionario)),
    }
  })
}
