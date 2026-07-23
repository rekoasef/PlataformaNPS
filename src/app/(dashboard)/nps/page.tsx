import PageContainer from '@/components/layout/PageContainer'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import IndicadoresPanel from '@/modules/dashboard/components/IndicadoresPanel'
import ConcesionariosNpsTable from '@/modules/dashboard/components/ConcesionariosNpsTable'
import NpsInsightsPanel from '@/modules/dashboard/components/NpsInsightsPanel'
import ComparativoCanalPanel from '@/modules/dashboard/components/ComparativoCanalPanel'
import CalificacionesPanel from '@/modules/dashboard/components/CalificacionesPanel'
import NpsPorTipoPanel from '@/modules/dashboard/components/NpsPorTipoPanel'
import TipoEncuestaBadge from '@/modules/dashboard/components/TipoEncuestaBadge'
import {
  getDashboardFilterOptions,
  getEfectividadEnvios,
  getNpsDistribucionPorTipoEncuesta,
  getNpsPorConcesionarioPorTipoEncuesta,
  getNpsResumenExtendido,
  getComparativoPorCanal,
  getCalificacionesPorTipoEncuesta,
  getNpsPorTipoEncuesta,
} from '@/modules/dashboard/services/dashboard.service'
import { formatTecnologia, normalizeTecnologiaInput } from '@/lib/utils/tecnologia'

type TipoMaquinaFilter = 'sembradora' | 'fertilizadora'

function parseTipoMaquina(value: string | undefined): TipoMaquinaFilter | undefined {
  return value === 'sembradora' || value === 'fertilizadora' ? value : undefined
}

