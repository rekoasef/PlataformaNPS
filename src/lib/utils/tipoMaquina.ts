// Misma lista de modelos que usa la encuesta (ver src/app/encuesta/form-options.ts)
export const MAQUINAS_SEMBRADORA = ['Gringa', 'Pionera', 'Plantor', 'Drilor', 'Mixia', 'Domina'] as const
export const MAQUINAS_FERTILIZADORA = ['Corper (incorporadora)', 'Raster (motriz)', 'Movia (arrastre)', 'Luxion'] as const

export const MAQUINAS = [...MAQUINAS_SEMBRADORA, ...MAQUINAS_FERTILIZADORA] as const

export type TipoMaquina = (typeof MAQUINAS)[number]

export const TIPOS_MAQUINA: { value: TipoMaquina; label: string }[] = MAQUINAS.map((maquina) => ({
  value: maquina,
  label: maquina,
}))

function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function normalizeTipoMaquinaInput(value: string | null | undefined): TipoMaquina | null {
  const normalized = normalizeForMatch(value ?? '')
  if (!normalized) return null

  return MAQUINAS.find((maquina) => normalizeForMatch(maquina) === normalized) ?? null
}

export function formatTipoMaquina(value: TipoMaquina | string | null | undefined): string {
  return value && value.trim() ? value : '—'
}
