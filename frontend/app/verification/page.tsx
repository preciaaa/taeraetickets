'use client'

import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function FileDropPage() {
  const [file, setFile] = useState<File | null>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0])
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    multiple: false, 
    maxFiles: 1
  })

  return (
    <div className="max-w-md mx-auto">
        <h1 className="text-4xl font-bold mb-4">Verification</h1>
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

            <Button className="mt-4 w-full" disabled={!file}>
                Submit
            </Button>
            </CardContent>
        </Card>
        </div>
    </div>
  )
}
