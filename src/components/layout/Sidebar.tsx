'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'

const navItems = [
  { href: '/', label: 'Dashboard', exact: true },
  { href: '/campanas', label: 'Campanas' },
  { href: '/clientes', label: 'Clientes' },
  { href: '/llamados', label: 'Llamados' },
  { href: '/sin-respuesta', label: 'Sin respuesta' },
  { href: '/respuestas', label: 'Respuestas' },
  { href: '/nps', label: 'NPS' },
  { href: '/configuracion', label: 'Configuracion' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 flex flex-col shrink-0" style={{ backgroundColor: '#1A1A1A' }}>
      <div className="px-5 py-5 border-b border-white/10">
        <span className="block text-base font-bold text-white tracking-tight">Crucianelli</span>
        <span className="block text-xs text-white/50 mt-0.5 uppercase tracking-widest">Plataforma NPS</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand text-white'
                  : 'text-white/60 hover:bg-white/10 hover:text-white'
              )}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="px-5 py-4 border-t border-white/10">
        <span className="text-xs text-white/30">v0.1 — interno</span>
      </div>
    </aside>
  )
}
