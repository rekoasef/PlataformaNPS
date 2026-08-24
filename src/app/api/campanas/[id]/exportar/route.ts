import { db } from '@/lib/db/client'
import { campanas, clientes, encuestas } from '@/lib/db/schema'
import { and, eq, inArray } from 'drizzle-orm'
import { generarCSVPendientes } from '@/lib/utils/exportar'
import { NextResponse } from 'next/server'
import { rechazarSiNoAutorizado } from '@/lib/auth/api'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Sesión y rol: el CSV incluye el link con el token de cada encuesta, que
  // permite responder en nombre del cliente. Es la página /campanas la que
  // define quién puede verlo.
  const rechazo = await rechazarSiNoAutorizado('/campanas')
  if (rechazo) return rechazo

  const { id } = await params

  const [[campana], encuestasPendientes] = await Promise.all([
    db.select({ nombre: campanas.nombre }).from(campanas).where(eq(campanas.id, id)).limit(1),
    db
      .select({
        token: encuestas.token,
        clientes: {
          nombre: clientes.nombre,
          telefono: clientes.telefono,
          telefono_2: clientes.telefono2,
          telefono_3: clientes.telefono3,
          concesionario: clientes.concesionario,
          orden_fabricacion: clientes.ordenFabricacion,
        },
      })
      .from(encuestas)
      .innerJoin(clientes, eq(encuestas.clienteId, clientes.id))
      .where(and(eq(encuestas.campanaId, id), inArray(encuestas.estado, ['pendiente', 'recordatorio_enviado']))),
  ])

  if (!campana) {
    return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const csv = generarCSVPendientes(encuestasPendientes, appUrl)
  const filename = `pendientes_${campana.nombre.replace(/\s+/g, '_')}.csv`

  return new Response(csv, {
    headers: {
      'Content-Type':        'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
