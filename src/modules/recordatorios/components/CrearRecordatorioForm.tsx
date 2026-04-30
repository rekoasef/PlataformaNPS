'use client'

import { useActionState } from 'react'
import Button from '@/components/ui/Button'
import { crearRecordatorioAction } from '@/app/(dashboard)/campanas/[id]/recordatorio/actions'

interface CrearRecordatorioFormProps {
  campanaId: string
}

export default function CrearRecordatorioForm({ campanaId }: CrearRecordatorioFormProps) {
  const [state, formAction, isPending] = useActionState(crearRecordatorioAction, {})

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="campanaId" value={campanaId} />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Creando recordatorio...' : 'Crear recordatorio'}
      </Button>
    </form>
  )
}
