import PageContainer from '@/components/layout/PageContainer'
import Badge from '@/components/ui/Badge'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { formatFechaHora } from '@/lib/utils/fecha'
import { getEncuestasSinRespuesta } from '@/modules/recordatorios/services/recordatorios.service'

export default async function SinRespuestaPage() {
  const encuestas = await getEncuestasSinRespuesta()

  return (
    <PageContainer title={`Sin respuesta (${encuestas.length})`}>
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-foreground">OF cerradas como sin respuesta</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Listado de encuestas que fueron marcadas como sin respuesta tras los intentos de contacto.
            Cada registro guarda el comentario del operador.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {encuestas.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
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
                  <TableHead>Historial de medidas</TableHead>
                  <TableHead>Observación final</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {encuestas.map((encuesta) => (
                  <TableRow key={encuesta.id}>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatFechaHora(encuesta.marcadoAt)}
                    </TableCell>
                    <TableCell>{encuesta.campana?.nombre ?? '—'}</TableCell>
                    <TableCell className="font-medium">{encuesta.cliente?.nombre ?? '—'}</TableCell>
                    <TableCell>{encuesta.cliente?.orden_fabricacion ?? '—'}</TableCell>
                    <TableCell>{encuesta.cliente?.concesionario ?? '—'}</TableCell>
                    <TableCell className="max-w-xs">
                      {encuesta.medidas.length === 0 ? (
                        <span className="text-sm text-muted-foreground">—</span>
                      ) : (
                        <ul className="max-h-32 space-y-1.5 overflow-y-auto text-xs">
                          {encuesta.medidas.map((medida) => (
                            <li key={medida.id}>
                              <span className="block font-medium text-muted-foreground">
                                {formatFechaHora(medida.createdAt)}
                              </span>
                              <span className="block whitespace-pre-wrap text-foreground">
                                {medida.comentario}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </TableCell>
                    <TableCell className="max-w-md whitespace-pre-wrap text-sm text-foreground">
                      {encuesta.comentario || <span className="text-muted-foreground">—</span>}
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
