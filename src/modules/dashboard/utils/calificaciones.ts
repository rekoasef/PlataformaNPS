import type { RespuestaDetalle } from '../services/dashboard.service'

export type CalificacionConfigItem = { key: keyof RespuestaDetalle; label: string; labelCorto: string }

const CALIFICACIONES_COMPARTIDAS: CalificacionConfigItem[] = [
  { key: 'npsConcesionario', label: 'NPS concesionario', labelCorto: 'NPS Concesion.' },
  { key: 'npsProducto', label: 'NPS producto', labelCorto: 'NPS Producto' },
  { key: 'npsEmpresa', label: 'NPS empresa', labelCorto: 'NPS Empresa' },
]

const CALIFICACIONES_POR_SLUG: Record<string, CalificacionConfigItem[]> = {
  inicio_garantia: [
    { key: 'calificacionEntregaPresentacion', label: 'Entrega y presentación', labelCorto: 'Entrega' },
    { key: 'calificacionCapacitacion', label: 'Capacitación', labelCorto: 'Capacitación' },
    { key: 'calificacionTecnico', label: 'Técnico', labelCorto: 'Técnico' },
    ...CALIFICACIONES_COMPARTIDAS,
  ],
  fin_garantia: [
    { key: 'calificacionFuncionamientoAnual', label: 'Funcionamiento anual', labelCorto: 'Func. Anual' },
    { key: 'calificacionResolucionProblemas', label: 'Resolución de problemas', labelCorto: 'Resol. Problemas' },
    ...CALIFICACIONES_COMPARTIDAS,
  ],
}

export function getCalificacionesConfigPorSlug(slug: string | null | undefined): CalificacionConfigItem[] {
  return CALIFICACIONES_POR_SLUG[slug ?? ''] ?? CALIFICACIONES_COMPARTIDAS
}
