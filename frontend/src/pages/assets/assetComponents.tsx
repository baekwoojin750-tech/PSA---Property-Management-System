import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import type { Asset } from './assetTypes'
import { statusColor } from './assetTypes'

// ─── Searchable Dropdown Component ───────────────────────────────────────────
// Uses a portal so the dropdown renders on document.body,
// escaping any overflow-hidden ancestor containers.
export function SearchableDropdown({ options, value, onChange, placeholder }: {
  options: string[]
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const portalRef = useRef<HTMLDivElement>(null)

  const recalc = useCallback(() => {
    if (!triggerRef.current) return
    const r = triggerRef.current.getBoundingClientRect()
    setCoords({ top: r.bottom + window.scrollY + 4, left: r.left + window.scrollX, width: r.width })
  }, [])

  const handleOpen = () => {
    if (!open) recalc()
    setOpen(o => !o)
  }

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        portalRef.current && !portalRef.current.contains(target)
      ) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = () => recalc()
    window.addEventListener('scroll', handler, true)
    window.addEventListener('resize', handler)
    return () => {
      window.removeEventListener('scroll', handler, true)
      window.removeEventListener('resize', handler)
    }
  }, [open, recalc])

  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()))

  const dropdown = open ? (
    <div
      ref={portalRef}
      style={{ position: 'absolute', top: coords.top, left: coords.left, width: coords.width, zIndex: 9999 }}
      className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden"
    >
      <div className="p-2 border-b border-slate-700">
        <input
          autoFocus
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search..."
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
        />
      </div>
      <div className="max-h-48 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-slate-500 text-sm px-4 py-3">No results</p>
        ) : filtered.map(o => (
          <button
            key={o}
            type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={() => { onChange(o); setOpen(false); setSearch('') }}
            className={`w-full text-left px-4 py-2.5 text-sm transition hover:bg-slate-800 ${value === o ? 'text-blue-400' : 'text-slate-300'}`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  ) : null

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-left flex items-center justify-between focus:outline-none focus:border-blue-500 transition"
      >
        <span className={value ? 'text-white' : 'text-slate-500'}>{value || placeholder}</span>
        <svg className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {createPortal(dropdown, document.body)}
    </div>
  )
}

