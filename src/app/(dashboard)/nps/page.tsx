import PageContainer from '@/components/layout/PageContainer'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import IndicadoresPanel from '@/modules/dashboard/components/IndicadoresPanel'
import ConcesionariosNpsTable from '@/modules/dashboard/components/ConcesionariosNpsTable'
import NpsInsightsPanel from '@/modules/dashboard/components/NpsInsightsPanel'
import {
  getDashboardFilterOptions,
  getEfectividadEnvios,
  getNpsDistribucion,
  getNpsPorConcesionario,
  getNpsResumenExtendido,
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
  }>
}) {
  const { concesionario, fechaDesde, fechaHasta, tipoMaquina, tecnologia } = await searchParams
  const tipoMaquinaFilter = parseTipoMaquina(tipoMaquina)
  const tecnologiaFilter = normalizeTecnologiaInput(tecnologia) ?? undefined
  const filtros = { concesionario, fechaDesde, fechaHasta, tipoMaquina: tipoMaquinaFilter, tecnologia: tecnologiaFilter }
  const comparacionFiltros = { fechaDesde, fechaHasta, tipoMaquina: tipoMaquinaFilter, tecnologia: tecnologiaFilter }
  const tecnologiaLabel = tecnologiaFilter ? formatTecnologia(tecnologiaFilter) : undefined

  const [options, resumen, efectividad, rows, distribucion] = await Promise.all([
    getDashboardFilterOptions(),
    getNpsResumenExtendido(filtros),
    getEfectividadEnvios(filtros),
    getNpsPorConcesionario(comparacionFiltros),
    getNpsDistribucion(filtros),
  ])

  return (
    <PageContainer title="Vista NPS">
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-4">
            <form className="grid grid-cols-1 gap-4 lg:grid-cols-6">
              <div className="w-full max-w-md">
                <label htmlFor="concesionario" className="mb-1 block text-sm font-medium text-gray-700">
                  Filtrar por concesionario
                </label>
                <select
                  id="concesionario"
                  name="concesionario"
                  defaultValue={concesionario ?? ''}
                  className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
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
                <label htmlFor="tipoMaquina" className="mb-1 block text-sm font-medium text-gray-700">
                  Tipo de máquina
                </label>
                <select
                  id="tipoMaquina"
                  name="tipoMaquina"
                  defaultValue={tipoMaquinaFilter ?? ''}
                  className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                >
                  <option value="">Todas</option>
                  <option value="sembradora">Sembradoras</option>
                  <option value="fertilizadora">Fertilizadoras</option>
                </select>
              </div>
              <div>
                <label htmlFor="tecnologia" className="mb-1 block text-sm font-medium text-gray-700">
                  Tecnología
                </label>
                <select
                  id="tecnologia"
                  name="tecnologia"
                  defaultValue={tecnologiaFilter ?? ''}
                  className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
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
                <label htmlFor="fechaDesde" className="mb-1 block text-sm font-medium text-gray-700">
                  Desde
                </label>
                <input
                  id="fechaDesde"
                  name="fechaDesde"
                  type="date"
                  defaultValue={fechaDesde}
                  className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
              <div>
                <label htmlFor="fechaHasta" className="mb-1 block text-sm font-medium text-gray-700">
                  Hasta
                </label>
                <input
                  id="fechaHasta"
                  name="fechaHasta"
                  type="date"
                  defaultValue={fechaHasta}
                  className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
              <div className="flex items-end gap-3">
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center rounded-md bg-gray-100 px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
              >
                Aplicar filtro
              </button>
              <a
                href="/nps"
                className="inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
              >
                Limpiar
              </a>
              </div>
            </form>
          </CardContent>
        </Card>

        <IndicadoresPanel
          resumen={resumen}
          efectividad={efectividad}
          label={
            concesionario
              ? `Indicadores para ${concesionario}${tipoMaquinaFilter ? ` · ${tipoMaquinaFilter}` : ''}${tecnologiaLabel ? ` · ${tecnologiaLabel}` : ''}${fechaDesde || fechaHasta ? ' con el rango seleccionado.' : '.'}`
              : `Indicadores generales${tipoMaquinaFilter ? ` filtrados por ${tipoMaquinaFilter}` : ''}${tecnologiaLabel ? ` · ${tecnologiaLabel}` : ''}${fechaDesde || fechaHasta ? ' del rango seleccionado.' : '.'}`
          }
        />

        <NpsInsightsPanel rows={rows} distribucion={distribucion} />

        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-900">Ranking completo por concesionario</h2>
          </CardHeader>
          <CardContent className="p-0">
            <ConcesionariosNpsTable rows={rows} />
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}
