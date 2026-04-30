import { notFound } from 'next/navigation'
import { getCampanaById, getCampanaConEncuestas } from '@/modules/campanas/services/campanas.service'
import PageContainer from '@/components/layout/PageContainer'
import Badge from '@/components/ui/Badge'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import CambiarEstadoForm from '@/modules/campanas/components/CambiarEstadoForm'
import RecordatoriosTimeline from '@/modules/recordatorios/components/RecordatoriosTimeline'
import { getRecordatoriosByCampana, puedeCrearRecordatorio } from '@/modules/recordatorios/services/recordatorios.service'
import { formatTecnologia } from '@/lib/utils/tecnologia'

const estadoBadge: Record<string, 'success' | 'info' | 'default'> = {
  activa:     'success',
  completada: 'info',
  archivada:  'default',
}

const encuestaBadge: Record<string, 'success' | 'warning' | 'info' | 'default'> = {
  pendiente: 'warning',
  recordatorio_enviado: 'info',
  necesidad_de_llamado: 'warning',
  respondida: 'success',
  sin_respuesta: 'default',
}

export default async function CampanaDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [campana, encuestas, recordatorios, permisoRecordatorio] = await Promise.all([
    getCampanaById(id).catch(() => null),
    getCampanaConEncuestas(id),
    getRecordatoriosByCampana(id),
    puedeCrearRecordatorio(id),
  ])

  if (!campana) notFound()

  const total = encuestas.length
  const respondidas = encuestas.filter((e) => e.estado === 'respondida').length
  const sinRespuesta = encuestas.filter((e) => e.estado === 'sin_respuesta').length
  const pendientes = total - respondidas - sinRespuesta
  const tasa = total > 0 ? Math.round((respondidas / total) * 100) : 0

  return (
    <PageContainer
      title={campana.nombre}
      actions={
        <a
          href={`/api/campanas/${id}/exportar`}
          className="inline-flex items-center justify-center h-10 px-4 rounded-md text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
        >
          Exportar pendientes
        </a>
      }
    >
      <div className="space-y-6">
        {/* Info + métricas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Estado</p>
              <div className="mt-1">
                <Badge variant={estadoBadge[campana.estado] ?? 'default'}>{campana.estado}</Badge>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total clientes</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">{total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Respondidas</p>
              <p className="mt-1 text-2xl font-bold text-green-700 tabular-nums">{respondidas}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Sin respuesta</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">{sinRespuesta}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Tasa de respuesta</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">{tasa}%</p>
          </CardContent>
        </Card>

        {/* Cambiar estado */}
        <CambiarEstadoForm campanaId={id} estadoActual={campana.estado} />

        <RecordatoriosTimeline
          campanaId={id}
          recordatorios={recordatorios}
          permiso={permisoRecordatorio}
        />

        {/* Tabla de encuestas */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-900">
              Clientes ({pendientes} pendientes · {respondidas} respondidas)
            </h2>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Teléfono 1</TableHead>
                  <TableHead>Teléfono 2</TableHead>
                  <TableHead>Teléfono 3</TableHead>
                  <TableHead>Concesionario</TableHead>
                  <TableHead>OF</TableHead>
                  <TableHead>Tecnología</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {encuestas.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.clientes?.nombre ?? '—'}</TableCell>
                    <TableCell>{e.clientes?.telefono ?? '—'}</TableCell>
                    <TableCell>{e.clientes?.telefono_2 ?? '—'}</TableCell>
                    <TableCell>{e.clientes?.telefono_3 ?? '—'}</TableCell>
                    <TableCell>{e.clientes?.concesionario ?? '—'}</TableCell>
                    <TableCell className="text-gray-500">{e.clientes?.orden_fabricacion ?? '—'}</TableCell>
                    <TableCell className="text-gray-500">{formatTecnologia(e.clientes?.tecnologia)}</TableCell>
                    <TableCell>
                      <Badge variant={encuestaBadge[e.estado] ?? 'default'}>
                        {e.estado}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}
