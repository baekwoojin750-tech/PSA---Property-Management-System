import { useState, useEffect, useRef } from 'react'
import { getAllAssets, getAllBorrowRequests, createBorrowRequest, updateAsset } from '../../services/authService'
import { SearchableDropdown } from '../assets/assetComponents'
import type { Asset } from '../assets/assetTypes'
import { defaultEquipmentCategories, transformAsset } from '../assets/assetTypes'

// ─── Base64 image loader (same pattern as GatepassTab / ReturnSlipTab) ────────
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
    img.onerror = () => console.warn(`BorrowTab: could not load ${src}`)
    img.src = src
  }, [src])
  return b64
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface BorrowItem {
  description: string
  equipmentCategory: string
  propertyNumber: string
  destination: string
  periodCovered: string
}

export interface BorrowRecord {
  id: string
  borrowerName: string
  borrowerDesignation?: string
  department: string
  itemName: string
  propertyNumber: string
  startDate: string
  endDate: string
  status: 'Active' | 'Returned' | 'Overdue'
  destination?: string
  purpose?: string
  borrowedFromName: string
  borrowedFromDesignation?: string
  items?: BorrowItem[]
}

interface BorrowForm {
  date: string
  borrowerName: string
  borrowerDesignation: string
  fromPlace: string
  toDestination: string
  startDate: string
  endDate: string
  purposeCompliance: string
  requestedBy: string
  borrowedFromName: string
  borrowedFromDesignation: string
  approvedBy: string
  approvedByDesignation: string
  items: BorrowItem[]
}

const emptyItem: BorrowItem = {
  description: '',
  equipmentCategory: '',
  propertyNumber: '',
  destination: '',
  periodCovered: '',
}

const emptyForm: BorrowForm = {
  date: new Date().toISOString().split('T')[0],
  borrowerName: '',
  borrowerDesignation: '',
  fromPlace: 'PSA Davao Del Sur',
  toDestination: '',
  startDate: '',
  endDate: '',
  purposeCompliance: '',
  requestedBy: '',
  borrowedFromName: 'CRESENCE BERYL B. MEJORADA',
  borrowedFromDesignation: '',
  approvedBy: 'ADELINE G. BATUCAN',
  approvedByDesignation: 'Chief Statistical Specialist',
  items: [{ ...emptyItem }],
}

interface BorrowTabProps {
  showRecords?: boolean
}

