'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function MyListings() {
    const [listings, setListings] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()

    useEffect(() => {
        const fetchListings = async () => {
            setLoading(true)
            setError(null)
            if (!supabase) {
                setError('Supabase client not initialized.')
                setLoading(false)
                return
            }
            // Get current user2
            const { data: { user }, error: userError } = await supabase.auth.getUser()
            console.log('User:', user, 'UserError:', userError)
            if (userError || !user) {
                setError('Could not fetch user.')
                setLoading(false)
                return
            }

            // Fetch listings for current user (no join with show/event)
            const { data, error: listingsError } = await supabase
                .from('listings')
                .select('*')
                .eq('original_owner_id', user.id)
            console.log('Listings:', data, listingsError)

            if (listingsError) {
                setError('Could not fetch listings: ' + listingsError.message)
            } else {
                setListings(data || [])
            }
            setLoading(false)
        }
        fetchListings()
    }, [])

    return (
        <div className="px-6 py-10">
            <h1 className="text-2xl font-bold mb-4">My listings</h1>
            {loading && <div>Loading...</div>}
            {error && <div className="text-red-500">{error}</div>}
            {!loading && !error && (
                listings.length === 0 ? (
                    <div>No tickets listed for resale.</div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-4">
                        {listings.map((listing) => (
                            <div
                                key={listing.id || listing.resale_ticket_id}
                                className="bg-white rounded-lg shadow-md border p-6 flex flex-col gap-2"
                            >
                                <div className="text-lg font-bold mb-1">
                                    {listing.event_name || 'Event'}
                                </div>
                                <div className="text-sm text-gray-600 mb-1">
                                    Section: {listing.section ?? '-'}, Row: {listing.row ?? '-'}, Seat: {listing.seat_number ?? '-'}
                                </div>
                                <div>
                                    <span className="font-semibold">Status:</span> <span className={`inline-block px-2 py-1 rounded text-xs ${listing.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>{listing.status}</span>
                                </div>
                                <div>
                                    <span className="font-semibold">Price:</span> ${listing.price}
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}
        </div>
    )
}


