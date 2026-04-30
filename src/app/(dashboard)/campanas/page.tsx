import Link from 'next/link'
import { getCampanas } from '@/modules/campanas/services/campanas.service'
import CampanasTable from '@/modules/campanas/components/CampanasTable'
import PageContainer from '@/components/layout/PageContainer'
import Button from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'

export default async function CampanasPage() {
  const campanas = await getCampanas()

  return (
    <PageContainer
      title="Campanas"
      actions={
        <Link href="/campanas/nueva">
          <Button>+ Nueva campaña</Button>
        </Link>
      }
    >
      <Card>
        <CardContent className="p-0">
          <CampanasTable campanas={campanas} />
        </CardContent>
      </Card>
    </PageContainer>
  )
}
