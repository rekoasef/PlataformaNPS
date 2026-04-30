import PageContainer from '@/components/layout/PageContainer'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import ConfigForm from '@/modules/configuracion/components/ConfigForm'
import { getSystemConfig } from '@/modules/configuracion/services/configuracion.service'

export default async function ConfiguracionPage() {
  const config = await getSystemConfig()

  return (
    <PageContainer title="Configuración">
      {!config ? (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-900">Configuración no inicializada</h2>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              No existe una fila en <code>system_config</code>. Ejecuta el seed inicial de Supabase
              antes de continuar.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="max-w-3xl">
          <ConfigForm config={config} />
        </div>
      )}
    </PageContainer>
  )
}
