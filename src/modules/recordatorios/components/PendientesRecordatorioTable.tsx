import Badge from '@/components/ui/Badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import type { ClientePendienteRecordatorio } from '../types/recordatorio.types'

interface PendientesRecordatorioTableProps {
  clientes: ClientePendienteRecordatorio[]
}

export default function PendientesRecordatorioTable({
  clientes,
}: PendientesRecordatorioTableProps) {
  if (clientes.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-gray-500">
        No hay clientes pendientes para este recordatorio.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Teléfono 1</TableHead>
          <TableHead>Teléfono 2</TableHead>
          <TableHead>Teléfono 3</TableHead>
          <TableHead>Concesionario</TableHead>
          <TableHead>OF</TableHead>
          <TableHead>Estado encuesta</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {clientes.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-medium">{item.clientes?.nombre ?? '—'}</TableCell>
            <TableCell>{item.clientes?.telefono ?? '—'}</TableCell>
            <TableCell>{item.clientes?.telefono_2 ?? '—'}</TableCell>
            <TableCell>{item.clientes?.telefono_3 ?? '—'}</TableCell>
            <TableCell>{item.clientes?.concesionario ?? '—'}</TableCell>
            <TableCell className="text-gray-500">{item.clientes?.orden_fabricacion ?? '—'}</TableCell>
            <TableCell>
              <Badge
                variant={
                  item.estado === 'respondida'
                    ? 'success'
                    : item.estado === 'sin_respuesta'
                      ? 'default'
                      : 'warning'
                }
              >
                {item.estado}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
