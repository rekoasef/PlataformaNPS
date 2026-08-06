import { Card, CardContent } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { getNpsScoreVariant } from '../utils/nps'
import type { EfectividadEnvios, NpsResumenExtendido } from '../services/dashboard.service'

interface IndicadoresPanelProps {
  resumen: NpsResumenExtendido
  efectividad: EfectividadEnvios
  label?: string
  efectividadPorTipo?: Array<{ nombre: string; slug: string; efectividad: EfectividadEnvios }>
}

const SLUG_CARD_COLORS: Record<string, string> = {
  inicio_garantia: 'bg-blue-50 border-blue-200',
  fin_garantia: 'bg-amber-50 border-amber-200',
}

function renderNps(value: number | null) {
  if (value === null) return '—'
  const formatted = value.toLocaleString('es-AR')
  return value > 0 ? `+${formatted}` : formatted
}

function npsLabel(value: number | null): string {
  if (value === null) return ''
  if (value < 0) return 'Bajo'
  if (value < 30) return 'Regular'
  if (value < 70) return 'Bueno'
  return 'Excelente'
}

function renderPorcentaje(value: number | null) {
  if (value === null) return '—'
  return `${value.toLocaleString('es-AR')}%`
}

export default function IndicadoresPanel({ resumen, efectividad, label, efectividadPorTipo }: IndicadoresPanelProps) {
  const npsCards = [
    {
      title: 'NPS producto sembradoras',
      value: renderNps(resumen.npsSembradora),
      label: npsLabel(resumen.npsSembradora),
      score: resumen.npsSembradora,
      sub: `${resumen.totalSembradora} respuestas`,
      cardColor: undefined as string | undefined,
    },
    {
      title: 'NPS producto fertilizadoras',
      value: renderNps(resumen.npsFertilizadora),
      label: npsLabel(resumen.npsFertilizadora),
      score: resumen.npsFertilizadora,
      sub: `${resumen.totalFertilizadora} respuestas`,
      cardColor: undefined as string | undefined,
    },
    {
      title: 'NPS Concesionario',
      value: renderNps(resumen.npsConcesionario),
      label: npsLabel(resumen.npsConcesionario),
      score: resumen.npsConcesionario,
      sub: `${resumen.totalRespuestas} respuestas`,
      cardColor: undefined as string | undefined,
    },
    {
      title: 'NPS Empresa (Crucianelli)',
      value: renderNps(resumen.npsEmpresa),
      label: npsLabel(resumen.npsEmpresa),
      score: resumen.npsEmpresa,
      sub: `${resumen.totalRespuestas} respuestas`,
      cardColor: undefined as string | undefined,
    },
  ]

  const efectividadCards = [
    ...(efectividadPorTipo ?? []).map(({ nombre, slug, efectividad: ef }) => ({
      title: `Efectividad · Encuesta ${nombre}`,
      value: renderPorcentaje(ef.porcentaje),
      label: '',
      score: null,
      sub: `${ef.respondidas} de ${ef.enviadas} enviadas`,
      cardColor: SLUG_CARD_COLORS[slug],
    })),
    {
      title: 'Efectividad total encuestas',
      value: renderPorcentaje(efectividad.porcentaje),
      label: '',
      score: null,
      sub: `${efectividad.respondidas} de ${efectividad.enviadas} enviadas`,
      cardColor: undefined,
    },
  ]

  const cards = [...npsCards, ...efectividadCards]

  return (
    <div className="space-y-4">
      {label && <p className="text-sm text-muted-foreground">{label}</p>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {cards.map((card) => (
          <Card key={card.title} className={card.cardColor}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{card.title}</p>
                {card.label && (
                  <Badge variant={getNpsScoreVariant(card.score)}>{card.label}</Badge>
                )}
              </div>
              <p className="mt-2 text-3xl font-bold text-foreground tabular-nums">{card.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{card.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
