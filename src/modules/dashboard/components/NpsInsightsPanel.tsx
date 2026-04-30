import Badge from '@/components/ui/Badge'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import type { ConcesionarioNpsRow, NpsDistribucionRow } from '../services/dashboard.service'
import { getNpsScoreVariant } from '../utils/nps'

interface NpsInsightsPanelProps {
  rows: ConcesionarioNpsRow[]
  distribucion: NpsDistribucionRow[]
}

function formatNps(value: number | null) {
  return value === null ? '—' : value.toLocaleString('es-AR')
}

function rankingRows(rows: ConcesionarioNpsRow[]) {
  return rows
    .filter((row) => row.npsConcesionario !== null)
    .sort((a, b) => {
      const byScore = (b.npsConcesionario ?? -101) - (a.npsConcesionario ?? -101)
      if (byScore !== 0) return byScore
      return b.totalRespuestas - a.totalRespuestas
    })
}

function NpsSummaryCard({
  label,
  row,
}: {
  label: string
  row: ConcesionarioNpsRow | null
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
          {row?.npsConcesionario !== null && row?.npsConcesionario !== undefined && (
            <Badge variant={getNpsScoreVariant(row.npsConcesionario)}>
              {formatNps(row.npsConcesionario)}
            </Badge>
          )}
        </div>
        <p className="mt-2 text-lg font-semibold text-gray-900">{row?.concesionario ?? '—'}</p>
        <p className="mt-1 text-xs text-gray-500">
          {row ? `${row.totalRespuestas} respuesta${row.totalRespuestas !== 1 ? 's' : ''}` : 'Sin datos'}
        </p>
      </CardContent>
    </Card>
  )
}

function normalizedWidth(value: number | null) {
  if (value === null) return '0%'
  return `${Math.max(4, Math.min(100, ((value + 100) / 200) * 100))}%`
}

export default function NpsInsightsPanel({ rows, distribucion }: NpsInsightsPanelProps) {
  const ranked = rankingRows(rows)
  const best = ranked[0] ?? null
  const worst = ranked.length > 0 ? ranked[ranked.length - 1] : null
  const mostAnswered = [...rows].sort((a, b) => b.totalRespuestas - a.totalRespuestas)[0] ?? null
  const topRows = ranked.slice(0, 8)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <NpsSummaryCard label="Mejor NPS concesionario" row={best} />
        <NpsSummaryCard label="Peor NPS concesionario" row={worst} />
        <NpsSummaryCard label="Mayor volumen" row={mostAnswered} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-900">Distribución NPS</h2>
          </CardHeader>
          <CardContent className="space-y-5">
            {distribucion.map((item) => (
              <div key={item.label} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-gray-900">{item.label}</p>
                  <p className="text-xs text-gray-500">{item.total} respuestas</p>
                </div>
                <div className="flex h-3 overflow-hidden rounded-full bg-gray-100">
                  <div className="bg-red-500" style={{ width: `${item.detractoresPct}%` }} />
                  <div className="bg-yellow-400" style={{ width: `${item.pasivosPct}%` }} />
                  <div className="bg-green-500" style={{ width: `${item.promotoresPct}%` }} />
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
                  <span>Detractores {item.detractoresPct}%</span>
                  <span>Pasivos {item.pasivosPct}%</span>
                  <span>Promotores {item.promotoresPct}%</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-900">Ranking NPS concesionario</h2>
          </CardHeader>
          <CardContent>
            {topRows.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-500">No hay respuestas para mostrar.</div>
            ) : (
              <div className="space-y-4">
                {topRows.map((row, index) => (
                  <div key={row.concesionario} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
                          {index + 1}
                        </span>
                        <p className="truncate text-sm font-medium text-gray-900">{row.concesionario}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-xs text-gray-500">{row.totalRespuestas}</span>
                        <Badge variant={getNpsScoreVariant(row.npsConcesionario)}>
                          {formatNps(row.npsConcesionario)}
                        </Badge>
                      </div>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-brand"
                        style={{ width: normalizedWidth(row.npsConcesionario) }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
