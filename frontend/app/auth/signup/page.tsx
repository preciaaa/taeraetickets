'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import ReCAPTCHA from "react-google-recaptcha"

export default function SignUpPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        router.push('/events')
      } else {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    if (!recaptchaToken) {
      setMessage('Please complete the reCAPTCHA.')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      setMessage(error.message)
    } else {
      setMessage('Check your email to confirm your account.')
      // ✅ Optional: do not redirect unless session exists
      // router.push('/events')
    }

    setLoading(false)
  }

  const redirectLogin = () => {
    router.push('/auth/login')
  }

  if (loading) return <div>Loading...</div>

  return (
    <div className="max-w-md mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-4">Sign Up</h1>
      <form onSubmit={handleSignup}>
        <Input
          type="email"
          placeholder="Email"
          value={email}
          required
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4"
        />
        <Input
          type="password"
          placeholder="Password"
          value={password}
          required
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4"
        />
        <ReCAPTCHA
          sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!}
          onChange={(token) => setRecaptchaToken(token)}
        />
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Signing up...' : 'Sign Up'}
        </Button>
        {message && <p className="mt-4 text-sm text-center">{message}</p>}
      </form>

      <div className="mt-6 text-center">
        Already have an account?{" "}
        <Button variant="link" onClick={redirectLogin}>
          Sign in
        </Button>
      </div>
    </div>
  )
}
