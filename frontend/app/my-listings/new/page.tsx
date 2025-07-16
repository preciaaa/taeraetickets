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
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty } from '@/components/ui/command'
import { EventSelector } from '@/components/ui/event-selector'
import { apiRoutes } from '@/lib/apiRoutes';

interface ExtractedFields {
  date?: string
  venue?: string
  section?: string
  row?: string
  seat_number?: string
  category?: string
  price?: string
}

export default function NewListing() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [extractedFields, setExtractedFields] = useState<ExtractedFields>({})
  const [extractedText, setExtractedText] = useState<string>('')
  const [isScanned, setIsScanned] = useState(false)
  const router = useRouter()
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  // Add state for processed data
  const [processedData, setProcessedData] = useState<any>(null);
  // Add state for pricing
  const [selectedPrice, setSelectedPrice] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(0);
  const [priceLoading, setPriceLoading] = useState(false);
  const [originalPrice, setOriginalPrice] = useState<number | null>(null);

  const handleSelectEvent = (event: any) => {
    setSelectedEvent(event)
    console.log('Selected event:', event)
  }

  const isValidDateFormat = (dateStr: string): boolean => {
    // Regex to match YYYY-MM-DD format
    return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
  };  

  const handleCreateEvent = async (title: string) => {
    console.log('Creating event with title:', title)
  }

  // Pricing algorithm to determine maximum allowed price
  const calculateMaxPrice = async (event: any) => {
    setPriceLoading(true);
    try {
      // Base factors for pricing algorithm
      const basePrice = 100; // Default base price
      let maxPrice = basePrice;

      // Factor 1: Event popularity (based on existing listings)
      const { data: existingListings } = await supabase
        .from('listings')
        .select('*')
        .eq('event_name', event.title);
      
      const popularityMultiplier = Math.min(1.5, 1 + (existingListings?.length || 0) * 0.1);
      maxPrice *= popularityMultiplier;

      // Factor 2: Event category/type (some events are more valuable)
      const categoryMultipliers = {
        'Concert': 1.3,
        'Sports': 1.2,
        'Theater': 1.1,
        'Comedy': 0.9,
        'General': 1.0
      };
      const category = extractedFields.category?.toLowerCase() || 'general';
      const categoryMultiplier = categoryMultipliers[category as keyof typeof categoryMultipliers] || 1.0;
      maxPrice *= categoryMultiplier;

      // Factor 3: Venue prestige
      const venueMultipliers = {
        'singapore indoor stadium': 1.4,
        'national stadium': 1.3,
        'marina bay sands': 1.5,
        'capitol theatre': 1.2,
        'gateway theatre': 1.1
      };
      const venue = extractedFields.venue?.toLowerCase() || '';
      const venueMultiplier = venueMultipliers[venue as keyof typeof venueMultipliers] || 1.0;
      maxPrice *= venueMultiplier;

      // Factor 4: Seat quality (section/row)
      let seatMultiplier = 1.0;
      if (extractedFields.section) {
        const section = extractedFields.section.toLowerCase();
        if (section.includes('vip') || section.includes('premium')) {
          seatMultiplier = 1.3;
        } else if (section.includes('cat1') || section.includes('a')) {
          seatMultiplier = 1.2;
        } else if (section.includes('cat2') || section.includes('b')) {
          seatMultiplier = 1.1;
        }
      }
      maxPrice *= seatMultiplier;

      // Factor 5: Market demand (time-based)
      const now = new Date();
      const eventDate = extractedFields.date ? new Date(extractedFields.date) : null;
      if (eventDate) {
        const daysUntilEvent = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntilEvent <= 7) {
          maxPrice *= 1.2; // Last minute demand
        } else if (daysUntilEvent <= 30) {
          maxPrice *= 1.1; // Near event
        }
      }

      // Factor 6: Seasonal adjustments
      const month = now.getMonth();
      const seasonalMultiplier = (month >= 11 || month <= 1) ? 1.1 : 1.0; // Holiday season
      maxPrice *= seasonalMultiplier;

      // Apply reasonable limits
      maxPrice = Math.min(maxPrice, 500); // Absolute maximum
      maxPrice = Math.max(maxPrice, 50); // Minimum reasonable price

      setMaxPrice(Math.round(maxPrice));
      setSelectedPrice(Math.round(maxPrice * 0.8)); // Default to 80% of max price
    } catch (error) {
      console.error('Error calculating max price:', error);
      setMaxPrice(150); // Fallback
      setSelectedPrice(120);
    } finally {
      setPriceLoading(false);
    }
  };

  // When event is selected, do NOT update extractedFields.event_name anymore
  useEffect(() => {
    if (selectedEvent) {
      // setExtractedFields(prev => ({ ...prev, event_name: selectedEvent.title })); // Removed
      calculateMaxPrice(selectedEvent);
    }
  }, [selectedEvent, extractedFields.category, extractedFields.venue, extractedFields.section, extractedFields.date]);

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

      const response = await fetch(apiRoutes.uploadTicket, {
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
      
      // Extract original price if available
      if (result.parsed?.price) {
        const priceValue = parseFloat(result.parsed.price.replace(/[^\d.]/g, ''));
        if (!isNaN(priceValue)) {
          setOriginalPrice(priceValue);
        }
      }
      
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

    if (!isValidDateFormat(extractedFields.date || '')) {
      toast.error('Please enter a valid date in YYYY-MM-DD format');
      return;
    }    

    if (selectedPrice <= 0 || selectedPrice > maxPrice) {
      toast.error(`Please select a valid price between $1 and $${maxPrice}`)
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
        price: selectedPrice,
        image_url: processedData.publicUrl,
        parsed_fields: extractedFields,
        fingerprint: processedData.fingerprint,
        embedding: processedData.embedding,
        phash: processedData.phash,
        // Add other fields as needed
      }

      console.log('Sending listing data:', listingData);
      console.log('Selected price:', selectedPrice);
      console.log('Original price from OCR:', originalPrice);

      if (selectedEvent?.id && isValidDateFormat(extractedFields.date || '')) {
        try {
          const updateResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/events/${selectedEvent.id}/add-date`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ date: extractedFields.date }),
          });
      
          if (!updateResponse.ok) {
            const errorData = await updateResponse.json();
            console.warn('Failed to update event date:', errorData.error);
          }
        } catch (error) {
          console.error('Error sending event date to API:', error);
        }
      }
    

      const response = await fetch(apiRoutes.listings, {
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
        <EventSelector
          selectedEvent={selectedEvent}
          onEventSelect={handleSelectEvent}
          onCreateEvent={handleCreateEvent}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
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
                    placeholder="YYYY-MM-DD"
                    className={`rounded-lg py-2.5 ${extractedFields.date && !isValidDateFormat(extractedFields.date) ? 'border-red-500' : ''}`}
                  />
                  {extractedFields.date && !isValidDateFormat(extractedFields.date) && (
                    <p className="text-sm text-red-500 mt-1">Date must be in YYYY-MM-DD format</p>
                  )}
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

        {/* Step 4: Set Price */}
        {Object.keys(extractedFields).length > 0 && (
          <Card className="rounded-2xl shadow-xl border border-gray-100 bg-white/90 mb-8">
            <CardHeader className="pb-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="inline-block bg-orange-100 text-orange-700 rounded-full px-3 py-1 text-xs font-semibold">Step 4</span>
                  <span className="font-semibold text-gray-800 text-lg">Set Your Price</span>
                </div>
                <div className="relative group">
                  <div className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center cursor-help text-xs font-semibold hover:bg-orange-200 transition-colors">
                    i
                  </div>
                  <div className="absolute right-0 top-8 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                    <div className="text-sm text-gray-800">
                      <p className="font-medium mb-2">Pricing Algorithm Factors:</p>
                      <ul className="space-y-1 text-xs text-gray-600">
                        <li>• <strong>Event Popularity:</strong> Based on existing listings</li>
                        <li>• <strong>Venue Prestige:</strong> Premium venues get higher limits</li>
                        <li>• <strong>Seat Quality:</strong> VIP/Premium sections valued higher</li>
                        <li>• <strong>Market Demand:</strong> Time-based adjustments</li>
                        <li>• <strong>Seasonal Factors:</strong> Holiday season premiums</li>
                        <li>• <strong>Category Multipliers:</strong> Concert/Sports vs Comedy</li>
                      </ul>
                    </div>
                    <div className="absolute top-0 right-4 w-3 h-3 bg-white border-l border-t border-gray-200 transform rotate-45 -translate-y-1.5"></div>
                  </div>
                </div>
              </div>
              <CardDescription className="text-gray-500 text-base leading-relaxed">
                Choose your selling price. Maximum price is calculated based on event popularity, venue, and market demand.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 px-6 pb-6">
              {priceLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                  <span className="ml-3 text-gray-600">Calculating maximum price...</span>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label className="text-sm font-medium">Maximum Allowed Price</Label>
                      <span className="text-2xl font-bold text-orange-600">${maxPrice}</span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>$1</span>
                        <span>${maxPrice}</span>
                      </div>
                      <div className="relative">
                        <input
                          type="range"
                          min="1"
                          max={maxPrice}
                          value={selectedPrice}
                          onChange={(e) => setSelectedPrice(parseInt(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                          style={{
                            background: `linear-gradient(to right, #f97316 0%, #f97316 ${(selectedPrice / maxPrice) * 100}%, #e5e7eb ${(selectedPrice / maxPrice) * 100}%, #e5e7eb 100%)`
                          }}
                        />
                        {originalPrice && originalPrice <= maxPrice && originalPrice >= 1 && (
                          <div 
                            className="absolute top-0 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-blue-500 transform -translate-x-1/2 -translate-y-1"
                            style={{ left: `${((originalPrice - 1) / (maxPrice - 1)) * 100}%` }}
                            title={`Original Price: $${originalPrice}`}
                          />
                        )}
                      </div>
                      {originalPrice && (
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Your Price: ${selectedPrice}</span>
                          <span>Original: ${originalPrice}</span>
                        </div>
                      )}

                      <div className="flex items-center space-x-4">
                        <div className="flex-1">
                          <Label htmlFor="price-input" className="text-sm font-medium">Your Price</Label>
                          <div className="relative mt-1">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                            <Input
                              id="price-input"
                              type="number"
                              min="1"
                              max={maxPrice}
                              value={selectedPrice}
                              onChange={(e) => {
                                const value = parseInt(e.target.value);
                                if (value >= 1 && value <= maxPrice) {
                                  setSelectedPrice(value);
                                }
                              }}
                              className="pl-8 py-2.5 rounded-lg"
                              placeholder="Enter price"
                            />
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-gray-600">Price Ratio</div>
                          <div className="text-lg font-semibold text-orange-600">
                            {originalPrice ? Math.round((selectedPrice / originalPrice) * 100) : Math.round((selectedPrice / maxPrice) * 100)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Submit Button */}
        {Object.keys(extractedFields).length > 0 && (
          <div className="mt-8 text-center">
            <Button
              onClick={handleSubmit}
              disabled={!selectedEvent || uploading || selectedPrice <= 0 || selectedPrice > maxPrice}
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
                  Create Listing - ${selectedPrice}
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