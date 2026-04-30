import NuevaCampanaForm from '@/modules/campanas/components/NuevaCampanaForm'
import PageContainer from '@/components/layout/PageContainer'

export default function NuevaCampanaPage() {
  return (
    <PageContainer title="Nueva campaña">
      <div className="max-w-3xl">
        <NuevaCampanaForm />
      </div>
    </PageContainer>
  )
}
