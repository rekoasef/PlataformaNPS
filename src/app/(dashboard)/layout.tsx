import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import AppSidebar from '@/components/layout/AppSidebar'
import Topbar from '@/components/layout/Topbar'
import { SidebarProvider } from '@/hooks/use-sidebar'
import { getUsuarioActual } from '@/lib/auth/session'
import { puedeAcceder, rutaInicial } from '@/lib/auth/rutas'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const usuario = await getUsuarioActual()

  // El middleware solo mira si existe la cookie; la sesión se valida acá contra
  // la base. Una cookie vieja o revocada llega hasta este punto y cae al login.
  if (!usuario) redirect('/login')

  // Autorización por rol: antes la hacía el middleware leyendo el JWT, ahora se
  // resuelve acá porque el rol vive en la base (ver src/lib/auth/rutas.ts).
  const pathname = (await headers()).get('x-pathname') ?? '/'
  if (!puedeAcceder(usuario.role, pathname)) {
    redirect(rutaInicial(usuario.role))
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <AppSidebar role={usuario.role} />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Topbar role={usuario.role} />
          <main
            id="main-content"
            className="flex-1 overflow-y-auto overflow-x-hidden"
            tabIndex={-1}
          >
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
