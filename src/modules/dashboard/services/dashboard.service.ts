import { createSupabaseServer } from '@/lib/supabase/server'
import { TECNOLOGIAS, type Tecnologia } from '@/lib/utils/tecnologia'
import { getCalificacionesConfigPorSlug, type CalificacionConfigItem } from '../utils/calificaciones'
import {
  matchesNpsAnswerStatus,
  type NpsAnswerStatus,
  type NpsDimension,
} from '../utils/nps'

type RawEncuestaConRespuesta = {
  id: string
  created_at: string
  campanas:
    | {
        id: string
        nombre: string
        fecha: string
        tipos_encuesta: { nombre: string; slug: string }[] | { nombre: string; slug: string } | null
      }[]
    | {
        id: string
        nombre: string
        fecha: string
        tipos_encuesta: { nombre: string; slug: string }[] | { nombre: string; slug: string } | null
      }
    | null
  clientes:
    | {
        id: string
        nombre: string
        telefono: string
        concesionario: string
        orden_fabricacion: string | null
        tecnologia: Tecnologia | null
      }[]
    | {
        id: string
        nombre: string
        telefono: string
        concesionario: string
        orden_fabricacion: string | null
        tecnologia: Tecnologia | null
      }
    | null
  respuestas:
    | {
        fecha_respuesta: string
        nombre_apellido: string | null
        calle_numero: string | null
        piso_departamento: string | null
        localidad: string | null
        codigo_postal: string | null
        provincia: string | null
        email: string | null
        telefono: string | null
        concesionario_sede: string | null
        maquina_modelo: string | null
        tipo_maquina: 'sembradora' | 'fertilizadora'
        nombre_firma_factura: string | null
        calificacion_entrega_presentacion: number | null
        calificacion_capacitacion: number | null
        calificacion_tecnico: number | null
        calificacion_funcionamiento_anual: number | null
        tuvo_problemas_tecnicos: boolean | null
        calificacion_resolucion_problemas: number | null
        comentario_problemas: string | null
        nps_producto: number
        nps_empresa: number
        nps_concesionario: number
        comentario_producto: string | null
        comentario_empresa: string | null
        comentario_general: string | null
        canal_respuesta: 'mensaje' | 'llamado'
      }[]
    | {
        fecha_respuesta: string
        nombre_apellido: string | null
        calle_numero: string | null
        piso_departamento: string | null
        localidad: string | null
        codigo_postal: string | null
        provincia: string | null
        email: string | null
        telefono: string | null
        concesionario_sede: string | null
        maquina_modelo: string | null
        tipo_maquina: 'sembradora' | 'fertilizadora'
        nombre_firma_factura: string | null
        calificacion_entrega_presentacion: number | null
        calificacion_capacitacion: number | null
        calificacion_tecnico: number | null
        calificacion_funcionamiento_anual: number | null
        tuvo_problemas_tecnicos: boolean | null
        calificacion_resolucion_problemas: number | null
        comentario_problemas: string | null
        nps_producto: number
        nps_empresa: number
        nps_concesionario: number
        comentario_producto: string | null
        comentario_empresa: string | null
        comentario_general: string | null
        canal_respuesta: 'mensaje' | 'llamado'
      }
    | null
}

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

function pickOne<T>(value: T | T[] | null): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
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

