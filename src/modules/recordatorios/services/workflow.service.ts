import { createSupabaseServer } from '@/lib/supabase/server'

type EncuestaEstado =
  | 'pendiente'
  | 'recordatorio_enviado'
  | 'necesidad_de_llamado'
  | 'respondida'
  | 'sin_respuesta'

export async function syncWorkflowEstados() {
  const supabase = await createSupabaseServer()

  const [{ data: config, error: configError }, { data: envios, error: enviosError }] = await Promise.all([
    supabase
      .from('system_config')
      .select('dias_hasta_llamado')
      .limit(1)
      .maybeSingle(),
    supabase
      .from('envios')
      .select('campana_id, cliente_id, numero_recordatorio, fecha_envio, estado_envio')
      .eq('estado_envio', 'enviado'),
  ])

  if (configError) throw configError
  if (enviosError) throw enviosError
  if (!config) return

  const now = Date.now()
  const staleRecordatorio = (envios ?? []).filter((envio) => {
    if (envio.numero_recordatorio <= 0 || !envio.fecha_envio) return false
    const diffDays = (now - new Date(envio.fecha_envio).getTime()) / (1000 * 60 * 60 * 24)
    return diffDays >= config.dias_hasta_llamado
  })

  if (staleRecordatorio.length === 0) return

  const groupedByCampana = new Map<string, string[]>()
  for (const envio of staleRecordatorio) {
    const current = groupedByCampana.get(envio.campana_id) ?? []
    current.push(envio.cliente_id)
    groupedByCampana.set(envio.campana_id, current)
  }

  for (const [campanaId, clienteIds] of groupedByCampana.entries()) {
    const { error } = await supabase
      .from('encuestas')
      .update({ estado: 'necesidad_de_llamado' satisfies EncuestaEstado })
      .eq('campana_id', campanaId)
      .in('cliente_id', Array.from(new Set(clienteIds)))
      .eq('estado', 'recordatorio_enviado')

    if (error) throw error
  }
}
