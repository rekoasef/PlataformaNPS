export function getNpsAnswerVariant(value: number): 'danger' | 'warning' | 'success' {
  if (value <= 6) return 'danger'
  if (value <= 8) return 'warning'
  return 'success'
}

export function getNpsScoreVariant(value: number | null): 'default' | 'danger' | 'warning' | 'success' {
  if (value === null) return 'default'
  if (value < 0) return 'danger'
  if (value < 30) return 'warning'
  return 'success'
}
