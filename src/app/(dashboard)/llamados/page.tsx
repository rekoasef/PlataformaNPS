import Link from 'next/link'
import PageContainer from '@/components/layout/PageContainer'
import Pagination from '@/components/ui/Pagination'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { getTiposEncuesta } from '@/modules/campanas/services/campanas.service'
import LlamadoRow from '@/modules/recordatorios/components/LlamadoRow'
import { getEncuestasNecesidadLlamado, LLAMADOS_PAGE_SIZE } from '@/modules/recordatorios/services/recordatorios.service'

export default async function LlamadosPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tipo?: string }>
}) {
  const params = await searchParams
  const page = Math.max(1, Number(params.page ?? 1))
  const tipo = params.tipo

  const [{ data: encuestas, total }, tipos] = await Promise.all([
    getEncuestasNecesidadLlamado(page, tipo),
    getTiposEncuesta(),
  ])
  const totalPages = Math.ceil(total / LLAMADOS_PAGE_SIZE)

  const getPageUrl = (p: number) => {
    const search = new URLSearchParams()
    if (p > 1) search.set('page', String(p))
    if (tipo) search.set('tipo', tipo)
    const qs = search.toString()
    return `/llamados${qs ? `?${qs}` : ''}`
  }

  return (
    <PageContainer title={`Necesidad de llamado (${total})`}>
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-foreground">OF pendientes de llamado</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Desde esta vista se gestionan las OF que no respondieron luego del recordatorio.
          </p>
        </CardHeader>
        <div className="flex items-center gap-2 border-t border-border px-4 py-3">
          <Link
            href="/llamados"
            className={`inline-flex h-8 items-center rounded-full px-3.5 text-xs font-medium transition-colors border ${
              !tipo
                ? 'bg-foreground text-background border-foreground'
                : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
            }`}
          >
            Todas
          </Link>
          {tipos.map((t) => (
            <Link
              key={t.id}
              href={`/llamados?tipo=${t.id}`}
              className={`inline-flex h-8 items-center rounded-full px-3.5 text-xs font-medium transition-colors border ${
                tipo === t.id
                  ? 'bg-foreground text-background border-foreground'
                  : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
              }`}
            >
              {t.nombre}
            </Link>
          ))}
        </div>
        <CardContent className="p-0">
          {encuestas.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No hay OF en necesidad de llamado.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaña</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>OF</TableHead>
                    <TableHead>Concesionario</TableHead>
                    <TableHead>Teléfono 1</TableHead>
                    <TableHead>Teléfono 2</TableHead>
                    <TableHead>Teléfono 3</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Medidas</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {encuestas.map((encuesta) => (
                    <LlamadoRow key={encuesta.id} encuesta={encuesta} />
                  ))}
                </TableBody>
              </Table>
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={total}
                pageSize={LLAMADOS_PAGE_SIZE}
                getPageUrl={getPageUrl}
                itemLabel="OF"
              />
            </>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  )
}
