'use client'

import { useActionState } from 'react'
import Button from '@/components/ui/Button'
import { eliminarEncuestaAction } from '@/app/(dashboard)/campanas/actions'

interface EliminarEncuestaFormProps {
  encuestaId: string
  clienteNombre: string
}

export default function EliminarEncuestaForm({ encuestaId, clienteNombre }: EliminarEncuestaFormProps) {
  const [state, formAction, isPending] = useActionState(eliminarEncuestaAction, {})

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        const confirmed = window.confirm(
          `¿Eliminar la encuesta de "${clienteNombre}"? Se eliminará también su respuesta y envíos asociados, si existen.`
        )
        if (!confirmed) event.preventDefault()
      }}
      className="inline-flex flex-col items-end gap-1"
    >
      <input type="hidden" name="encuesta_id" value={encuestaId} />
      <Button type="submit" variant="danger" size="sm" disabled={isPending}>
        {isPending ? 'Eliminando...' : 'Eliminar'}
      </Button>
      {state?.error && (
        <span className="max-w-48 text-right text-xs font-medium text-red-600">{state.error}</span>
      )}
    </form>
  )
}