function mapRespuesta(row: RawEncuestaConRespuesta): RespuestaDetalle | null {
  const campana = pickOne(row.campanas)
  const tipoEncuesta = campana ? pickOne(campana.tipos_encuesta) : null
  const cliente = pickOne(row.clientes)
  const respuesta = pickOne(row.respuestas)

  if (!cliente || !respuesta) return null

  return {
    encuestaId: row.id,
    fechaEnvioEncuesta: row.created_at,
    fechaRespuesta: respuesta.fecha_respuesta,
    campanaId: campana?.id ?? null,
    campanaNombre: campana?.nombre ?? 'Campaña sin nombre',
    campanaFecha: campana?.fecha ?? null,
    tipoEncuestaSlug: tipoEncuesta?.slug ?? null,
    tipoEncuestaNombre: tipoEncuesta?.nombre ?? null,
    clienteNombre: cliente.nombre,
    clienteTelefono: cliente.telefono,
    concesionario: cliente.concesionario,
    ordenFabricacion: cliente.orden_fabricacion,
    tecnologia: cliente.tecnologia,
    nombreApellido: respuesta.nombre_apellido,
    calleNumero: respuesta.calle_numero,
    pisoDepartamento: respuesta.piso_departamento,
    localidad: respuesta.localidad,
    codigoPostal: respuesta.codigo_postal,
    provincia: respuesta.provincia,
    email: respuesta.email,
    telefono: respuesta.telefono,
    concesionarioSede: respuesta.concesionario_sede,
    maquinaModelo: respuesta.maquina_modelo,
    tipoMaquina: respuesta.tipo_maquina,
    nombreFirmaFactura: respuesta.nombre_firma_factura,
    calificacionEntregaPresentacion: respuesta.calificacion_entrega_presentacion,
    calificacionCapacitacion: respuesta.calificacion_capacitacion,
    calificacionTecnico: respuesta.calificacion_tecnico,
    calificacionFuncionamientoAnual: respuesta.calificacion_funcionamiento_anual,
    tuvoProblemasTecnicos: respuesta.tuvo_problemas_tecnicos,
    calificacionResolucionProblemas: respuesta.calificacion_resolucion_problemas,
    comentarioProblemas: respuesta.comentario_problemas,
    npsProducto: respuesta.nps_producto,
    npsEmpresa: respuesta.nps_empresa,
    npsConcesionario: respuesta.nps_concesionario,
    comentarioProducto: respuesta.comentario_producto,
    comentarioEmpresa: respuesta.comentario_empresa,
    comentarioGeneral: respuesta.comentario_general,
    canalRespuesta: respuesta.canal_respuesta,
    fechaRespuestaDate: new Date(respuesta.fecha_respuesta),
  }
}

