import { useEffect, useRef, useState } from 'react'
import { X, Camera, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { useCheckinByQR } from '../hooks/useRegistrations'

function nameFromEmail(email) {
  if (!email) return 'Unknown'
  const local = email.split('@')[0]
  return local.split('.')
    .map((p) => p.replace(/\d+$/, ''))
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ') || local
}

export default function QRScanner({ eventId, onClose }) {
  const scannerRef = useRef(null)
  const html5QrRef = useRef(null)
  const scanningRef = useRef(false)
  const checkinMutationRef = useRef(null)
  const [scanResult, setScanResult] = useState(null) // { ok, message, registration }
  const [scanning, setScanning] = useState(false)

  const checkinMutation = useCheckinByQR(eventId)

  useEffect(() => {
    checkinMutationRef.current = checkinMutation
  }, [checkinMutation])

  useEffect(() => {
    let scanner

    async function startScanner() {
      const { Html5QrcodeScanner } = await import('html5-qrcode')

      scanner = new Html5QrcodeScanner(
        'qr-reader',
        { fps: 10, qrbox: { width: 250, height: 250 }, rememberLastUsedCamera: true },
        false,
      )
      html5QrRef.current = scanner

      scanner.render(
        (decodedText) => {
          // Parse "eventra:checkin:<token>"
          const token = decodedText.startsWith('eventra:checkin:')
            ? decodedText.replace('eventra:checkin:', '')
            : decodedText

          if (scanningRef.current) return
          scanningRef.current = true
          setScanning(true)
          scanner.pause(true)

          checkinMutationRef.current.mutate(token, {
            onSuccess: (data) => {
              setScanResult({
                ok: true,
                alreadyIn: data.already_checked_in,
                registration: data.registration,
                message: data.message,
              })
              scanningRef.current = false
              setScanning(false)
            },
            onError: (err) => {
              setScanResult({ ok: false, message: err.message || 'Check-in failed' })
              scanningRef.current = false
              setScanning(false)
              // Resume scanning after 2 s on error
              setTimeout(() => {
                setScanResult(null)
                scanner.resume()
              }, 2500)
            },
          })
        },
        () => {},
      )
    }

    startScanner()

    return () => {
      html5QrRef.current?.clear().catch(() => {})
    }
  }, [])

  function handleScanAgain() {
    setScanResult(null)
    html5QrRef.current?.resume()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-brand-500" />
            <h2 className="font-bold text-fg text-lg">Scan QR Ticket</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-fg-3 hover:text-fg hover:bg-surface-alt transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
          {/* Result overlay */}
          {scanResult ? (
            <div className={`rounded-xl p-5 text-center border ${
              scanResult.ok
                ? 'bg-green-500/10 border-green-500/20'
                : 'bg-red-500/10 border-red-500/20'
            }`}>
              {scanResult.ok ? (
                <>
                  <CheckCircle2 className={`w-12 h-12 mx-auto mb-3 ${scanResult.alreadyIn ? 'text-yellow-500' : 'text-green-500'}`} />
                  <p className={`font-bold text-lg ${scanResult.alreadyIn ? 'text-yellow-500' : 'text-green-500'}`}>
                    {scanResult.alreadyIn ? 'Already Checked In' : 'Check-in Successful'}
                  </p>
                  {scanResult.registration?.user_email && (
                    <p className="text-fg-2 mt-2 font-medium">
                      {nameFromEmail(scanResult.registration.user_email)}
                    </p>
                  )}
                  {scanResult.registration?.user_email && (
                    <p className="text-fg-3 text-sm">{scanResult.registration.user_email}</p>
                  )}
                  <button
                    onClick={handleScanAgain}
                    className="mt-4 px-5 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-400 transition-colors"
                  >
                    Scan Next
                  </button>
                </>
              ) : (
                <>
                  <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-500" />
                  <p className="font-bold text-lg text-red-500">Failed</p>
                  <p className="text-fg-3 text-sm mt-1">{scanResult.message}</p>
                </>
              )}
            </div>
          ) : (
            <>
              {scanning && (
                <div className="flex items-center justify-center gap-2 text-brand-500 text-sm mb-3">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </div>
              )}
              <div id="qr-reader" ref={scannerRef} className="rounded-xl overflow-hidden" />
              <p className="text-xs text-fg-3 text-center mt-3">
                Point the camera at a participant's QR ticket
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
