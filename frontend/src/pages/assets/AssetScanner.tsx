import { useState, useEffect, useRef, useCallback } from 'react'
import type { Asset, ScanRecord } from './assetTypes'
import { statusColor, transformAsset } from './assetTypes'
import { AssetModal } from './assetComponents'
import { getAllAssets } from '../../services/authService'

export function AssetScanner() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const [assets, setAssets] = useState<Asset[]>([])
  const [scanning, setScanning] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [scannedAsset, setScannedAsset] = useState<Asset | null>(null)
  const [recentScans, setRecentScans] = useState<ScanRecord[]>([])
  
  const assetsRef = useRef<Asset[]>([])
  const isSecureCameraContext =
    typeof window !== 'undefined' &&
    (window.isSecureContext || ['localhost', '127.0.0.1'].includes(window.location.hostname))

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const data = await getAllAssets()
        const transformedAssets: Asset[] = data.map((asset: any) => transformAsset(asset))
        assetsRef.current = transformedAssets
        setAssets(transformedAssets)
      } catch (err) {
        console.error('Failed to fetch assets:', err)
        setAssets([])
      }
    }

    fetchAssets()
  }, [])

  // Load jsQR via npm package (install with: npm install jsqr)
  const loadJsQR = useCallback(() => import('jsqr').then(m => m.default), [])

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setScanning(false)
  }, [])

  const startCamera = useCallback(async () => {
    setCameraError('')
    try {
      if (!isSecureCameraContext) {
        throw new Error('Camera is blocked because this page is not using HTTPS. Open the app on localhost, or serve it with HTTPS for mobile phones.')
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera access is not available in this browser. Use Chrome, Edge, or Safari on a secure HTTPS connection.')
      }
      const jsQR = await loadJsQR()
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      streamRef.current = stream
      if (!videoRef.current) {
        stream.getTracks().forEach(t => t.stop())
        return
      }
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setScanning(true)

      const tick = () => {
        const video = videoRef.current
        const canvas = canvasRef.current
        if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
          animFrameRef.current = requestAnimationFrame(tick)
          return
        }
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.drawImage(video, 0, 0)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' })
        if (code?.data) {
          const found = assetsRef.current.find(a => a.propertyNumber === code.data || a.assetTag === code.data || a.serialNumber === code.data)
          if (found) {
            stopCamera()
            setScannedAsset(found)
            setRecentScans(prev => {
              const alreadyLogged = prev.some(s => s.propertyNumber === found.propertyNumber)
              if (alreadyLogged) return prev
              return [{
                id: Date.now().toString(),
                propertyNumber: found.propertyNumber,
                itemName: found.itemName,
                location: found.location,
                status: found.status,
                scannedAt: new Date().toLocaleString()
              }, ...prev].slice(0, 20)
            })
            return  // stop the loop — camera is already off
          }
        }
        animFrameRef.current = requestAnimationFrame(tick)
      }
      animFrameRef.current = requestAnimationFrame(tick)
    } catch (err: any) {
      const message =
        err?.name === 'NotAllowedError'
          ? 'Camera permission was blocked. Allow camera access in the browser site settings, then try again.'
          : err?.name === 'NotFoundError'
            ? 'No camera was found on this device.'
            : err?.message || 'Camera access denied'
      setCameraError(message)
    }
  }, [isSecureCameraContext, loadJsQR, stopCamera])

  useEffect(() => () => stopCamera(), [stopCamera])


  return (
    <div className="space-y-5">
      {/* Scanner + Instructions side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Camera Panel (2/3) ── */}
        <div className="lg:col-span-2 bg-[#0d1421] border border-[#1a2744] rounded-xl sm:rounded-2xl overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-[#1a2744] flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-white font-semibold">QR Scanner</h2>
              <p className="text-slate-500 text-xs mt-0.5">Point the camera at an asset QR code to identify it</p>
            </div>
            {scanning && (
              <span className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                LIVE
              </span>
            )}
          </div>

          {/* Camera Viewport */}
          <div className="relative bg-[#070d18] overflow-hidden flex items-center justify-center min-h-[260px] sm:min-h-[320px]">
            <video ref={videoRef} className={`w-full max-h-[70vh] object-cover ${scanning ? 'block' : 'hidden'}`} playsInline muted />
            <canvas ref={canvasRef} className="hidden" />

            {/* Scan overlay */}
            {scanning && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {/* dark vignette corners */}
                <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.6) 100%)' }} />
                <div className="relative w-44 h-44">
                  <div className="absolute top-0 left-0 w-7 h-7 border-t-[3px] border-l-[3px] border-blue-400 rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-7 h-7 border-t-[3px] border-r-[3px] border-blue-400 rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-7 h-7 border-b-[3px] border-l-[3px] border-blue-400 rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-7 h-7 border-b-[3px] border-r-[3px] border-blue-400 rounded-br-lg" />
                  <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-bounce" style={{ top: '50%' }} />
                </div>
                <p className="absolute bottom-3 text-blue-300/80 text-[11px] tracking-wide">Align QR code within the frame</p>
              </div>
            )}

            {/* Idle state */}
            {!scanning && !cameraError && (
              <div className="flex flex-col items-center gap-3 py-14 px-4 text-center">
                <div className="w-16 h-16 bg-[#0f1a2e] border border-[#1a2744] rounded-2xl flex items-center justify-center">
                  <svg className="w-8 h-8 text-blue-500/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <p className="text-slate-500 text-sm">Camera is off — press Start to begin scanning</p>
                {!isSecureCameraContext && (
                  <p className="max-w-md text-amber-400 text-xs leading-relaxed">
                    Mobile browsers only allow camera permissions on HTTPS pages. Localhost works on this computer, but a phone needs an HTTPS URL.
                  </p>
                )}
              </div>
            )}

            {/* Error state */}
            {cameraError && (
              <div className="flex flex-col items-center gap-2 py-12 px-6 text-center">
                <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mb-1">
                  <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                </div>
                <p className="text-red-400 text-sm font-semibold">{cameraError}</p>
                <p className="text-slate-600 text-xs">Check browser site settings, then refresh and try again</p>
              </div>
            )}
          </div>

          {/* Camera Controls */}
          <div className="px-4 sm:px-6 py-4 flex justify-center border-t border-[#1a2744]">
            {scanning ? (
              <button
                onClick={stopCamera}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-semibold bg-red-600/15 border border-red-500/25 text-red-400 hover:bg-red-600/25 transition flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
                Stop Camera
              </button>
            ) : (
              <button
                onClick={startCamera}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white transition shadow-lg shadow-blue-900/40 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0118.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Start Camera
              </button>
            )}
          </div>
        </div>

        {/* ── Instructions Panel (1/3) ── */}
        <div className="bg-[#0d1421] border border-[#1a2744] rounded-xl sm:rounded-2xl overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-[#1a2744]">
            <h3 className="text-white font-semibold text-sm">How to Use</h3>
            <p className="text-slate-500 text-xs mt-0.5">Follow these steps to scan an asset</p>
          </div>

          <div className="px-5 py-5 flex-1 space-y-4">
            {[
              {
                step: '01',
                title: 'Open Camera',
                desc: 'Tap the Start Camera button to activate your device\'s camera. Allow browser access when prompted.',
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0118.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                )
              },
              {
                step: '02',
                title: 'Aim at QR Code',
                desc: 'Hold your device steady and point the camera at the asset\'s QR code. Keep it within the blue frame.',
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                )
              },
              {
                step: '03',
                title: 'Auto-Detect',
                desc: 'The scanner automatically detects the QR code and looks up the asset — no button tap needed.',
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                )
              },
              {
                step: '04',
                title: 'Review & Request',
                desc: 'A modal will show all asset details. Use the Request Item button to log a borrowing request.',
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                )
              },
            ].map(({ step, title, desc, icon }) => (
              <div key={step} className="flex gap-3">
                <div className="shrink-0 w-7 h-7 rounded-lg bg-blue-600/15 border border-blue-500/20 flex items-center justify-center mt-0.5">
                  <svg className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">{icon}</svg>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-bold text-blue-500/70 tracking-widest">{step}</span>
                    <span className="text-white text-xs font-semibold">{title}</span>
                  </div>
                  <p className="text-slate-500 text-[11px] leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Tips box */}
          <div className="mx-5 mb-5 bg-amber-500/5 border border-amber-500/15 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-3.5 h-3.5 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-amber-400 text-[10px] font-bold uppercase tracking-widest">Tips</span>
            </div>
            <ul className="space-y-1">
              {['Ensure good lighting for better detection', 'Hold the device 15–25cm from the code', 'QR codes must be registered in the system'].map(tip => (
                <li key={tip} className="text-slate-500 text-[11px] flex gap-1.5 items-start">
                  <span className="text-amber-500/50 mt-0.5">•</span>{tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Recent Scans Table */}
      <div className="bg-[#0d1421] border border-[#1a2744] rounded-xl sm:rounded-2xl overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-[#1a2744] flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-white font-semibold text-sm">Recent Scans</h2>
            <p className="text-slate-500 text-xs mt-0.5">{recentScans.length} item{recentScans.length !== 1 ? 's' : ''} scanned this session</p>
          </div>
          {recentScans.length > 0 && (
            <button
              onClick={() => setRecentScans([])}
              className="w-fit text-xs text-slate-600 hover:text-red-400 transition"
            >
              Clear history
            </button>
          )}
        </div>

        {recentScans.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-14 text-center">
            <svg className="w-8 h-8 text-slate-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            <p className="text-slate-600 text-sm">No scans yet — scan a QR code to see results here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1a2744]">
                  {['#', 'Property No.', 'Item Name', 'Location', 'Status', 'Scanned At', 'Action'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold text-slate-600 uppercase tracking-widest whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentScans.map((scan, idx) => (
                  <tr key={scan.id} className={`border-b border-[#131f33] hover:bg-[#0f1a2e] transition-colors ${idx % 2 === 0 ? '' : 'bg-[#0a1120]/40'}`}>
                    <td className="px-4 py-3 text-xs text-slate-600">{idx + 1}</td>
                    <td className="px-4 py-3 text-xs font-mono text-blue-400 whitespace-nowrap">{scan.propertyNumber}</td>
                    <td className="px-4 py-3 text-xs text-white font-medium whitespace-nowrap">{scan.itemName}</td>
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{scan.location}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${statusColor[scan.status] || ''}`}>
                        {scan.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{scan.scannedAt}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => {
                          const a = assets.find(x => x.propertyNumber === scan.propertyNumber)
                          if (a) setScannedAsset(a)
                        }}
                        className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold underline underline-offset-2 transition"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Asset Modal */}
      {scannedAsset && (
        <AssetModal
          asset={scannedAsset}
          onClose={() => setScannedAsset(null)}
          onBorrowSuccess={(updated) => {
            // Update the asset in both local lists so status is reflected immediately
            setAssets(prev => prev.map(a => a.propertyNumber === updated.propertyNumber ? updated : a))
            setRecentScans(prev => prev.map(s => s.propertyNumber === updated.propertyNumber ? { ...s, status: updated.status } : s))
            setScannedAsset(null)
          }}
        />
      )}
    </div>
  )
}