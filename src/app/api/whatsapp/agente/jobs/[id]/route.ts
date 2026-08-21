import { NextResponse } from 'next/server'
import { esAgenteAutorizado } from '@/lib/auth/agente'
import { getJobParaAgente } from '@/modules/whatsapp/services/whatsapp.service'

/**
 * El job y los contactos que faltan mandar, para el script del operador.
 *
 * El script vuelve a pedir esto entre contacto y contacto para enterarse de si
 * lo detuvieron desde la plataforma (`estado === 'interrumpido'`).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!esAgenteAutorizado(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await params
  const job = await getJobParaAgente(id)
  if (!job) return NextResponse.json({ error: 'Job no encontrado' }, { status: 404 })

  return NextResponse.json(job)
}
