import NuevaPasswordForm from './NuevaPasswordForm'

interface Props {
  searchParams: Promise<{ token?: string; error?: string }>
}

/**
 * A esta página se llega desde el link del mail de recuperación, pero **no
 * directo**: el link apunta a `/api/auth/reset-password/{token}`, que valida el
 * token y recién ahí redirige acá con `?token=`.
 *
 * Si el token venció o no existe, esa validación redirige con `?error=` y **sin
 * token**. Por eso hay que mirar los dos parámetros: sin este chequeo el usuario
 * ve el formulario normal, completa la contraseña dos veces y recién al enviar
 * se entera de que el enlace no servía.
 */
export default async function NuevaPasswordPage({ searchParams }: Props) {
  const { token, error } = await searchParams
  const enlaceInvalido = !!error || !token

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200/80 bg-white shadow-2xl shadow-gray-200/60">

        <div className="h-1.5 w-full rounded-t-2xl bg-gradient-to-r from-brand via-red-400 to-brand" />

        <div className="px-8 py-10">
          {enlaceInvalido ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50">
                <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-gray-900">Enlace vencido o inválido</h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                Los enlaces de recuperación duran 1 hora. Pedí uno nuevo y usalo apenas te llegue.
              </p>
              <a
                href="/login"
                className="mt-6 inline-block rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Pedir un enlace nuevo
              </a>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10">
                  <svg className="h-5 w-5 text-brand" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 0 1 21.75 8.25Z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-gray-900">Nueva contraseña</h2>
                <p className="mt-1.5 text-sm text-gray-500">
                  Elegí una contraseña nueva para tu cuenta.
                </p>
              </div>

              <NuevaPasswordForm token={token} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
