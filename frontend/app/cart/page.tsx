'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export default function CartPage() {
  const [cart, setCart] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const userId = typeof window !== 'undefined' ? localStorage.getItem('user_id') : null

  useEffect(() => {
    if (!userId) return
    axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/cart/${userId}`)
      .then(res => {
        setCart(res.data)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [userId])

  const handleCheckoutRedirect = () => {
    router.push('/checkout') // ✅ redirect to checkout page
  }

  const handleRemove = async (ticket_id: string) => {
    await axios.delete(`${process.env.NEXT_PUBLIC_API_BASE_URL}/cart/${userId}/${ticket_id}`)
    setCart(cart.filter(item => item.ticket_id !== ticket_id))
  }

  if (loading) return <p>Loading...</p>
  if (!cart.length) return <p className="text-center mt-20">Your cart is empty.</p>

  return (
    <div className="max-w-2xl mx-auto mt-10 space-y-6">
      {cart.map(item => (
        <div key={item.ticket_id} className="border p-4 rounded-lg shadow bg-white">
          <h2 className="text-lg font-bold">{item.event_name}</h2>
          <p>{item.category} • {item.section} • Row {item.row}, Seat {item.seat_number}</p>
          <p className="text-sm text-gray-500">{item.date}</p>
          <p className="font-semibold">${item.price}</p>
          <Button variant="destructive" onClick={() => handleRemove(item.ticket_id)}>
            Remove
          </Button>
        </div>
      ))}
      
      {/* ✅ Redirect to checkout page */}
      <Button onClick={handleCheckoutRedirect} className="w-full">
        Confirm and Pay
      </Button>
    </div>
  )
}
