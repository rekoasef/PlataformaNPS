import { Card, CardContent } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { getNpsScoreVariant } from '../utils/nps'
import type { EfectividadEnvios, NpsResumenExtendido } from '../services/dashboard.service'

interface IndicadoresPanelProps {
  resumen: NpsResumenExtendido
  efectividad: EfectividadEnvios
  label?: string
}

function renderNps(value: number | null) {
  return value === null ? '—' : value.toLocaleString('es-AR')
}

function renderPorcentaje(value: number | null) {
  if (value === null) return '—'
  return `${value.toLocaleString('es-AR')}%`
}

export default function IndicadoresPanel({ resumen, efectividad, label }: IndicadoresPanelProps) {
  const cards = [
    {
      title: 'NPS producto sembradoras',
      value: renderNps(resumen.npsSembradora),
      score: resumen.npsSembradora,
      sub: `${resumen.totalSembradora} respuestas`,
    },
    {
      title: 'NPS producto fertilizadoras',
      value: renderNps(resumen.npsFertilizadora),
      score: resumen.npsFertilizadora,
      sub: `${resumen.totalFertilizadora} respuestas`,
    },
    {
      title: 'NPS Concesionario',
      value: renderNps(resumen.npsConcesionario),
      score: resumen.npsConcesionario,
      sub: `${resumen.totalRespuestas} respuestas`,
    },
    {
      title: 'NPS Empresa (Crucianelli)',
      value: renderNps(resumen.npsEmpresa),
      score: resumen.npsEmpresa,
      sub: `${resumen.totalRespuestas} respuestas`,
    },
    {
      title: 'Efectividad encuestas',
      value: renderPorcentaje(efectividad.porcentaje),
      score: null,
      sub: `${efectividad.respondidas} de ${efectividad.enviadas} enviadas`,
    },
  ]

  return (
    <div className="space-y-4">
      {label && <p className="text-sm text-gray-500">{label}</p>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs uppercase tracking-wide text-gray-500">{card.title}</p>
                {card.score !== undefined && card.score !== null && (
                  <Badge variant={getNpsScoreVariant(card.score)}>activo</Badge>
                )}
              </div>
              <p className="mt-2 text-3xl font-bold text-gray-900 tabular-nums">{card.value}</p>
              <p className="mt-1 text-xs text-gray-500">{card.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
