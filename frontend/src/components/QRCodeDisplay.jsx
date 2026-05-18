import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'
import { Download } from 'lucide-react'

export default function QRCodeDisplay({ value, eventTitle, size = 200 }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current || !value) return
    QRCode.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 2,
      color: { dark: '#192041', light: '#ffffff' },
    }).catch(console.error)
  }, [value, size])

  function handleDownload() {
    const canvas = canvasRef.current
    if (!canvas) return
    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = `${(eventTitle || 'event').replace(/\s+/g, '-').toLowerCase()}-qr.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  if (!value) return null

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="p-3 bg-white rounded-xl border border-border shadow-sm">
        <canvas ref={canvasRef} />
      </div>
      <button
        onClick={handleDownload}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-alt text-fg-2 hover:text-fg text-sm transition-colors"
      >
        <Download className="w-3.5 h-3.5" />
        Download QR
      </button>
    </div>
  )
}
