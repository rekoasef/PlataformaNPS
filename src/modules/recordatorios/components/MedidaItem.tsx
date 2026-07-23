'use client'

import { useActionState, useEffect, useState } from 'react'
import Button from '@/components/ui/Button'
import { formatFechaHora } from '@/lib/utils/fecha'
import { editarMedidaAction, eliminarMedidaAction } from '@/app/(dashboard)/llamados/actions'
import type { EncuestaMedida } from '../types/recordatorio.types'

interface MedidaItemProps {
  medida: EncuestaMedida
}

export default function MedidaItem({ medida }: MedidaItemProps) {
  const [editing, setEditing] = useState(false)
  const [editState, editAction, isSaving] = useActionState(editarMedidaAction, {})
  const [deleteState, deleteAction, isDeleting] = useActionState(eliminarMedidaAction, {})

  useEffect(() => {
    if (editState?.success) {
      setEditing(false)
    }
  }, [editState])

  const fueEditada = medida.updatedAt !== medida.createdAt

  if (editing) {
    return (
      <li className="text-sm">
        <form action={editAction} className="space-y-1.5">
          <input type="hidden" name="medidaId" value={medida.id} />
          <textarea
            name="comentario"
            defaultValue={medida.comentario}
            rows={2}
            required
            minLength={3}
            maxLength={2000}
            disabled={isSaving}
            autoFocus
            className="block w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {editState?.error && <p className="text-xs text-red-600">{editState.error}</p>}
          <div className="flex gap-2">
            <Button type="submit" variant="secondary" size="sm" disabled={isSaving}>
              {isSaving ? 'Guardando...' : 'Guardar'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isSaving}
              onClick={() => setEditing(false)}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </li>
    )
  }

  return (
    <li className="text-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="block text-xs font-medium text-muted-foreground">
            {formatFechaHora(medida.createdAt)}
            {fueEditada && ` · editado ${formatFechaHora(medida.updatedAt)}`}
          </span>
          <span className="block whitespace-pre-wrap text-foreground">{medida.comentario}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="font-medium text-brand hover:underline"
          >
            Editar
          </button>
          <form
            action={deleteAction}
            onSubmit={(event) => {
              if (!window.confirm('¿Eliminar esta medida? Esta acción no se puede deshacer.')) {
                event.preventDefault()
              }
            }}
          >
            <input type="hidden" name="medidaId" value={medida.id} />
            <button type="submit" disabled={isDeleting} className="font-medium text-red-600 hover:underline">
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </button>
          </form>
        </div>
      </div>
      {deleteState?.error && <p className="mt-1 text-xs text-red-600">{deleteState.error}</p>}
    </li>
  )
}
