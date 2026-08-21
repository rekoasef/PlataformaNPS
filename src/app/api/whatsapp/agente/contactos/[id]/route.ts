import { NextResponse } from 'next/server'
import { z } from 'zod'
import { esAgenteAutorizado } from '@/lib/auth/agente'
import { reportarContacto } from '@/modules/whatsapp/services/whatsapp.service'

const BodySchema = z.object({
  estado: z.enum(['enviado', 'error']),
  error: z.string().max(500).optional(),
})

/** El script reporta cómo salió un contacto, apenas lo manda. */
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
  const resultado = await reportarContacto(id, parsed.data.estado, parsed.data.error)
  if (!resultado) return NextResponse.json({ error: 'Contacto no encontrado' }, { status: 404 })

  return NextResponse.json(resultado)
}
