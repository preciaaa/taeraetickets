'use client'

import Image from 'next/image'
import { notFound } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { use, useState } from 'react'
import { useRouter } from 'next/navigation'

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
import Link from "next/link";

const mockEventData = [
  {
    id: 1,
    title: 'Taylor Swift Eras Tour',
    venue: 'Singapore Indoor Stadium',
    date: "2025-07-21",
    status: 'hot',
    slug: 'taylor-swift-eras-tour',
    description:
    'Experience all eras of Taylor Swift live in concert. Limited tickets available!',
    imageUrl: '/images/taylor.jpg',
  },
  {
    id: 2,
    title: 'Zerobaseone Timeless World Tour',
    venue: 'Singapore Indoor Stadium',
    date: "2025-07-21",
    status: 'normal',
    slug: 'zerobaseone-timeless-world-tour',
    description:
      "Don't miss out on Zerobaseone&nbsp;s debut world tour in Singapore!",
    imageUrl: '/images/zb1.jpg',
  },
  {
    id: 3,
    title: 'IU H.E.R World Tour',
    venue: 'Kallang Stadium',
    date: "2025-07-21",
    status: 'hot',
    slug: 'iu-her-world-tour',
    description: 'K-pop queen IU is back with her powerful H.E.R World Tour.',
    imageUrl: '/images/iu.jpg',
  },
]

const mockTickets = [
    { category: 'Cat1', quantity: 2, price: 300 },
    { category: 'Cat1', quantity: 1, price: 150 },
    { category: 'Cat2', quantity: 2, price: 220 },
    { category: 'Cat3', quantity: 1, price: 100 },
    { category: 'Cat4', quantity: 4, price: 80 },
  ]

const categories = ['Cat1', 'Cat2', 'Cat3', 'Cat4']
const quantity = [1, 2, 3, 4, 5, 6]

const isUserVerified = false

// Form schema
const FormSchema = z.object({
  category: z.coerce.string().optional(),
  quantity: z.coerce.number().optional(),
})

export default function EventPage({ params }: { params: Promise<{ slug: string }> }) {
    const [filteredTickets, setFilteredTickets] = useState(mockTickets)
    const [selectedTicket, setSelectedTicket] = useState<typeof mockTickets[0] | null>(null)
    const [showConfirm, setShowConfirm] = useState(false)
    const router = useRouter()

    const { slug } = use(params)
    const event = mockEventData.find((e) => e.slug === slug.toLowerCase())
     if (!event) return notFound()

    const form = useForm<z.infer<typeof FormSchema>>({
      resolver: zodResolver(FormSchema),
    })

    function onFilter(data: z.infer<typeof FormSchema>) {
        const filtered = mockTickets.filter((ticket) => {
          const matchCategory = data.category ? ticket.category === data.category : true
          const matchQuantity = data.quantity ? ticket.quantity >= data.quantity : true
          return matchCategory && matchQuantity
        })
      
        setFilteredTickets(filtered)
      
        toast('Filtered tickets:', {
          description: (
            <pre className="mt-2 w-[320px] rounded-md bg-neutral-950 p-4">
              <code className="text-white">{JSON.stringify(filtered, null, 2)}</code>
            </pre>
          ),
        })      
    }

  return (
    <div className="px-6 py-10 max-w-6xl mx-auto">
      {/* Title & Venue */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-2">
          {event.title}
          {event.status === 'hot' && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded shadow">
              🔥 Hot
            </span>
          )}
        </h1>
        <p className="text-lg text-muted-foreground">{event.venue}</p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Left: Image */}
        <div className="w-full">
          <Image
            src={event.imageUrl}
            alt={event.title}
            width={600}
            height={400}
            className="rounded-xl object-cover w-full shadow-md"
          />
        </div>

        {/* Right: Description + Filter Form */}
        <div className="flex flex-col gap-6">
          <p className="text-gray-700 text-base">{event.description}</p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onFilter)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                        <FormItem >
                            <FormLabel>Select a Category</FormLabel>
                            <Popover>
                            <PopoverTrigger asChild>
                                <FormControl>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    className={cn(
                                    'w-full justify-between',
                                    !field.value && 'text-muted-foreground'
                                    )}
                                >
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
                                        <CommandItem
                                        key={cat}
                                        onSelect={() => {
                                            form.setValue('category', cat)
                                        }}
                                        >
                                        <Check
                                            className={cn(
                                            'mr-2 h-4 w-4',
                                            cat === field.value
                                                ? 'opacity-100'
                                                : 'opacity-0'
                                            )}
                                        />
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
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    className={cn(
                                    'w-full justify-between',
                                    !field.value && 'text-muted-foreground'
                                    )}
                                >
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
                                        <CommandItem
                                        key={qty}
                                        onSelect={() => {
                                            form.setValue('quantity', qty)
                                        }}
                                        >
                                        <Check
                                            className={cn(
                                            'mr-2 h-4 w-4',
                                            qty === field.value
                                                ? 'opacity-100'
                                                : 'opacity-0'
                                            )}
                                        />
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
                        <Button type="submit"> Filter </Button> 
                        <Button type="button" variant="secondary"
                                onClick={() => {form.reset() 
                                                setFilteredTickets(mockTickets)
                                                setSelectedTicket(null)}}>
                            Reset
                        </Button>
                    </div>
                </div>
              
            </form>
          </Form>

          {filteredTickets.length > 0 ? (
            <div className="mt-2 space-y-4">
                <h3 className="text-xl font-semibold">Available Tickets:</h3>
                <ul className="space-y-2">
                    {filteredTickets.map((ticket, idx) => (
                        <li
                        key={idx}
                        className={cn(
                            "border p-4 rounded-md shadow-sm cursor-pointer transition",
                            selectedTicket?.category === ticket.category &&
                            selectedTicket?.price === ticket.price
                            ? "border-blue-50 bg-blue-50"
                            : "hover: bg-gray-50"
                        )}
                        onClick={() => setSelectedTicket(ticket)}
                        >
                        <p className="flex justify-between">
                            <span>{ticket.category} | {ticket.quantity}</span>
                            <span>${ticket.price}</span>
                        </p>
                        </li>
                    ))}
                </ul>
                <Link href="/profile/verification"><Button
                    disabled={!selectedTicket}
                    onClick={() => {
                        if (!selectedTicket) return
                        if (!isUserVerified){
                            toast.error("You need to verify your identity before purchasing tickets!", {
                                description: "Go to profile settings to complete identity verfification"
                            })
                        }
                        setShowConfirm(true)
                    }}
                    >
                    Buy Now
                </Button>
                </Link>
            </div>
            ) : (
            <div className="mt-8 text-gray-500 italic">No tickets found for this filter.</div>
            )}
        </div>
      </div>

      {showConfirm && selectedTicket && (
        <div className="fixed inset-0 bg-white-70 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-[90%] max-w-md">
            <h2 className="text-lg font-semibold mb-4">Confirm Ticket Purchase</h2>
            <p className="mb-2">Category: {selectedTicket.category}</p>
            <p className="mb-2">Quantity: {selectedTicket.quantity}</p>
            <p className="mb-4 font-semibold">Price: ${selectedTicket.price}</p>
            <div className="flex justify-end gap-4">
                <Button
                variant="secondary"
                onClick={() => setShowConfirm(false)}
                >
                Cancel
                </Button>
                <Button
                    onClick={() => {
                        setShowConfirm(false)
                        setSelectedTicket(null)
                        router.push(`/events/${slug}/payment?category=${selectedTicket.category}&quantity=${selectedTicket.quantity}&price=${selectedTicket.price}`)                          
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
