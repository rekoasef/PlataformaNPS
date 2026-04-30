import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import type { CampanaConConteos } from '../types/campana.types'

const estadoBadge: Record<string, 'success' | 'info' | 'default'> = {
  activa:     'success',
  completada: 'info',
  archivada:  'default',
}

interface CampanasTableProps {
  campanas: CampanaConConteos[]
}

export default function CampanasTable({ campanas }: CampanasTableProps) {
  if (campanas.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-gray-500">
        No hay campanas creadas todavia.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Fecha</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="text-right">Clientes</TableHead>
          <TableHead className="text-right">Respondidas</TableHead>
          <TableHead className="text-right">Pendientes</TableHead>
          <TableHead className="text-right">Tasa</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {campanas.map((c) => {
          const tasa = c.total > 0 ? Math.round((c.respondidas / c.total) * 100) : 0
          return (
            <TableRow key={c.id}>
              <TableCell className="font-medium">{c.nombre}</TableCell>
              <TableCell className="text-gray-500">
                {new Date(c.fecha + 'T00:00:00').toLocaleDateString('es-AR')}
              </TableCell>
              <TableCell>
                <Badge variant={estadoBadge[c.estado] ?? 'default'}>
                  {c.estado}
                </Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums">{c.total}</TableCell>
              <TableCell className="text-right tabular-nums text-green-700">{c.respondidas}</TableCell>
              <TableCell className="text-right tabular-nums text-yellow-700">{c.pendientes}</TableCell>
              <TableCell className="text-right tabular-nums font-medium">{tasa}%</TableCell>
              <TableCell className="text-right">
                <Link
                  href={`/campanas/${c.id}`}
                  className="text-sm text-brand hover:underline font-medium"
                >
                  Ver detalle
                </Link>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
