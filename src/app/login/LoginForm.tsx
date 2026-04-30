'use client'

import { useActionState } from 'react'
import { loginAction } from './actions'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

const initialState = { error: undefined }

export default function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, initialState)

  return (
    <form action={formAction} className="space-y-4">
      <Input
        label="Email"
        name="email"
        type="email"
        required
        autoComplete="email"
        disabled={isPending}
      />
      <Input
        label="Contraseña"
        name="password"
        type="password"
        required
        autoComplete="current-password"
        disabled={isPending}
      />
      {state?.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? 'Ingresando...' : 'Ingresar'}
      </Button>
    </form>
  )
}
