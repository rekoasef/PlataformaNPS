import { notFound } from 'next/navigation'
import { getEncuestaPorToken } from './encuesta.db'
import FormularioEncuesta from './FormularioEncuesta'
import FormularioFinGarantia from './FormularioFinGarantia'

interface Props {
  searchParams: Promise<{ token?: string }>
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* Hero rojo */}
      <div className="relative bg-[#C0272D] pt-12 pb-20 px-4 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-1.5 mb-6">
          <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <span className="text-white text-xs font-medium tracking-wide">Encuesta Oficial Crucianelli 2026</span>
        </div>

        <h1 className="text-white font-extrabold text-3xl md:text-4xl leading-tight mb-3">
          Contanos tu experiencia
        </h1>
        <p className="text-white/75 text-base max-w-md mx-auto leading-relaxed">
          Tu opinión es clave para mejorar el producto, la atención y la experiencia con Crucianelli.
        </p>

        {/* Ola */}
        <div className="absolute -bottom-px left-0 right-0 leading-none">
          <svg viewBox="0 0 1440 70" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-[71px]">
            <path d="M0,40 C200,70 400,10 600,45 C800,75 1050,15 1200,50 C1310,72 1380,45 1440,38 L1440,71 L0,71 Z" fill="white" />
          </svg>
        </div>
      </div>

      {/* Logo debajo de la ola */}
      <div className="flex justify-center pt-8 pb-2">
        <img src="/CrucianelliLogo.png" alt="Crucianelli" width={240} />
      </div>

      {/* Contenido */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
        {children}
      </main>

      <footer className="text-center text-xs text-gray-400 py-6 border-t border-gray-100">
        Crucianelli © 2026 &nbsp;·&nbsp; Tus respuestas son confidenciales
      </footer>
    </div>
  )
}

export default async function EncuestaPage({ searchParams }: Props) {
  const { token } = await searchParams

  if (!token) notFound()

  const encuesta = await getEncuestaPorToken(token)

  if (!encuesta) notFound()

  if (encuesta.estado === 'respondida') {
    return (
      <PageShell>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center mt-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-5">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">¡Encuesta ya respondida!</h2>
          <p className="text-gray-500 text-sm max-w-sm mx-auto">
            Esta encuesta ya fue completada. Muchas gracias por tu tiempo y colaboración.
          </p>
        </div>
      </PageShell>
    )
  }

  if (encuesta.estado === 'sin_respuesta') {
    return (
      <PageShell>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center mt-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-5">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Encuesta cerrada</h2>
          <p className="text-gray-500 text-sm max-w-sm mx-auto">
            Esta encuesta ya no está disponible para completar.
          </p>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell>
      {encuesta.tipoSlug === 'fin_garantia'
        ? <FormularioFinGarantia token={token} concesionario={encuesta.concesionario} />
        : <FormularioEncuesta token={token} concesionario={encuesta.concesionario} />
      }
    </PageShell>
  )
}
