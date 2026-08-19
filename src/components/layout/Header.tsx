import { logoutAction } from '@/lib/auth/actions'

export default function Header() {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-100 bg-white px-6">
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-1.5 rounded-full bg-brand" />
        <span className="text-xs font-medium text-gray-400 uppercase tracking-widest">Plataforma NPS</span>
      </div>

      <form action={logoutAction}>
        <button
          type="submit"
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H15" />
          </svg>
          Salir
        </button>
      </form>
    </header>
  )
}
