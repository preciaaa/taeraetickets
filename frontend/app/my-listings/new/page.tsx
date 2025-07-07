'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { toast } from 'sonner';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface ParsedTicketData {
  event_name?: string;
  event_date?: string;
  venue?: string;
  seat?: string;
  price?: string;
  ticket_number?: string;
  [key: string]: any;
}

export default function NewListing() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [parsedData, setParsedData] = useState<ParsedTicketData>({});
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [listingId, setListingId] = useState<string>('');
  const [user, setUser] = useState<any>(null);
  const [editableData, setEditableData] = useState<ParsedTicketData>({});
  const router = useRouter();


  useEffect(() => {
    checkUser();

  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
      } else {
        router.push('/auth/login');
      }
    } catch (error) {
      console.error('Error checking user:', error);
      router.push('/auth/login');
    }
  };


  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setUploadedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setParsedData({});
      setEditableData({});
      setListingId('');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.bmp']
    },
    multiple: false,
    maxSize: 10 * 1024 * 1024 
  });

  const uploadTicket = async () => {
    if (!uploadedFile || !user) {
      toast.error('Please select a file and ensure you are logged in');
      return;
    }

    try {
      setIsUploading(true);
      setIsProcessing(true);

      const formData = new FormData();
      formData.append('ticket', uploadedFile);
      formData.append('userId', user.id);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      console.log('Uploading to:', `${apiUrl}/upload-ticket`);

      const response = await fetch(`${apiUrl}/upload-ticket`, {
        method: 'POST',
        body: formData,
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Upload failed');
        } else {
          const text = await response.text();
          console.error('Non-JSON response:', text.substring(0, 200));
          throw new Error(`Server error: ${response.status} ${response.statusText}. Please check if the backend server is running.`);
        }
      }

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Expected JSON but got:', text.substring(0, 200));
        throw new Error('Server returned invalid response format. Please check if the backend server is running.');
      }

      const result = await response.json();
      
      setParsedData(result.parsed || {});
      setEditableData(result.parsed || {});
      setListingId(result.listingId);
      
      toast.success('Ticket uploaded successfully! Please review the extracted information.');
      
    } catch (error) {
      console.error('Upload error:', error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Failed to upload ticket. Please check if the backend server is running.');
      }
    } finally {
      setIsUploading(false);
      setIsProcessing(false);
    }
  };

  const confirmListing = async () => {
    if (!listingId || !user) {
      toast.error('No listing to confirm');
      return;
    }

    try {
      setIsProcessing(true);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/confirm-listing/${listingId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Confirmation failed');
      }

      toast.success('Listing confirmed and published successfully!');
      router.push('/my-listings');
      
    } catch (error) {
      console.error('Confirmation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to confirm listing');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    setEditableData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const renderField = (key: string, value: string) => {
    const fieldLabels: { [key: string]: string } = {
      event_name: 'Event Name',
      event_date: 'Event Date',
      venue: 'Venue',
      seat: 'Seat',
      price: 'Price',
      ticket_number: 'Ticket Number',
      section: 'Section',
      row: 'Row',
      gate: 'Gate',
      time: 'Time'
    };

    const label = fieldLabels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    return (
      <div key={key} className="space-y-2">
        <Label htmlFor={key}>{label}</Label>
        <Input
          id={key}
          value={editableData[key] || ''}
          onChange={(e) => handleFieldChange(key, e.target.value)}
          placeholder={`Enter ${label.toLowerCase()}`}
        />
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center mb-8">
        <Button
          variant="ghost"
          onClick={() => router.push('/my-listings')}
          className="mr-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Listings
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create New Listing</h1>
          <p className="text-gray-600 mt-2">Upload your ticket and we'll extract the details automatically</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle>Upload Ticket</CardTitle>
            <CardDescription>
              Upload a screenshot or photo of your ticket
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input {...getInputProps()} />
              {previewUrl ? (
                <div className="space-y-4">
                  <img
                    src={previewUrl}
                    alt="Ticket preview"
                    className="mx-auto max-h-64 object-contain rounded"
                  />
                  <p className="text-sm text-gray-600">
                    Click to change image or drag and drop a new one
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div>
                    <p className="text-lg font-medium text-gray-900">
                      {isDragActive ? 'Drop the file here' : 'Upload your ticket'}
                    </p>
                    <p className="text-sm text-gray-600">
                      Drag and drop an image, or click to select
                    </p>
                  </div>
                </div>
              )}
            </div>

            {uploadedFile && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {uploadedFile.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={uploadTicket}
                  disabled={isUploading || isProcessing }
                  className="w-full"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Process Ticket
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Review Section */}
        <Card>
          <CardHeader>
            <CardTitle>Review Details</CardTitle>
            <CardDescription>
              Review and edit the extracted ticket information
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isProcessing && !parsedData.event_name ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-500 mb-4" />
                  <p className="text-gray-600">Processing your ticket...</p>
                  <p className="text-sm text-gray-500">This may take a few moments</p>
                </div>
              </div>
            ) : parsedData.event_name ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  {Object.entries(editableData).map(([key, value]) => 
                    renderField(key, value)
                  )}
                </div>

                <div className="pt-4 border-t">
                  <Button
                    onClick={confirmListing}
                    disabled={isProcessing}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Confirming...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Confirm & Publish Listing
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="mx-auto h-8 w-8 mb-4" />
                <p>Upload a ticket to see extracted details</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
