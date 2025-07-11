'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Upload, FileText, Image, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

interface ExtractedFields {
  event_name?: string
  event_date?: string
  venue?: string
  section?: string
  row?: string
  seat?: string
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

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      setFile(file)
      
      // Create preview
      if (file.type === 'application/pdf') {
        // For PDFs, show a PDF icon or placeholder
        setPreview('/pdf-icon.png') // You can add a PDF icon to your public folder
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
    maxSize: 100 * 1024 * 1024 // 100MB
  })

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file first')
      return
    }

    setUploading(true)
    
    try {
      const formData = new FormData()
      formData.append('ticket', file)
      
      // Get current user ID (you'll need to implement this based on your auth)
      const user = { id: 'current-user-id' } // Replace with actual user ID
      formData.append('userId', user.id)

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
      
      toast.success('Ticket uploaded successfully!')
      
      // Optionally redirect to listings page
      // router.push('/my-listings')
      
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error instanceof Error ? error.message : 'Upload failed')
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Upload New Ticket</h1>
        <p className="text-gray-600 mt-2">Upload your ticket and we'll extract the details automatically</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle>Upload Ticket</CardTitle>
            <CardDescription>
              Drag and drop your ticket image or PDF here
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input {...getInputProps()} />
              {preview ? (
                <div className="space-y-4">
                  {file?.type === 'application/pdf' ? (
                    <div className="flex items-center justify-center">
                      <FileText className="w-16 h-16 text-red-500" />
                    </div>
                  ) : (
                    <img 
                      src={preview} 
                      alt="Preview" 
                      className="max-w-full max-h-64 mx-auto rounded-lg"
                    />
                  )}
                  <div>
                    <p className="font-medium">{file?.name}</p>
                    <p className="text-sm text-gray-500">
                      {file?.size ? (file.size / 1024 / 1024).toFixed(2) : '0.00'} MB
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                  <div>
                    <p className="text-lg font-medium">
                      {isDragActive ? 'Drop the file here' : 'Drag & drop or click to select'}
                    </p>
                    <p className="text-sm text-gray-500">
                      Supports images (JPG, PNG) and PDFs up to 100MB
                    </p>
                  </div>
                </div>
              )}
            </div>

            <Button 
              onClick={handleUpload} 
              disabled={!file || uploading}
              className="w-full"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload & Extract Details
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Extracted Details Section */}
        <Card>
          <CardHeader>
            <CardTitle>Extracted Details</CardTitle>
            <CardDescription>
              Review and edit the extracted information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isScanned && (
              <div className="flex items-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
                <span className="text-sm text-yellow-800">
                  This appears to be a scanned document. Please verify the extracted details.
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="event_name">Event Name</Label>
                <Input
                  id="event_name"
                  value={extractedFields.event_name || ''}
                  onChange={(e) => updateField('event_name', e.target.value)}
                  placeholder="Event name"
                />
              </div>
              
              <div>
                <Label htmlFor="event_date">Event Date</Label>
                <Input
                  id="event_date"
                  value={extractedFields.event_date || ''}
                  onChange={(e) => updateField('event_date', e.target.value)}
                  placeholder="Event date"
                />
              </div>
              
              <div>
                <Label htmlFor="venue">Venue</Label>
                <Input
                  id="venue"
                  value={extractedFields.venue || ''}
                  onChange={(e) => updateField('venue', e.target.value)}
                  placeholder="Venue"
                />
              </div>
              
              <div>
                <Label htmlFor="section">Section</Label>
                <Input
                  id="section"
                  value={extractedFields.section || ''}
                  onChange={(e) => updateField('section', e.target.value)}
                  placeholder="Section"
                />
              </div>
              
              <div>
                <Label htmlFor="row">Row</Label>
                <Input
                  id="row"
                  value={extractedFields.row || ''}
                  onChange={(e) => updateField('row', e.target.value)}
                  placeholder="Row"
                />
              </div>
              
              <div>
                <Label htmlFor="seat">Seat</Label>
                <Input
                  id="seat"
                  value={extractedFields.seat || ''}
                  onChange={(e) => updateField('seat', e.target.value)}
                  placeholder="Seat"
                />
              </div>
              
              <div>
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  value={extractedFields.price || ''}
                  onChange={(e) => updateField('price', e.target.value)}
                  placeholder="Price"
                />
              </div>
            </div>

            {extractedText && (
              <div>
                <Label htmlFor="extracted_text">Raw Extracted Text</Label>
                <Textarea
                  id="extracted_text"
                  value={extractedText}
                  readOnly
                  rows={4}
                  className="text-sm"
                  placeholder="Extracted text will appear here..."
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 