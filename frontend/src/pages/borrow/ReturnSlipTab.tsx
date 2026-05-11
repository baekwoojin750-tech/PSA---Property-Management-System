import { useState, useEffect, useRef } from 'react'
import type { BorrowRecord } from './BorrowTab'
import { RecordActionMenu } from './RecordActionMenu'
import { getAllBorrowRequests, updateBorrowRequest } from '../../services/authService'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function useBase64Image(src: string) {
  const [b64, setB64] = useState('')
  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      canvas.getContext('2d')?.drawImage(img, 0, 0)
      setB64(canvas.toDataURL())
    }
    img.onerror = () => console.warn(`ReturnSlip: could not load ${src}`)
    img.src = src
  }, [src])
  return b64
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface ReturnItem {
  description: string
  propertyNumber: string
  dateTimeReturned: string
  remarks: string
}

interface ReturnForm {
  date: string
  returnedByName: string
  returnedByDesignation: string
  borrowedFromName: string
  borrowedFromDesignation: string
  borrowedTo: string
  purposeCompliance: string
  usedLast: string
  accountableOfficer: string
  guardOnDuty: string
  items: ReturnItem[]
  linkedRecordId: string
}

// Returned record entry stored in the table
interface ReturnedRecord {
  id: string
  borrowerId: string
  returnedByName: string
  returnedByDesignation: string
  borrowedFromName: string
  itemName: string
  propertyNumber: string
  returnDate: string
  purposeCompliance: string
  remarks: string
}

const emptyItem: ReturnItem = {
  description: '',
  propertyNumber: '',
  dateTimeReturned: '',
  remarks: '',
}

const emptyForm: ReturnForm = {
  date: new Date().toISOString().split('T')[0],
  returnedByName: '',
  returnedByDesignation: '',
  borrowedFromName: '',
  borrowedFromDesignation: '',
  borrowedTo: '',
  purposeCompliance: '',
  usedLast: '',
  accountableOfficer: '',
  guardOnDuty: '',
  items: [{ ...emptyItem }],
  linkedRecordId: '',
}

