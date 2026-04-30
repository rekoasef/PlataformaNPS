export function generarToken(): string {
  return crypto.randomUUID()
}
