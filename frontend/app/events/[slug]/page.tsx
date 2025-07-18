'use client'

import Image from 'next/image'
import { notFound } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useSearchParams } from 'next/navigation'
import { apiRoutes } from '@/lib/apiRoutes';

import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import Link from 'next/link'
import React from 'react'

interface Event {
  id: number
  title: string
  venue: string
  date: string
  description: string
  img_url: string
}

interface Listing {
  ticket_id: string
  event_id: number
  event_name: string
  section: string
  row: string
  seat_number: string
  price: number
  category: string
  venue: string
  status: string
  date: string
  fixed_seating: boolean
  image_url: string
}

const quantity = [1, 2, 3, 4, 5, 6]

const FormSchema = z.object({
  category: z.coerce.string().optional(),
  quantity: z.coerce.number().optional(),
})

async function fetchUserVerification(userId: string): Promise<boolean> {
  try {
    const res = await fetch(apiRoutes.userVerification(userId))
    if (!res.ok) throw new Error('Failed to verify user')
    const data = await res.json()
    return data.verified === true
  } catch (err) {
    console.error('[Verification Error]', err)
    return false
  }
}

// Utility: group listings by section and row, and chunk consecutive seats
function groupListings(listings: Listing[]) {
  const grouped = {};
  listings.forEach(listing => {
    const section = listing.section || 'Unknown Section';
    const row = listing.row || 'Unknown Row';
    if (!grouped[section]) grouped[section] = {};
    if (!grouped[section][row]) grouped[section][row] = [];
    grouped[section][row].push(listing);
  });
  // Sort seat numbers within each row
  Object.values(grouped).forEach(rows => {
    Object.values(rows).forEach(seats => {
      seats.sort((a, b) => {
        const aNum = parseInt(a.seat_number, 10);
        const bNum = parseInt(b.seat_number, 10);
        if (isNaN(aNum) || isNaN(bNum)) return String(a.seat_number).localeCompare(String(b.seat_number));
        return aNum - bNum;
      });
    });
  });
  return grouped;
}

// Utility: chunk sorted seat listings into consecutive groups
function chunkConsecutiveSeats(seats: Listing[]) {
  if (seats.length === 0) return [];
  const result = [];
  let group = [seats[0]];
  for (let i = 1; i < seats.length; i++) {
    const prev = parseInt(seats[i - 1].seat_number, 10);
    const curr = parseInt(seats[i].seat_number, 10);
    if (!isNaN(prev) && !isNaN(curr) && curr === prev + 1) {
      group.push(seats[i]);
    } else {
      result.push(group);
      group = [seats[i]];
    }
  }
  result.push(group);
  return result;
}

