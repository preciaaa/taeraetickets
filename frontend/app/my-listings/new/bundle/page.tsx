"use client"
import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import { EventSelector } from "@/components/ui/event-selector"
import { apiRoutes } from "@/lib/apiRoutes"
import { v4 as uuidv4 } from "uuid"

interface ExtractedFields {
  date?: string
  venue?: string
  section?: string
  row?: string
  seat_number?: string
  category?: string
  price?: string
}

interface TicketDraft {
  id: string
  file: File | null
  preview: string | null
  uploading: boolean
  extractedFields: ExtractedFields
  extractedText: string
  isScanned: boolean
  selectedEvent: any | null
  processedData: any
}

export default function NewBundleListing() {
  const [tickets, setTickets] = useState<TicketDraft[]>([])
  const [activeTicketIdx, setActiveTicketIdx] = useState(0)
  const [bundlePrice, setBundlePrice] = useState<number>(0)
  const [maxBundlePrice, setMaxBundlePrice] = useState<number>(500)
  const [priceLoading, setPriceLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const router = useRouter()

  const addTicket = () => {
    setTickets(tks => [...tks, {
      id: uuidv4(),
      file: null,
      preview: null,
      uploading: false,
      extractedFields: {},
      extractedText: '',
      isScanned: false,
      selectedEvent: null,
      processedData: null,
    }])
    setActiveTicketIdx(tickets.length)
  }

  const removeTicket = (idx: number) => {
    setTickets(tks => {
      const newTickets = tks.filter((_, i) => i !== idx)
      setActiveTicketIdx(prev => {
        if (newTickets.length === 0) return 0
        if (prev >= newTickets.length) return newTickets.length - 1
        return prev
      })
      return newTickets
    })
  }

  const updateTicket = (idx: number, update: Partial<TicketDraft>) => {
    setTickets(tks => tks.map((tk, i) => i === idx ? { ...tk, ...update } : tk))
  }

  useEffect(() => {
    setMaxBundlePrice(500)
  }, [tickets])

  const handleBundleSubmit = async () => {
    if (tickets.length === 0) {
      toast.error('Add at least one ticket')
      return
    }
    if (bundlePrice <= 0 || bundlePrice > maxBundlePrice) {
      toast.error(`Please select a valid bundle price between $1 and $${maxBundlePrice}`)
      return
    }
    setUploading(true)
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        toast.error('Please log in to create listings')
        setUploading(false)
        return
      }
      const listings_id = uuidv4()
      for (const tk of tickets) {
        const processedData = tk.processedData
        const extractedFields = tk.extractedFields
        const selectedEvent = tk.selectedEvent
        if (!processedData || !selectedEvent) continue
        const listingData = {
          event_id: processedData.eventId || selectedEvent.id,
          original_owner_id: user.id,
          event_name: selectedEvent.title,
          section: extractedFields.section || '',
          row: extractedFields.row || null,
          seat_number: extractedFields.seat_number || null,
          category: extractedFields.category || 'General',
          venue: extractedFields.venue || '',
          date: extractedFields.date || processedData.eventDate,
          price: bundlePrice,
          image_url: processedData.publicUrl,
          parsed_fields: extractedFields,
          fingerprint: processedData.fingerprint,
          embedding: processedData.embedding,
          phash: processedData.phash,
          listings_id,
        }
        await fetch(apiRoutes.listings, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(listingData),
        })
      }
      toast.success('Bundle listing created successfully!')
      router.push('/my-listings')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create bundle listing')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-2 tracking-tight drop-shadow-sm">Create Bundle Listing</h1>
        <p className="text-gray-600 text-lg">Upload multiple tickets and sell them as a bundle. Each ticket will be processed individually, but priced together.</p>
      </div>
      <div className="flex gap-4 mb-6">
        {tickets.map((tk, idx) => (
          <Button key={tk.id} variant={activeTicketIdx === idx ? 'default' : 'outline'} onClick={() => setActiveTicketIdx(idx)}>
            Ticket {idx + 1}
            <span onClick={e => { e.stopPropagation(); removeTicket(idx) }} className="ml-2 text-red-500 cursor-pointer">&times;</span>
          </Button>
        ))}
        <Button onClick={addTicket} variant="secondary">+ Add Another Ticket</Button>
      </div>
      {tickets.length > 0 && tickets[activeTicketIdx] && (
        <SingleTicketSteps
          ticket={tickets[activeTicketIdx]}
          onUpdate={update => updateTicket(activeTicketIdx, update)}
        />
      )}
      {tickets.length > 0 && tickets.every(tk => tk.processedData && tk.selectedEvent) && (
        <div className="mt-10">
          <h2 className="text-2xl font-bold mb-4">Step 4: Set Bundle Price</h2>
          <div className="mb-4">Set a single price for the entire bundle of tickets.</div>
          <Input
            type="number"
            min={1}
            max={maxBundlePrice}
            value={bundlePrice}
            onChange={e => setBundlePrice(Number(e.target.value))}
            className="w-64 mb-4"
            placeholder={`Enter bundle price (max $${maxBundlePrice})`}
          />
          <Button onClick={handleBundleSubmit} disabled={uploading || bundlePrice <= 0 || bundlePrice > maxBundlePrice} size="lg">
            {uploading ? 'Creating Bundle...' : `Create Bundle Listing - $${bundlePrice}`}
          </Button>
        </div>
      )}
    </div>
  )
}

