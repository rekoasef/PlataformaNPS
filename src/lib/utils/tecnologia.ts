export type Tecnologia = 'leaf' | 'precision_planting'

export const TECNOLOGIAS: { value: Tecnologia; label: string }[] = [
  { value: 'leaf', label: 'Leaf' },
  { value: 'precision_planting', label: 'Precision Planting' },
]

export function normalizeTecnologiaInput(value: string | null | undefined): Tecnologia | null {
  const normalized = (value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

  if (!normalized) return null
  if (normalized === 'leaf') return 'leaf'
  if (normalized === 'precision planting' || normalized === 'precisionplanting') {
    return 'precision_planting'
  }

  return null
}

export function formatTecnologia(value: Tecnologia | string | null | undefined): string {
  return TECNOLOGIAS.find((item) => item.value === value)?.label ?? 'Sin tecnología'
}
