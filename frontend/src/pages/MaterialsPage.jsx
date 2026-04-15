import { useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Upload, Trash2, Download, Loader2, AlertCircle, FolderOpen } from 'lucide-react'
import Navbar from '../components/Navbar'
import FileTypeIcon from '../components/FileTypeIcon'
import ConfirmModal from '../components/ConfirmModal'
import { useToast } from '../context/ToastContext'
import { eventService } from '../services/eventService'

const ACCEPTED = '.pdf,.png,.jpg,.jpeg,.pptx'
const MAX_SIZE_MB = 16

function formatBytes(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

export default function MaterialsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addToast } = useToast()
  const queryClient = useQueryClient()
  const fileInputRef = useRef(null)

  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const { data: eventData } = useQuery({
    queryKey: ['event', id],
    queryFn: () => eventService.getEvent(id),
    staleTime: 60_000,
  })

  const { data: materialsData, isLoading, error } = useQuery({
    queryKey: ['materials', id],
    queryFn: () => eventService.getMaterials(id),
    staleTime: 30_000,
  })

  const deleteMutation = useMutation({
    mutationFn: (mid) => eventService.deleteMaterial(id, mid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials', id] })
      addToast('Material deleted.', 'info')
      setDeleteTarget(null)
    },
    onError: (err) => addToast(err.message, 'error'),
  })

  async function uploadFile(file) {
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      addToast(`File too large. Max ${MAX_SIZE_MB}MB.`, 'error')
      return
    }
    setUploading(true)
    setUploadProgress(0)
    try {
      await eventService.uploadMaterial(id, file, setUploadProgress)
      queryClient.invalidateQueries({ queryKey: ['materials', id] })
      addToast('File uploaded successfully!', 'success')
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
    e.target.value = ''
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) uploadFile(file)
  }

  const event = eventData?.event
  const materials = materialsData?.materials ?? []

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/organizer')} className="p-2 rounded-lg text-fg-3 hover:text-fg hover:bg-surface-alt transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-fg">Materials</h1>
            {event && <p className="text-fg-3 text-sm truncate">{event.title}</p>}
          </div>
        </div>

        {/* Upload area */}
        <div className="bg-surface border border-border rounded-xl p-6 shadow-sm mb-6">
          <h2 className="font-semibold text-fg mb-4 text-sm">Upload File</h2>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              dragging
                ? 'border-brand-500 bg-brand-500/5'
                : 'border-border hover:border-brand-500/50 hover:bg-surface-alt'
            } ${uploading ? 'cursor-not-allowed opacity-60' : ''}`}
          >
            {uploading ? (
              <div className="space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-brand-500 mx-auto" />
                <p className="text-sm text-fg-2">Uploading… {uploadProgress}%</p>
                <div className="max-w-xs mx-auto h-2 rounded-full bg-surface-alt overflow-hidden">
                  <div
                    className="h-full bg-brand-500 rounded-full transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            ) : (
              <>
                <Upload className="w-8 h-8 text-fg-3 mx-auto mb-2" />
                <p className="font-medium text-fg-2 text-sm">
                  {dragging ? 'Drop file here' : 'Drag & drop or click to upload'}
                </p>
                <p className="text-xs text-fg-3 mt-1">PDF, PNG, JPG, PPTX — max {MAX_SIZE_MB}MB</p>
              </>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED}
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Materials list */}
        <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-fg text-sm">Uploaded Files</h2>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-fg-3">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Loading…
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-red-500 text-sm p-6">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error.message}
            </div>
          ) : materials.length === 0 ? (
            <div className="text-center py-16 text-fg-3">
              <FolderOpen className="w-10 h-10 mx-auto mb-3 opacity-25" />
              <p className="text-fg-2 font-medium">No materials uploaded yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {materials.map((mat) => (
                <div key={mat.id} className="flex items-center gap-4 px-5 py-4 hover:bg-surface-alt transition-colors">
                  <FileTypeIcon fileType={mat.file_type} className="w-5 h-5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-fg text-sm truncate">{mat.file_name}</p>
                    <p className="text-xs text-fg-3 mt-0.5">
                      {mat.file_size ? formatBytes(mat.file_size) + ' · ' : ''}
                      {formatDate(mat.uploaded_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={`/api/events/${id}/materials/${mat.id}/download`}
                      download
                      className="p-2 rounded-lg text-fg-3 hover:text-brand-500 hover:bg-brand-500/10 transition-colors"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => setDeleteTarget(mat)}
                      className="p-2 rounded-lg text-fg-3 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Material"
        message={`Are you sure you want to delete "${deleteTarget?.file_name}"? This cannot be undone.`}
        onConfirm={() => deleteMutation.mutate(deleteTarget?.id)}
        onCancel={() => setDeleteTarget(null)}
        confirmLabel="Delete"
      />
    </div>
  )
}
