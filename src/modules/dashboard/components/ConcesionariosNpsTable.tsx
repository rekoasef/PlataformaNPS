import Badge from '@/components/ui/Badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import type { ConcesionarioNpsRow } from '../services/dashboard.service'
import { getNpsScoreVariant } from '../utils/nps'

interface ConcesionariosNpsTableProps {
  rows: ConcesionarioNpsRow[]
}

function valueOrDash(value: number | null) {
  return value === null ? '—' : value.toLocaleString('es-AR')
}

function NpsScoreBadge({ value }: { value: number | null }) {
  return <Badge variant={getNpsScoreVariant(value)}>{valueOrDash(value)}</Badge>
}

export default function ConcesionariosNpsTable({ rows }: ConcesionariosNpsTableProps) {
  if (rows.length === 0) {
    return <div className="py-12 text-center text-sm text-gray-500">No hay respuestas para mostrar.</div>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16">#</TableHead>
          <TableHead>Concesionario</TableHead>
          <TableHead className="text-right">Respuestas</TableHead>
          <TableHead className="text-right">NPS concesionario</TableHead>
          <TableHead className="text-right">NPS producto</TableHead>
          <TableHead className="text-right">NPS empresa</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, index) => (
          <TableRow key={row.concesionario}>
            <TableCell className="text-gray-500 tabular-nums">{index + 1}</TableCell>
            <TableCell className="font-medium">{row.concesionario}</TableCell>
            <TableCell className="text-right tabular-nums">{row.totalRespuestas}</TableCell>
            <TableCell className="text-right"><NpsScoreBadge value={row.npsConcesionario} /></TableCell>
            <TableCell className="text-right"><NpsScoreBadge value={row.npsProducto} /></TableCell>
            <TableCell className="text-right"><NpsScoreBadge value={row.npsEmpresa} /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
