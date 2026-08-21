import { NextResponse } from 'next/server'
import { getJobConDetalle } from '@/modules/whatsapp/services/whatsapp.service'
import { getUsuarioActual } from '@/lib/auth/session'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // El middleware solo mira que exista la cookie, no que sea válida — la
  // verificación real va acá, como en el resto de la app. Sin esto, la
  // respuesta filtra celulares y las URLs con el token de cada encuesta.
  if (!(await getUsuarioActual())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await params
  const job = await getJobConDetalle(id)
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(job)
}
