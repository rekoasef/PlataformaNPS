import PageContainer from '@/components/layout/PageContainer'
import Badge from '@/components/ui/Badge'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { getEncuestasSinRespuesta } from '@/modules/recordatorios/services/recordatorios.service'

function formatFecha(value: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

export default async function SinRespuestaPage() {
  const encuestas = await getEncuestasSinRespuesta()

  return (
    <PageContainer title={`Sin respuesta (${encuestas.length})`}>
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-gray-900">OF cerradas como sin respuesta</h2>
          <p className="mt-1 text-sm text-gray-500">
            Listado de encuestas que fueron marcadas como sin respuesta tras los intentos de contacto.
            Cada registro guarda el comentario del operador.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {encuestas.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500">
              No hay encuestas marcadas como sin respuesta.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Marcado</TableHead>
                  <TableHead>Campaña</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>OF</TableHead>
                  <TableHead>Concesionario</TableHead>
                  <TableHead>Comentario</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {encuestas.map((encuesta) => (
                  <TableRow key={encuesta.id}>
                    <TableCell className="whitespace-nowrap text-sm text-gray-600">
                      {formatFecha(encuesta.marcadoAt)}
                    </TableCell>
                    <TableCell>{encuesta.campana?.nombre ?? '—'}</TableCell>
                    <TableCell className="font-medium">{encuesta.cliente?.nombre ?? '—'}</TableCell>
                    <TableCell>{encuesta.cliente?.orden_fabricacion ?? '—'}</TableCell>
                    <TableCell>{encuesta.cliente?.concesionario ?? '—'}</TableCell>
                    <TableCell className="max-w-md whitespace-pre-wrap text-sm text-gray-700">
                      {encuesta.comentario || <span className="text-gray-400">—</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="danger">sin_respuesta</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  )
}