export async function getRespuestas(filters: DashboardFilters = {}) {
  const supabase = await createSupabaseServer()

  // Si se filtra por tipo de encuesta, pre-filtramos los campana_ids
  let campanaIdsFiltro: string[] | null = null
  if (filters.tipoEncuestaId) {
    const { data: campanasFiltradas } = await supabase
      .from('campanas')
      .select('id')
      .eq('tipo_encuesta_id', filters.tipoEncuestaId)
    campanaIdsFiltro = (campanasFiltradas ?? []).map((c) => c.id)
  }

  let query = supabase
    .from('encuestas')
    .select(`
      id,
      created_at,
      campanas(id, nombre, fecha, tipos_encuesta(nombre, slug)),
      clientes(id, nombre, telefono, concesionario, orden_fabricacion, tecnologia),
      respuestas(
        fecha_respuesta,
        nombre_apellido,
        calle_numero,
        piso_departamento,
        localidad,
        codigo_postal,
        provincia,
        email,
        telefono,
        concesionario_sede,
        maquina_modelo,
        tipo_maquina,
        nombre_firma_factura,
        calificacion_entrega_presentacion,
        calificacion_capacitacion,
        calificacion_tecnico,
        calificacion_funcionamiento_anual,
        tuvo_problemas_tecnicos,
        calificacion_resolucion_problemas,
        comentario_problemas,
        nps_producto,
        nps_empresa,
        nps_concesionario,
        comentario_producto,
        comentario_empresa,
        comentario_general,
        canal_respuesta
      )
    `)
    .eq('estado', 'respondida')
    .order('created_at', { ascending: false })

  if (filters.concesionario) {
    query = query.eq('clientes.concesionario', filters.concesionario)
  }

  if (filters.tecnologia) {
    query = query.eq('clientes.tecnologia', filters.tecnologia)
  }

  if (filters.campanaId) {
    query = query.eq('campana_id', filters.campanaId)
  }

  if (campanaIdsFiltro !== null) {
    if (campanaIdsFiltro.length === 0) return []
    query = query.in('campana_id', campanaIdsFiltro)
  }

  const { data, error } = await query
  if (error) throw error

  let respuestas = (data as unknown as RawEncuestaConRespuesta[])
    .map(mapRespuesta)
    .filter((item): item is RespuestaDetalle => Boolean(item))

  if (filters.q) {
    const needle = filters.q.toLowerCase()
    respuestas = respuestas.filter((item) =>
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
    respuestas = respuestas.filter((item) => item.concesionario === filters.concesionario)
  }

  if (filters.tecnologia) {
    respuestas = respuestas.filter((item) => item.tecnologia === filters.tecnologia)
  }

  if (filters.fechaDesde) {
    const from = new Date(`${filters.fechaDesde}T00:00:00`)
    respuestas = respuestas.filter((item) => item.fechaRespuestaDate >= from)
  }

  if (filters.fechaHasta) {
    const to = new Date(`${filters.fechaHasta}T23:59:59.999`)
    respuestas = respuestas.filter((item) => item.fechaRespuestaDate <= to)
  }

  if (filters.tipoMaquina) {
    respuestas = respuestas.filter((item) => item.tipoMaquina === filters.tipoMaquina)
  }

  if (filters.estadoNps) {
    const estadoNps = filters.estadoNps
    respuestas = respuestas.filter((item) =>
      getNpsValues(item, filters.npsDimension).some((value) =>
        matchesNpsAnswerStatus(value, estadoNps)
      )
    )
  }

  if (filters.canal) {
    respuestas = respuestas.filter((item) => item.canalRespuesta === filters.canal)
  }

  return respuestas
}

export async function getDashboardFilterOptions() {
  const supabase = await createSupabaseServer()
  const [respuestas, tiposResult] = await Promise.all([
    getRespuestas(),
    supabase.from('tipos_encuesta').select('id, nombre, slug').eq('activo', true).order('created_at'),
  ])

  const concesionarios = Array.from(new Set(respuestas.map((item) => item.concesionario))).sort()
  const campanas = Array.from(
    new Map(
      respuestas.map((item) => [
        item.campanaId ?? item.campanaNombre,
        { id: item.campanaId, nombre: item.campanaNombre },
      ])
    ).values()
  ).sort((a, b) => a.nombre.localeCompare(b.nombre))

  const tiposEncuesta = tiposResult.data ?? []

  return { concesionarios, campanas, tecnologias: TECNOLOGIAS, tiposEncuesta }
}

export async function getNpsPorConcesionario(filters: DashboardFilters = {}): Promise<ConcesionarioNpsRow[]> {
  const respuestas = await getRespuestas(filters)
  const grouped = new Map<string, RespuestaDetalle[]>()

  for (const respuesta of respuestas) {
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
  const respuestas = await getRespuestas(filters)

  const sembradoras = respuestas.filter((item) => item.tipoMaquina === 'sembradora')
  const fertilizadoras = respuestas.filter((item) => item.tipoMaquina === 'fertilizadora')

  return [
    calcularDistribucion('Producto · Sembradora', sembradoras.map((item) => item.npsProducto)),
    calcularDistribucion('Producto · Fertilizadora', fertilizadoras.map((item) => item.npsProducto)),
    calcularDistribucion('Concesionario', respuestas.map((item) => item.npsConcesionario)),
    calcularDistribucion('Empresa', respuestas.map((item) => item.npsEmpresa)),
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

export async function getNpsResumenExtendido(
  filters: DashboardFilters = {}
): Promise<NpsResumenExtendido> {
  const respuestas = await getRespuestas(filters)

  const sembradoras = respuestas.filter((item) => item.tipoMaquina === 'sembradora')
  const fertilizadoras = respuestas.filter((item) => item.tipoMaquina === 'fertilizadora')

  return {
    totalRespuestas: respuestas.length,
    npsSembradora: calcularNps(sembradoras.map((item) => item.npsProducto)),
    totalSembradora: sembradoras.length,
    npsFertilizadora: calcularNps(fertilizadoras.map((item) => item.npsProducto)),
    totalFertilizadora: fertilizadoras.length,
    npsConcesionario: calcularNps(respuestas.map((item) => item.npsConcesionario)),
    npsEmpresa: calcularNps(respuestas.map((item) => item.npsEmpresa)),
  }
}

export async function getEfectividadEnvios(
  filters: DashboardFilters = {}
): Promise<EfectividadEnvios> {
  const supabase = await createSupabaseServer()

  // Pre-filtrar campanas por tipo si corresponde
  let campanaIdsFiltro: string[] | null = null
  if (filters.tipoEncuestaId) {
    const { data: campanasFiltradas } = await supabase
      .from('campanas')
      .select('id')
      .eq('tipo_encuesta_id', filters.tipoEncuestaId)
    campanaIdsFiltro = (campanasFiltradas ?? []).map((c) => c.id)
  }

  let enviadasQuery = supabase
    .from('encuestas')
    .select('id, clientes!inner(concesionario, tecnologia)', { count: 'exact', head: true })
    .neq('estado', 'pendiente')

  let respondidasQuery = supabase
    .from('encuestas')
    .select('id, clientes!inner(concesionario, tecnologia)', { count: 'exact', head: true })
    .eq('estado', 'respondida')

  if (campanaIdsFiltro !== null) {
    if (campanaIdsFiltro.length === 0) {
      return { enviadas: 0, respondidas: 0, porcentaje: null }
    }
    enviadasQuery = enviadasQuery.in('campana_id', campanaIdsFiltro)
    respondidasQuery = respondidasQuery.in('campana_id', campanaIdsFiltro)
  }

  if (filters.campanaId) {
    enviadasQuery = enviadasQuery.eq('campana_id', filters.campanaId)
    respondidasQuery = respondidasQuery.eq('campana_id', filters.campanaId)
  }

  if (filters.concesionario) {
    enviadasQuery = enviadasQuery.eq('clientes.concesionario', filters.concesionario)
    respondidasQuery = respondidasQuery.eq('clientes.concesionario', filters.concesionario)
  }

  if (filters.tecnologia) {
    enviadasQuery = enviadasQuery.eq('clientes.tecnologia', filters.tecnologia)
    respondidasQuery = respondidasQuery.eq('clientes.tecnologia', filters.tecnologia)
  }

  const [{ count: enviadasCount, error: enviosError }, { count: respondidasCount, error: respError }] =
    await Promise.all([enviadasQuery, respondidasQuery])

  if (enviosError) throw enviosError
  if (respError) throw respError

  const enviadas = enviadasCount ?? 0
  const respondidas = respondidasCount ?? 0

  return {
    enviadas,
    respondidas,
    porcentaje:
      enviadas === 0 ? null : Math.round((respondidas / enviadas) * 1000) / 10,
  }
}

function calcularCalificaciones(
  respuestas: RespuestaDetalle[],
  config: CalificacionConfigItem[]
): CalificacionResumen[] {
  return config.map(({ key, label, labelCorto }) => {
    const values = respuestas
      .map((r) => r[key] as number | null)
      .filter((v): v is number => v !== null)

    const total = values.length
    const promedio =
      total > 0
        ? Math.round((values.reduce((acc, v) => acc + v, 0) / total) * 10) / 10
        : null

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
  const supabase = await createSupabaseServer()

  let query = supabase
    .from('tipos_encuesta')
    .select('id, nombre, slug')
    .eq('activo', true)
    .order('created_at')

  if (tipoEncuestaId) {
    query = query.eq('id', tipoEncuestaId)
  }

  const { data } = await query
  return data ?? []
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
      const respuestas = await getRespuestas({ ...filters, tipoEncuestaId: tipo.id })
      const config = getCalificacionesConfigPorSlug(tipo.slug)
      return { tipo, calificaciones: calcularCalificaciones(respuestas, config) }
    })
  )
}

export type NpsPorTipo = {
  tipo: { id: string; nombre: string; slug: string }
  resumen: NpsResumenExtendido
  efectividad: EfectividadEnvios
}

export async function getNpsPorTipoEncuesta(
  baseFiltros: Omit<DashboardFilters, 'tipoEncuestaId'> = {},
): Promise<NpsPorTipo[]> {
  const supabase = await createSupabaseServer()
  const { data: tipos } = await supabase
    .from('tipos_encuesta')
    .select('id, nombre, slug')
    .eq('activo', true)
    .order('created_at')

  if (!tipos?.length) return []

  return Promise.all(
    tipos.map(async (tipo) => {
      const filtros: DashboardFilters = { ...baseFiltros, tipoEncuestaId: tipo.id }
      const [resumen, efectividad] = await Promise.all([
        getNpsResumenExtendido(filtros),
        getEfectividadEnvios(filtros),
      ])
      return { tipo, resumen, efectividad }
    }),
  )
}

export async function getComparativoPorCanal(
  filters: DashboardFilters = {}
): Promise<ComparativoPorCanal[]> {
  const respuestas = await getRespuestas(filters)
  const total = respuestas.length

  const canales: Array<'mensaje' | 'llamado'> = ['mensaje', 'llamado']

  return canales.map((canal) => {
    const grupo = respuestas.filter((item) => item.canalRespuesta === canal)
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
