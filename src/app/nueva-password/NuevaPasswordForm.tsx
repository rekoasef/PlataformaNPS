'use client'

import { useActionState } from 'react'
import { actualizarPasswordAction } from './actions'

const initialState: { error?: string } = {}

export default function NuevaPasswordForm({ token }: { token: string }) {
  const [state, formAction, isPending] = useActionState(actualizarPasswordAction, initialState)

  return (
    <form action={formAction} className="space-y-5">
      {/* Better Auth identifica el pedido de reset con este token (viene en el link del mail) */}
      <input type="hidden" name="token" value={token} />
      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Nueva contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          disabled={isPending}
          placeholder="Mínimo 8 caracteres"
          className="block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 transition-all focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:opacity-60"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="confirmar" className="block text-sm font-medium text-gray-700">
          Confirmá la contraseña
        </label>
        <input
          id="confirmar"
          name="confirmar"
          type="password"
          required
          minLength={8}
          disabled={isPending}
          placeholder="Repetí la contraseña"
          className="block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 transition-all focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:opacity-60"
        />
      </div>

      {state?.error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
          <svg className="h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <p className="text-sm text-red-600">{state.error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="group relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand/30 transition-all hover:bg-brand-dark hover:shadow-brand/40 disabled:opacity-70"
      >
        {isPending ? (
          <>
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Guardando...
          </>
        ) : (
          <>
            Guardar contraseña
            <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </>
        )}
      </button>
    </form>
  )
}
