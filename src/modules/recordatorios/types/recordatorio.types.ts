import type { Tables } from '@/types/database.types'

export type Envio = Tables<'envios'>
export type EnvioEstado = 'pendiente_envio' | 'enviado'

export type RecordatorioResumen = {
  numero_recordatorio: number
  estado_envio: EnvioEstado
  fecha_envio: string | null
  total_clientes: number
}

export type ClientePendienteRecordatorio = {
  id: string
  token: string
  estado: 'pendiente' | 'recordatorio_enviado' | 'necesidad_de_llamado' | 'respondida' | 'sin_respuesta'
  clientes: {
    id: string
    nombre: string
    telefono: string
    telefono_2: string | null
    telefono_3: string | null
    concesionario: string
    orden_fabricacion: string | null
  } | null
}

export type PuedeCrearRecordatorioResult = {
  allowed: boolean
  nextNumero: number | null
  reason?: string
}

export type EncuestaNecesidadLlamado = {
  id: string
  token: string
  estado: 'necesidad_de_llamado'
  campana: {
    id: string
    nombre: string
    fecha: string
  } | null
  cliente: {
    id: string
    nombre: string
    telefono: string
    telefono_2: string | null
    telefono_3: string | null
    concesionario: string
    orden_fabricacion: string | null
  } | null
}

export type EncuestaSinRespuesta = {
  id: string
  token: string
  estado: 'sin_respuesta'
  comentario: string | null
  marcadoAt: string | null
  campana: {
    id: string
    nombre: string
    fecha: string
  } | null
  cliente: {
    id: string
    nombre: string
    telefono: string
    telefono_2: string | null
    telefono_3: string | null
    concesionario: string
    orden_fabricacion: string | null
  } | null
}
