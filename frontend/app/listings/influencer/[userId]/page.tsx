import { ListingProfile } from '@/components/listing-profile'

export default function InfluencerProfilePage({ params }: { params: { userId: string } }) {
  return <ListingProfile userId={params.userId} type="influencer" />
}
