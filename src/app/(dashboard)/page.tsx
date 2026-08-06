import PageContainer from '@/components/layout/PageContainer'
import IndicadoresPanel from '@/modules/dashboard/components/IndicadoresPanel'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import RespuestasTable from '@/modules/dashboard/components/RespuestasTable'
import {
  getEfectividadEnvios,
  getNpsPorTipoEncuesta,
  getNpsResumenExtendido,
  getRespuestas,
} from '@/modules/dashboard/services/dashboard.service'
import { checkAvisosRecordatorio } from '@/modules/recordatorios/services/avisos.service'

export default async function DashboardPage() {
  const [resumen, efectividad, respuestas, npsPorTipo] = await Promise.all([
    getNpsResumenExtendido(),
    getEfectividadEnvios(),
    getRespuestas(),
    getNpsPorTipoEncuesta(),
    checkAvisosRecordatorio().catch((err) =>
      console.error('[dashboard] checkAvisosRecordatorio falló:', err)
    ),
  ])

  return (
    <PageContainer title="Dashboard">
      <div className="space-y-6">
        <IndicadoresPanel
          resumen={resumen}
          efectividad={efectividad}
          efectividadPorTipo={npsPorTipo.map(({ tipo, efectividad }) => ({
            nombre: tipo.nombre,
            slug: tipo.slug,
            efectividad,
          }))}
          label="Resumen general calculado sobre todas las respuestas registradas."
        />

        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-foreground">Últimas respuestas</h2>
          </CardHeader>
          <CardContent className="p-0">
            <RespuestasTable respuestas={respuestas.slice(0, 10)} />
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}
