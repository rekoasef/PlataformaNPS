import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { generarCSVRespuestas } from '@/lib/utils/exportar'
import { formatTecnologia, normalizeTecnologiaInput } from '@/lib/utils/tecnologia'
import { getRespuestas } from '@/modules/dashboard/services/dashboard.service'

export async function GET(request: Request) {
  const supabase = await createSupabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') ?? undefined
  const concesionario = searchParams.get('concesionario') ?? undefined
  const campanaId = searchParams.get('campanaId') ?? undefined
  const fechaDesde = searchParams.get('fechaDesde') ?? undefined
  const fechaHasta = searchParams.get('fechaHasta') ?? undefined
  const tecnologia = normalizeTecnologiaInput(searchParams.get('tecnologia'))

  const respuestas = await getRespuestas({
    q,
    concesionario,
    campanaId,
    fechaDesde,
    fechaHasta,
    tecnologia: tecnologia ?? undefined,
  })

  const csv = generarCSVRespuestas(
    respuestas.map((item) => ({
      fecha_respuesta: item.fechaRespuesta,
      campana_nombre: item.campanaNombre,
      cliente_nombre: item.clienteNombre,
      nombre_apellido: item.nombreApellido,
      email: item.email,
      telefono: item.telefono,
      calle_numero: item.calleNumero,
      piso_departamento: item.pisoDepartamento,
      localidad: item.localidad,
      codigo_postal: item.codigoPostal,
      provincia: item.provincia,
      concesionario: item.concesionario,
      concesionario_sede: item.concesionarioSede,
      maquina_modelo: item.maquinaModelo,
      tipo_maquina: item.tipoMaquina,
      tecnologia: item.tecnologia ? formatTecnologia(item.tecnologia) : null,
      nombre_firma_factura: item.nombreFirmaFactura,
      calificacion_entrega_presentacion: item.calificacionEntregaPresentacion,
      calificacion_puesta_marcha: item.calificacionPuestaMarcha,
      calificacion_capacitacion: item.calificacionCapacitacion,
      calificacion_funcionamiento_general: item.calificacionFuncionamientoGeneral,
      calificacion_tecnico: item.calificacionTecnico,
      nps_concesionario: item.npsConcesionario,
      nps_producto: item.npsProducto,
      nps_empresa: item.npsEmpresa,
      comentario_producto: item.comentarioProducto,
      comentario_empresa: item.comentarioEmpresa,
      comentario_general: item.comentarioGeneral,
    }))
  )

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="respuestas_encuestas.csv"',
    },
  })
}
