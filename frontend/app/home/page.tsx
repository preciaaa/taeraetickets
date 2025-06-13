'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function HomePage() {
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.push('/auth/login') // 👈 redirect if not logged in
      } else {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  if (loading) return <div>Loading...</div>

  return (
    <div>
      <h1>Welcome to the protected Home Page</h1>
    </div>
  )
}
