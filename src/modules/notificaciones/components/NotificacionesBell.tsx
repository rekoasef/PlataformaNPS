'use client'

import { useState, useTransition } from 'react'
import {
  Bell,
  AlertTriangle,
  MessageSquare,
  Gift,
  Activity,
  CalendarClock,
  Check,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { marcarTodasLeidasAction } from '@/app/(dashboard)/notificaciones/actions'
import type { Notificacion, NotificacionTipo } from '../types/notificacion.types'

interface Props {
  notificaciones: Notificacion[]
  unreadCount: number
}

const TIPO_CONFIG: Record<NotificacionTipo, {
  icon: React.ElementType
  iconColor: string
  iconBg: string
}> = {
  nps_critico: {
    icon: AlertTriangle,
    iconColor: 'text-red-500',
    iconBg: 'bg-red-100',
  },
  nueva_respuesta: {
    icon: MessageSquare,
    iconColor: 'text-blue-500',
    iconBg: 'bg-blue-100',
  },
  regalo_pendiente: {
    icon: Gift,
    iconColor: 'text-amber-500',
    iconBg: 'bg-amber-100',
  },
  campana_sin_actividad: {
    icon: Activity,
    iconColor: 'text-orange-500',
    iconBg: 'bg-orange-100',
  },
  aviso_recordatorio: {
    icon: CalendarClock,
    iconColor: 'text-amber-600',
    iconBg: 'bg-amber-100',
  },
}

function tiempoRelativo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Ahora'
  if (mins < 60) return `Hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `Hace ${hrs}h`
  return `Hace ${Math.floor(hrs / 24)}d`
}

export default function NotificacionesBell({ notificaciones: initial, unreadCount: initialCount }: Props) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState(initial)
  const [badge, setBadge] = useState(initialCount)
  const [, startTransition] = useTransition()

  function handleOpen() {
    setOpen(true)
    if (badge > 0) {
      setBadge(0)
      setItems(prev => prev.map(n => ({ ...n, leida: true })))
      startTransition(() => { marcarTodasLeidasAction() })
    }
  }

  return (
    <div className="relative">
      {open && (
        <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} aria-hidden />
      )}

      {/* Botón campanita */}
      <button
        type="button"
        onClick={open ? () => setOpen(false) : handleOpen}
        aria-label={badge > 0 ? `${badge} notificaciones sin leer` : 'Notificaciones'}
        className="relative flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground
                   transition-colors duration-150 hover:bg-muted hover:text-foreground
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Bell size={16} aria-hidden />
        {badge > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center
                           rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-white">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-80 rounded-xl border border-border bg-card shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-foreground">Notificaciones</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground
                         hover:bg-muted hover:text-foreground"
            >
              <X size={13} />
            </button>
          </div>

          {/* Lista */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-border">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10">
                <Check size={22} className="mb-2 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">Sin notificaciones</p>
              </div>
            ) : (
              items.map((n) => {
                const cfg = TIPO_CONFIG[n.tipo]
                const Icon = cfg.icon
                return (
                  <div
                    key={n.id}
                    className={cn(
                      'flex gap-3 px-4 py-3',
                      !n.leida && 'bg-muted/50'
                    )}
                  >
                    <div className={cn(
                      'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                      cfg.iconBg
                    )}>
                      <Icon size={13} className={cfg.iconColor} aria-hidden />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground">{n.titulo}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{n.mensaje}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground/50">{tiempoRelativo(n.created_at)}</p>
                    </div>

                    {!n.leida && (
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
