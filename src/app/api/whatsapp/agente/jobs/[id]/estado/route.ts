import { NextResponse } from 'next/server'
import { z } from 'zod'
import { esAgenteAutorizado } from '@/lib/auth/agente'
import { marcarJobEstado } from '@/modules/whatsapp/services/whatsapp.service'

const BodySchema = z.object({
  estado: z.enum(['en_progreso', 'completado', 'error', 'interrumpido']),
})

/**
 * El script avisa que arrancó o que terminó.
 *
 * Ojo: el estado que queda no siempre es el que se pidió — un job detenido
 * desde la plataforma no vuelve a `completado`. Por eso la respuesta devuelve
 * `estado`, para que el script sepa con qué se quedó.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!esAgenteAutorizado(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { id } = await params
  const estado = await marcarJobEstado(id, parsed.data.estado)
  if (!estado) return NextResponse.json({ error: 'Job no encontrado' }, { status: 404 })

  return NextResponse.json({ estado })
}
