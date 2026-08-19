import NuevaPasswordForm from './NuevaPasswordForm'

interface Props {
  searchParams: Promise<{ token?: string }>
}

export default async function NuevaPasswordPage({ searchParams }: Props) {
  // Better Auth manda el token como query param del link del mail.
  const { token } = await searchParams

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200/80 bg-white shadow-2xl shadow-gray-200/60">

        <div className="h-1.5 w-full rounded-t-2xl bg-gradient-to-r from-brand via-red-400 to-brand" />

        <div className="px-8 py-10">
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

          <NuevaPasswordForm token={token ?? ''} />
        </div>
      </div>
    </div>
  )
}