function SingleTicketSteps({ ticket, onUpdate }: { ticket: TicketDraft, onUpdate: (update: Partial<TicketDraft>) => void }) {
  const [priceLoading, setPriceLoading] = useState(false)
  const [maxPrice, setMaxPrice] = useState(150)
  const [originalPrice, setOriginalPrice] = useState<number | null>(null)
  const [originalPriceFromOCR, setOriginalPriceFromOCR] = useState(false)

  const handleSelectEvent = (event: any) => {
    onUpdate({ selectedEvent: event })
  }

  const isValidDateFormat = (dateStr: string): boolean => {
    return /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
  }

  const calculateMaxPrice = async (event: any) => {
    setPriceLoading(true)
    try {
      const basePrice = 100
      let maxPrice = basePrice
      const { data: existingListings } = await supabase
        .from("listings")
        .select("*")
        .eq("event_name", event.title)
      const popularityMultiplier = Math.min(1.5, 1 + (existingListings?.length || 0) * 0.1)
      maxPrice *= popularityMultiplier
      const venueMultipliers = {
        "singapore indoor stadium": 1.4,
        "national stadium": 1.3,
        "marina bay sands": 1.5,
        "capitol theatre": 1.2,
        "gateway theatre": 1.1
      }
      const venue = ticket.extractedFields.venue?.toLowerCase() || ""
      const venueMultiplier = venueMultipliers[venue as keyof typeof venueMultipliers] || 1.0
      maxPrice *= venueMultiplier
      let seatMultiplier = 1.0
      if (ticket.extractedFields.section) {
        const section = ticket.extractedFields.section.toLowerCase()
        if (section.includes("vip") || section.includes("premium")) {
          seatMultiplier = 1.3
        } else if (section.includes("cat1") || section.includes("a")) {
          seatMultiplier = 1.2
        } else if (section.includes("cat2") || section.includes("b")) {
          seatMultiplier = 1.1
        }
      }
      maxPrice *= seatMultiplier
      const now = new Date()
      const eventDate = ticket.extractedFields.date ? new Date(ticket.extractedFields.date) : null
      if (eventDate) {
        const daysUntilEvent = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        if (daysUntilEvent <= 7) {
          maxPrice *= 1.2
        } else if (daysUntilEvent <= 30) {
          maxPrice *= 1.1
        }
      }
      const month = now.getMonth()
      const seasonalMultiplier = (month >= 11 || month <= 1) ? 1.1 : 1.0
      maxPrice *= seasonalMultiplier
      maxPrice = Math.min(maxPrice, 500)
      maxPrice = Math.max(maxPrice, 50)
      setMaxPrice(Math.round(maxPrice))
    } catch (error) {
      setMaxPrice(150)
    } finally {
      setPriceLoading(false)
    }
  }

  useEffect(() => {
    if (ticket.selectedEvent) {
      calculateMaxPrice(ticket.selectedEvent)
    }
  }, [ticket.selectedEvent, ticket.extractedFields.category, ticket.extractedFields.venue, ticket.extractedFields.section, ticket.extractedFields.date])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      if (file.type === "application/pdf") {
        onUpdate({ file, preview: "/pdf-icon.png" })
      } else {
        const reader = new FileReader()
        reader.onload = () => {
          onUpdate({ file, preview: reader.result as string })
        }
        reader.readAsDataURL(file)
      }
    }
  }, [onUpdate])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".gif", ".bmp"],
      "application/pdf": [".pdf"]
    },
    maxFiles: 1,
    maxSize: 100 * 1024 * 1024
  })

  const handleUpload = async () => {
    if (!ticket.file) {
      toast.error("Please select a file first")
      return
    }
    onUpdate({ uploading: true })
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        toast.error("Please log in to upload tickets")
        onUpdate({ uploading: false })
        return
      }
      const formData = new FormData()
      formData.append("ticket", ticket.file)
      formData.append("userId", user.id)
      if (ticket.selectedEvent && ticket.selectedEvent.title) {
        formData.append("eventName", ticket.selectedEvent.title)
      }
      const response = await fetch(apiRoutes.uploadTicket, {
        method: "POST",
        body: formData
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Upload failed")
      }
      const result = await response.json()
      const parsed = result.parsed || {}
      onUpdate({
        extractedFields: {
          ...parsed,
          seat_number: parsed.seat || parsed.seat_number || ""
        },
        extractedText: result.extractedText || "",
        isScanned: result.isScanned || false,
        processedData: result
      })
      if (result.parsed?.price) {
        const priceValue = parseFloat(result.parsed.price.replace(/[^0-9.]/g, ''))
        setOriginalPrice(priceValue)
        setOriginalPriceFromOCR(true)
      } else {
        setOriginalPrice(null)
        setOriginalPriceFromOCR(false)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload ticket")
    } finally {
      onUpdate({ uploading: false })
    }
  }

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value)
    if (isNaN(value)) {
      setBundlePrice(0)
    } else {
      setBundlePrice(value)
    }
  }

  const handlePriceBlur = () => {
    if (bundlePrice < 1) {
      setBundlePrice(1)
    } else if (bundlePrice > maxBundlePrice) {
      setBundlePrice(maxBundlePrice)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ticket {activeTicketIdx + 1}</CardTitle>
        <CardDescription>Step 1: Upload Ticket</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center mb-4">
          <Upload className="mr-2 text-gray-500" />
          <span className="text-gray-700">Drag and drop a ticket image or click to select a file</span>
        </div>
        <div {...getRootProps()} className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition-colors">
          <input {...getInputProps()} />
          {isDragActive ? (
            <p>Drop the files here ...</p>
          ) : (
            <p>Drag 'n' drop some files here, or click to select files</p>
          )}
        </div>
        {ticket.file && (
          <div className="mt-4 flex items-center text-sm text-gray-600">
            <FileText className="mr-2" />
            {ticket.file.name}
            {ticket.uploading && <Loader2 className="ml-2 animate-spin text-blue-500" />}
          </div>
        )}
        {ticket.preview && (
          <div className="mt-4">
            <img src={ticket.preview} alt="Ticket Preview" className="max-w-sm h-auto rounded-md" />
          </div>
        )}
        {ticket.extractedText && (
          <div className="mt-4 bg-gray-100 p-3 rounded-md">
            <h3 className="font-semibold mb-2">Extracted Text:</h3>
            <p>{ticket.extractedText}</p>
          </div>
        )}
        {ticket.isScanned && (
          <div className="mt-4 flex items-center text-green-600">
            <CheckCircle className="mr-2" />
            Ticket scanned successfully!
          </div>
        )}
        {ticket.uploading && (
          <div className="mt-4 flex items-center text-blue-600">
            <Loader2 className="mr-2 animate-spin" />
            Uploading ticket...
          </div>
        )}
        {ticket.processedData && (
          <div className="mt-4 bg-gray-100 p-3 rounded-md">
            <h3 className="font-semibold mb-2">Processed Data:</h3>
            <pre className="text-xs text-gray-800 overflow-auto max-h-32">{JSON.stringify(ticket.processedData, null, 2)}</pre>
          </div>
        )}
        {ticket.selectedEvent && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Selected Event:</h3>
            <p>{ticket.selectedEvent.title}</p>
          </div>
        )}
        {ticket.extractedFields.date && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Date:</h3>
            <p>{ticket.extractedFields.date}</p>
          </div>
        )}
        {ticket.extractedFields.venue && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Venue:</h3>
            <p>{ticket.extractedFields.venue}</p>
          </div>
        )}
        {ticket.extractedFields.section && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Section:</h3>
            <p>{ticket.extractedFields.section}</p>
          </div>
        )}
        {ticket.extractedFields.row && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Row:</h3>
            <p>{ticket.extractedFields.row}</p>
          </div>
        )}
        {ticket.extractedFields.seat_number && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Seat Number:</h3>
            <p>{ticket.extractedFields.seat_number}</p>
          </div>
        )}
        {ticket.extractedFields.category && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Category:</h3>
            <p>{ticket.extractedFields.category}</p>
          </div>
        )}
        {ticket.extractedFields.price && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Price:</h3>
            <p>{ticket.extractedFields.price}</p>
          </div>
        )}
        {originalPrice !== null && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Original Price:</h3>
            <p>{originalPriceFromOCR ? `From OCR: $${originalPrice}` : `From Input: $${bundlePrice}`}</p>
          </div>
        )}
        <div className="mt-4 flex gap-2">
          <Button onClick={handleUpload} disabled={ticket.uploading || !ticket.file} variant="outline">
            {ticket.uploading ? 'Uploading...' : 'Upload Ticket'}
          </Button>
          <Button onClick={() => removeTicket(activeTicketIdx)} variant="outline" className="text-red-500 hover:text-red-600">
            Remove Ticket
          </Button>
        </div>
      </CardContent>
    </Card>
  )
} 