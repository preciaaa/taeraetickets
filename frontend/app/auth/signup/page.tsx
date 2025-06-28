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
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

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

    if (showPassword && password !== confirmPassword) {
      setMessage('Passwords do not match.')
      setLoading(false)
      return
    }

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
    // router.push('/auth/login')
    window.location.href = '/auth/login'
  }

  if (loading) return <div>Loading...</div>

  return (
    <div className="min-h-[calc(100vh-69px)] flex items-center justify-center bg-gradient-to-b from-yellow-50 to-white">
      <div className="w-full max-w-xl bg-white/90 rounded-3xl shadow-2xl p-12 border-2 border-gray-200">
        <h1 className="text-4xl font-bold mb-8 text-center">Sign Up</h1>
        <form onSubmit={handleSignup}>
          <Input
            type="email"
            placeholder="Email"
            value={email}
            required
            onChange={(e) => setEmail(e.target.value)}
            className="mb-6 text-lg h-14 px-5"
            disabled={showPassword}
          />
          {!showPassword ? (
            <Button
              type="button"
              className="w-full h-14 text-lg font-semibold mb-6"
              disabled={!email}
              onClick={() => setShowPassword(true)}
            >
              Continue with Email
            </Button>
          ) : (
            <>
              <Input
                type="password"
                placeholder="Password"
                value={password}
                required
                onChange={(e) => setPassword(e.target.value)}
                className="mb-4 text-lg h-14 px-5"
              />
              <Input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                required
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mb-6 text-lg h-14 px-5"
              />
              <div className="mb-6 flex justify-left">
                <ReCAPTCHA
                  sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!}
                  onChange={(token) => setRecaptchaToken(token)}
                  className="w-full"
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full h-14 text-lg font-semibold">
                {loading ? 'Signing up...' : 'Sign Up'}
              </Button>
            </>
          )}
          {message && <p className="mt-6 text-base text-center">{message}</p>}
        </form>
        <div className="mt-8 text-center text-lg">
          Already have an account?{' '}
          <Button variant="link" onClick={redirectLogin} className="text-blue-500 underline inline-flex p-0 align-baseline text-lg">
            Sign in
          </Button>
        </div>
      </div>
    </div>
  )
}
