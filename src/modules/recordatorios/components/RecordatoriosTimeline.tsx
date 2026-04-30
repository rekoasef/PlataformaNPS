import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import type {
  PuedeCrearRecordatorioResult,
  RecordatorioResumen,
} from '../types/recordatorio.types'

interface RecordatoriosTimelineProps {
  campanaId: string
  recordatorios: RecordatorioResumen[]
  permiso: PuedeCrearRecordatorioResult
}

function getLabel(numero: number) {
  return numero === 0 ? 'Envío inicial' : `Recordatorio ${numero}`
}

export default function RecordatoriosTimeline({
  campanaId,
  recordatorios,
  permiso,
}: RecordatoriosTimelineProps) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Recordatorios</h2>
          <p className="mt-1 text-sm text-gray-500">
            Se reutiliza siempre el mismo link por OF. Máximo 3 recordatorios por campaña.
          </p>
        </div>
        {permiso.allowed && permiso.nextNumero ? (
          <Link href={`/campanas/${campanaId}/recordatorio`}>
            <Button>Crear recordatorio {permiso.nextNumero}</Button>
          </Link>
        ) : (
          <span className="text-sm text-gray-500">{permiso.reason}</span>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {recordatorios.length === 0 ? (
          <p className="text-sm text-gray-500">Todavía no hay envíos registrados para esta campaña.</p>
        ) : (
          recordatorios.map((item) => (
            <div
              key={item.numero_recordatorio}
              className="flex flex-col gap-3 rounded-lg border border-gray-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900">{getLabel(item.numero_recordatorio)}</p>
                  <Badge variant={item.estado_envio === 'enviado' ? 'success' : 'warning'}>
                    {item.estado_envio}
                  </Badge>
                </div>
                <p className="text-sm text-gray-500">
                  {item.total_clientes} cliente{item.total_clientes !== 1 ? 's' : ''}
                  {item.fecha_envio
                    ? ` · enviado el ${new Date(item.fecha_envio).toLocaleDateString('es-AR')}`
                    : ' · pendiente de confirmación'}
                </p>
              </div>

              {item.numero_recordatorio > 0 && item.estado_envio === 'pendiente_envio' && (
                <Link href={`/campanas/${campanaId}/recordatorio`}>
                  <Button variant="secondary">Gestionar</Button>
                </Link>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
