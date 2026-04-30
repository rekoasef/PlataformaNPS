import type { Tables, TablesUpdate } from '@/types/database.types'

export type SystemConfig = Tables<'system_config'>

export type SystemConfigUpdate = Pick<
  TablesUpdate<'system_config'>,
  'dias_notificacion_inicial' | 'dias_notificacion_recordatorio' | 'dias_hasta_llamado' | 'emails_notificacion'
>
