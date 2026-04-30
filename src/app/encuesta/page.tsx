import { notFound } from 'next/navigation'
import { createSupabaseAdmin } from '@/lib/supabase/server'
import FormularioEncuesta from './FormularioEncuesta'

interface Props {
  searchParams: Promise<{ token?: string }>
}

export default async function EncuestaPage({ searchParams }: Props) {
  const { token } = await searchParams

  if (!token) notFound()

  const supabase = createSupabaseAdmin()

  const { data: encuesta } = await supabase
    .from('encuestas')
    .select('id, estado, clientes(concesionario)')
    .eq('token', token)
    .single()

  if (!encuesta) notFound()

  if (encuesta.estado === 'respondida') {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">¡Gracias por tu respuesta!</h2>
          <p className="text-gray-500 text-sm">
            Ya completaste esta encuesta. Tu opinión fue registrada exitosamente.
          </p>
        </div>
      </main>
    )
  }

  if (encuesta.estado === 'sin_respuesta') {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 max-w-md w-full text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Encuesta cerrada</h2>
          <p className="text-gray-500 text-sm">
            Esta OF fue marcada como sin respuesta y ya no está disponible para completar.
          </p>
        </div>
      </main>
    )
  }

  const concesionario = Array.isArray(encuesta.clientes)
    ? encuesta.clientes[0]?.concesionario ?? ''
    : (encuesta.clientes as { concesionario: string } | null)?.concesionario ?? ''

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 mb-1">
            <span className="text-2xl font-bold text-brand">Crucianelli</span>
          </div>
          <p className="text-gray-500 text-sm">Encuesta de satisfacción de clientes</p>
        </div>

        <FormularioEncuesta token={token} concesionario={concesionario} />

        <p className="text-center text-xs text-gray-400 pb-4">
          Crucianelli · Tus respuestas son confidenciales
        </p>
      </div>
    </main>
  )
}