// ─── Asset Info Modal ─────────────────────────────────────────────────────────
export function AssetModal({ asset, onClose, onRequest }: { asset: Asset; onClose: () => void; onRequest: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[92vh] bg-[#0d1421] border border-[#1a2744] rounded-2xl shadow-2xl overflow-y-auto overflow-x-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a2744]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600/15 border border-blue-500/25 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">Asset Details</h3>
              <p className="text-slate-600 text-xs">{asset.propertyNumber}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-[#1a2744] transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-4 sm:px-6 py-5 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-white font-semibold text-base leading-tight">{asset.itemName}</p>
              <p className="text-slate-500 text-xs mt-0.5">{asset.itemDescription}</p>
            </div>
            <span className={`w-fit shrink-0 px-2.5 py-1 rounded-full text-[10px] font-semibold ${statusColor[asset.status] || ''}`}>
              {asset.status}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {[
              { label: 'Property No.', value: asset.propertyNumber },
              { label: 'Asset Tag', value: asset.assetTag },
              { label: 'Serial No.', value: asset.serialNumber },
              { label: 'Category', value: asset.equipmentCategory },
              { label: 'Location', value: asset.location },
              { label: 'Unit', value: asset.unit },
              { label: 'Unit Cost', value: `₱${asset.unitCost}` },
              { label: 'Date Purchased', value: asset.datePurchased },
            ].map(({ label, value }) => (
              <div key={label} className="bg-[#0a1020] border border-[#131f33] rounded-xl px-3.5 py-2.5">
                <p className="text-slate-600 text-[9px] uppercase tracking-widest font-semibold mb-0.5">{label}</p>
                <p className="text-white text-xs font-medium">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-4 border-t border-[#1a2744] flex flex-col sm:flex-row gap-3">
          <button onClick={onClose} className="flex-1 px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 border border-[#1e2d45] hover:bg-[#1a2744] hover:text-white transition">
            Close
          </button>
          <button
            onClick={() => {
              // Print return slip inline
              const today = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
              const printWindow = window.open('', '_blank', 'width=750,height=900')
              if (!printWindow) return
              printWindow.document.write(`<!DOCTYPE html><html><head><title>Return Slip – ${asset.propertyNumber}</title><style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Arial,Helvetica,sans-serif;font-size:10px;color:#000;padding:28px 36px;background:#fff;}h1{font-size:14px;font-weight:900;text-align:center;letter-spacing:1px;margin-bottom:2px;}h2{font-size:11px;font-weight:700;text-align:center;margin-bottom:16px;color:#333;}.meta{display:flex;justify-content:space-between;margin-bottom:14px;}table{width:100%;border-collapse:collapse;margin-bottom:20px;}th{background:#f5f5f5;border:1px solid #ccc;padding:6px 8px;font-size:9px;text-transform:uppercase;letter-spacing:.5px;text-align:left;}td{border:1px solid #ccc;padding:7px 8px;font-size:10px;}.label{font-weight:700;width:32%;color:#444;}.sig-row{display:flex;gap:40px;margin-top:32px;}.sig-box{flex:1;border-top:1px solid #000;padding-top:6px;font-size:9px;text-align:center;}footer{margin-top:20px;text-align:center;font-size:8px;color:#888;border-top:1px solid #eee;padding-top:8px;}@media print{@page{size:A4;margin:18mm 20mm;}}</style></head><body><h1>PHILIPPINE STATISTICS AUTHORITY</h1><h2>PROPERTY RETURN SLIP</h2><div class="meta"><span><strong>Date:</strong> ${today}</span><span><strong>Ref No.:</strong> RS-${asset.propertyNumber}</span></div><table><tr><td class="label">Item Name</td><td>${asset.itemName}</td></tr><tr><td class="label">Item Description</td><td>${asset.itemDescription || '—'}</td></tr><tr><td class="label">Property Number</td><td>${asset.propertyNumber}</td></tr><tr><td class="label">Asset Tag</td><td>${asset.assetTag}</td></tr><tr><td class="label">Serial Number</td><td>${asset.serialNumber}</td></tr><tr><td class="label">Equipment Category</td><td>${asset.equipmentCategory}</td></tr><tr><td class="label">Office / Location</td><td>${asset.location}</td></tr><tr><td class="label">Unit Cost</td><td>₱${asset.unitCost}</td></tr><tr><td class="label">Date Purchased</td><td>${asset.datePurchased}</td></tr><tr><td class="label">Status</td><td>${asset.status}</td></tr></table><p style="font-size:10px;margin-bottom:6px;">This certifies that the above-described property has been returned in the condition noted above.</p><div class="sig-row"><div class="sig-box"><div style="font-weight:700;font-size:11px;margin-bottom:2px;">&nbsp;</div><div>Returned By / Borrower</div><div style="color:#888;font-size:8px;">Signature over Printed Name / Date</div></div><div class="sig-box"><div style="font-weight:700;font-size:11px;margin-bottom:2px;">&nbsp;</div><div>Received By / Property Custodian</div><div style="color:#888;font-size:8px;">Signature over Printed Name / Date</div></div><div class="sig-box"><div style="font-weight:700;font-size:11px;margin-bottom:2px;">&nbsp;</div><div>Noted By / Division Chief</div><div style="color:#888;font-size:8px;">Signature over Printed Name / Date</div></div></div><footer>PSA Property Management System | Generated: ${today}</footer></body></html>`)
              printWindow.document.close()
              printWindow.focus()
              setTimeout(() => { printWindow.print(); printWindow.close() }, 500)
            }}
            className="flex-1 px-5 py-2.5 rounded-xl text-xs font-semibold bg-slate-700 hover:bg-slate-600 text-white transition flex items-center justify-center gap-2"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Return Slip
          </button>
          <button onClick={onRequest} className="flex-1 px-5 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition shadow-lg shadow-blue-900/40 flex items-center justify-center gap-2">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Request Item
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── QR Code Image Component ────────────────────────────────────────────────
export function QRCodeImage({ value, size = 96 }: { value: string; size?: number }) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  // Load qrcode lib from CDN and render to canvas
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!value) return
    setLoaded(false)
    setError(false)

    const loadAndRender = async () => {
      try {
        // Try to load QRCode library from CDN
        if (!(window as any).QRCode) {
          await new Promise<void>((resolve, reject) => {
            const existing = document.querySelector('script[data-qrlib]')
            if (existing) { resolve(); return }
            const s = document.createElement('script')
            s.setAttribute('data-qrlib', 'true')
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'
            s.onload = () => resolve()
            s.onerror = () => reject()
            document.head.appendChild(s)
          })
        }

        // Use a hidden div to generate QR then copy to canvas
        const container = document.createElement('div')
        container.style.position = 'fixed'
        container.style.left = '-9999px'
        document.body.appendChild(container)

        const qr = new (window as any).QRCode(container, {
          text: value,
          width: size * 2,
          height: size * 2,
          colorDark: '#000000',
          colorLight: '#FFFFFF',
          correctLevel: (window as any).QRCode.CorrectLevel.M,
        })

        // Wait a tick for QRCode to render
        await new Promise(r => setTimeout(r, 100))

        const img = container.querySelector('img') as HTMLImageElement
        const canvas = canvasRef.current
        if (canvas && img && img.src) {
          const ctx = canvas.getContext('2d')
          if (ctx) {
            const image = new Image()
            image.onload = () => {
              ctx.clearRect(0, 0, size, size)
              ctx.drawImage(image, 0, 0, size, size)
              setLoaded(true)
            }
            image.onerror = () => setError(true)
            image.src = img.src
          }
        }
        document.body.removeChild(container)
      } catch {
        setError(true)
      }
    }

    loadAndRender()
  }, [value, size])

  if (!value) return (
    <div style={{ width: size, height: size }} className="bg-yellow-400 border-2 border-black flex items-center justify-center">
      <svg className="w-8 h-8 text-black/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
      </svg>
    </div>
  )

  return (
    <div style={{ width: size, height: size, position: 'relative' }}>
      <canvas ref={canvasRef} width={size} height={size} style={{ display: loaded ? 'block' : 'none' }} />
      {!loaded && !error && (
        <div style={{ width: size, height: size }} className="bg-white flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
        </div>
      )}
      {error && (
        <div style={{ width: size, height: size }} className="bg-white border-2 border-black flex items-center justify-center text-[8px] font-bold text-black text-center p-1">
          {/* QR generation failed — leave blank so only the QR placeholder shows */}
        </div>
      )}
    </div>
  )
}

// ─── PSA Property Tag Component ────────────────────────────────────────────────
export function PSAPropertyTag({ asset }: { asset: Asset | null }) {
  const tagRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    if (!asset) return
    const tagEl = tagRef.current
    if (!tagEl) return

    const printWindow = window.open('', '_blank', 'width=700,height=400')
    if (!printWindow) return

    const canvas = tagEl.querySelector('canvas') as HTMLCanvasElement
    let qrDataUrl = ''
    if (canvas) qrDataUrl = canvas.toDataURL('image/png')

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>PSA Property Tag - ${asset.propertyNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { background: white; }
          body { display: flex; align-items: flex-start; justify-content: center; padding: 20px; }
          .tag { background: #FFE600; border: 2.5px solid #000; width: 420px; font-family: Arial, sans-serif; page-break-inside: avoid; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .tag-title { text-align: center; font-size: 11px; font-weight: 900; color: #000; border-bottom: 1.5px solid #000; padding: 3px 8px; letter-spacing: 0.5px; background: #FFE600; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .tag-body { display: flex; gap: 8px; padding: 4px 8px 4px; }
          .tag-fields { flex: 1; }
          .tag-row { display: flex; align-items: center; margin-bottom: 3px; }
          .tag-label { font-size: 7.5px; font-weight: 900; color: #000; width: 62px; flex-shrink: 0; letter-spacing: 0.3px; text-transform: uppercase; }
          .tag-value-box { flex: 1; border-bottom: 1.5px solid #000; min-height: 14px; font-size: 8px; color: #000; padding: 0 2px; display: flex; align-items: flex-end; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .tag-article-value { font-size: 9px; font-weight: 700; }
          .tag-qr-area { display: flex; flex-direction: column; align-items: center; justify-content: space-between; gap: 2px; width: 90px; padding-bottom: 2px; }
          .tag-qr-img { width: 76px; height: 76px; border: 1.5px solid #000; display: block; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .tag-qr-label { font-size: 5.5px; font-weight: 900; color: #000; text-align: center; line-height: 1.2; letter-spacing: 0.2px; }
          .tag-footer { text-align: center; font-size: 7.5px; font-weight: 900; color: #000; border-top: 1.5px solid #000; padding: 3px 8px; background: #FFE600; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @media print {
            @page { size: A4; margin: 10mm; }
            body { padding: 0; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .tag { page-break-inside: avoid; break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="tag">
          <div class="tag-title">PSA PROPERTY</div>
          <div class="tag-body">
            <div class="tag-fields">
              <div class="tag-row">
                <span class="tag-label">ARTICLE</span>
                <span class="tag-value-box tag-article-value">${asset.itemName.toUpperCase()} (${asset.equipmentCategory.toUpperCase()})</span>
              </div>
              <div class="tag-row">
                <span class="tag-label">PROP No.</span>
                <span class="tag-value-box">${asset.propertyNumber}</span>
              </div>
              <div class="tag-row">
                <span class="tag-label">SERIAL No.</span>
                <span class="tag-value-box">${asset.serialNumber}</span>
              </div>
              <div class="tag-row">
                <span class="tag-label">OFFICE</span>
                <span class="tag-value-box">${asset.location}</span>
              </div>
              <div class="tag-row">
                <span class="tag-label">CUSTODIAN</span>
                <span class="tag-value-box">${asset.custodian || ''}</span>
              </div>
              <div class="tag-row">
                <span class="tag-label">COST</span>
                <span class="tag-value-box">₱${asset.unitCost}</span>
              </div>
              <div class="tag-row">
                <span class="tag-label">DATE</span>
                <span class="tag-value-box">${asset.datePurchased}</span>
              </div>
            </div>
            <div class="tag-qr-area">
              ${qrDataUrl ? `<img class="tag-qr-img" src="${qrDataUrl}" />` : `<div class="tag-qr-img" style="background:#fff;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:bold;">${asset.serialNumber}</div>`}
              <span class="tag-qr-label">INVENTORY COMMITTEE<br/>VALIDATION</span>
            </div>
          </div>
          <div class="tag-footer">(DO NOT DETACH OR MUTILATE)</div>
        </div>
      </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => { printWindow.print(); printWindow.close() }, 600)
  }

  return (
    <div className="space-y-3">
      {/* The Tag Preview */}
      <div ref={tagRef}>
        <div
          className="relative border-[2.5px] border-black rounded-sm overflow-hidden select-none"
          style={{ background: '#FFE600', fontFamily: 'Arial, Helvetica, sans-serif', minWidth: 360 }}
        >
          {/* Title bar */}
          <div className="text-center text-[10px] font-black text-black border-b-[1.5px] border-black py-[3px] tracking-wide">
            PSA PROPERTY
          </div>

          {/* Body */}
          <div className="flex gap-2 px-2 pt-1 pb-1">
            {/* Left: fields */}
            <div className="flex-1 space-y-[3px]">
              {/* ARTICLE */}
              <div className="flex items-center gap-1">
                <span className="text-[7px] font-black text-black uppercase w-[58px] shrink-0 tracking-tight">ARTICLE</span>
                <div className="flex-1 border-b-[1.5px] border-black min-h-[14px] flex items-end pb-px">
                  <span className="text-[9px] font-bold text-black">
                    {asset ? `${asset.itemName.toUpperCase()} (${asset.equipmentCategory.toUpperCase()})` : ''}
                  </span>
                </div>
              </div>
              {/* PROP No. */}
              <div className="flex items-center gap-1">
                <span className="text-[7px] font-black text-black uppercase w-[58px] shrink-0 tracking-tight">PROP No.</span>
                <div className="flex-1 border-b-[1.5px] border-black min-h-[14px] flex items-end pb-px">
                  <span className="text-[8px] text-black font-semibold">{asset?.propertyNumber || ''}</span>
                </div>
              </div>
              {/* SERIAL No. */}
              <div className="flex items-center gap-1">
                <span className="text-[7px] font-black text-black uppercase w-[58px] shrink-0 tracking-tight">SERIAL No.</span>
                <div className="flex-1 border-b-[1.5px] border-black min-h-[14px] flex items-end pb-px">
                  <span className="text-[8px] text-black font-semibold">{asset?.serialNumber || ''}</span>
                </div>
              </div>
              {/* OFFICE */}
              <div className="flex items-center gap-1">
                <span className="text-[7px] font-black text-black uppercase w-[58px] shrink-0 tracking-tight">OFFICE</span>
                <div className="flex-1 border-b-[1.5px] border-black min-h-[14px] flex items-end pb-px">
                  <span className="text-[8px] text-black font-semibold">{asset?.location || ''}</span>
                </div>
              </div>
              {/* CUSTODIAN */}
              <div className="flex items-center gap-1">
                <span className="text-[7px] font-black text-black uppercase w-[58px] shrink-0 tracking-tight">CUSTODIAN</span>
                <div className="flex-1 border-b-[1.5px] border-black min-h-[14px] flex items-end pb-px">
                  <span className="text-[8px] text-black font-semibold">{asset?.custodian || ''}</span>
                </div>
              </div>
              {/* COST */}
              <div className="flex items-center gap-1">
                <span className="text-[7px] font-black text-black uppercase w-[58px] shrink-0 tracking-tight">COST</span>
                <div className="flex-1 border-b-[1.5px] border-black min-h-[14px] flex items-end pb-px">
                  <span className="text-[8px] text-black font-semibold">{asset ? `₱${asset.unitCost}` : ''}</span>
                </div>
              </div>
              {/* DATE */}
              <div className="flex items-center gap-1">
                <span className="text-[7px] font-black text-black uppercase w-[58px] shrink-0 tracking-tight">DATE</span>
                <div className="flex-1 border-b-[1.5px] border-black min-h-[14px] flex items-end pb-px">
                  <span className="text-[8px] text-black font-semibold">{asset?.datePurchased || ''}</span>
                </div>
              </div>
            </div>

            {/* Right: QR + validation text */}
            <div className="flex flex-col items-center justify-between gap-1 pb-1 w-[86px] shrink-0">
              <div className="border-[1.5px] border-black">
                <QRCodeImage value={asset?.propertyNumber || ''} size={76} />
              </div>
              <span className="text-[5.5px] font-black text-black text-center leading-tight tracking-tight">
                INVENTORY COMMITTEE VALIDATION
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-[7.5px] font-black text-black border-t-[1.5px] border-black py-[3px] tracking-wide">
            (DO NOT DETACH OR MUTILATE)
          </div>
        </div>
      </div>

      {/* Print button */}
      {asset && (
        <button
          onClick={handlePrint}
          className="w-full py-2.5 rounded-xl text-sm font-semibold bg-yellow-400 hover:bg-yellow-300 text-black transition flex items-center justify-center gap-2 border-2 border-black/20"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print Tag
        </button>
      )}
    </div>
  )
}

// ─── Return Slip Component ─────────────────────────────────────────────────────
// Renders a printable Return Slip populated entirely from the passed asset.
export function ReturnSlip({ asset }: { asset: Asset }) {
  const today = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=750,height=900')
    if (!printWindow) return
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Return Slip – ${asset.propertyNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, Helvetica, sans-serif; font-size: 10px; color: #000; padding: 28px 36px; background: #fff; }
          h1 { font-size: 14px; font-weight: 900; text-align: center; letter-spacing: 1px; margin-bottom: 2px; }
          h2 { font-size: 11px; font-weight: 700; text-align: center; margin-bottom: 16px; color: #333; }
          .meta { display: flex; justify-content: space-between; margin-bottom: 14px; }
          .meta span { font-size: 10px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { background: #f5f5f5; border: 1px solid #ccc; padding: 6px 8px; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; text-align: left; }
          td { border: 1px solid #ccc; padding: 7px 8px; font-size: 10px; }
          .label { font-weight: 700; width: 32%; color: #444; }
          .sig-row { display: flex; gap: 40px; margin-top: 32px; }
          .sig-box { flex: 1; border-top: 1px solid #000; padding-top: 6px; font-size: 9px; text-align: center; }
          .sig-name { font-weight: 700; font-size: 11px; margin-bottom: 2px; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 9px; font-weight: 700; border: 1px solid #999; }
          .badge-serviceable { border-color: #22c55e; color: #16a34a; }
          .badge-non { border-color: #ef4444; color: #dc2626; }
          .badge-borrowed { border-color: #f59e0b; color: #d97706; }
          footer { margin-top: 20px; text-align: center; font-size: 8px; color: #888; border-top: 1px solid #eee; padding-top: 8px; }
          @media print { @page { size: A4; margin: 18mm 20mm; } }
        </style>
      </head>
      <body>
        <h1>PHILIPPINE STATISTICS AUTHORITY</h1>
        <h2>PROPERTY RETURN SLIP</h2>
        <div class="meta">
          <span><strong>Date:</strong> ${today}</span>
          <span><strong>Ref No.:</strong> RS-${asset.propertyNumber}</span>
        </div>
        <table>
          <tr><td class="label">Item Name</td><td>${asset.itemName}</td></tr>
          <tr><td class="label">Item Description</td><td>${asset.itemDescription || '—'}</td></tr>
          <tr><td class="label">Property Number</td><td>${asset.propertyNumber}</td></tr>
          <tr><td class="label">Asset Tag</td><td>${asset.assetTag}</td></tr>
          <tr><td class="label">Serial Number</td><td>${asset.serialNumber}</td></tr>
          <tr><td class="label">Equipment Category</td><td>${asset.equipmentCategory}</td></tr>
          <tr><td class="label">Office / Location</td><td>${asset.location}</td></tr>
          <tr><td class="label">Unit</td><td>${asset.unit}</td></tr>
          <tr><td class="label">Unit Cost</td><td>₱${asset.unitCost}</td></tr>
          <tr><td class="label">Date Purchased</td><td>${asset.datePurchased}</td></tr>
          <tr><td class="label">Status</td><td>
            <span class="badge ${asset.status === 'Serviceable' ? 'badge-serviceable' : asset.status === 'Non-Serviceable' ? 'badge-non' : 'badge-borrowed'}">
              ${asset.status}
            </span>
          </td></tr>
        </table>
        <p style="font-size:10px;margin-bottom:6px;">This certifies that the above-described property has been returned in the condition noted above.</p>
        <div class="sig-row">
          <div class="sig-box">
            <div class="sig-name">&nbsp;</div>
            <div>Returned By / Borrower</div>
            <div style="color:#888;font-size:8px;">Signature over Printed Name / Date</div>
          </div>
          <div class="sig-box">
            <div class="sig-name">&nbsp;</div>
            <div>Received By / Property Custodian</div>
            <div style="color:#888;font-size:8px;">Signature over Printed Name / Date</div>
          </div>
          <div class="sig-box">
            <div class="sig-name">&nbsp;</div>
            <div>Noted By / Division Chief</div>
            <div style="color:#888;font-size:8px;">Signature over Printed Name / Date</div>
          </div>
        </div>
        <footer>PSA Property Management System &nbsp;|&nbsp; Generated: ${today}</footer>
      </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => { printWindow.print(); printWindow.close() }, 500)
  }

  return (
    <div className="bg-[#0a1020] border border-[#131f33] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-[#1a2744] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-600/15 border border-blue-500/25 rounded-lg flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <p className="text-white text-xs font-semibold">Property Return Slip</p>
            <p className="text-slate-600 text-[10px]">{asset.propertyNumber} · {today}</p>
          </div>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-blue-600 hover:bg-blue-500 text-white transition"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print
        </button>
      </div>

      {/* Preview rows */}
      <div className="px-5 py-4 grid grid-cols-2 gap-x-6 gap-y-2 text-[11px]">
        {[
          ['Item Name', asset.itemName],
          ['Property No.', asset.propertyNumber],
          ['Asset Tag', asset.assetTag],
          ['Serial No.', asset.serialNumber],
          ['Category', asset.equipmentCategory],
          ['Location / Office', asset.location],
          ['Unit Cost', `₱${asset.unitCost}`],
          ['Date Purchased', asset.datePurchased],
          ['Status', asset.status],
        ].map(([label, value]) => (
          <div key={label} className="flex flex-col gap-0.5 border-b border-[#1a2744] pb-1.5">
            <span className="text-slate-600 text-[9px] uppercase tracking-widest font-semibold">{label}</span>
            {label === 'Status' ? (
              <span className={`w-fit px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusColor[value] || ''}`}>{value}</span>
            ) : (
              <span className="text-white font-medium">{value || '—'}</span>
            )}
          </div>
        ))}
      </div>

      {/* Signature placeholders */}
      <div className="px-5 pb-5 grid grid-cols-3 gap-3 mt-2">
        {['Returned By / Borrower', 'Received By / Custodian', 'Noted By / Division Chief'].map(role => (
          <div key={role} className="border-t border-slate-600 pt-2 text-center">
            <p className="text-slate-600 text-[9px] leading-tight">{role}</p>
            <p className="text-slate-700 text-[8px] mt-0.5">Signature over Printed Name</p>
          </div>
        ))}
      </div>
    </div>
  )
}