export default async function NpsPage({
  searchParams,
}: {
  searchParams: Promise<{
    concesionario?: string
    fechaDesde?: string
    fechaHasta?: string
    tipoMaquina?: string
    tecnologia?: string
    tipoEncuestaId?: string
  }>
}) {
  const { concesionario, fechaDesde, fechaHasta, tipoMaquina, tecnologia, tipoEncuestaId } = await searchParams
  const tipoMaquinaFilter = parseTipoMaquina(tipoMaquina)
  const tecnologiaFilter = normalizeTecnologiaInput(tecnologia) ?? undefined
  const filtros = { concesionario, fechaDesde, fechaHasta, tipoMaquina: tipoMaquinaFilter, tecnologia: tecnologiaFilter, tipoEncuestaId }
  const comparacionFiltros = { fechaDesde, fechaHasta, tipoMaquina: tipoMaquinaFilter, tecnologia: tecnologiaFilter, tipoEncuestaId }
  const tecnologiaLabel = tecnologiaFilter ? formatTecnologia(tecnologiaFilter) : undefined

  const [options, resumen, efectividad, npsPorConcesionario, distribucionPorTipo, comparativoCanal, calificaciones, npsPorTipo] = await Promise.all([
    getDashboardFilterOptions(),
    getNpsResumenExtendido(filtros),
    getEfectividadEnvios(filtros),
    getNpsPorConcesionarioPorTipoEncuesta(comparacionFiltros),
    getNpsDistribucionPorTipoEncuesta(filtros),
    getComparativoPorCanal(filtros),
    getCalificacionesPorTipoEncuesta(filtros),
    tipoEncuestaId ? Promise.resolve([]) : getNpsPorTipoEncuesta({ concesionario, fechaDesde, fechaHasta, tipoMaquina: tipoMaquinaFilter, tecnologia: tecnologiaFilter }),
  ])

  return (
    <PageContainer title="Vista NPS">
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-4">
            <form className="grid grid-cols-1 gap-4 lg:grid-cols-6">
              <div>
                <label htmlFor="tipoEncuestaId" className="mb-1 block text-sm font-medium text-foreground">
                  Tipo de encuesta
                </label>
                <select
                  id="tipoEncuestaId"
                  name="tipoEncuestaId"
                  defaultValue={tipoEncuestaId ?? ''}
                  className="block w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Todas las encuestas</option>
                  {options.tiposEncuesta.map((tipo) => (
                    <option key={tipo.id} value={tipo.id}>
                      {tipo.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-full max-w-md">
                <label htmlFor="concesionario" className="mb-1 block text-sm font-medium text-foreground">
                  Concesionario
                </label>
                <select
                  id="concesionario"
                  name="concesionario"
                  defaultValue={concesionario ?? ''}
                  className="block w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Todos los concesionarios</option>
                  {options.concesionarios.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="tipoMaquina" className="mb-1 block text-sm font-medium text-foreground">
                  Tipo de máquina
                </label>
                <select
                  id="tipoMaquina"
                  name="tipoMaquina"
                  defaultValue={tipoMaquinaFilter ?? ''}
                  className="block w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Todas</option>
                  <option value="sembradora">Sembradoras</option>
                  <option value="fertilizadora">Fertilizadoras</option>
                </select>
              </div>
              <div>
                <label htmlFor="tecnologia" className="mb-1 block text-sm font-medium text-foreground">
                  Tecnología
                </label>
                <select
                  id="tecnologia"
                  name="tecnologia"
                  defaultValue={tecnologiaFilter ?? ''}
                  className="block w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Todas</option>
                  {options.tecnologias.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="fechaDesde" className="mb-1 block text-sm font-medium text-foreground">
                  Desde
                </label>
                <input
                  id="fechaDesde"
                  name="fechaDesde"
                  type="date"
                  defaultValue={fechaDesde}
                  className="block w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label htmlFor="fechaHasta" className="mb-1 block text-sm font-medium text-foreground">
                  Hasta
                </label>
                <input
                  id="fechaHasta"
                  name="fechaHasta"
                  type="date"
                  defaultValue={fechaHasta}
                  className="block w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex items-end gap-3">
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center rounded-md bg-muted px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Aplicar filtro
              </button>
              <a
                href="/nps"
                className="inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Limpiar
              </a>
              </div>
            </form>
          </CardContent>
        </Card>

        {!tipoEncuestaId && npsPorTipo.length > 0 && (
          <NpsPorTipoPanel
            data={npsPorTipo}
            currentSearchParams={{ concesionario, fechaDesde, fechaHasta, tipoMaquina, tecnologia }}
          />
        )}

        {tipoEncuestaId && (() => {
          const tipoNombre = options.tiposEncuesta.find((t) => t.id === tipoEncuestaId)?.nombre ?? ''
          return (
            <IndicadoresPanel
              resumen={resumen}
              efectividad={efectividad}
              label={
                concesionario
                  ? `Indicadores para ${concesionario} · ${tipoNombre}${tipoMaquinaFilter ? ` · ${tipoMaquinaFilter}` : ''}${tecnologiaLabel ? ` · ${tecnologiaLabel}` : ''}${fechaDesde || fechaHasta ? ' con el rango seleccionado.' : '.'}`
                  : `Encuestas de ${tipoNombre}${tipoMaquinaFilter ? ` filtradas por ${tipoMaquinaFilter}` : ''}${tecnologiaLabel ? ` · ${tecnologiaLabel}` : ''}${fechaDesde || fechaHasta ? ' del rango seleccionado.' : '.'}`
              }
            />
          )
        })()}

        <CalificacionesPanel data={calificaciones} />

        <ComparativoCanalPanel comparativo={comparativoCanal} />

        <NpsInsightsPanel npsPorConcesionario={npsPorConcesionario} distribucionPorTipo={distribucionPorTipo} />

        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Ranking completo por concesionario</h2>
          <div className={`grid grid-cols-1 gap-4 ${npsPorConcesionario.length > 1 ? 'xl:grid-cols-2' : ''}`}>
            {npsPorConcesionario.map(({ tipo, rows }) => (
              <Card key={tipo.id}>
                <CardHeader>
                  <TipoEncuestaBadge tipo={tipo} />
                </CardHeader>
                <CardContent className="p-0">
                  <ConcesionariosNpsTable rows={rows} />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
