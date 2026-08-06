'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import { archivarPlantillaAction, desarchivarPlantillaAction, duplicarPlantillaAction } from '@/app/(dashboard)/whatsapp/actions'
import type { PlantillaWhatsapp, PlantillaTipo } from '../types/whatsapp.types'

interface PlantillasTableProps {
  plantillas: PlantillaWhatsapp[]
}

const TIPO_BADGE: Record<PlantillaTipo, 'success' | 'info' | 'default'> = {
  inicial:       'success',
  recordatorio:  'info',
  personalizado: 'default',
}

const TIPO_LABEL: Record<PlantillaTipo, string> = {
  inicial:       'Inicial',
  recordatorio:  'Recordatorio',
  personalizado: 'Personalizado',
}

export default function PlantillasTable({ plantillas }: PlantillasTableProps) {
  const [isPending, startTransition] = useTransition()

  const handleArchivar = (id: string) => {
    if (!confirm('¿Archivar esta plantilla?')) return
    startTransition(async () => { await archivarPlantillaAction(id) })
  }

  const handleDesarchivar = (id: string) => {
    startTransition(async () => { await desarchivarPlantillaAction(id) })
  }

  const handleDuplicar = (id: string) => {
    startTransition(async () => { await duplicarPlantillaAction(id) })
  }

  if (plantillas.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border py-12 text-center">
        <p className="text-sm text-muted-foreground">No hay plantillas creadas todavía.</p>
        <Link
          href="/whatsapp/plantillas/nueva"
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
        >
          Crear primera plantilla →
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {plantillas.map((p) => (
        <div
          key={p.id}
          className="flex items-start justify-between rounded-lg border border-border bg-card px-4 py-3"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium text-foreground">{p.nombre}</span>
              <Badge variant={TIPO_BADGE[p.tipo]}>{TIPO_LABEL[p.tipo]}</Badge>
              {!p.activa && (
                <Badge variant="default">Archivada</Badge>
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {p.lineas.filter(Boolean).length} líneas con texto
              {p.ruta_imagen && ' · con imagen'}
            </p>
            <p className="mt-1 line-clamp-1 font-mono text-xs text-muted-foreground/70">
              {p.lineas[0] ?? ''}
            </p>
          </div>

          <div className="ml-4 flex shrink-0 gap-2">
            <Link
              href={`/whatsapp/plantillas/${p.id}/editar`}
              className="rounded px-2 py-1 text-xs font-medium text-muted-foreground
                         hover:bg-muted hover:text-foreground transition-colors"
            >
              Editar
            </Link>
            <button
              type="button"
              onClick={() => handleDuplicar(p.id)}
              disabled={isPending}
              className="rounded px-2 py-1 text-xs font-medium text-muted-foreground
                         hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
            >
              Duplicar
            </button>
            {p.activa ? (
              <button
                type="button"
                onClick={() => handleArchivar(p.id)}
                disabled={isPending}
                className="rounded px-2 py-1 text-xs font-medium text-muted-foreground
                           hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50"
              >
                Archivar
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleDesarchivar(p.id)}
                disabled={isPending}
                className="rounded px-2 py-1 text-xs font-medium text-muted-foreground
                           hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
              >
                Desarchivar
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
