import { useRef, useState, useCallback } from 'react'
import { Upload, X, FileText, Image, File } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { api } from '@/lib/api'
import { toast } from '@/hooks/useToast'
import { Button } from '@/components/ui/button'
import type { Document } from '@/types'

interface FileUploadProps {
  entityType: string
  entityId: number
  onUploaded?: (doc: Document) => void
  className?: string
}

function fileIcon(mime?: string | null) {
  if (!mime) return <File className="h-4 w-4" />
  if (mime.startsWith('image/')) return <Image className="h-4 w-4" />
  return <FileText className="h-4 w-4" />
}

export function FileUpload({ entityType, entityId, onUploaded, className }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const upload = useCallback(async (files: FileList | null) => {
    if (!files?.length) return
    setUploading(true)
    for (const file of Array.from(files)) {
      try {
        // Step 1: Get document record + upload URL
        const { document_id, upload_url, file_key } = await api.post<{
          document_id: number; upload_url: string | null; file_key: string
        }>('/documents/upload-url', {
          entity_type: entityType,
          entity_id: entityId,
          file_name: file.name,
          mime_type: file.type || 'application/octet-stream',
        })

        // Step 2: Upload file
        if (upload_url) {
          await fetch(upload_url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
        } else {
          // Fallback: direct upload via API
          const formData = new FormData()
          formData.append('file', file)
          await fetch(`/api/documents/${document_id}/upload`, {
            method: 'POST',
            body: file,
            headers: {
              'Content-Type': file.type,
              'Authorization': `Bearer ${(await import('@/lib/api')).getAccessToken() ?? ''}`,
            },
          })
        }

        // Step 3: Confirm
        await api.put(`/documents/${document_id}/confirm`, { file_size: file.size })

        toast({ title: 'Uploaded', description: file.name })
        onUploaded?.({
          id: document_id, entity_type: entityType, entity_id: entityId,
          file_name: file.name, file_key, mime_type: file.type,
          file_size: file.size, category: 'other', version: 1,
          created_at: new Date().toISOString(),
        })
      } catch {
        toast({ title: 'Upload failed', description: file.name, variant: 'destructive' })
      }
    }
    setUploading(false)
  }, [entityType, entityId, onUploaded])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    upload(e.dataTransfer.files)
  }, [upload])

  return (
    <div
      className={cn(
        'border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer',
        dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
        uploading && 'pointer-events-none opacity-60',
        className
      )}
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={e => upload(e.target.files)}
      />
      <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
      <p className="text-sm font-medium">{uploading ? 'Uploading...' : 'Click or drag files to upload'}</p>
      <p className="text-xs text-muted-foreground mt-1">Plans, photos, permits, contracts</p>
    </div>
  )
}

interface FileListProps {
  documents: Document[]
  onDeleted?: (id: number) => void
  className?: string
}

export function FileList({ documents, onDeleted, className }: FileListProps) {
  const [deleting, setDeleting] = useState<number | null>(null)

  const handleDownload = async (doc: Document) => {
    try {
      const { url } = await api.get<{ url: string }>(`/documents/${doc.id}/url`)
      window.open(url, '_blank')
    } catch {
      toast({ title: 'Download failed', variant: 'destructive' })
    }
  }

  const handleDelete = async (doc: Document) => {
    setDeleting(doc.id)
    try {
      await api.delete(`/documents/${doc.id}`)
      onDeleted?.(doc.id)
      toast({ title: 'File deleted' })
    } catch {
      toast({ title: 'Delete failed', variant: 'destructive' })
    }
    setDeleting(null)
  }

  if (!documents.length) return null

  return (
    <ul className={cn('divide-y', className)}>
      {documents.map(doc => (
        <li key={doc.id} className="flex items-center gap-3 py-2.5 group">
          <div className="flex-shrink-0 text-muted-foreground">{fileIcon(doc.mime_type)}</div>
          <div className="flex-1 min-w-0">
            <button
              onClick={() => handleDownload(doc)}
              className="text-sm font-medium text-foreground hover:text-primary truncate block text-left w-full"
            >
              {doc.file_name}
            </button>
            <p className="text-xs text-muted-foreground">
              {doc.category} · {formatDate(doc.created_at)}
              {doc.uploaded_by_name && ` · ${doc.uploaded_by_name}`}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
            disabled={deleting === doc.id}
            onClick={() => handleDelete(doc)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </li>
      ))}
    </ul>
  )
}

// Re-export formatDate locally
function _formatDate(s: string | null | undefined) {
  return formatDate(s)
}
void _formatDate
