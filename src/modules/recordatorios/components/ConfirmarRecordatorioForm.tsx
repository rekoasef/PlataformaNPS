'use client'

import { useActionState } from 'react'
import Button from '@/components/ui/Button'
import { confirmarEnvioRecordatorioAction } from '@/app/(dashboard)/campanas/[id]/recordatorio/actions'

interface ConfirmarRecordatorioFormProps {
  campanaId: string
  numeroRecordatorio: number
}

export default function ConfirmarRecordatorioForm({
  campanaId,
  numeroRecordatorio,
}: ConfirmarRecordatorioFormProps) {
  const [state, formAction, isPending] = useActionState(confirmarEnvioRecordatorioAction, {})

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="campanaId" value={campanaId} />
      <input type="hidden" name="numeroRecordatorio" value={numeroRecordatorio} />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Confirmando...' : `Confirmar envío de recordatorio ${numeroRecordatorio}`}
      </Button>
    </form>
  )
}
