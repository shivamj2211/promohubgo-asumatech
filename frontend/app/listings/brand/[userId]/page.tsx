import { ListingProfile } from '@/components/listing-profile'

export default function BrandProfilePage({ params }: { params: { userId: string } }) {
  return <ListingProfile userId={params.userId} type="brand" />
}