const statusColor: Record<string, string> = {
  Active: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  Returned: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  Overdue: 'bg-red-500/10 text-red-400 border border-red-500/20',
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function BorrowTab({ showRecords = true }: BorrowTabProps) {
  const printRef = useRef<HTMLDivElement>(null)

  // Same image sources as GatepassTab / ReturnSlipTab
  const psaLogo    = useBase64Image('/headerImage1.jpg')
  const bagongLogo = useBase64Image('/headerImage2.png')
  const isoFooter  = useBase64Image('/iso.png')

  const [form, setForm]           = useState<BorrowForm>(emptyForm)
  const [records, setRecords]     = useState<BorrowRecord[]>([])
  const [assetList, setAssetList] = useState<Asset[]>([])
  const [equipmentCategories, setEquipmentCategories] = useState<string[]>(defaultEquipmentCategories)
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [statusFilter, setStatus] = useState('All')
  const [page, setPage]           = useState(1)
  const [successBanner, setSuccessBanner] = useState(false)
  const [paperSize, setPaperSize] = useState<'A4' | 'Letter' | 'Legal'>('A4')
  const PER_PAGE = 10

  // Paper size dimensions in mm
  const PAPER_SIZES = {
    A4:     { w: 210, h: 297, label: 'A4 (210\u00d7297mm)' },
    Letter: { w: 216, h: 279, label: 'Letter (216\u00d7279mm)' },
    Legal:  { w: 216, h: 356, label: 'Legal (216\u00d7356mm)' },
  }

  useEffect(() => {
    if (!showRecords) {
      setLoading(false)
      return
    }

    const fetchBorrowRecords = async () => {
      try {
        setLoading(true)
        const data = await getAllBorrowRequests()
        // Transform the data to match BorrowRecord interface
        const transformedData: BorrowRecord[] = data.map((record: any) => ({
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
          borrowedFromName: 'PSA Officer',
          borrowedFromDesignation: 'Administrative Officer',
          items: [{
            description: record.item_name,
            equipmentCategory: '',
            propertyNumber: record.property_number,
            destination: record.destination || '',
            periodCovered: [record.start_date, record.end_date].filter(Boolean).join(' - '),
          }],
        }))
        setRecords(transformedData)
      } catch (err) {
        console.error('Failed to fetch borrow records:', err)
        // Fall back to empty array on error
        setRecords([])
      } finally {
        setLoading(false)
      }
    }

    fetchBorrowRecords()
  }, [showRecords])

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const assets = await getAllAssets()
        const transformedAssets = assets.map((asset: any) => transformAsset(asset))
        const categories = Array.from(new Set([
          ...defaultEquipmentCategories,
          ...transformedAssets.map((asset: Asset) => asset.equipmentCategory).filter(Boolean),
        ]))
        setAssetList(transformedAssets)
        setEquipmentCategories(categories)
      } catch (err) {
        console.error('Failed to fetch asset categories:', err)
      }
    }

    fetchAssets()
  }, [])

  const inputClass  = "w-full bg-[#0f1623] border border-[#1e2d45] rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition"
  const labelClass  = "block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1"

  const getPeriodCovered = (startDate = form.startDate, endDate = form.endDate) =>
    [startDate, endDate].filter(Boolean).join(' - ')

  const formatPropertyNumber = (value: string) => {
    const digits = value.replace(/\D/g, '')
    const group1 = digits.slice(0, 4)
    const group2 = digits.slice(4, 6)
    const group3 = digits.slice(6, 9)
    const group4 = digits.slice(9)
    let formatted = group1
    if (group2) formatted += `-${group2}`
    if (group3) formatted += `-${group3}`
    if (group4) formatted += `-${group4}`
    return formatted
  }

  const setField = (key: keyof BorrowForm, value: string) =>
    setForm(f => {
      const next = { ...f, [key]: value }
      if (key === 'borrowerName') next.requestedBy = value

      if (key === 'toDestination' || key === 'startDate' || key === 'endDate') {
        const destination = key === 'toDestination' ? value : next.toDestination
        const periodCovered = getPeriodCovered(
          key === 'startDate' ? value : next.startDate,
          key === 'endDate' ? value : next.endDate
        )
        next.items = next.items.map(item => ({
          ...item,
          destination,
          periodCovered,
        }))
      }

      return next
    })

  const setItemField = (idx: number, key: keyof BorrowItem, value: string) =>
    setForm(f => {
      const item = f.items[idx]
      const nextValue = key === 'propertyNumber' ? formatPropertyNumber(value) : value
      let nextItem = { ...item, [key]: nextValue }

      if (key === 'propertyNumber') {
        const matched = assetList.find(asset => asset.propertyNumber === nextValue)
        if (matched) {
          nextItem = {
            ...nextItem,
            equipmentCategory: matched.equipmentCategory || nextItem.equipmentCategory,
            description: nextItem.description || matched.itemName || nextItem.description,
          }
        }
      }

      return {
        ...f,
        items: f.items.map((it, i) => i === idx ? nextItem : it),
      }
    })

  const addItem    = () => setForm(f => ({
    ...f,
    items: [
      ...f.items,
      {
        ...emptyItem,
        destination: f.toDestination,
        periodCovered: getPeriodCovered(f.startDate, f.endDate),
      },
    ],
  }))
  const removeItem = (idx: number) => {
    if (form.items.length === 1) return
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))
  }

  const isFormValid = !!(
    form.date &&
    form.borrowerName &&
    form.fromPlace &&
    form.toDestination &&
    form.startDate &&
    form.endDate &&
    form.purposeCompliance &&
    form.borrowedFromName &&
    form.items.every(it => it.description && it.propertyNumber)
  )

  const handleSubmit = async () => {
    if (!isFormValid) return
    try {
      setLoading(true)
      // Create one borrow request per item
      const results = await Promise.all(
        form.items
          .filter(it => it.description && it.propertyNumber)
          .map(item =>
            createBorrowRequest({
              property_number: item.propertyNumber,
              item_name: item.description,
              borrower_name: form.borrowerName,
              borrower_designation: form.borrowerDesignation || undefined,
              department: form.fromPlace || undefined,
              start_date: form.startDate,
              end_date: form.endDate || undefined,
              purpose: form.purposeCompliance || undefined,
              destination: form.toDestination || undefined,
            })
          )
      )
      // Flip each borrowed asset's status to 'Borrowed'
      await Promise.all(
        form.items
          .filter(it => it.propertyNumber)
          .map(item => updateAsset(item.propertyNumber, { status: 'Borrowed' }))
      )

      // Update local records state
      const newRecords: BorrowRecord[] = results.map(record => ({
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
        borrowedFromName: form.borrowedFromName,
        borrowedFromDesignation: form.borrowedFromDesignation,
        items: [{
          description: record.item_name,
          equipmentCategory: '',
          propertyNumber: record.property_number,
          destination: record.destination || '',
          periodCovered: [record.start_date, record.end_date].filter(Boolean).join(' - '),
        }],
      }))
      setRecords(prev => [...newRecords, ...prev])
      setForm(emptyForm)
      setSuccessBanner(true)
      setTimeout(() => setSuccessBanner(false), 4000)
    } catch (err) {
      console.error('Failed to submit borrow request:', err)
      alert('Failed to submit borrow request. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ─── Print handler ──────────────────────────────────────────────────────────
  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=700')
    if (!printWindow) return

    const psaSrc    = psaLogo    || ''
    const bagongSrc = bagongLogo || ''
    const isoSrc    = isoFooter  || ''

    const psaImg = psaSrc
      ? '<img src="' + psaSrc + '" style="width:72px;height:72px;object-fit:contain;display:block;" />'
      : ''

    const bagongImg = bagongSrc
      ? '<img src="' + bagongSrc + '" style="width:72px;height:72px;object-fit:contain;display:block;" />'
      : ''

    const isoImg = isoSrc
      ? '<img src="' + isoSrc + '" style="max-height:48px;object-fit:contain;object-position:left;" />'
      : '<span style="font-size:8px;color:#888;">3rd Floor JM Agro Building, Gov. Sales St., Davao City, Philippines 8000</span>'

    const slipItems = form.items.filter(it => it.description && it.propertyNumber)
    const filledItems = slipItems.length > 0 ? slipItems : []
    const emptyRowCount = Math.max(0, 8 - filledItems.length)

    const itemRows = filledItems.map(item =>
      '<tr>' +
        '<td style="border:1px solid #000;padding:6px 8px;font-size:11px;font-weight:700;vertical-align:middle;">' + item.description + '</td>' +
        '<td style="border:1px solid #000;padding:6px 8px;font-size:11px;vertical-align:middle;">' + (item.equipmentCategory ? item.equipmentCategory + ' - ' : '') + item.propertyNumber + '</td>' +
        '<td style="border:1px solid #000;padding:6px 8px;font-size:11px;text-align:center;vertical-align:middle;">' + (form.purposeCompliance || '') + '</td>' +
        '<td style="border:1px solid #000;padding:6px 8px;font-size:11px;text-align:center;vertical-align:middle;">' + (form.date || '') + '</td>' +
        '<td style="border:1px solid #000;padding:6px 8px;font-size:11px;text-align:center;vertical-align:middle;">' + (item.periodCovered || getPeriodCovered()) + '</td>' +
      '</tr>'
    ).join('')

    const emptyRows = Array.from({ length: emptyRowCount }).map(() =>
      '<tr>' +
        '<td style="border:1px solid #000;height:36px;"></td>' +
        '<td style="border:1px solid #000;"></td>' +
        '<td style="border:1px solid #000;"></td>' +
        '<td style="border:1px solid #000;"></td>' +
        '<td style="border:1px solid #000;"></td>' +
      '</tr>'
    ).join('')

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Borrower's Slip</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: A4 portrait; margin: 14mm 20mm; }
    html { height: 100%; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #000; background: #fff; min-height: 100%; display: flex; flex-direction: column; }
    #content { flex: 1; }
    #footer { margin-top: auto; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #000; padding: 6px 8px; vertical-align: middle; }
    th { font-size: 11px; font-weight: bold; text-align: center; }
    @media print { html, body { height: 100% !important; } }
  </style>
</head>
<body>
  <div id="content">
    <!-- HEADER: no divider -->
    <div style="display:grid;grid-template-columns:80px 1fr 80px;align-items:center;margin-bottom:6mm;">
      <div>${psaImg}</div>
      <div style="text-align:center;line-height:1.4;">
        <div style="font-size:8px;text-transform:uppercase;letter-spacing:0.18em;color:#555;">Republic of the Philippines</div>
        <div style="font-size:15px;font-weight:900;text-transform:uppercase;letter-spacing:0.05em;">Philippine Statistics Authority</div>
        <div style="font-size:8px;text-transform:uppercase;letter-spacing:0.14em;color:#555;">Davao del Sur Provincial Statistical Office</div>
      </div>
      <div style="display:flex;justify-content:flex-end;">${bagongImg}</div>
    </div>

    <!-- BORROWER'S SLIP label -->
    <div style="display:flex;justify-content:flex-end;margin-bottom:5mm;">
      <div style="border:2px solid #000;padding:5px 18px;font-weight:900;font-size:14px;letter-spacing:2px;text-transform:uppercase;">BORROWER'S SLIP</div>
    </div>

    <!-- Date -->
    <div style="margin-bottom:4mm;display:flex;gap:6px;align-items:flex-end;">
      <span style="font-weight:bold;">Date:</span>
      <span style="border-bottom:1px solid #000;min-width:160px;display:inline-block;padding-bottom:1px;">${form.date || ''}</span>
    </div>

    <!-- Body paragraph -->
    <div style="margin-bottom:5mm;line-height:2.1;">
      <span>Please allow </span>
      <span style="border-bottom:1px solid #000;font-weight:bold;text-decoration:underline;padding:0 4px;display:inline-block;min-width:150px;text-align:center;">${form.borrowerName || '_______________'}</span>
      <span> to borrow out property/equipment listed below from </span>
      <span style="border-bottom:1px solid #000;font-weight:bold;padding:0 4px;display:inline-block;min-width:100px;text-align:center;">${form.fromPlace || 'PSA Davao Del Sur'}</span>
      <span> to </span>
      <span style="border-bottom:1px solid #000;font-weight:bold;padding:0 4px;display:inline-block;min-width:120px;text-align:center;">DESTINATION${form.toDestination ? ' ' + form.toDestination : ''}</span>
      <span> from </span>
      <span style="border-bottom:1px solid #000;font-weight:bold;padding:0 4px;display:inline-block;min-width:110px;text-align:center;">${form.startDate || 'STARTING DATE'}</span>
      <span> to </span>
      <span style="border-bottom:1px solid #000;font-weight:bold;padding:0 4px;display:inline-block;min-width:110px;text-align:center;">${form.endDate || 'END DATE'}</span>
      <span> for the purpose/compliance of </span>
      <span style="border-bottom:1px solid #000;font-weight:bold;text-decoration:underline;padding:0 4px;display:inline-block;min-width:160px;text-align:center;">${form.purposeCompliance || '_______________'}</span>
      <span>.</span>
    </div>

    <!-- Items table -->
    <table style="margin-bottom:6mm;">
      <thead>
        <tr>
          <th style="width:26%;">Description of<br/>Property/Equipment</th>
          <th style="width:28%;">Property Number</th>
          <th style="width:16%;">Purpose</th>
          <th style="width:18%;">Date and Time<br/>Borrowed</th>
          <th style="width:12%;">Duration</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
        ${emptyRows}
      </tbody>
    </table>

    <!-- Signatures -->
    <div style="display:grid;grid-template-columns:110px 1fr;column-gap:10px;row-gap:16px;margin-bottom:6mm;">
      <div style="font-weight:bold;padding-top:2px;">Borrowed by:</div>
      <div>
        <div style="border-bottom:1px solid #000;font-weight:bold;font-size:12px;text-align:center;padding-bottom:2px;">${form.requestedBy || form.borrowerName || ''}</div>
        <div style="text-align:center;font-size:9px;margin-top:3px;">(${form.borrowerDesignation || 'Name and Designation'})</div>
      </div>
      <div style="font-weight:bold;padding-top:2px;">Borrowed From:</div>
      <div>
        <div style="border-bottom:1px solid #000;font-weight:bold;font-size:12px;text-align:center;padding-bottom:2px;">${form.borrowedFromName || ''}</div>
        <div style="text-align:center;font-size:9px;margin-top:3px;">(${form.borrowedFromDesignation || 'Name and Designation'})</div>
      </div>
      <div style="font-weight:bold;padding-top:2px;">Approved By:</div>
      <div>
        <div style="border-bottom:1px solid #000;font-weight:bold;font-size:12px;text-align:center;padding-bottom:2px;">${form.approvedBy || ''}</div>
        <div style="text-align:center;font-size:9px;margin-top:3px;">(${form.approvedByDesignation || 'Name and Designation'})</div>
      </div>
    </div>

    <!-- Note -->
    <div style="font-size:10px;display:grid;grid-template-columns:34px 1fr;gap:4px;">
      <span style="font-weight:bold;">Note:</span>
      <span>This slip temporarily transfers the accountability of the above-mentioned property/equipment to the borrower.</span>
    </div>
  </div>

  <!-- FOOTER: no divider, pinned to bottom -->
  <div id="footer">${isoImg}</div>

</body>
</html>`

    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.onload = () => {
      printWindow.focus()
      printWindow.print()
      printWindow.onafterprint = () => printWindow.close()
    }
  }

  // Table filters
  const filtered = records.filter(r => {
    const matchSearch = [r.borrowerName, r.itemName, r.propertyNumber, r.department]
      .some(v => v.toLowerCase().includes(search.toLowerCase()))
    const matchStatus = statusFilter === 'All' || r.status === statusFilter
    return matchSearch && matchStatus
  })
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  useEffect(() => { setPage(1) }, [search, statusFilter])

  // ─── Printable Borrower's Slip ──────────────────────────────────────────────
  const renderSlip = () => {
    const slipItems = form.items.filter(it => it.description && it.propertyNumber)
    return (
      <div style={{ width: '100%', padding: '10mm 14mm', fontFamily: 'Arial, sans-serif', fontSize: '11px', backgroundColor: '#fff', color: '#000', boxSizing: 'border-box' }}>

        {/* ══ HEADER — PSA logo | center text | Bagong Pilipinas logo ══ */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '8px' }}>
          {psaLogo
            ? <img src={psaLogo} alt="PSA Logo" style={{ width: '68px', height: '68px', objectFit: 'contain', flexShrink: 0 }} />
            : <div style={{ width: 68, height: 68, border: '1px dashed #bbb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: '#aaa' }}>PSA</div>
          }
          <div style={{ textAlign: 'center', lineHeight: 1.3 }}>
            <div style={{ fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.18em', color: '#555' }}>Republic of the Philippines</div>
            <div style={{ fontSize: '15px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#000' }}>Philippine Statistics Authority</div>
            <div style={{ fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.14em', color: '#555' }}>Davao del Sur Provincial Statistical Office</div>
          </div>
          {bagongLogo
            ? <img src={bagongLogo} alt="Bagong Pilipinas" style={{ width: '68px', height: '68px', objectFit: 'contain', flexShrink: 0 }} />
            : <div style={{ width: 68, height: 68, border: '1px dashed #bbb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: '#aaa' }}>Seal</div>
          }
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid #aaa', marginBottom: '8px' }} />

        {/* BORROWER'S SLIP box — right-aligned (same pattern as Gate Pass / Return Slip) */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
          <div style={{ border: '2px solid #000', padding: '6px 20px', fontWeight: 900, fontSize: '14px', letterSpacing: '2px', textTransform: 'uppercase' }}>
            BORROWER'S SLIP
          </div>
        </div>

        {/* Date */}
        <div style={{ marginBottom: '10px', fontSize: '11px', display: 'flex', gap: '6px', alignItems: 'flex-end' }}>
          <span style={{ fontWeight: 'bold' }}>Date:</span>
          <span style={{ borderBottom: '1px solid #000', minWidth: '160px', paddingBottom: 1 }}>{form.date}</span>
        </div>

        {/* Body text */}
        <div style={{ marginBottom: '14px', lineHeight: 2.1, fontSize: '11px' }}>
          <span>Please allow </span>
          <span style={{ borderBottom: '1px solid #000', fontWeight: 'bold', padding: '0 3px' }}>{form.borrowerName || '___________________________'}</span>
          <span> to borrow property/equipment listed below from </span>
          <br />
          <span style={{ borderBottom: '1px solid #000', fontWeight: 'bold', padding: '0 3px' }}>{form.fromPlace || '_____________________'}</span>
          <span> to </span>
          <span style={{ borderBottom: '1px solid #000', fontWeight: 'bold', padding: '0 3px' }}>{form.toDestination || '_____________________'}</span>
          <span> from </span>
          <span style={{ borderBottom: '1px solid #000', fontWeight: 'bold', padding: '0 3px' }}>{form.startDate || '_____________'}</span>
          <span> to </span>
          <span style={{ borderBottom: '1px solid #000', fontWeight: 'bold', padding: '0 3px' }}>{form.endDate || '_____________'}</span>
          <span> for the purpose/compliance of </span>
          <span style={{ borderBottom: '1px solid #000', fontWeight: 'bold', padding: '0 3px', textDecoration: 'underline' }}>{form.purposeCompliance || '_____________________'}</span>
          <span>.</span>
        </div>

        {/* Items Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '28px' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center', fontWeight: 'bold', fontSize: '11px', width: '28%' }}>
                Description of<br />Property/Equipment
              </th>
              <th style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center', fontWeight: 'bold', fontSize: '11px', width: '26%' }}>
                Property Number
              </th>
              <th style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center', fontWeight: 'bold', fontSize: '11px', width: '16%' }}>
                Purpose
              </th>
              <th style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center', fontWeight: 'bold', fontSize: '11px', width: '18%' }}>
                Date and Time<br />Borrowed
              </th>
              <th style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center', fontWeight: 'bold', fontSize: '11px', width: '12%' }}>
                Duration
              </th>
            </tr>
          </thead>
          <tbody>
            {slipItems.length === 0
              ? [...Array(8)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(5)].map((_, j) => (
                      <td key={j} style={{ border: '1px solid #000', padding: '4px 6px', height: 36 }} />
                    ))}
                  </tr>
                ))
              : (
                <>
                  {slipItems.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ border: '1px solid #000', padding: '4px 8px', fontSize: '11px' }}>{item.description}</td>
                      <td style={{ border: '1px solid #000', padding: '4px 8px', textAlign: 'center', fontSize: '11px' }}>{item.propertyNumber}</td>
                      <td style={{ border: '1px solid #000', padding: '4px 8px', textAlign: 'center', fontSize: '11px' }}>{form.purposeCompliance}</td>
                      <td style={{ border: '1px solid #000', padding: '4px 8px', textAlign: 'center', fontSize: '11px' }}>{form.date}</td>
                      <td style={{ border: '1px solid #000', padding: '4px 8px', textAlign: 'center', fontSize: '11px' }}>{item.periodCovered}</td>
                    </tr>
                  ))}
                  {slipItems.length < 8 && [...Array(8 - slipItems.length)].map((_, i) => (
                    <tr key={`empty-${i}`}>
                      {[...Array(5)].map((_, j) => (
                        <td key={j} style={{ border: '1px solid #000', padding: '4px 6px', height: 36 }} />
                      ))}
                    </tr>
                  ))}
                </>
              )
            }
          </tbody>
        </table>

        {/* Signatures */}
        <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', columnGap: 10, rowGap: 16, marginBottom: '20px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '11px', paddingTop: 2 }}>Borrowed by:</div>
          <div>
            <div style={{ borderBottom: '1px solid #000', paddingBottom: 2, minHeight: 28, fontWeight: 'bold', fontSize: '12px', textAlign: 'center' }}>{form.requestedBy || form.borrowerName}</div>
            <div style={{ textAlign: 'center', fontSize: '10px', color: '#475569', marginTop: 4 }}>({form.borrowerDesignation || 'Name and Designation'})</div>
          </div>

          <div style={{ fontWeight: 'bold', fontSize: '11px', paddingTop: 2 }}>Borrowed From:</div>
          <div>
            <div style={{ borderBottom: '1px solid #000', paddingBottom: 2, minHeight: 28, fontWeight: 'bold', fontSize: '12px', textAlign: 'center' }}>{form.borrowedFromName}</div>
            <div style={{ textAlign: 'center', fontSize: '10px', color: '#475569', marginTop: 4 }}>({form.borrowedFromDesignation || 'Name and Designation'})</div>
          </div>

          <div style={{ fontWeight: 'bold', fontSize: '11px', paddingTop: 2 }}>Approved By:</div>
          <div>
            <div style={{ borderBottom: '1px solid #000', paddingBottom: 2, minHeight: 28, fontWeight: 'bold', fontSize: '12px', textAlign: 'center' }}>{form.approvedBy}</div>
            <div style={{ textAlign: 'center', fontSize: '10px', color: '#475569', marginTop: 4 }}>({form.approvedByDesignation || 'Name and Designation'})</div>
          </div>
        </div>

        {/* Note */}
        <div style={{ fontSize: '10px', color: '#475569', marginBottom: '12px' }}>
          Note: This slip temporarily transfers the accountability of the above-mentioned property/equipment to the borrower.
        </div>

        {/* ══ FOOTER — ISO image (same as GatepassTab / ReturnSlipTab) ══ */}
        <div style={{ borderTop: '1px solid #bbb', paddingTop: '6px', marginTop: '8px' }}>
          {isoFooter
            ? <img src={isoFooter} alt="ISO Footer" style={{ width: '100%', maxHeight: '54px', objectFit: 'contain' }} />
            : (
              <div style={{ fontSize: '9px', color: '#888', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span>[ISO logo]</span>
                <span>
                  3rd Floor JM Agro Building, Gov. Sales St., Davao City, Philippines 8000<br />
                  Telephone/Fax No.: (082) 225-0172 &nbsp;|&nbsp; E-Mail: davaodelsur@psa.gov.ph
                </span>
              </div>
            )
          }
        </div>

      </div>
    )
  }

  const renderBorrowSlip = () => {
    const slipItems = form.items.filter(it => it.description && it.propertyNumber)
    const filledItems = slipItems.length > 0 ? slipItems : [{ ...emptyItem }]
    // Pad to minimum 4 rows when there are few items; no cap when many
    const emptyRows = Math.max(0, 4 - filledItems.length)

    return (
      <div style={{ width: '100%', fontFamily: 'Arial, sans-serif', fontSize: 10, backgroundColor: '#fff', color: '#000', boxSizing: 'border-box' }}>

        {/* ── BORROWER'S SLIP label — centered in a bordered box (matches docx) ── */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <div style={{ border: '2px solid #000', padding: '5px 18px', fontWeight: 900, fontSize: 16, textTransform: 'uppercase', letterSpacing: '1.5px', textAlign: 'center' }}>BORROWER'S SLIP</div>
        </div>

        {/* ── Date ── */}
        <div style={{ marginBottom: 10, display: 'flex', gap: 4, alignItems: 'flex-end' }}>
          <span style={{ fontWeight: 700 }}>Date:</span>
          <span style={{ borderBottom: '1px solid #000', minWidth: 160, paddingBottom: 1, display: 'inline-block' }}>{form.date}</span>
        </div>

        {/* ── Body paragraph — exact wording from docx ── */}
        {/* "Please allow [name] to borrow out property/equipment listed below from [from] to [destination] use in the [period] from [date] for the purpose/compliance of [purpose]." */}
        <div style={{ marginBottom: 14, lineHeight: 2.0 }}>
          <span>Please allow </span>
          <span style={{ display: 'inline-block', minWidth: 170, borderBottom: '1px solid #000', fontWeight: 700, padding: '0 4px', textAlign: 'center' }}>{form.borrowerName || '___________________________'}</span>
          <span>  to borrow out property/equipment listed below from </span>
          <span style={{ display: 'inline-block', minWidth: 120, borderBottom: '1px solid #000', fontWeight: 700, padding: '0 4px', textAlign: 'center' }}>{form.fromPlace || 'PSA Davao Del Sur'}</span>
          <span> to </span>
          <span style={{ display: 'inline-block', minWidth: 140, borderBottom: '1px solid #000', fontWeight: 700, padding: '0 4px', textAlign: 'center' }}>{form.toDestination || '_____________________'}</span>
          <span> use in the </span>
          <span style={{ display: 'inline-block', minWidth: 120, borderBottom: '1px solid #000', fontWeight: 700, padding: '0 4px', textAlign: 'center' }}>{form.startDate ? `${form.startDate}${form.endDate ? ' – ' + form.endDate : ''}` : '_______________________'}</span>
          <span> from </span>
          <span style={{ display: 'inline-block', minWidth: 120, borderBottom: '1px solid #000', fontWeight: 700, padding: '0 4px', textAlign: 'center' }}>{form.startDate || '_____________'}</span>
          <span> for the purpose/compliance of </span>
          <span style={{ display: 'inline-block', minWidth: 200, borderBottom: '1px solid #000', fontWeight: 700, padding: '0 4px', textAlign: 'center', textDecoration: 'underline' }}>{form.purposeCompliance || '_____________________'}</span>
          <span>.</span>
        </div>

        {/* ── Items table — thead repeats on each page via CSS ── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20, tableLayout: 'fixed', pageBreakAfter: 'avoid' }}>
          <thead>
            <tr>
              <th style={{ width: '24%', border: '1px solid #000', padding: '6px 8px', textAlign: 'center', fontWeight: 'bold', fontSize: 10 }}>Description of<br />Property/Equipment</th>
              <th style={{ width: '30%', border: '1px solid #000', padding: '6px 8px', textAlign: 'center', fontWeight: 'bold', fontSize: 10 }}>Property Number</th>
              <th style={{ width: '17%', border: '1px solid #000', padding: '6px 8px', textAlign: 'center', fontWeight: 'bold', fontSize: 10 }}>Purpose</th>
              <th style={{ width: '17%', border: '1px solid #000', padding: '6px 8px', textAlign: 'center', fontWeight: 'bold', fontSize: 10 }}>Date and Time<br />Borrowed</th>
              <th style={{ width: '12%', border: '1px solid #000', padding: '6px 8px', textAlign: 'center', fontWeight: 'bold', fontSize: 10 }}>Duration</th>
            </tr>
          </thead>
          <tbody>
            {filledItems.map((item, idx) => (
              <tr key={idx}>
                <td style={{ height: '13mm', fontSize: 10, fontWeight: 700, verticalAlign: 'middle', padding: '4px 6px', border: '1px solid #000' }}>{item.description}</td>
                <td style={{ height: '13mm', fontSize: 10, verticalAlign: 'middle', padding: '4px 6px', border: '1px solid #000' }}>{`${item.equipmentCategory ? `${item.equipmentCategory} - ` : ''}${item.propertyNumber}`}</td>
                <td style={{ height: '13mm', fontSize: 10, textAlign: 'center', verticalAlign: 'middle', padding: '4px 6px', border: '1px solid #000' }}>{form.purposeCompliance}</td>
                <td style={{ height: '13mm', fontSize: 10, textAlign: 'center', fontWeight: 700, verticalAlign: 'middle', padding: '4px 6px', border: '1px solid #000' }}>{form.date}</td>
                <td style={{ height: '13mm', fontSize: 9, textAlign: 'center', wordBreak: 'break-word', verticalAlign: 'middle', padding: '4px 6px', border: '1px solid #000' }}>{item.periodCovered || getPeriodCovered()}</td>
              </tr>
            ))}
            {Array.from({ length: emptyRows }).map((_, i) => (
              <tr key={`empty-${i}`}>
                <td style={{ height: '13mm', border: '1px solid #000' }} />
                <td style={{ height: '13mm', border: '1px solid #000' }} />
                <td style={{ height: '13mm', border: '1px solid #000' }} />
                <td style={{ height: '13mm', border: '1px solid #000' }} />
                <td style={{ height: '13mm', border: '1px solid #000' }} />
              </tr>
            ))}
          </tbody>
        </table>

        {/* ── Signatures + Note — kept together, never split across pages ── */}
        <div className="no-break" style={{ pageBreakInside: 'avoid', breakInside: 'avoid', paddingTop: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '95px 1fr', columnGap: 10, rowGap: 18, marginBottom: 20 }}>
            <div style={{ fontWeight: 700, paddingTop: 2 }}>Borrowed by:</div>
            <div>
              <div style={{ borderBottom: '1px solid #000', fontWeight: 700, fontSize: 11, textAlign: 'center', paddingBottom: 2 }}>{form.requestedBy || form.borrowerName}</div>
              <div style={{ textAlign: 'center', fontSize: 8, marginTop: 2 }}>({form.borrowerDesignation || 'Name and Designation'})</div>
            </div>

            <div style={{ fontWeight: 700, paddingTop: 2 }}>Borrowed From:</div>
            <div>
              <div style={{ borderBottom: '1px solid #000', fontWeight: 700, fontSize: 11, textAlign: 'center', paddingBottom: 2 }}>{form.borrowedFromName}</div>
              <div style={{ textAlign: 'center', fontSize: 8, marginTop: 2 }}>({form.borrowedFromDesignation || 'Name and Designation'})</div>
            </div>

            <div style={{ fontWeight: 700, paddingTop: 2 }}>Approved By:</div>
            <div>
              <div style={{ borderBottom: '1px solid #000', fontWeight: 700, fontSize: 11, textAlign: 'center', paddingBottom: 2 }}>{form.approvedBy}</div>
              <div style={{ textAlign: 'center', fontSize: 8, marginTop: 2 }}>({form.approvedByDesignation || 'Name and Designation'})</div>
            </div>
          </div>

          <div style={{ fontSize: 8.5, display: 'grid', gridTemplateColumns: '30px 1fr', gap: 4 }}>
            <span style={{ fontWeight: 700 }}>Note:</span>
            <span>This slip temporarily transfers the accountability of the above-mentioned property/equipment to the borrower.</span>
          </div>
        </div>

      </div>
    )
  }

  // ─── UI ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Success Banner */}
      {successBanner && (
        <div className="flex items-center gap-3 bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3">
          <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center shrink-0">
            <svg className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-blue-400 text-sm font-medium">Borrow request submitted successfully.</p>
        </div>
      )}

      {/* ── Borrow Request Form ── */}
      <div className="bg-[#0d1421] border border-[#1a2744] rounded-2xl overflow-visible">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-[#1a2744]">
          <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h2 className="text-white font-semibold text-sm">New Borrow Request</h2>
        </div>

        <div className="p-6 space-y-5">

          {/* Borrow request details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Date</label>
              <input type="date" value={form.date} onChange={e => setField('date', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Borrower Name</label>
              <input type="text" value={form.borrowerName} onChange={e => setField('borrowerName', e.target.value)} className={inputClass} placeholder="Full name" />
            </div>
            <div>
              <label className={labelClass}>Borrower Designation</label>
              <input type="text" value={form.borrowerDesignation} onChange={e => setField('borrowerDesignation', e.target.value)} className={inputClass} placeholder="Borrower designation" />
            </div>
            <div>
              <label className={labelClass}>From (Current Place)</label>
              <input type="text" value={form.fromPlace} onChange={e => setField('fromPlace', e.target.value)} className={inputClass} placeholder="PSA Davao Del Sur" />
            </div>
            <div>
              <label className={labelClass}>To (Destination)</label>
              <input type="text" value={form.toDestination} onChange={e => setField('toDestination', e.target.value)} className={inputClass} placeholder="Destination" />
            </div>
            <div>
              <label className={labelClass}>From (Starting Date)</label>
              <input type="date" value={form.startDate} onChange={e => setField('startDate', e.target.value)} className={`${inputClass} [color-scheme:dark]`} />
            </div>
            <div>
              <label className={labelClass}>To (End Date)</label>
              <input type="date" value={form.endDate} onChange={e => setField('endDate', e.target.value)} className={`${inputClass} [color-scheme:dark]`} />
            </div>
            <div>
              <label className={labelClass}>Purpose / Compliance</label>
              <input type="text" value={form.purposeCompliance} onChange={e => setField('purposeCompliance', e.target.value)} className={inputClass} placeholder="e.g. E-CRVS" />
            </div>
            <div>
              <label className={labelClass}>Borrowed By</label>
              <input type="text" value={form.borrowerName} readOnly className={`${inputClass} cursor-not-allowed text-slate-400`} placeholder="Auto-filled from borrower name" />
            </div>
            <div>
              <label className={labelClass}>Borrowed From</label>
              <input type="text" value={form.borrowedFromName} onChange={e => setField('borrowedFromName', e.target.value)} className={inputClass} placeholder="Name of accountable officer" />
            </div>
            <div>
              <label className={labelClass}>Borrowed From (Designation)</label>
              <input type="text" value={form.borrowedFromDesignation} onChange={e => setField('borrowedFromDesignation', e.target.value)} className={inputClass} placeholder="Designation" />
            </div>
            <div>
              <label className={labelClass}>Approved By</label>
              <input type="text" value={form.approvedBy} readOnly className={`${inputClass} cursor-not-allowed text-slate-400`} />
            </div>
            <div>
              <label className={labelClass}>Approved By (Designation)</label>
              <input type="text" value={form.approvedByDesignation} readOnly className={`${inputClass} cursor-not-allowed text-slate-400`} />
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className={labelClass}>Items to Borrow</label>
              <button type="button" onClick={addItem} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600/10 border border-blue-500/20 text-blue-400 hover:bg-blue-600/20 transition">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Add Item
              </button>
            </div>
            <div className="space-y-3" style={form.items.length > 5 ? { maxHeight: '520px', overflowY: 'auto', paddingRight: '4px' } : undefined}>
              {form.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-1 lg:grid-cols-12 gap-3 bg-[#0a1120] border border-[#1a2744] rounded-xl p-3 relative">
                  <div className="lg:col-span-3">
                    <label className={labelClass}>Description</label>
                    <input type="text" value={item.description} onChange={e => setItemField(idx, 'description', e.target.value)} className={inputClass} placeholder="Property/equipment description" />
                  </div>
                  <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label className={`${labelClass} sm:col-span-2`}>Property No.</label>
                    <SearchableDropdown
                      options={equipmentCategories}
                      value={item.equipmentCategory}
                      onChange={value => setItemField(idx, 'equipmentCategory', value)}
                      placeholder="Equipment category"
                    />
                    <input type="text" value={item.propertyNumber} onChange={e => setItemField(idx, 'propertyNumber', e.target.value)} className={inputClass} placeholder="ICS-…" />
                  </div>
                  <div className="lg:col-span-2">
                    <label className={labelClass}>Destination</label>
                    <input type="text" value={item.destination || form.toDestination} readOnly className={`${inputClass} cursor-not-allowed text-slate-400`} placeholder="Auto-filled" />
                  </div>
                  <div className="lg:col-span-3">
                    <label className={labelClass}>Period Covered</label>
                    <input type="text" value={item.periodCovered || getPeriodCovered()} readOnly className={`${inputClass} cursor-not-allowed text-slate-400`} placeholder="Auto-filled from dates" />
                  </div>
                  {form.items.length > 1 && (
                    <button type="button" onClick={() => removeItem(idx)} className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded text-red-400 hover:bg-red-500/10 transition">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[#1a2744]">
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button type="button" onClick={() => setForm(emptyForm)} className="w-full sm:w-auto px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-[#1a2744] border border-transparent hover:border-[#243357] transition">
                Clear Form
              </button>
              <button type="button" onClick={handlePrint} disabled={!isFormValid} className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17H17.01M17 8H7a2 2 0 00-2 2v8a2 2 0 002 2h10a2 2 0 002-2v-8a2 2 0 00-2-2zM17 8V6a2 2 0 00-2-2H9a2 2 0 00-2 2v2" /></svg>
                Print Slip
              </button>
            </div>
            <button type="button" onClick={handleSubmit} disabled={!isFormValid} className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Submit Request
            </button>
          </div>
        </div>
      </div>

      {/* Hidden printable area */}
      <div style={{ position: 'absolute', left: -9999, top: -9999, width: 0, height: 0, overflow: 'hidden' }}>
        <div ref={printRef}>
          {renderBorrowSlip()}
        </div>
      </div>

      {showRecords && (
        <div className="bg-[#0d1421] border border-[#1a2744] rounded-2xl overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-[#1a2744]">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h2 className="text-white font-semibold text-sm">Borrow Records</h2>
            <span className="text-[10px] bg-slate-800 border border-slate-700 text-slate-400 px-2 py-0.5 rounded-full font-semibold">{filtered.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search records..." className="bg-[#0f1623] border border-[#1e2d45] rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition w-44" />
            </div>
            <select value={statusFilter} onChange={e => setStatus(e.target.value)} className="bg-[#0f1623] border border-[#1e2d45] rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500 transition cursor-pointer appearance-none">
              {['All', 'Active', 'Returned', 'Overdue'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1a2744]">
                {['Request ID', 'Borrower', 'Department', 'Item', 'Property No.', 'Start Date', 'End Date', 'Status'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold text-slate-600 uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-14 text-slate-600 text-sm">No borrow records found</td></tr>
              ) : paginated.map((record, i) => (
                <tr key={record.id} className={`border-b border-[#131f33] hover:bg-[#0f1a2e] transition-colors ${i % 2 === 0 ? '' : 'bg-[#0a1120]/40'}`}>
                  <td className="px-4 py-3 text-xs font-mono text-blue-400 whitespace-nowrap">{record.id}</td>
                  <td className="px-4 py-3 text-xs text-white font-medium whitespace-nowrap">{record.borrowerName}</td>
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{record.department}</td>
                  <td className="px-4 py-3 text-xs text-slate-300 whitespace-nowrap">{record.itemName}</td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-400 whitespace-nowrap">{record.propertyNumber}</td>
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{record.startDate}</td>
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{record.endDate}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${statusColor[record.status] || ''}`}>{record.status}</span>
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