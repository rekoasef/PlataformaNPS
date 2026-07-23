const SLUG_HEADER_COLORS: Record<string, string> = {
  inicio_garantia: 'bg-blue-100/60 text-blue-800',
  fin_garantia:    'bg-amber-100/60 text-amber-800',
}

export default function TipoEncuestaBadge({ tipo }: { tipo: { nombre: string; slug: string } }) {
  const headerBg = SLUG_HEADER_COLORS[tipo.slug] ?? 'bg-muted text-muted-foreground'
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${headerBg}`}>
      {tipo.nombre}
    </span>
  )
}
