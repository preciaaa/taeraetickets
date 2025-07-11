'use client'

import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Webcam from 'react-webcam'
import { cn } from '@/lib/utils'
import { createClient } from '@supabase/supabase-js'

export default function FileDropPage() {
  const [file, setFile] = useState<File | null>(null)
  const [next, setNext] = useState<boolean>(false)
  const [match, setMatch] = useState<boolean | null>(null)
  const [embedding, setEmbedding] = useState<number[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0])
      setEmbedding(null)
      setMatch(null)
      setError(null)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    multiple: false, 
    maxFiles: 1,
    accept: {
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/png': ['.png']
    }
  })

  const handleNext = async () => {
    if (!file) return
  
    setLoading(true)
    setError(null)
  
    try {
      // Get the logged-in user
      const { data, error } = await supabase.auth.getUser()
      if (error || !data?.user) {
        throw new Error("Failed to get user.")
      }
  
      const userId = data.user.id
      const formData = new FormData()
      formData.append('file', file)
      formData.append('user_id', userId)
  
      const response = await fetch('http://localhost:5002/extract-embedding', {
        method: 'POST',
        body: formData,
      })
  
      if (!response.ok) {
        throw new Error('Failed to extract embedding.')
      }
  
      const responseData = await response.json()
      setEmbedding(responseData.embedding)
      setNext(true)
    } catch (err: any) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }
  

  return (
    <div className="max-w-md mx-auto">
        <h1 className="text-4xl font-bold mb-4">Verification</h1>
        {next ? (
          <div>
            <Webcam/>
            <Button className="mt-4 w-full" disabled={!match}>
               Finish
            </Button>
          </div>
        ) : (
        <div>
          <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0">Upload an identification picture</h2>
          <div className="flex items-center justify-center">
            <Card className="w-full max-w-md p-6">
                <CardContent>
                <div
                    {...getRootProps()}
                    className={cn(
                    'border border-dashed border-gray-400 rounded-md p-6 text-center cursor-pointer transition-all',
                    isDragActive ? 'bg-accent' : 'bg-background'
                    )}
                >
                    <input {...getInputProps()} />
                    {isDragActive ? (
                    <p className="text-muted-foreground">Drop the file here...</p>
                    ) : (
                    <p className="text-muted-foreground">
                        Drag and drop a file here, or click to select one
                    </p>
                    )}
                </div>

                {file && (
                    <div className="mt-4">
                    <p className="text-sm font-medium">Selected file:</p>
                    <p className="text-muted-foreground">{file.name}</p>
                    </div>
                )}

                {fileRejections.length > 0 && (
                    <p className="text-red-500 mt-2 text-sm">Only one file is allowed.</p>
                )}

                {error && <p className="text-red-600 mt-2 text-sm">{error}</p>}
                {loading && <p className="text-sm text-muted-foreground mt-2">Processing image...</p>}

                <Button className="mt-4 w-full" disabled={!file || loading} onClick={handleNext}>
                    Next
                </Button>
                </CardContent>
            </Card>
          </div>
        </div>
        )}
    </div>
  )
}
