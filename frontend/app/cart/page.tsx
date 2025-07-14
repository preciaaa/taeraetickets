'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function CartPage() {
  const [cart, setCart] = useState<any[]>([])
  const [sellerNames, setSellerNames] = useState<{ [key: string]: string }>({})
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string[]>([])
  const router = useRouter()
  const userId = typeof window !== 'undefined' ? localStorage.getItem('user_id') : null

  useEffect(() => {
    if (!userId) return
    axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/cart/${userId}`)
      .then(async res => {
        setCart(res.data)
        setLoading(false)
        // Fetch seller usernames for each ticket
        const ownerIds = Array.from(new Set(res.data.map((item: any) => item.original_owner_id).filter(Boolean)))
        if (ownerIds.length) {
          try {
            const { data, error } = await supabase
              .from('users')
              .select('id, username')
              .in('id', ownerIds)

            if (error) throw error

            const nameMap: { [key: string]: string } = {}
            data?.forEach(user => {
              nameMap[user.id] = user.username
            })

            setSellerNames(nameMap)
          } catch (err) {
            console.error('Error fetching usernames from Supabase:', err)
          }
        }
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [userId])

  const handleCheckoutRedirect = () => {
  if (selected.length === 0) return
  router.push(`/checkout?tickets=${selected.join(',')}`)
}

  const handleRemove = async (ticket_id: string) => {
    await axios.delete(`${process.env.NEXT_PUBLIC_API_BASE_URL}/cart/${userId}/${ticket_id}`)
    setCart(cart.filter(item => item.ticket_id !== ticket_id))
    setSelected(selected.filter(id => id !== ticket_id))
  }

  const handleSelect = (ticket_id: string) => {
    setSelected(prev =>
      prev.includes(ticket_id)
        ? prev.filter(id => id !== ticket_id)
        : [...prev, ticket_id]
    )
  }

  const totalPrice = cart
    .filter(item => selected.includes(item.ticket_id))
    .reduce((sum, item) => sum + (item.price || 0), 0)

  if (loading) return <p>Loading...</p>
  if (!cart.length) return <p className="text-center mt-20">Your cart is empty.</p>

  return (
    <div className="max-w-2xl mx-auto mt-10 space-y-6">
      <h1 className="text-2xl font-bold mb-4 text-center">Your Cart</h1>
      <div className="space-y-4">
        {cart.map(item => (
          <div key={item.ticket_id} className="flex items-start border p-4 rounded-lg shadow bg-white relative">
            <input
              type="checkbox"
              className="mt-2 mr-4 accent-blue-600 w-5 h-5"
              checked={selected.includes(item.ticket_id)}
              onChange={() => handleSelect(item.ticket_id)}
            />
            <div className="flex-1">
              <div className="text-xs text-gray-500 mb-1">
                Seller: <span className="font-semibold">{sellerNames[item.original_owner_id] || '...'}</span>
              </div>
              <h2 className="text-lg font-bold">{item.event_name}</h2>
              <p className="text-sm">{item.category} • {item.section} • Row {item.row}, Seat {item.seat_number}</p>
              <p className="text-xs text-gray-500">{item.date}</p>
            </div>
            <div className="flex flex-col items-end ml-4">
              <span className="font-semibold text-lg text-blue-700">${item.price}</span>
              <Button
                variant="destructive"
                size="sm"
                className="mt-2"
                onClick={() => handleRemove(item.ticket_id)}
              >
                Remove
              </Button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between items-center mt-6 border-t pt-4">
        <span className="font-semibold text-lg">Total:</span>
        <span className="font-bold text-2xl text-blue-700">${totalPrice.toFixed(2)}</span>
      </div>
      <Button
        onClick={handleCheckoutRedirect}
        className="w-full mt-2"
        disabled={selected.length === 0}
      >
        Confirm and Pay
      </Button>
    </div>
  )
}