export default function EventPage({ params }: { params: { slug: string } }) {
  const [event, setEvent] = useState<Event | null>(null)
  const [isUserVerified, setIsUserVerified] = useState(false)
  const [listings, setListings] = useState<Listing[]>([])
  const [filteredListings, setFilteredListings] = useState<Listing[]>([])
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  const searchParams = useSearchParams()
  const eventId = useMemo(() => {
    const id = searchParams.get('id')
    return id ? parseInt(id, 10) : null
  }, [searchParams])

  useEffect(() => {
    const fetchEvent = async (id: number) => {
      try {
        const res = await fetch(apiRoutes.event(id))
        console.log(res)
        if (!res.ok) throw new Error('Failed to fetch event')
        const data = await res.json()
        setEvent(data)
      } catch (err) {
        console.error('Event fetch error:', err)
        setEvent(null)
      }
    }    
  
    if (eventId) {
      fetchEvent(eventId)
      fetchListings(eventId)
    }
  }, [eventId])

  useEffect(() => {
    const storedUserId =
      localStorage.getItem('user_id') || sessionStorage.getItem('user_id')
    console.log('[User ID]', storedUserId)

    if (!storedUserId) return

    fetchUserVerification(storedUserId).then((verified) => {
      console.log('[Verified from backend]', verified)
      setIsUserVerified(verified)
    })
  }, [])

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
  })

  const fetchListings = async (eventId: number) => {
    try {
      setIsLoading(true)
      const response = await fetch(apiRoutes.getEventListings(eventId), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch listings')
      }

      const data = await response.json()
      console.log('Fetched listings:', data)
      
      // Filter only active listings
      const activeListings = data.filter((listing: Listing) => listing.status === 'active')
      setListings(activeListings)
      setFilteredListings(activeListings)
    } catch (error) {
      console.error('Error fetching listings:', error)
      toast.error('Failed to load tickets')
      setListings([])
      setFilteredListings([])
    } finally {
      setIsLoading(false)
    }
  }

  const categories = useMemo(
    () => [...new Set(listings.map((listing) => listing.category).filter(Boolean))],
    [listings]
  )

  function onFilter(data: z.infer<typeof FormSchema>) {
    const filtered = listings.filter((listing) => {
      const matchCategory = data.category ? listing.category === data.category : true
      return matchCategory
    })
    setFilteredListings(filtered)
    toast.success('Tickets filtered', {
      description: `Found ${filtered.length} ticket${filtered.length !== 1 ? 's' : ''}`,
    })
  }

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading event...</div>
  }

  if (!event) return notFound()

  return (
    <div className="px-6 py-10 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-2">
          {event.title}
          {filteredListings.length > 10 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded shadow">🔥 Hot</span>
          )}
        </h1>
        <p className="text-lg text-muted-foreground">{event.venue}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <div className="w-full">
          <Image
            src={event.img_url}
            alt={event.title}
            width={600}
            height={400}
            className="rounded-xl object-cover w-full shadow-md"
          />
        </div>

        <div className="flex flex-col gap-6">
          <p className="text-gray-700 text-base">{event.description}</p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onFilter)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select a Category</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant="outline" role="combobox" className={cn('w-full justify-between', !field.value && 'text-muted-foreground')}>
                              {field.value || 'Choose category'}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                          <Command>
                            <CommandInput placeholder="Search..." />
                            <CommandList>
                              <CommandEmpty>No results found.</CommandEmpty>
                              <CommandGroup>
                                {categories.map((cat) => (
                                  <CommandItem key={cat} onSelect={() => form.setValue('category', cat)}>
                                    <Check className={cn('mr-2 h-4 w-4', cat === field.value ? 'opacity-100' : 'opacity-0')} />
                                    {cat}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Seat Preference</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant="outline" role="combobox" className={cn('w-full justify-between', !field.value && 'text-muted-foreground')}>
                              {field.value || 'Choose quantity'}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                          <Command>
                            <CommandInput placeholder="Search..." />
                            <CommandList>
                              <CommandEmpty>No results found.</CommandEmpty>
                              <CommandGroup>
                                {quantity.map((qty) => (
                                  <CommandItem key={qty} onSelect={() => form.setValue('quantity', qty)}>
                                    <Check className={cn('mr-2 h-4 w-4', qty === field.value ? 'opacity-100' : 'opacity-0')} />
                                    {qty}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <div className="flex flex-col justify-end gap-2 md:gap-4">
                  <Button type="submit">Filter</Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      form.reset()
                      setFilteredListings(listings)
                      setSelectedListing(null)
                    }}
                  >
                    Reset
                  </Button>
                </div>
              </div>
            </form>
          </Form>

          {isLoading ? (
            <div className="mt-8 text-gray-500 italic">Loading tickets...</div>
          ) : filteredListings.length > 0 ? (
            <div className="mt-2 space-y-4">
              <h3 className="text-xl font-semibold">Available Tickets:</h3>
              {/* New seat map layout */}
              {Object.entries(groupListings(filteredListings)).map(([section, rows]) => (
                <div key={section} className="mb-8">
                  <div className="font-bold text-lg border-b mb-2">{section}</div>
                  {Object.entries(rows).map(([row, seats]) => (
                    <div key={row} className="mb-4 pl-4">
                      <div className="font-semibold mb-1">{row}</div>
                      {chunkConsecutiveSeats(seats).map((seatGroup, idx) => (
                        <div key={idx} className="flex flex-row gap-4 mb-2">
                          {seatGroup.map((listing) => (
                            <div
                              key={listing.ticket_id}
                              className={cn(
                                'border p-4 rounded-md shadow-sm cursor-pointer transition min-w-[120px]',
                                selectedListing?.ticket_id === listing.ticket_id
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'hover:bg-gray-50'
                              )}
                              onClick={() => setSelectedListing(listing)}
                            >
                              <div className="font-medium text-gray-900">Seat {listing.seat_number}</div>
                              <div className="text-sm text-gray-600">{listing.category || 'General'}</div>
                              <div className="text-xs text-gray-500">${listing.price}</div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
              <Button
                disabled={!selectedListing}
                onClick={(e) => {
                  e.preventDefault()
                  if (!selectedListing) return
                  if (!isUserVerified) {
                    toast.error('You need to verify your identity before purchasing tickets!', {
                      description: 'Go to profile settings to complete identity verification',
                    })
                    router.push('/profile/verification')
                    return
                  }
                  setShowConfirm(true)
                }}
              >
                Buy Now
              </Button>
            </div>
          ) : (
            <div className="mt-8 text-gray-500 italic">No tickets available for this event.</div>
          )}
        </div>
      </div>

      {showConfirm && selectedListing && (
        <div className="fixed inset-0 bg-white-70 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-[90%] max-w-md">
            <h2 className="text-lg font-semibold mb-4">Confirm Ticket Purchase</h2>
            <p className="mb-2">Category: {selectedListing.category}</p>
            <p className="mb-2">Section: {selectedListing.section}</p>
            <p className="mb-4 font-semibold">Price: ${selectedListing.price}</p>
            <div className="flex justify-end gap-4">
              <Button variant="secondary" onClick={() => setShowConfirm(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setShowConfirm(false)
                  setSelectedListing(null)
                  router.push(`/checkout`)
                }}
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}