/**
 * MediaUpload Component
 *
 * Provides photo/video upload functionality for teaching sessions.
 * Handles file selection, validation, preview, and base64 conversion.
 *
 * Features:
 * - File type validation (images: JPG, PNG, WEBP; videos: MP4, WEBM)
 * - Size validation (20MB for images, 90MB for videos)
 * - Preview modal with image/video display
 * - Base64 conversion for direct Gemini API transmission
 * - Error handling with user-friendly messages
 *
 * Usage:
 * <MediaUpload
 *   onMediaUpload={(base64, mimeType, mediaType) => handleUpload(base64, mimeType, mediaType)}
 *   disabled={isProcessing}
 * />
 *
 * References:
 * - Gemini vision: https://ai.google.dev/gemini-api/docs/image-understanding
 * - Gemini video: https://ai.google.dev/gemini-api/docs/video-understanding
 */

'use client'

import { useState, useRef, ChangeEvent } from 'react'
import { Upload, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface MediaUploadProps {
  onMediaUpload: (mediaBase64: string, mimeType: string, mediaType: 'image' | 'video') => void
  disabled?: boolean
}

// File size limits (verified against Gemini API inline data limits)
// Reference: https://ai.google.dev/gemini-api/docs/image-understanding
const MAX_IMAGE_SIZE = 20 * 1024 * 1024 // 20MB
const MAX_VIDEO_SIZE = 90 * 1024 * 1024 // 90MB

// Supported MIME types (verified from official Gemini documentation)
// Images: https://ai.google.dev/gemini-api/docs/image-understanding
// Videos: https://ai.google.dev/gemini-api/docs/video-understanding
const VALID_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const VALID_VIDEO_TYPES = ['video/mp4', 'video/webm']

export function MediaUpload({ onMediaUpload, disabled = false }: MediaUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  /**
   * Validate file type and size
   * Returns validation result with user-friendly error message if invalid
   */
  function validateFile(file: File): { valid: boolean; error?: string; mediaType?: 'image' | 'video' } {
    // Check if File API is supported
    if (!window.File || !window.FileReader) {
      return {
        valid: false,
        error: 'Media upload is not supported in this browser. Please use a modern browser.'
      }
    }

    // Determine file type
    const isImage = VALID_IMAGE_TYPES.includes(file.type)
    const isVideo = VALID_VIDEO_TYPES.includes(file.type)

    if (!isImage && !isVideo) {
      return {
        valid: false,
        error: 'Invalid file type. Supported formats: JPG, PNG, WEBP for images; MP4, WEBM for videos.'
      }
    }

    const detectedMediaType: 'image' | 'video' = isImage ? 'image' : 'video'

    // Validate file size
    const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE
    if (file.size > maxSize) {
      const maxSizeMB = maxSize / 1024 / 1024
      const fileSizeMB = (file.size / 1024 / 1024).toFixed(1)
      return {
        valid: false,
        error: `File too large (${fileSizeMB}MB). Maximum size for ${detectedMediaType}s: ${maxSizeMB}MB.`
      }
    }

    return { valid: true, mediaType: detectedMediaType }
  }

  /**
   * Convert file to base64 string
   * Reuses pattern from VoiceRecorder.tsx:259-274
   */
  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          // Remove data URL prefix to get pure base64
          // Format: "data:image/jpeg;base64,<base64string>"
          const base64 = reader.result.split(',')[1]
          resolve(base64)
        } else {
          reject(new Error('Failed to read file data'))
        }
      }

      reader.onerror = () => {
        reject(new Error('FileReader error occurred'))
      }

      reader.readAsDataURL(file)
    })
  }

  /**
   * Format file size for display
   */
  function formatFileSize(bytes?: number): string {
    if (!bytes) return 'Unknown'
    if (bytes < 1024) return `${bytes} bytes`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  /**
   * Handle file selection from input
   */
  function handleFileSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    // Reset previous state
    setError(null)

    // Validate file
    const validation = validateFile(file)

    if (!validation.valid) {
      setError(validation.error!)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    // File is valid, set state and show preview
    setSelectedFile(file)
    setMediaType(validation.mediaType!)

    // Create preview URL
    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)
    setIsPreviewOpen(true)
  }

  /**
   * Handle modal close - cleanup resources
   */
  function handleClosePreview() {
    // Revoke object URL to prevent memory leaks
    // Reference: https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }

    setIsPreviewOpen(false)
    setSelectedFile(null)
    setPreviewUrl(null)
    setMediaType(null)
    setError(null)

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  /**
   * Handle upload confirmation
   * Converts file to base64 and sends to parent component
   */
  async function handleConfirmUpload() {
    if (!selectedFile || !mediaType) return

    setIsUploading(true)
    setError(null)

    try {
      // Convert file to base64
      const base64 = await fileToBase64(selectedFile)

      // Send to parent component
      onMediaUpload(base64, selectedFile.type, mediaType)

      // Close modal and cleanup
      handleClosePreview()
    } catch (err) {
      console.error('Error converting file to base64:', err)
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to process file. Please try again.'
      )
    } finally {
      setIsUploading(false)
    }
  }

  /**
   * Trigger file input click
   */
  function handleButtonClick() {
    fileInputRef.current?.click()
  }

  return (
    <>
      {/* Upload Button */}
      <button
        onClick={handleButtonClick}
        disabled={disabled}
        className="w-14 h-14 rounded-full flex items-center justify-center bg-accent hover:bg-accent/90 shadow-lg transition-all focus:outline-none focus:ring-4 focus:ring-accent/50 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Upload photo or video"
        title="Upload photo or video"
      >
        <Upload className="text-white" size={24} />
      </button>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
        onChange={handleFileSelect}
        className="hidden"
        aria-hidden="true"
      />

      {/* Error Display (outside modal, for file selection errors) */}
      {error && !isPreviewOpen && (
        <div className="fixed bottom-4 right-4 max-w-sm p-3 bg-error/10 border border-error rounded-lg shadow-lg z-50">
          <p className="text-error text-sm">{error}</p>
        </div>
      )}

      {/* Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={handleClosePreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Preview Media</DialogTitle>
            <DialogDescription>
              Review your {mediaType} before sending to the teacher
            </DialogDescription>
          </DialogHeader>

          {/* Preview Area */}
          <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-center min-h-[300px]">
            {selectedFile?.type.startsWith('image/') && previewUrl && (
              <img
                src={previewUrl}
                alt="Preview"
                className="max-w-full max-h-[400px] object-contain rounded-lg"
              />
            )}
            {selectedFile?.type.startsWith('video/') && previewUrl && (
              <video
                src={previewUrl}
                controls
                className="max-w-full max-h-[400px] rounded-lg"
              />
            )}
          </div>

          {/* File Info */}
          <div className="text-sm text-gray-600 space-y-1 bg-gray-50 p-3 rounded-lg">
            <p>
              <strong>File:</strong> {selectedFile?.name}
            </p>
            <p>
              <strong>Size:</strong> {formatFileSize(selectedFile?.size)}
            </p>
            <p>
              <strong>Type:</strong> {selectedFile?.type}
            </p>
          </div>

          {/* Error Display (in modal) */}
          {error && (
            <div className="p-3 bg-error/10 border border-error rounded-lg">
              <p className="text-error text-sm">{error}</p>
            </div>
          )}

          {/* Actions */}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleClosePreview}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleConfirmUpload}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Send to Teacher
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
