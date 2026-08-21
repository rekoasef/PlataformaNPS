import PageContainer from '@/components/layout/PageContainer'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import Link from 'next/link'

export default function WhatsappSetupPage() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const regContent = `Windows Registry Editor Version 5.00

[HKEY_CLASSES_ROOT\\whatsapp-sender]
@="URL:WhatsApp Sender Protocol"
"URL Protocol"=""

[HKEY_CLASSES_ROOT\\whatsapp-sender\\shell]

[HKEY_CLASSES_ROOT\\whatsapp-sender\\shell\\open]

[HKEY_CLASSES_ROOT\\whatsapp-sender\\shell\\open\\command]
@="\\"C:\\\\Windows\\\\System32\\\\cmd.exe\\" /c \\"C:\\\\ruta\\\\a\\\\launcher.bat\\" \\"%1\\""
`

  const batContent = `@echo off
cd /d "C:\\ruta\\a\\mensajes.py"
call .venv\\Scripts\\activate
python mensajes.py --job %1
pause`

  return (
    <PageContainer title="Setup del script local">
      <div className="max-w-2xl space-y-6">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Este setup se hace <strong>una sola vez</strong> en la PC Windows donde corre el script.
          Después, los botones &quot;Ejecutar&quot; de la plataforma funcionan con un solo clic.
        </div>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold">Paso 1 — Crear launcher.bat</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Creá un archivo <code className="rounded bg-muted px-1 text-xs">launcher.bat</code> en
              la carpeta donde está <code className="rounded bg-muted px-1 text-xs">mensajes.py</code>.
              Editá la ruta según tu instalación.
            </p>
            <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-xs text-foreground">
              {batContent}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold">Paso 2 — Registrar el protocolo</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Creá un archivo{' '}
              <code className="rounded bg-muted px-1 text-xs">registrar-protocolo.reg</code> con
              este contenido. Editá la ruta al <code className="rounded bg-muted px-1 text-xs">launcher.bat</code>.
              Luego hacé doble clic y aceptá la confirmación de Windows.
            </p>
            <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-xs text-foreground">
              {regContent}
            </pre>
            <p className="text-xs text-muted-foreground">
              En la ruta de la clave de registro, usá doble backslash{' '}
              <code className="rounded bg-muted px-1 text-xs">\\</code> como separador.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold">Paso 3 — Actualizar mensajes.py</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Reemplazá el <code className="rounded bg-muted px-1 text-xs">mensajes.py</code> actual
              con la versión del repositorio del proyecto, en{' '}
              <code className="rounded bg-muted px-1 text-xs">scripts/whatsapp/mensajes.py</code>.
            </p>
            <p className="text-sm text-muted-foreground">
              El script también necesita un archivo{' '}
              <code className="rounded bg-muted px-1 text-xs">.env</code> en la misma carpeta con:
            </p>
            <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-xs text-foreground">
              {`PLATAFORMA_URL=${appUrl}
WHATSAPP_AGENTE_TOKEN=pedíselo a quien administra el servidor`}
            </pre>
            <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              El token es el mismo <code className="rounded bg-background px-1">WHATSAPP_AGENTE_TOKEN</code>{' '}
              que está configurado en el servidor. Solo habilita los endpoints de envío: si se
              filtra, se revoca cambiándolo en el servidor y en esta PC, sin tocar nada más.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold">Paso 4 — Verificar</h2>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Creá un job de prueba desde cualquier campaña. Hacé clic en{' '}
              <strong>▶ Ejecutar</strong>. El browser debería preguntar si querés abrir{' '}
              <em>whatsapp-sender</em> — aceptá y la terminal se abre automáticamente.
            </p>
          </CardContent>
        </Card>

        <div className="text-center">
          <Link
            href="/whatsapp"
            className="text-sm font-medium text-brand hover:underline"
          >
            ← Volver a WhatsApp
          </Link>
        </div>
      </div>
    </PageContainer>
  )
}
