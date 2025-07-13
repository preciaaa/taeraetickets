'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Upload, FileText, Image, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty } from '@/components/ui/command';

interface ExtractedFields {
  date?: string
  venue?: string
  section?: string
  row?: string
  seat_number?: string
  category?: string
}

export default function NewListing() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [extractedFields, setExtractedFields] = useState<ExtractedFields>({})
  const [extractedText, setExtractedText] = useState<string>('')
  const [isScanned, setIsScanned] = useState(false)
  const router = useRouter()
  const [eventSearch, setEventSearch] = useState('');
  const [eventSuggestions, setEventSuggestions] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [eventLoading, setEventLoading] = useState(false);
  const [eventError, setEventError] = useState<string | null>(null);
  const [creatingEvent, setCreatingEvent] = useState(false);
  // Add state for processed data
  const [processedData, setProcessedData] = useState<any>(null);

  // Fetch events as user types
  useEffect(() => {
    if (!eventSearch) {
      setEventSuggestions([]);
      return;
    }
    setEventLoading(true);
    supabase
      .from('events')
      .select('*')
      .ilike('title', `%${eventSearch}%`)
      .then(({ data, error }) => {
        setEventLoading(false);
        if (error) {
          setEventError('Failed to fetch events');
          setEventSuggestions([]);
        } else {
          setEventSuggestions(data || []);
        }
      });
  }, [eventSearch]);

  // Create new event if needed
  const handleCreateEvent = async (title: string) => {
    setCreatingEvent(true);
    const { data, error } = await supabase
      .from('events')
      .insert([{ title }])
      .select();
    setCreatingEvent(false);
    if (error || !data || !data[0]) {
      setEventError('Failed to create event');
      return;
    }
    setSelectedEvent(data[0]);
    setEventSuggestions([]);
    setEventSearch(data[0].title);
  };

  // When event is selected, do NOT update extractedFields.event_name anymore
  useEffect(() => {
    if (selectedEvent) {
      // setExtractedFields(prev => ({ ...prev, event_name: selectedEvent.title })); // Removed
    }
  }, [selectedEvent]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      setFile(file)
      
      if (file.type === 'application/pdf') {
        setPreview('/pdf-icon.png')
      } else {
        const reader = new FileReader()
        reader.onload = () => {
          setPreview(reader.result as string)
        }
        reader.readAsDataURL(file)
      }
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.bmp'],
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    maxSize: 100 * 1024 * 1024 
  })

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file first')
      return
    }

    setUploading(true)
    
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        toast.error('Please log in to upload tickets')
        setUploading(false)
        return
      }

      const formData = new FormData()
      formData.append('ticket', file)
      formData.append('userId', user.id)
      if (selectedEvent && selectedEvent.title) {
        formData.append('eventName', selectedEvent.title)
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/upload-ticket`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      const result = await response.json()
      
      setExtractedFields(result.parsed || {})
      setExtractedText(result.extractedText || '')
      setIsScanned(result.isScanned || false)
      setProcessedData(result); // Store processed data
      
      toast.success('Ticket processed successfully! Review the details below.')
      
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async () => {
    if (!selectedEvent) {
      toast.error('Please select an event first')
      return
    }

    if (!processedData) {
      toast.error('Please upload and process a ticket first')
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

      // Create the listing with the final data using the backend API
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
        image_url: processedData.publicUrl,
        parsed_fields: extractedFields,
        fingerprint: processedData.fingerprint,
        embedding: processedData.embedding,
        phash: processedData.phash,
        // Add other fields as needed
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/listings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(listingData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create listing')
      }

      toast.success('Listing created successfully!')
      router.push('/my-listings')
      
    } catch (error) {
      console.error('Submit error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create listing')
    } finally {
      setUploading(false)
    }
  }

  const updateField = (field: keyof ExtractedFields, value: string) => {
    setExtractedFields(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-10 text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2 tracking-tight drop-shadow-sm">Create a New Listing</h1>
          <p className="text-gray-600 text-lg">Upload your ticket and extract details automatically. Please ensure your event name is correct.</p>
        </div>

        {/* Step 1: Event Name */}
        <div className="mb-8">
          <div className="mb-2 flex items-center gap-2">
            <span className="inline-block bg-blue-100 text-blue-700 rounded-full px-3 py-1 text-xs font-semibold">Step 1</span>
            <span className="font-semibold text-gray-800 text-lg">Select or Create Event</span>
          </div>
          <div className="relative mt-2">
            <Input
              id="event-search"
              type="text"
              placeholder="Search or create event..."
              value={selectedEvent ? selectedEvent.title : eventSearch}
              onChange={e => {
                setSelectedEvent(null);
                setEventSearch(e.target.value);
                setEventError(null);
              }}
              autoComplete="off"
              className="pr-24 py-3 text-base rounded-xl border-2 border-blue-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 shadow-sm transition"
              disabled={creatingEvent}
            />
            {eventSearch && !selectedEvent && (
              <div className="absolute left-0 right-0 z-10 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto mt-1">
                {eventLoading ? (
                  <div className="p-3 text-gray-500">Loading...</div>
                ) : eventSuggestions.length > 0 ? (
                  eventSuggestions.map(event => (
                    <div
                      key={event.id}
                      className="px-4 py-3 cursor-pointer hover:bg-blue-50 rounded transition"
                      onMouseDown={() => {
                        setSelectedEvent(event);
                        setEventSearch(event.title);
                        setEventSuggestions([]);
                      }}
                    >
                      <span className="font-semibold text-blue-700">{event.title}</span>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-3 text-gray-500 flex items-center justify-between">
                    <span>No results.</span>
                    <Button
                      size="sm"
                      className="ml-2"
                      onMouseDown={() => handleCreateEvent(eventSearch)}
                      disabled={creatingEvent}
                    >
                      {creatingEvent ? 'Creating...' : `Create "${eventSearch}"`}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
          {eventError && <div className="text-red-500 text-sm mt-1">{eventError}</div>}
        </div>

        <div className="h-6 flex items-center justify-center mb-8">
          <div className="w-1/2 border-t border-gray-200"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Step 2: Upload Ticket */}
          <Card className="rounded-2xl shadow-xl border border-gray-100 bg-white/90">
            <CardHeader className="pb-6">
              <div className="mb-4 flex items-center gap-3">
                <span className="inline-block bg-purple-100 text-purple-700 rounded-full px-3 py-1 text-xs font-semibold">Step 2</span>
                <span className="font-semibold text-gray-800 text-lg">Upload Ticket</span>
              </div>
              <CardDescription className="text-gray-500 text-base leading-relaxed">Drag and drop your ticket image or PDF here</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 px-6 pb-6">
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors bg-gradient-to-br from-blue-50 to-purple-50/30 ${
                  isDragActive ? 'border-blue-400 bg-blue-100' : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <input {...getInputProps()} />
                {preview ? (
                  <div className="space-y-6">
                    {file?.type === 'application/pdf' ? (
                      <div className="flex items-center justify-center">
                        <FileText className="w-16 h-16 text-purple-500" />
                      </div>
                    ) : (
                      <img 
                        src={preview} 
                        alt="Preview" 
                        className="max-w-full max-h-64 mx-auto rounded-xl shadow"
                      />
                    )}
                    <div className="space-y-2">
                      <p className="font-medium text-gray-800 text-lg truncate px-2">{file?.name}</p>
                      <p className="text-sm text-gray-500">
                        {file?.size ? (file.size / 1024 / 1024).toFixed(2) : '0.00'} MB
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <Upload className="w-16 h-16 text-purple-300 mx-auto" />
                    <div className="space-y-3">
                      <p className="text-xl font-medium text-gray-700">
                        {isDragActive ? 'Drop the file here' : 'Drag & drop or click to select'}
                      </p>
                      <p className="text-sm text-gray-400 leading-relaxed">
                        Supports images (JPG, PNG) and PDFs up to 100MB
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <Button
                onClick={handleUpload}
                disabled={!file || uploading || !selectedEvent}
                className="w-full py-3 text-base font-medium"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 mr-3" />
                    Upload & Extract Details
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Step 3: Review Details */}
          <Card className="rounded-2xl shadow-xl border border-gray-100 bg-white/90">
            <CardHeader className="pb-6">
              <div className="mb-4 flex items-center gap-3">
                <span className="inline-block bg-green-100 text-green-700 rounded-full px-3 py-1 text-xs font-semibold">Step 3</span>
                <span className="font-semibold text-gray-800 text-lg">Review & Edit Details</span>
              </div>
              <CardDescription className="text-gray-500 text-base leading-relaxed">Review and edit the extracted information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 px-6 pb-6">
              {isScanned && (
                <div className="flex items-start p-4 bg-yellow-50 border border-yellow-200 rounded-lg space-x-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-yellow-800 leading-relaxed">
                    This appears to be a scanned document. Please verify the extracted details.
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="event_date" className="text-sm font-medium">Event Date</Label>
                  <Input
                    id="event_date"
                    value={extractedFields.date || ''}
                    onChange={(e) => updateField('date', e.target.value)}
                    placeholder="Event date"
                    className="rounded-lg py-2.5"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="venue" className="text-sm font-medium">Venue</Label>
                  <Input
                    id="venue"
                    value={extractedFields.venue || ''}
                    onChange={(e) => updateField('venue', e.target.value)}
                    placeholder="Venue"
                    className="rounded-lg py-2.5"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="section" className="text-sm font-medium">Section</Label>
                  <Input
                    id="section"
                    value={extractedFields.section || ''}
                    onChange={(e) => updateField('section', e.target.value)}
                    placeholder="Section"
                    className="rounded-lg py-2.5"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="row" className="text-sm font-medium">Row</Label>
                  <Input
                    id="row"
                    value={extractedFields.row || ''}
                    onChange={(e) => updateField('row', e.target.value)}
                    placeholder="Row"
                    className="rounded-lg py-2.5"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-sm font-medium">Category</Label>
                  <Input
                    id="category"
                    value={extractedFields.category || ''}
                    onChange={(e) => updateField('category', e.target.value)}
                    placeholder="Category"
                    className="rounded-lg py-2.5"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="seat" className="text-sm font-medium">Seat</Label>
                  <Input
                    id="seat"
                    value={extractedFields.seat_number || ''}
                    onChange={(e) => updateField('seat_number', e.target.value)}
                    placeholder="Seat"
                    className="rounded-lg py-2.5"
                  />
                </div>
              </div>

              {/* Removed the raw extracted text section */}
            </CardContent>
          </Card>
        </div>

        {/* Submit Button */}
        {Object.keys(extractedFields).length > 0 && (
          <div className="mt-8 text-center">
            <Button
              onClick={handleSubmit}
              disabled={!selectedEvent || uploading}
              size="lg"
              className="px-8 py-3 text-lg font-semibold"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                  Creating Listing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 mr-3" />
                  Create Listing
                </>
              )}
            </Button>
            <p className="text-sm text-gray-500 mt-2">
              Review all details above before creating your listing
            </p>
          </div>
        )}
      </div>
  )
} 