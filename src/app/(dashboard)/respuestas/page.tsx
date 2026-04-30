import PageContainer from '@/components/layout/PageContainer'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import RespuestasTable from '@/modules/dashboard/components/RespuestasTable'
import {
  getDashboardFilterOptions,
  getRespuestas,
} from '@/modules/dashboard/services/dashboard.service'
import { normalizeTecnologiaInput } from '@/lib/utils/tecnologia'

export default async function RespuestasPage({
  searchParams,
}: {
  searchParams: Promise<{
    concesionario?: string
    campanaId?: string
    q?: string
    fechaDesde?: string
    fechaHasta?: string
    tecnologia?: string
  }>
}) {
  const { concesionario, campanaId, q, fechaDesde, fechaHasta, tecnologia } = await searchParams
  const tecnologiaFilter = normalizeTecnologiaInput(tecnologia) ?? undefined
  const [options, respuestas] = await Promise.all([
    getDashboardFilterOptions(),
    getRespuestas({ concesionario, campanaId, q, fechaDesde, fechaHasta, tecnologia: tecnologiaFilter }),
  ])

  const exportParams = new URLSearchParams()
  if (q) exportParams.set('q', q)
  if (concesionario) exportParams.set('concesionario', concesionario)
  if (campanaId) exportParams.set('campanaId', campanaId)
  if (fechaDesde) exportParams.set('fechaDesde', fechaDesde)
  if (fechaHasta) exportParams.set('fechaHasta', fechaHasta)
  if (tecnologiaFilter) exportParams.set('tecnologia', tecnologiaFilter)
  const exportHref = `/api/respuestas/exportar${exportParams.toString() ? `?${exportParams.toString()}` : ''}`

  return (
    <PageContainer title={`Respuestas (${respuestas.length})`}>
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-4">
            <form className="space-y-4">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-6">
              <div>
                <label htmlFor="q" className="mb-1 block text-sm font-medium text-gray-700">
                  Buscar
                </label>
                <input
                  id="q"
                  name="q"
                  defaultValue={q}
                  placeholder="Cliente, email, campaña..."
                  className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
              <div>
                <label htmlFor="concesionario" className="mb-1 block text-sm font-medium text-gray-700">
                  Concesionario
                </label>
                <select
                  id="concesionario"
                  name="concesionario"
                  defaultValue={concesionario ?? ''}
                  className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                >
                  <option value="">Todos</option>
                  {options.concesionarios.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="campanaId" className="mb-1 block text-sm font-medium text-gray-700">
                  Campaña
                </label>
                <select
                  id="campanaId"
                  name="campanaId"
                  defaultValue={campanaId ?? ''}
                  className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                >
                  <option value="">Todas</option>
                  {options.campanas.map((item) => (
                    <option key={item.id ?? item.nombre} value={item.id ?? ''}>
                      {item.nombre}
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
              </div>
              <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-gray-500">{respuestas.length} respuesta{respuestas.length !== 1 ? 's' : ''} encontrada{respuestas.length !== 1 ? 's' : ''}</p>
                <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  className="inline-flex h-10 items-center justify-center rounded-md bg-gray-100 px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
                >
                  Filtrar
                </button>
                <a
                  href="/respuestas"
                  className="inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
                >
                  Limpiar
                </a>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Listado de respuestas</h2>
            <a
              href={exportHref}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 transition-colors hover:border-brand hover:text-brand"
            >
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-gray-600">
                CSV
              </span>
              Exportar
            </a>
          </CardHeader>
          <CardContent className="p-0">
            <RespuestasTable respuestas={respuestas} />
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}
