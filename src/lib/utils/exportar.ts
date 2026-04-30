type FilaExport = {
  token: string
  clientes: {
    nombre: string
    telefono: string
    telefono_2: string | null
    telefono_3: string | null
    concesionario: string
    orden_fabricacion: string | null
  } | null
}

type FilaRespuestaExport = {
  fecha_respuesta: string
  campana_nombre: string
  cliente_nombre: string
  nombre_apellido: string | null
  email: string | null
  telefono: string | null
  calle_numero: string | null
  piso_departamento: string | null
  localidad: string | null
  codigo_postal: string | null
  provincia: string | null
  concesionario: string
  concesionario_sede: string | null
  maquina_modelo: string | null
  tipo_maquina: string
  tecnologia: string | null
  nombre_firma_factura: string | null
  calificacion_entrega_presentacion: number | null
  calificacion_puesta_marcha: number | null
  calificacion_capacitacion: number | null
  calificacion_funcionamiento_general: number | null
  calificacion_tecnico: number | null
  nps_concesionario: number
  nps_producto: number
  nps_empresa: number
  comentario_producto: string | null
  comentario_empresa: string | null
  comentario_general: string | null
}

function escaparCSV(val: string | null | undefined): string {
  const str = val ?? ''
  return `"${str.replace(/"/g, '""')}"`
}

export function generarCSVPendientes(encuestas: FilaExport[], appUrl: string): string {
  const headers = ['nombre', 'telefono', 'concesionario', 'orden_fabricacion', 'link_encuesta']
  const rows = encuestas.flatMap((e) => {
    const phones = [e.clientes?.telefono, e.clientes?.telefono_2, e.clientes?.telefono_3].filter(Boolean)

    return phones.map((phone) => [
      escaparCSV(e.clientes?.nombre),
      escaparCSV(phone),
      escaparCSV(e.clientes?.concesionario),
      escaparCSV(e.clientes?.orden_fabricacion),
      escaparCSV(`${appUrl}/encuesta?token=${e.token}`),
    ])
  })
  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
}

export function generarCSVRespuestas(respuestas: FilaRespuestaExport[]): string {
  const headers = [
    'fecha_respuesta',
    'campana',
    'cliente',
    'nombre_apellido',
    'email',
    'telefono',
    'calle_numero',
    'piso_departamento',
    'localidad',
    'codigo_postal',
    'provincia',
    'concesionario',
    'concesionario_sede',
    'maquina',
    'tipo_maquina',
    'tecnologia',
    'firma_factura',
    'calificacion_entrega_presentacion',
    'calificacion_puesta_marcha',
    'calificacion_capacitacion',
    'calificacion_funcionamiento_general',
    'calificacion_tecnico',
    'nps_concesionario',
    'nps_producto',
    'nps_empresa',
    'comentario_producto',
    'comentario_empresa',
    'comentario_general',
  ]

  const rows = respuestas.map((respuesta) => [
    escaparCSV(new Date(respuesta.fecha_respuesta).toLocaleString('es-AR')),
    escaparCSV(respuesta.campana_nombre),
    escaparCSV(respuesta.cliente_nombre),
    escaparCSV(respuesta.nombre_apellido),
    escaparCSV(respuesta.email),
    escaparCSV(respuesta.telefono),
    escaparCSV(respuesta.calle_numero),
    escaparCSV(respuesta.piso_departamento),
    escaparCSV(respuesta.localidad),
    escaparCSV(respuesta.codigo_postal),
    escaparCSV(respuesta.provincia),
    escaparCSV(respuesta.concesionario),
    escaparCSV(respuesta.concesionario_sede),
    escaparCSV(respuesta.maquina_modelo),
    escaparCSV(respuesta.tipo_maquina),
    escaparCSV(respuesta.tecnologia),
    escaparCSV(respuesta.nombre_firma_factura),
    escaparCSV(respuesta.calificacion_entrega_presentacion === null ? null : String(respuesta.calificacion_entrega_presentacion)),
    escaparCSV(respuesta.calificacion_puesta_marcha === null ? null : String(respuesta.calificacion_puesta_marcha)),
    escaparCSV(respuesta.calificacion_capacitacion === null ? null : String(respuesta.calificacion_capacitacion)),
    escaparCSV(respuesta.calificacion_funcionamiento_general === null ? null : String(respuesta.calificacion_funcionamiento_general)),
    escaparCSV(respuesta.calificacion_tecnico === null ? null : String(respuesta.calificacion_tecnico)),
    escaparCSV(String(respuesta.nps_concesionario)),
    escaparCSV(String(respuesta.nps_producto)),
    escaparCSV(String(respuesta.nps_empresa)),
    escaparCSV(respuesta.comentario_producto),
    escaparCSV(respuesta.comentario_empresa),
    escaparCSV(respuesta.comentario_general),
  ])

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')
}
