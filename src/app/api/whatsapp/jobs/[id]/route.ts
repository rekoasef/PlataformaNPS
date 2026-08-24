import { NextResponse } from 'next/server'
import { getJobConDetalle } from '@/modules/whatsapp/services/whatsapp.service'
import { rechazarSiNoAutorizado } from '@/lib/auth/api'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // La respuesta trae celulares y las URLs con el token de cada encuesta, así
  // que no alcanza con que haya sesión: se exige el rol de /whatsapp.
  const rechazo = await rechazarSiNoAutorizado('/whatsapp')
  if (rechazo) return rechazo

  const { id } = await params
  const job = await getJobConDetalle(id)
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(job)
}
