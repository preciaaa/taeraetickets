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

function slugify(text: string) {
  return text 
    .toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with dashes
    .replace(/[^\w-]+/g, '')        // Remove non-word characters
    .replace(/--+/g, '-')           // Replace multiple dashes with one
    .trim()
}

interface Event {
  id: number
  title: string
  description: string
  venue: string
}

export default function EventsPage() {
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<Event[]>([])
  const router = useRouter()

  useEffect(() => {
    const checkAuthAndFetchEvents = async () => {
      // Check auth session
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/auth/login')
        return
      }

      // Fetch events
      const { data, error } = await supabase.from('events').select('*')
      if (error) {
        console.error('Error fetching events:', error.message)
      } else if (data) {
        setEvents(data as Event[])
      }

      setLoading(false)
    }

    checkAuthAndFetchEvents()
  }, [router])

  if (loading) return <div>Loading...</div>

  return (
    <div className="px-6 py-10">
      <h1 className="scroll-m-20 text-center text-4xl font-extrabold tracking-tight text-balance">
        Welcome back to Taeraetickets
      </h1>

      <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0">
        For You
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-6">
        {events.map((event) => (
          <Card
            key={event.id}
            className="relative w-full p-2 hover:cursor-pointer hover:shadow-md"
            onClick={() => router.push(`/events/${slugify(event.title)}`)}
          >
            <CardHeader className="pt-6">
              <CardTitle>{event.title}</CardTitle>
              <CardDescription>{event.venue}</CardDescription>
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