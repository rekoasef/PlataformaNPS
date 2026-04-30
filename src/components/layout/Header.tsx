import { logoutAction } from '@/lib/supabase/actions'

export default function Header() {
  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-end px-6 shrink-0">
      <form action={logoutAction}>
        <button
          type="submit"
          className="text-sm text-gray-500 hover:text-gray-900 font-medium transition-colors"
        >
          Cerrar sesión
        </button>
      </form>
    </header>
  )
}
