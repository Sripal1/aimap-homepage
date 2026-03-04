import { useCallback, useRef, useState } from 'react'
import { Upload, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FileUploadProps {
  accept: string
  label: string
  file: File | null
  previewUrl?: string | null
  hasError?: boolean
  onChange: (file: File | null) => void
}

export default function FileUpload({
  accept,
  label,
  file,
  previewUrl,
  hasError,
  onChange,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const dropped = e.dataTransfer.files[0]
      if (dropped) onChange(dropped)
    },
    [onChange],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  if (file) {
    return (
      <div className="flex items-center gap-3 rounded-md border border-stone-300 px-3 py-2">
        {previewUrl && (
          <img
            src={previewUrl}
            alt="Preview"
            className="h-10 w-10 rounded object-contain"
          />
        )}
        <span className="flex-1 truncate text-sm text-stone-700">
          {file.name}
        </span>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-stone-400 hover:text-stone-600 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={cn(
        'flex w-full flex-col items-center gap-2 rounded-md border-2 border-dashed px-4 py-6 text-sm transition-colors cursor-pointer',
        isDragging
          ? 'border-brand-teal bg-brand-teal-light'
          : hasError
            ? 'border-red-300 bg-red-50'
            : 'border-stone-300 hover:border-stone-400 bg-stone-50',
      )}
    >
      <Upload className="h-5 w-5 text-stone-400" />
      <span className="text-stone-500">{label}</span>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onChange(f)
        }}
      />
    </button>
  )
}