const statusColor: Record<string, string> = {
  Active: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  Returned: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  Overdue: 'bg-red-500/10 text-red-400 border border-red-500/20',
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface ReturnSlipTabProps {
  showRecords?: boolean
}

export default function ReturnSlipTab({ showRecords = true }: ReturnSlipTabProps) {
  const printRef = useRef<HTMLDivElement>(null)
  const psaLogo    = useBase64Image('/headerImage1.jpg')
  const bagongLogo = useBase64Image('/headerImage2.png')
  const isoFooter  = useBase64Image('/iso.png')

  const [form, setForm]               = useState<ReturnForm>(emptyForm)
  const [records, setRecords]         = useState<BorrowRecord[]>([])
  const [returnedRecords, setReturnedRecords] = useState<ReturnedRecord[]>([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [page, setPage]               = useState(1)
  const [successBanner, setSuccessBanner] = useState(false)
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null)
  const [openActionId, setOpenActionId] = useState<string | null>(null)
  const PER_PAGE = 10

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        setLoading(true)
        const data = await getAllBorrowRequests()
        const transformed: BorrowRecord[] = data.map((record: any) => ({
          id: `BR-${record.id}`,
          borrowerName: record.borrower_name,
          borrowerDesignation: record.borrower_designation || '',
          department: record.department || 'General',
          itemName: record.item_name,
          propertyNumber: record.property_number,
          startDate: record.start_date,
          endDate: record.end_date || '',
          status: record.status as 'Active' | 'Returned' | 'Overdue',
          destination: record.destination || '',
          purpose: record.purpose || '',
          borrowedFromName: record.borrowed_from_name || 'PSA Officer',
          borrowedFromDesignation: record.borrowed_from_designation || 'Administrative Officer',
          items: [{
            description: record.item_name,
            propertyNumber: record.property_number,
            purpose: record.purpose || '',
            dateTimeBorrowed: record.start_date,
            duration: '',
          }],
        }))
        setRecords(transformed)

        // Pre-populate returned records table from API data that's already Returned
        const alreadyReturned: ReturnedRecord[] = transformed
          .filter(r => r.status === 'Returned')
          .map(r => ({
            id: `RT-${r.id}`,
            borrowerId: r.id,
            returnedByName: r.borrowerName,
            returnedByDesignation: r.borrowerDesignation || '',
            borrowedFromName: r.borrowedFromName,
            itemName: r.itemName,
            propertyNumber: r.propertyNumber,
            returnDate: r.endDate || '',
            purposeCompliance: r.purpose || '',
            remarks: '',
          }))
        setReturnedRecords(alreadyReturned)
      } catch (err) {
        console.error('Failed to fetch borrow records:', err)
        setRecords([])
      } finally {
        setLoading(false)
      }
    }
    fetchRecords()
  }, [])

  const inputClass = "w-full bg-[#0f1623] border border-[#1e2d45] rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
  const labelClass = "block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1"
  const today = new Date().toISOString().split('T')[0]

  const setField = (key: keyof ReturnForm, value: string) =>
    setForm(f => ({ ...f, [key]: value }))

  const setItemField = (idx: number, key: keyof ReturnItem, value: string) =>
    setForm(f => ({
      ...f,
      items: f.items.map((item, i) => i === idx ? { ...item, [key]: value } : item),
    }))

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { ...emptyItem }] }))
  const removeItem = (idx: number) => {
    if (form.items.length === 1) return
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))
  }

  // Auto-fill form from a selected borrow record
  const handleLinkRecord = (record: BorrowRecord) => {
    setForm(f => ({
      ...f,
      linkedRecordId: record.id,
      returnedByName: record.borrowerName,
      returnedByDesignation: record.borrowerDesignation || '',
      borrowedFromName: record.borrowedFromName,
      borrowedFromDesignation: record.borrowedFromDesignation || '',
      borrowedTo: record.destination || '',
      purposeCompliance: record.purpose || '',
      items: record.items && record.items.length > 0
        ? record.items.map(it => ({
            description: it.description,
            propertyNumber: it.propertyNumber,
            dateTimeReturned: '',
            remarks: '',
          }))
        : [{ description: record.itemName, propertyNumber: record.propertyNumber, dateTimeReturned: '', remarks: '' }],
    }))
  }

  const isFormValid = !!(
    form.date &&
    form.returnedByName &&
    form.borrowedFromName &&
    form.items.every(it => it.description && it.propertyNumber && it.dateTimeReturned)
  )

  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!isFormValid || submitting) return
    setSubmitting(true)
    try {
      if (editingRecordId) {
        const item = form.items[0]
        setReturnedRecords(prev => prev.map(record =>
          record.id === editingRecordId
            ? {
                ...record,
                borrowerId: form.linkedRecordId || record.borrowerId,
                returnedByName: form.returnedByName,
                returnedByDesignation: form.returnedByDesignation,
                borrowedFromName: form.borrowedFromName,
                itemName: item.description,
                propertyNumber: item.propertyNumber,
                returnDate: item.dateTimeReturned,
                purposeCompliance: form.purposeCompliance,
                remarks: item.remarks,
              }
            : record
        ))
        setEditingRecordId(null)
        setForm(emptyForm)
        return
      }

      // 1. Persist borrow record status → Returned in the DB
      if (form.linkedRecordId) {
        // ID is stored as "BR-<numeric_id>" — strip prefix to get the numeric id
        const numericId = parseInt(form.linkedRecordId.replace('BR-', ''), 10)
        if (!isNaN(numericId)) {
          await updateBorrowRequest(numericId, { status: 'Returned' })
        }
        // Optimistic UI update
        setRecords(prev =>
          prev.map(r => r.id === form.linkedRecordId ? { ...r, status: 'Returned' as const } : r)
        )
      }

      // Add entries to the returned records table.
      const newReturned: ReturnedRecord[] = form.items.map((item, idx) => ({
        id: `RT-${Date.now()}-${idx}`,
        borrowerId: form.linkedRecordId || '—',
        returnedByName: form.returnedByName,
        returnedByDesignation: form.returnedByDesignation,
        borrowedFromName: form.borrowedFromName,
        itemName: item.description,
        propertyNumber: item.propertyNumber,
        returnDate: item.dateTimeReturned,
        purposeCompliance: form.purposeCompliance,
        remarks: item.remarks,
      }))
      setReturnedRecords(prev => [...newReturned, ...prev])

      setForm(emptyForm)
      setSuccessBanner(true)
      setTimeout(() => setSuccessBanner(false), 4000)
    } catch (err) {
      console.error('Failed to submit return slip:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=700')
    if (!printWindow) return

    const psaSrc = psaLogo || ''
    const bagongSrc = bagongLogo || ''
    const isoSrc = isoFooter || ''

    const psaImg = psaSrc
      ? '<img src="' + psaSrc + '" style="width:72px;height:72px;object-fit:contain;display:block;" />'
      : ''

    const bagongImg = bagongSrc
      ? '<img src="' + bagongSrc + '" style="width:72px;height:72px;object-fit:contain;display:block;" />'
      : ''

    const isoImg = isoSrc
      ? '<img src="' + isoSrc + '" style="max-height:48px;object-fit:contain;object-position:left;" />'
      : '<span style="font-size:8px;color:#888;">3rd Floor JM Agro Building, Gov. Sales St., Davao City, Philippines 8000</span>'

    const escapeHtml = (value: string) =>
      value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')

    const formatDateTime = (value: string) => escapeHtml(value.replace('T', ' '))
    const slipItems = form.items.filter(it => it.description && it.propertyNumber)
    const itemRows = slipItems.map(item =>
      '<tr>' +
        '<td style="border:1px solid #000;padding:5px 8px;font-size:11px;font-weight:700;vertical-align:middle;">' + escapeHtml(item.description) + '</td>' +
        '<td style="border:1px solid #000;padding:5px 8px;font-size:11px;text-align:center;vertical-align:middle;">' + escapeHtml(item.propertyNumber) + '</td>' +
        '<td style="border:1px solid #000;padding:5px 8px;font-size:11px;text-align:center;vertical-align:middle;">' + formatDateTime(item.dateTimeReturned) + '</td>' +
        '<td style="border:1px solid #000;padding:5px 8px;font-size:11px;vertical-align:middle;">' + escapeHtml(item.remarks || '') + '</td>' +
      '</tr>'
    ).join('')

    const emptyRows = Array.from({ length: Math.max(0, 8 - slipItems.length) }).map(() =>
      '<tr>' +
        '<td style="border:1px solid #000;height:32px;"></td>' +
        '<td style="border:1px solid #000;"></td>' +
        '<td style="border:1px solid #000;"></td>' +
        '<td style="border:1px solid #000;"></td>' +
      '</tr>'
    ).join('')

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Return Slip</title>
  <style>
    @font-face {
      font-family: 'Trajan Pro';
      src: url('/fonts/trajan-pro/TrajanPro-Regular.ttf') format('truetype');
      font-weight: 400;
      font-style: normal;
    }
    @font-face {
      font-family: 'Trajan Pro';
      src: url('/fonts/trajan-pro/TrajanPro-Bold.otf') format('opentype');
      font-weight: 700 900;
      font-style: normal;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: A4 portrait; margin: 14mm 20mm; }
    html { height: 100%; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #000; background: #fff; min-height: 100%; display: flex; flex-direction: column; }
    #content { flex: 1; }
    #footer { margin-top: auto; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #000; padding: 6px 8px; vertical-align: middle; }
    th { font-size: 11px; font-weight: bold; text-align: center; line-height: 1.2; }
    @media print { html, body { height: 100% !important; } }
  </style>
</head>
<body>
  <div id="content">
    <div style="display:grid;grid-template-columns:80px 1fr 80px;align-items:center;margin-bottom:2mm;">
      <div>${psaImg}</div>
      <div style="text-align:center;line-height:1.4;">
        <div style="font-size:8px;text-transform:uppercase;letter-spacing:0.18em;color:#555;">Republic of the Philippines</div>
        <div style="font-family:'Trajan Pro','Times New Roman',serif;font-size:15px;font-weight:900;text-transform:uppercase;letter-spacing:0.05em;">Philippine Statistics Authority</div>
        <div style="font-size:8px;text-transform:uppercase;letter-spacing:0.14em;color:#555;">Davao del Sur Provincial Statistical Office</div>
      </div>
      <div style="display:flex;justify-content:flex-end;">${bagongImg}</div>
    </div>

    <div style="border-top:1px solid #777;margin-bottom:3mm;"></div>

    <div style="display:flex;justify-content:flex-end;margin-bottom:6mm;">
      <div style="border:2px solid #000;padding:5px 18px;font-weight:900;font-size:14px;letter-spacing:2px;text-transform:uppercase;">RETURN SLIP</div>
    </div>

    <div style="margin-bottom:3mm;display:flex;gap:6px;align-items:flex-end;">
      <span style="font-weight:bold;">Date:</span>
      <span style="border-bottom:1px solid #000;min-width:160px;display:inline-block;padding-bottom:1px;font-weight:bold;">${escapeHtml(form.date || '')}</span>
    </div>

    <div style="margin-bottom:4mm;line-height:2.1;font-size:10px;">
      <span>This document states that </span>
      <span style="border-bottom:1px solid #000;font-weight:bold;padding:0 4px;display:inline-block;min-width:130px;text-align:center;">${escapeHtml(form.returnedByName || '')}</span>
      <span> have returned the borrowed out property/equipment listed below from </span>
      <span style="border-bottom:1px solid #000;font-weight:bold;padding:0 4px;display:inline-block;min-width:100px;text-align:center;">${escapeHtml(form.borrowedTo || '')}</span>
      <span> to </span>
      <span style="border-bottom:1px solid #000;font-weight:bold;padding:0 4px;display:inline-block;min-width:110px;text-align:center;">${escapeHtml(form.borrowedFromName || '')}</span>
      <span> that was used last </span>
      <span style="border-bottom:1px solid #000;font-weight:bold;padding:0 4px;display:inline-block;min-width:110px;text-align:center;">${escapeHtml(form.usedLast || '')}</span>
      <span> purpose/compliance of </span>
      <span style="border-bottom:1px solid #000;font-weight:bold;padding:0 4px;display:inline-block;min-width:130px;text-align:center;">${escapeHtml(form.purposeCompliance || '')}</span>
      <span>.</span>
    </div>

    <table style="margin-bottom:8mm;">
      <thead>
        <tr>
          <th style="width:38%;">Description of<br/>Property/Equipment</th>
          <th style="width:22%;">Property Number</th>
          <th style="width:22%;">Date and Time<br/>Returned</th>
          <th style="width:18%;">Remarks</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
        ${emptyRows}
      </tbody>
    </table>

    <div style="display:grid;grid-template-columns:1fr 1fr;column-gap:18mm;margin-bottom:7mm;">
      <div>
        <div style="font-weight:bold;margin-bottom:2mm;">Returned by:</div>
        <div style="border-bottom:1px solid #000;font-weight:bold;font-size:12px;min-height:18px;padding-bottom:2px;">${escapeHtml(form.returnedByName || '')}</div>
        <div style="text-align:center;font-size:9px;margin-top:3px;">(Name, Signature and Designation)</div>
      </div>
      <div>
        <div style="font-weight:bold;margin-bottom:2mm;">Received by:</div>
        <div style="border-bottom:1px solid #000;font-weight:bold;font-size:12px;text-align:center;min-height:18px;padding-bottom:2px;">${escapeHtml(form.borrowedFromName || '')}</div>
        <div style="text-align:center;font-size:9px;margin-top:3px;">${escapeHtml(form.borrowedFromDesignation || 'Administrative Officer')}</div>
        <div style="text-align:center;font-size:9px;margin-top:1px;">(Accountable Officer)</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;column-gap:18mm;margin-bottom:6mm;">
      <div></div>
      <div>
        <div style="border-bottom:1px solid #000;font-weight:bold;font-size:12px;text-align:center;min-height:18px;padding-bottom:2px;">${escapeHtml(form.guardOnDuty || '')}</div>
        <div style="text-align:center;font-size:9px;margin-top:3px;">(Guard on Duty)</div>
      </div>
    </div>

    <div style="font-size:10px;display:grid;grid-template-columns:34px 1fr;gap:4px;">
      <span style="font-weight:bold;">Note:</span>
      <span>This slip returns the accountability of the above-mentioned property/equipment to the accountable officer.</span>
    </div>
  </div>

  <div id="footer">${isoImg}</div>
</body>
</html>`

    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()

    printWindow.onload = () => {
      const imgs = Array.from(printWindow.document.images)
      if (imgs.length === 0) {
        printWindow.focus()
        printWindow.print()
        printWindow.onafterprint = () => printWindow.close()
        return
      }

      let loaded = 0
      const tryPrint = () => {
        loaded++
        if (loaded >= imgs.length) {
          printWindow.focus()
          printWindow.print()
          printWindow.onafterprint = () => printWindow.close()
        }
      }

      imgs.forEach(img => {
        if (img.complete) tryPrint()
        else {
          img.onload = tryPrint
          img.onerror = tryPrint
        }
      })
    }
  }

  const handleEditRecord = (record: ReturnedRecord) => {
    setEditingRecordId(record.id)
    setOpenActionId(null)
    setForm({
      ...emptyForm,
      linkedRecordId: record.borrowerId === '—' ? '' : record.borrowerId,
      returnedByName: record.returnedByName,
      returnedByDesignation: record.returnedByDesignation,
      borrowedFromName: record.borrowedFromName,
      purposeCompliance: record.purposeCompliance,
      items: [{
        description: record.itemName,
        propertyNumber: record.propertyNumber,
        dateTimeReturned: record.returnDate,
        remarks: record.remarks,
      }],
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDeleteRecord = (record: ReturnedRecord) => {
    setOpenActionId(null)
    setReturnedRecords(prev => prev.filter(item => item.id !== record.id))
    if (editingRecordId === record.id) {
      setEditingRecordId(null)
      setForm(emptyForm)
    }
  }

  // Returned records table filtering
  const filtered = returnedRecords.filter(r =>
    [r.returnedByName, r.itemName, r.propertyNumber, r.borrowedFromName, r.purposeCompliance]
      .some(v => v.toLowerCase().includes(search.toLowerCase()))
  )
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  useEffect(() => { setPage(1) }, [search])

  // ─── Printable Return Slip ─────────────────────────────────────────────────
  const renderReturnSlip = () => {
    const slipItems = form.items.filter(it => it.description && it.propertyNumber)
    return (
      <div className="return-slip bg-white text-slate-950 p-6" style={{ width: '100%', boxSizing: 'border-box' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {psaLogo
              ? <img src={psaLogo} alt="PSA Logo" style={{ height: 72, width: 72, objectFit: 'contain', flexShrink: 0 }} />
              : <div style={{ width: 72, height: 72, border: '1px dashed #bbb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: '#aaa', flexShrink: 0 }}>PSA</div>
            }
            <div style={{ textAlign: 'center', lineHeight: 1.3 }}>
              <div style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#555' }}>Republic of the Philippines</div>
              <div style={{ fontSize: 15, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#000' }}>Philippine Statistics Authority</div>
              <div style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#555' }}>Davao del Sur Provincial Statistical Office</div>
            </div>
            {bagongLogo
              ? <img src={bagongLogo} alt="Bagong Pilipinas" style={{ height: 72, width: 72, objectFit: 'contain', flexShrink: 0 }} />
              : <div style={{ width: 72, height: 72, border: '1px dashed #bbb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: '#aaa', flexShrink: 0 }}>Seal</div>
            }
          </div>
        </div>
        <div style={{ borderTop: '1px solid #aaa', marginBottom: 8 }} />

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
          <div style={{ border: '2px solid #000', padding: '6px 20px' }}>
            <div style={{ fontSize: 14, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#000' }}>RETURN SLIP</div>
          </div>
        </div>

        <div className="space-y-3 text-sm mb-6" style={{ lineHeight: 2 }}>
          <div className="flex items-center gap-2">
            <span className="font-semibold w-20">Date:</span>
            <span className="border-b border-black pb-0.5 min-w-[180px]">{form.date || '____________________'}</span>
          </div>
          <div style={{ fontSize: 11 }}>
            <span>This document states that </span>
            <span className="border-b border-black font-bold px-1">{form.returnedByName || '___________________________'}</span>
            <span> have returned the borrowed out property/equipment listed below from </span>
            <span className="border-b border-black font-bold px-1">{form.borrowedTo || '____________________'}</span>
            <span> to </span>
            <span className="border-b border-black font-bold px-1">{form.borrowedFromName || '____________________'}</span>
            <span> that was used last </span>
            <span className="border-b border-black font-bold px-1">{form.usedLast || '____________________'}</span>
            <span> purpose/compliance of </span>
            <span className="border-b border-black font-bold px-1">{form.purposeCompliance || '____________________'}</span>
            <span>.</span>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 28 }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center', fontWeight: 'bold', fontSize: 11, width: '38%' }}>Description of<br />Property/Equipment</th>
              <th style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center', fontWeight: 'bold', fontSize: 11, width: '22%' }}>Property Number</th>
              <th style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center', fontWeight: 'bold', fontSize: 11, width: '22%' }}>Date and Time<br />Returned</th>
              <th style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center', fontWeight: 'bold', fontSize: 11, width: '18%' }}>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {slipItems.length === 0 ? (
              [...Array(8)].map((_, i) => (
                <tr key={i}>{[...Array(4)].map((_, j) => <td key={j} style={{ border: '1px solid #000', padding: '4px 6px', height: 36 }} />)}</tr>
              ))
            ) : (
              <>
                {slipItems.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ border: '1px solid #000', padding: '4px 8px', fontSize: 11 }}>{item.description}</td>
                    <td style={{ border: '1px solid #000', padding: '4px 8px', textAlign: 'center', fontSize: 11 }}>{item.propertyNumber}</td>
                    <td style={{ border: '1px solid #000', padding: '4px 8px', textAlign: 'center', fontSize: 11 }}>{item.dateTimeReturned}</td>
                    <td style={{ border: '1px solid #000', padding: '4px 8px', fontSize: 11 }}>{item.remarks}</td>
                  </tr>
                ))}
                {slipItems.length < 8 && [...Array(8 - slipItems.length)].map((_, i) => (
                  <tr key={`empty-${i}`}>{[...Array(4)].map((_, j) => <td key={j} style={{ border: '1px solid #000', padding: '4px 6px', height: 36 }} />)}</tr>
                ))}
              </>
            )}
          </tbody>
        </table>

        <div style={{ marginTop: 40 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, marginBottom: 32 }}>
            <div>
              <div style={{ marginBottom: 4, fontSize: 11 }}>Returned by:</div>
              <div style={{ borderBottom: '1px solid #000', paddingBottom: 2, minHeight: 28, fontWeight: 'bold', fontSize: 12 }}>{form.returnedByName || ''}</div>
              <div style={{ textAlign: 'center', fontSize: 10, color: '#475569', marginTop: 4 }}>(Name, Signature and Designation)</div>
            </div>
            <div>
              <div style={{ marginBottom: 4, fontSize: 11 }}>Received by:</div>
              <div style={{ borderBottom: '1px solid #000', paddingBottom: 2, minHeight: 28, fontWeight: 'bold', fontSize: 12 }}>{form.borrowedFromName || ''}</div>
              {form.borrowedFromDesignation && <div style={{ fontSize: 11, textAlign: 'center' }}>{form.borrowedFromDesignation}</div>}
              <div style={{ textAlign: 'center', fontSize: 10, color: '#475569', marginTop: 4 }}>(Accountable Officer)</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48 }}>
            <div />
            <div>
              <div style={{ borderBottom: '1px solid #000', paddingBottom: 2, minHeight: 28, fontWeight: 'bold', fontSize: 12 }}>{form.guardOnDuty || ''}</div>
              <div style={{ textAlign: 'center', fontSize: 10, color: '#475569', marginTop: 4 }}>(Guard on Duty)</div>
            </div>
          </div>
        </div>

        <div className="mt-4 text-[11px] text-slate-500">
          Note: This slip returns the accountability of the above-mentioned property/equipment to the accountable officer.
        </div>

        <div style={{ borderTop: '1px solid #bbb', marginTop: 16, paddingTop: 6 }}>
          {isoFooter
            ? <img src={isoFooter} alt="ISO Footer" style={{ width: '100%', maxHeight: 54, objectFit: 'contain' }} />
            : <div style={{ fontSize: 9, color: '#888' }}>3rd Floor JM Agro Building, Gov. Sales St., Davao City, Philippines 8000</div>
          }
        </div>
      </div>
    )
  }

  // ─── UI ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Success Banner */}
      {successBanner && (
        <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
          <div className="w-6 h-6 bg-emerald-500/20 rounded-full flex items-center justify-center shrink-0">
            <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-emerald-400 text-sm font-medium">
            Return slip submitted. The borrow record has been marked as <span className="font-semibold">Returned</span>.
          </p>
        </div>
      )}

      {/* ── Return Slip Form ── */}
      <div className="bg-[#0d1421] border border-[#1a2744] rounded-2xl overflow-visible">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-[#1a2744]">
          <span className="w-5 h-5 rounded flex items-center justify-center text-emerald-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </span>
          <h2 className="text-white font-semibold text-sm">New Return Slip</h2>
        </div>

        <div className="p-6 space-y-5">

          {/* Link to existing borrow record */}
          <div className="bg-[#0a1020] border border-[#1a2744] rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Link to Borrow Record (Auto-fill)</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1">
              {loading ? (
                <div className="col-span-full flex items-center gap-2 py-3">
                  <div className="w-4 h-4 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                  <p className="text-slate-600 text-xs">Loading borrow records...</p>
                </div>
              ) : records.filter(r => r.status !== 'Returned').map(r => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleLinkRecord(r)}
                  className={`text-left px-3 py-2.5 rounded-xl border transition-all ${
                    form.linkedRecordId === r.id
                      ? 'bg-emerald-500/10 border-emerald-500/30 ring-1 ring-emerald-500/20'
                      : 'bg-[#0d1421] border-[#1a2744] hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-xs font-mono text-blue-400">{r.id}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${statusColor[r.status] || ''}`}>
                      {r.status}
                    </span>
                  </div>
                  <p className="text-xs text-white font-medium truncate">{r.borrowerName}</p>
                  <p className="text-[10px] text-slate-500 truncate">{r.itemName} · {r.propertyNumber}</p>
                </button>
              ))}
              {!loading && records.filter(r => r.status !== 'Returned').length === 0 && (
                <p className="text-slate-600 text-xs py-2 col-span-full">No active borrow records found.</p>
              )}
            </div>
            {form.linkedRecordId && (
              <button type="button" onClick={() => setForm(emptyForm)} className="text-xs text-slate-600 hover:text-red-400 transition">
                Unlink record
              </button>
            )}
          </div>

          {/* Row 1: Date + Returned By */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Date <span className="text-red-400 normal-case tracking-normal">*</span></label>
              <input type="date" value={form.date} onChange={e => setField('date', e.target.value)} max={today} className={`${inputClass} [color-scheme:dark]`} />
            </div>
            <div>
              <label className={labelClass}>Returned By <span className="text-red-400 normal-case tracking-normal">*</span></label>
              <input type="text" value={form.returnedByName} onChange={e => setField('returnedByName', e.target.value)} className={inputClass} placeholder="Name of person returning" />
            </div>
            <div>
              <label className={labelClass}>Designation</label>
              <input type="text" value={form.returnedByDesignation} onChange={e => setField('returnedByDesignation', e.target.value)} className={inputClass} placeholder="e.g. Statistical Analyst" />
            </div>
          </div>

          {/* Row 2: Borrowed from / to */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Borrowed From <span className="text-red-400 normal-case tracking-normal">*</span></label>
              <input type="text" value={form.borrowedFromName} onChange={e => setField('borrowedFromName', e.target.value)} className={inputClass} placeholder="Name of accountable officer" />
            </div>
            <div>
              <label className={labelClass}>From Designation</label>
              <input type="text" value={form.borrowedFromDesignation} onChange={e => setField('borrowedFromDesignation', e.target.value)} className={inputClass} placeholder="e.g. Administrative Officer II" />
            </div>
            <div>
              <label className={labelClass}>Borrowed To (Destination)</label>
              <input type="text" value={form.borrowedTo} onChange={e => setField('borrowedTo', e.target.value)} className={inputClass} placeholder="Where it was used" />
            </div>
          </div>

          {/* Row 3: Used last / Purpose */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Used Last (Location/Event)</label>
              <input type="text" value={form.usedLast} onChange={e => setField('usedLast', e.target.value)} className={inputClass} placeholder="e.g. Davao del Sur Provincial Hospital" />
            </div>
            <div>
              <label className={labelClass}>Purpose / Compliance</label>
              <input type="text" value={form.purposeCompliance} onChange={e => setField('purposeCompliance', e.target.value)} className={inputClass} placeholder="e.g. E-CRVS" />
            </div>
          </div>

          {/* Items Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold text-sm">Items Being Returned</h3>
              <button type="button" onClick={addItem} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-600/20 transition">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Item
              </button>
            </div>
            {form.items.map((item, idx) => (
              <div key={idx} className="border border-[#1a2744] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Item {idx + 1}</span>
                  {form.items.length > 1 && (
                    <button type="button" onClick={() => removeItem(idx)} className="text-xs text-red-400 hover:text-red-300 transition">Remove</button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Description of Property/Equipment <span className="text-red-400 normal-case tracking-normal">*</span></label>
                    <input type="text" value={item.description} onChange={e => setItemField(idx, 'description', e.target.value)} className={inputClass} placeholder="e.g. Dell Laptop" />
                  </div>
                  <div>
                    <label className={labelClass}>Property Number <span className="text-red-400 normal-case tracking-normal">*</span></label>
                    <input type="text" value={item.propertyNumber} onChange={e => setItemField(idx, 'propertyNumber', e.target.value)} className={inputClass} placeholder="e.g. PN-001" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Date and Time Returned <span className="text-red-400 normal-case tracking-normal">*</span></label>
                    <input type="datetime-local" value={item.dateTimeReturned} onChange={e => setItemField(idx, 'dateTimeReturned', e.target.value)} className={`${inputClass} [color-scheme:dark]`} />
                  </div>
                  <div>
                    <label className={labelClass}>Remarks</label>
                    <input type="text" value={item.remarks} onChange={e => setItemField(idx, 'remarks', e.target.value)} className={inputClass} placeholder="Condition or notes" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Row: Accountable Officer + Guard */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Accountable Officer</label>
              <input type="text" value={form.accountableOfficer} onChange={e => setField('accountableOfficer', e.target.value)} className={inputClass} placeholder="Name of accountable officer" />
            </div>
            <div>
              <label className={labelClass}>Guard on Duty</label>
              <input type="text" value={form.guardOnDuty} onChange={e => setField('guardOnDuty', e.target.value)} className={inputClass} placeholder="Name of guard on duty" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[#1a2744]">
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button type="button" onClick={() => { setForm(emptyForm); setEditingRecordId(null) }} className="w-full sm:w-auto px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-[#1a2744] border border-transparent hover:border-[#243357] transition">
                {editingRecordId ? 'Cancel Edit' : 'Clear Form'}
              </button>
              <button type="button" onClick={handlePrint} disabled={!isFormValid} className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition">
                Print Slip
              </button>
            </div>
            <button type="button" onClick={handleSubmit} disabled={!isFormValid || submitting} className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2">
{submitting ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting...</>
              ) : (
                <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> {editingRecordId ? 'Save Changes' : 'Submit Return'}</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Hidden printable area */}
      <div style={{ position: 'absolute', left: -9999, top: -9999, width: 0, height: 0, overflow: 'hidden' }}>
        <div ref={printRef}>
          {renderReturnSlip()}
        </div>
      </div>

      {showRecords && (
        <div className="bg-[#0d1421] border border-[#1a2744] rounded-2xl overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-[#1a2744]">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h2 className="text-white font-semibold text-sm">Returned Records</h2>
            <span className="text-[10px] bg-slate-800 border border-slate-700 text-slate-400 px-2 py-0.5 rounded-full font-semibold">{filtered.length}</span>
          </div>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search returned records..."
              className="bg-[#0f1623] border border-[#1e2d45] rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition w-52"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1a2744]">
                {['Return ID', 'Borrow Ref', 'Returned By', 'Item', 'Property No.', 'Returned To', 'Date Returned', 'Purpose', 'Remarks', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold text-slate-600 uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="text-center py-14">
                  <div className="flex items-center justify-center gap-2 text-slate-600 text-sm">
                    <div className="w-4 h-4 border-2 border-slate-600 border-t-slate-400 rounded-full animate-spin" />
                    Loading records...
                  </div>
                </td></tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-14">
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-8 h-8 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                      <p className="text-slate-600 text-sm">No returned records yet</p>
                      <p className="text-slate-700 text-xs">Submitted return slips will appear here</p>
                    </div>
                  </td>
                </tr>
              ) : paginated.map((record, i) => (
                <tr key={record.id} className={`border-b border-[#131f33] hover:bg-[#0f1a2e] transition-colors ${i % 2 === 0 ? '' : 'bg-[#0a1120]/40'}`}>
                  <td className="px-4 py-3 text-xs font-mono text-emerald-400 whitespace-nowrap">{record.id}</td>
                  <td className="px-4 py-3 text-xs font-mono text-blue-400 whitespace-nowrap">{record.borrowerId}</td>
                  <td className="px-4 py-3 text-xs text-white font-medium whitespace-nowrap">
                    <div>{record.returnedByName}</div>
                    {record.returnedByDesignation && <div className="text-[10px] text-slate-500">{record.returnedByDesignation}</div>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-300 whitespace-nowrap">{record.itemName}</td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-400 whitespace-nowrap">{record.propertyNumber}</td>
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{record.borrowedFromName}</td>
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{record.returnDate || '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{record.purposeCompliance || '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                    {record.remarks
                      ? <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 border border-slate-700 text-slate-300">{record.remarks}</span>
                      : <span className="text-slate-700">—</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-right">
                    <RecordActionMenu
                      open={openActionId === record.id}
                      onToggle={() => setOpenActionId(openActionId === record.id ? null : record.id)}
                      onClose={() => setOpenActionId(null)}
                    >
                      <button type="button" onClick={() => handleEditRecord(record)} className="w-full px-3 py-2 text-left text-xs text-slate-300 hover:bg-white/10 hover:text-white transition">Edit</button>
                      <button type="button" onClick={() => handleDeleteRecord(record)} className="w-full px-3 py-2 text-left text-xs text-red-400 hover:bg-red-500/10 transition">Delete</button>
                    </RecordActionMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-5 py-3 border-t border-[#1a2744] flex items-center justify-between">
          <p className="text-slate-600 text-xs">
            {filtered.length === 0 ? '0' : `${(page - 1) * PER_PAGE + 1}–${Math.min(page * PER_PAGE, filtered.length)}`} of {filtered.length} records
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[#1e2d45] text-slate-400 hover:bg-[#1a2744] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Back
            </button>
            <span className="text-slate-500 text-xs px-1">Page {page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[#1e2d45] text-slate-400 hover:bg-[#1a2744] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition flex items-center gap-1.5">
              Next
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
      </div>
      )}

    </div>
  )
}
