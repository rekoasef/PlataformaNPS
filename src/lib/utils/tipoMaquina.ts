export type TipoMaquina = 'sembradora' | 'fertilizadora'

export const TIPOS_MAQUINA: { value: TipoMaquina; label: string }[] = [
  { value: 'sembradora', label: 'Sembradora' },
  { value: 'fertilizadora', label: 'Fertilizadora' },
]

export function normalizeTipoMaquinaInput(value: string | null | undefined): TipoMaquina | null {
  const normalized = (value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

  if (!normalized) return null
  if (normalized === 'sembradora') return 'sembradora'
  if (normalized === 'fertilizadora') return 'fertilizadora'

  return null
}

export function formatTipoMaquina(value: TipoMaquina | string | null | undefined): string {
  return TIPOS_MAQUINA.find((item) => item.value === value)?.label ?? 'Sin tipo de máquina'
}
