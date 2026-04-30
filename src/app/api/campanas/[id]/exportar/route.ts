import { createSupabaseAdmin, createSupabaseServer } from '@/lib/supabase/server'
import { generarCSVPendientes } from '@/lib/utils/exportar'
import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verificar autenticación
  const supabaseAuth = await createSupabaseServer()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await params
  const supabase = createSupabaseAdmin()

  const [{ data: campana }, { data: encuestas }] = await Promise.all([
    supabase.from('campanas').select('nombre').eq('id', id).single(),
    supabase
      .from('encuestas')
      .select('token, clientes(nombre, telefono, telefono_2, telefono_3, concesionario, orden_fabricacion)')
      .eq('campana_id', id)
      .in('estado', ['pendiente', 'recordatorio_enviado']),
  ])

  if (!campana) {
    return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const csv = generarCSVPendientes(encuestas ?? [], appUrl)
  const filename = `pendientes_${campana.nombre.replace(/\s+/g, '_')}.csv`

  return new Response(csv, {
    headers: {
      'Content-Type':        'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
