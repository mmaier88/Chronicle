'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Loader2 } from 'lucide-react'

interface UploadCoverButtonProps {
  bookId: string
  onUploaded?: () => void
}

export function UploadCoverButton({ bookId, onUploaded }: UploadCoverButtonProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be smaller than 5MB')
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('bookId', bookId)

      const response = await fetch('/api/cover/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        onUploaded?.()
        router.refresh()
      } else {
        const data = await response.json()
        setError(data.error || 'Upload failed')
      }
    } catch (err) {
      setError('Upload failed')
      console.error('Failed to upload cover:', err)
    } finally {
      setIsUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <button
        onClick={handleClick}
        disabled={isUploading}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 1rem',
          background: 'rgba(250, 246, 237, 0.05)',
          border: '1px solid rgba(250, 246, 237, 0.15)',
          borderRadius: 8,
          color: 'var(--moon-soft)',
          fontSize: '0.875rem',
          cursor: isUploading ? 'wait' : 'pointer',
          transition: 'all 0.2s',
          opacity: isUploading ? 0.7 : 1,
        }}
      >
        {isUploading ? (
          <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
        ) : (
          <Upload style={{ width: 16, height: 16 }} />
        )}
        {isUploading ? 'Uploading...' : 'Upload Cover'}
        <style jsx>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </button>
      {error && (
        <p style={{ color: '#fda4af', fontSize: '0.75rem', marginTop: '0.5rem' }}>
          {error}
        </p>
      )}
    </>
  )
}
