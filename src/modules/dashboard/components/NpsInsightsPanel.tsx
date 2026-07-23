import Badge from '@/components/ui/Badge'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import type { ConcesionarioNpsPorTipo, ConcesionarioNpsRow, NpsDistribucionPorTipo, TipoEncuestaRef } from '../services/dashboard.service'
import { getNpsScoreVariant } from '../utils/nps'
import NpsDistribucionPieChart from './NpsDistribucionPieChart'
import TipoEncuestaBadge from './TipoEncuestaBadge'

interface NpsInsightsPanelProps {
  npsPorConcesionario: ConcesionarioNpsPorTipo[]
  distribucionPorTipo: NpsDistribucionPorTipo[]
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

function NpsRankingCard({ tipo, rows }: { tipo: TipoEncuestaRef; rows: ConcesionarioNpsRow[] }) {
  return (
    <Card>
      <CardHeader>
        <TipoEncuestaBadge tipo={tipo} />
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin datos</p>
        ) : (
          <div className="space-y-3">
            {rows.map((row, index) => (
              <div key={row.concesionario} className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                    {index + 1}
                  </span>
                  <p className="truncate text-sm font-medium text-foreground">{row.concesionario}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {row.totalRespuestas} resp.
                  </span>
                  <Badge variant={getNpsScoreVariant(row.npsConcesionario)}>
                    {formatNps(row.npsConcesionario)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function normalizedWidth(value: number | null) {
  if (value === null) return '0%'
  return `${Math.max(4, Math.min(100, ((value + 100) / 200) * 100))}%`
}

export default function NpsInsightsPanel({ npsPorConcesionario, distribucionPorTipo }: NpsInsightsPanelProps) {
  if (npsPorConcesionario.length === 0 && distribucionPorTipo.length === 0) return null

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Top 5 mejores NPS concesionario</h2>
        <div className={`grid grid-cols-1 gap-4 ${npsPorConcesionario.length > 1 ? 'md:grid-cols-2' : ''}`}>
          {npsPorConcesionario.map(({ tipo, rows }) => (
            <NpsRankingCard key={tipo.id} tipo={tipo} rows={rankingRows(rows).slice(0, 5)} />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Top 5 peores NPS concesionario</h2>
        <div className={`grid grid-cols-1 gap-4 ${npsPorConcesionario.length > 1 ? 'md:grid-cols-2' : ''}`}>
          {npsPorConcesionario.map(({ tipo, rows }) => (
            <NpsRankingCard key={tipo.id} tipo={tipo} rows={rankingRows(rows).slice(-5).reverse()} />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Distribución NPS</h2>
        <div className={`grid grid-cols-1 gap-6 ${distribucionPorTipo.length > 1 ? 'xl:grid-cols-2' : ''}`}>
          {distribucionPorTipo.map(({ tipo, distribucion }) => (
            <Card key={tipo.id}>
              <CardHeader>
                <TipoEncuestaBadge tipo={tipo} />
              </CardHeader>
              <CardContent>
                <NpsDistribucionPieChart distribucion={distribucion} />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Ranking NPS concesionario</h2>
        <div className={`grid grid-cols-1 gap-6 ${npsPorConcesionario.length > 1 ? 'xl:grid-cols-2' : ''}`}>
          {npsPorConcesionario.map(({ tipo, rows }) => {
            const topRows = rankingRows(rows).slice(0, 8)
            return (
              <Card key={tipo.id}>
                <CardHeader>
                  <TipoEncuestaBadge tipo={tipo} />
                </CardHeader>
                <CardContent>
                  {topRows.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">No hay respuestas para mostrar.</div>
                  ) : (
                    <div className="space-y-4">
                      {topRows.map((row, index) => (
                        <div key={row.concesionario} className="space-y-1.5">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                                {index + 1}
                              </span>
                              <p className="truncate text-sm font-medium text-foreground">{row.concesionario}</p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <span className="text-xs text-muted-foreground">{row.totalRespuestas}</span>
                              <Badge variant={getNpsScoreVariant(row.npsConcesionario)}>
                                {formatNps(row.npsConcesionario)}
                              </Badge>
                            </div>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-muted">
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
            )
          })}
        </div>
      </div>
    </div>
  )
}
