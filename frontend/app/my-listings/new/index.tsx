import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function NewListingChoice() {
  const router = useRouter()
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <h1 className="text-3xl font-bold mb-8">Create a New Listing</h1>
      <div className="flex gap-8">
        <Button size="lg" className="px-8 py-4 text-xl" onClick={() => router.push('/my-listings/new/individual')}>
          Create Individual Listing
        </Button>
        <Button size="lg" className="px-8 py-4 text-xl" onClick={() => router.push('/my-listings/new/bundle')}>
          Create Bundle Listing
        </Button>
      </div>
    </div>
  )
} 