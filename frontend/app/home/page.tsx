'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import {
  Card,
  CardTitle,
  CardDescription,
  CardHeader,
  CardFooter,
} from '@/components/ui/card'

export default function HomePage() {
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/auth/login')
      } else {
        setLoading(false)
      }
    }
    checkAuth()
  }, [router])

  if (loading) return <div>Loading...</div>

  const cards = [
    {
      title: 'Taylor Swift Eras Tour',
      venue: 'Singapore Indoor Stadium',
      status: 'hot',
    },
    {
      title: 'Zerobaseone Timeless World Tour',
      venue: 'Singapore Indoor Stadium',
      status: 'normal',
    },
    {
      title: 'IU H.E.R World Tour',
      venue: 'Kallang Stadium',
      status: 'hot',
    },
  ]

  return (
    <div className="px-6 py-10">
      <h1 className="scroll-m-20 text-center text-4xl font-extrabold tracking-tight text-balance">
        Welcome back to Taeraetickets
      </h1>

      <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0">For You</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {cards.map((card, idx) => (
          <Card key={idx} className="relative w-full p-2">
            {card.status === 'hot' && (
              <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 text-xs font-bold rounded shadow-sm">
                🔥 Hot
              </div>
            )}

            <CardHeader className="pt-6">
              <CardTitle>{card.title}</CardTitle>
              <CardDescription>{card.venue}</CardDescription>
            </CardHeader>
            <CardFooter>
              <p className="text-sm text-muted-foreground">Click to view</p>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
