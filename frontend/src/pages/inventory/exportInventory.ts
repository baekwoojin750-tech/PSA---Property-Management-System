/**
 * exportInventory.ts
 * Generates a polished multi-sheet .xlsx inventory report using ExcelJS.
 * Install: npm install exceljs
 *
 * Usage:
 *   import { exportInventoryXLSX } from './exportInventory'
 *   exportInventoryXLSX(rows, { periodType: 'yearly', year: 2026, statusFilter: 'all' })
 */

import ExcelJS from 'exceljs'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InventoryRow {
  propertyNumber: string
  itemName: string
  category: string
  location: string
  assetTag: string
  serialNumber: string
  unitCost: string | number
  datePurchased: string
  assetStatus: string
  borrowStatus?: string
  borrowerName?: string
  borrowerDesignation?: string
  department?: string
  borrowStart?: string
  borrowEnd?: string
  purpose?: string
  destination?: string
  borrowId?: string
}

export interface ExportOptions {
  periodType: 'all' | 'monthly' | 'yearly'
  year?: number
  month?: number
  statusFilter: 'all' | 'Serviceable' | 'Non-Serviceable' | 'Active' | 'Overdue' | 'Returned'
  dateField?: 'datePurchased' | 'borrowStart'
  organization?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

function clean(v?: string | number | null): string {
  if (v == null) return ''
  const s = String(v).trim()
  return s === '—' ? '' : s
}

function periodLabel(opts: ExportOptions): string {
  if (opts.periodType === 'yearly') return `Yearly ${opts.year ?? ''}`
  if (opts.periodType === 'monthly') return `${MONTH_NAMES[(opts.month ?? 1) - 1]} ${opts.year ?? ''}`
  return 'All Time'
}

function fileName(opts: ExportOptions): string {
  const period =
    opts.periodType === 'yearly'  ? `${opts.year}` :
    opts.periodType === 'monthly' ? `${opts.year}-${String(opts.month).padStart(2, '00')}` :
    'all-time'
  const status = opts.statusFilter === 'all'
    ? 'all-assets'
    : opts.statusFilter.toLowerCase().replace(/\s+/g, '-')
  return `inventory-${period}-${status}.xlsx`
}

// ─── Filter rows ──────────────────────────────────────────────────────────────

function filterRows(rows: InventoryRow[], opts: ExportOptions): InventoryRow[] {
  return rows.filter(row => {
    if (opts.periodType !== 'all') {
      const rawDate = (opts.dateField ?? 'datePurchased') === 'datePurchased'
        ? row.datePurchased
        : row.borrowStart
      if (!rawDate || rawDate === '—') return false
      const d = new Date(rawDate)
      if (isNaN(d.getTime())) return false
      if (opts.periodType === 'yearly' && d.getFullYear() !== opts.year) return false
      if (opts.periodType === 'monthly' &&
        (d.getFullYear() !== opts.year || d.getMonth() + 1 !== opts.month)) return false
    }
    if (opts.statusFilter !== 'all') {
      const isAssetStatus = ['Serviceable', 'Non-Serviceable'].includes(opts.statusFilter)
      if (isAssetStatus) return row.assetStatus === opts.statusFilter
      return row.borrowStatus === opts.statusFilter
    }
    return true
  })
}

// ─── Style constants ──────────────────────────────────────────────────────────

const C = {
  bannerBg:   'FF0F2140',
  bannerFg:   'FFFFFFFF',
  headerBg:   'FF1E3A5F',
  headerFg:   'FFFFFFFF',
  subHeaderBg:'FF3A6190',
  altRowBg:   'FFF0F4FA',
  whiteBg:    'FFFFFFFF',
  totalsBg:   'FFD6E4F0',
  totalsFg:   'FF0F2140',
  border:     'FFBDD0E8',
  // status badges
  serviceable:'FFD4EDDA',
  nonService: 'FFF8D7DA',
  active:     'FFCCE5FF',
  overdue:    'FFF8D7DA',
  returned:   'FFD4EDDA',
  statusText: 'FF0F2140',
}

type BorderStyle = ExcelJS.BorderStyle

function thinBorder(color = C.border): Partial<ExcelJS.Borders> {
  const side = { style: 'thin' as BorderStyle, color: { argb: color } }
  return { top: side, left: side, bottom: side, right: side }
}

function mediumBorder(color = C.headerBg): Partial<ExcelJS.Borders> {
  return {
    top:    { style: 'medium' as BorderStyle, color: { argb: color } },
    bottom: { style: 'medium' as BorderStyle, color: { argb: color } },
    left:   { style: 'thin'   as BorderStyle, color: { argb: C.border } },
    right:  { style: 'thin'   as BorderStyle, color: { argb: C.border } },
  }
}

// ─── Sheet 1: Inventory Detail ────────────────────────────────────────────────

function buildDetailSheet(ws: ExcelJS.Worksheet, rows: InventoryRow[], opts: ExportOptions) {
  const org  = opts.organization ?? 'Philippine Statistics Authority — Property Management Office'
  const now  = new Date().toLocaleString('en-PH', { dateStyle: 'long', timeStyle: 'short' })
  const COLS = 18

  ws.columns = [
    { width: 18 }, { width: 32 }, { width: 22 }, { width: 22 }, { width: 16 },
    { width: 22 }, { width: 16 }, { width: 18 }, { width: 18 }, { width: 16 },
    { width: 26 }, { width: 24 }, { width: 24 }, { width: 16 }, { width: 16 },
    { width: 28 }, { width: 22 }, { width: 18 },
  ]

  // Helper: fill a merged banner row
  const addBanner = (text: string, height: number, fontSize: number, italic = false, fgArgb = C.bannerFg) => {
    const rowNum = ws.rowCount + 1
    const row = ws.addRow([text])
    ws.mergeCells(rowNum, 1, rowNum, COLS)
    row.height = height
    const cell = row.getCell(1)
    cell.value = text
    cell.font  = { name: 'Arial', size: fontSize, bold: !italic, italic, color: { argb: fgArgb } }
    cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.bannerBg } }
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
  }

  addBanner('ASSET INVENTORY REPORT', 30, 16)
  addBanner(org, 20, 10)
  addBanner(
    `Generated: ${now}     |     Period: ${periodLabel(opts)}     |     Filter: ${opts.statusFilter === 'all' ? 'All Assets' : opts.statusFilter}`,
    16, 9, true, 'FFADC8E0',
  )

  // Spacer
  const spacer = ws.addRow([])
  spacer.height = 5

  // Headers
  const headers = [
    'Property No.', 'Item Name', 'Category', 'Location', 'Asset Tag',
    'Serial Number', 'Unit Cost (₱)', 'Date Purchased', 'Asset Status',
    'Borrow Status', 'Borrower Name', 'Department', 'Designation',
    'Borrow Start', 'Borrow End', 'Purpose', 'Destination', 'Borrow ID',
  ]
  const headerRow = ws.addRow(headers)
  headerRow.height = 24
  headerRow.eachCell({ includeEmpty: true }, (cell, c) => {
    if (c > COLS) return
    cell.font  = { name: 'Arial', size: 9, bold: true, color: { argb: C.headerFg } }
    cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.headerBg } }
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    cell.border = mediumBorder()
  })

  ws.autoFilter = { from: { row: headerRow.number, column: 1 }, to: { row: headerRow.number, column: COLS } }
  ws.views = [{ state: 'frozen', ySplit: headerRow.number, xSplit: 0 }]

  // Data rows
  rows.forEach((r, idx) => {
    const cost = r.unitCost && r.unitCost !== '—' ? Number(r.unitCost) : null
    const dataRow = ws.addRow([
      clean(r.propertyNumber), clean(r.itemName), clean(r.category),
      clean(r.location), clean(r.assetTag), clean(r.serialNumber),
      cost, clean(r.datePurchased), clean(r.assetStatus),
      clean(r.borrowStatus), clean(r.borrowerName), clean(r.department),
      clean(r.borrowerDesignation), clean(r.borrowStart), clean(r.borrowEnd),
      clean(r.purpose), clean(r.destination), clean(r.borrowId),
    ])
    dataRow.height = 18
    const isAlt = idx % 2 === 1

    dataRow.eachCell({ includeEmpty: true }, (cell, c) => {
      if (c > COLS) return
      cell.font   = { name: 'Arial', size: 9 }
      cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: isAlt ? C.altRowBg : C.whiteBg } }
      cell.alignment = { vertical: 'middle' }
      cell.border = thinBorder()

      if (c === 7 && cell.value !== null && cell.value !== '') {
        cell.numFmt = '₱#,##0.00'
        cell.alignment = { vertical: 'middle', horizontal: 'right' }
      }
      if (c === 9) {
        const v = String(cell.value ?? '')
        const bg = v === 'Serviceable' ? C.serviceable : v === 'Non-Serviceable' ? C.nonService : (isAlt ? C.altRowBg : C.whiteBg)
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
        cell.font = { name: 'Arial', size: 9, bold: !!v, color: { argb: C.statusText } }
        cell.alignment = { vertical: 'middle', horizontal: 'center' }
      }
      if (c === 10) {
        const v = String(cell.value ?? '')
        const bg = v === 'Active' ? C.active : v === 'Overdue' ? C.overdue : v === 'Returned' ? C.returned : (isAlt ? C.altRowBg : C.whiteBg)
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
        cell.font = { name: 'Arial', size: 9, bold: !!v, color: { argb: C.statusText } }
        cell.alignment = { vertical: 'middle', horizontal: 'center' }
      }
    })
  })

  ws.addRow([]).height = 5

  // Totals row
  const activeCount   = rows.filter(r => r.borrowStatus === 'Active').length
  const overdueCount  = rows.filter(r => r.borrowStatus === 'Overdue').length
  const returnedCount = rows.filter(r => r.borrowStatus === 'Returned').length
  const totalCost     = rows.reduce((s, r) => s + (r.unitCost && r.unitCost !== '—' ? Number(r.unitCost) : 0), 0)

  const totalsRow = ws.addRow([
    'TOTAL ASSETS', '', '', '', '', '',
    totalCost,
    '',
    `${rows.length} asset${rows.length !== 1 ? 's' : ''}`,
    '',
    `${activeCount} Active`,
    `${overdueCount} Overdue`,
    `${returnedCount} Returned`,
    '', '', '', '', '',
  ])
  totalsRow.height = 22
  totalsRow.eachCell({ includeEmpty: true }, (cell, c) => {
    if (c > COLS) return
    cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.totalsBg } }
    cell.font   = { name: 'Arial', size: 9, bold: true, color: { argb: C.totalsFg } }
    cell.alignment = { vertical: 'middle' }
    cell.border = mediumBorder()
    if (c === 7) { cell.numFmt = '₱#,##0.00'; cell.alignment = { vertical: 'middle', horizontal: 'right' } }
  })
}

// ─── Sheet 2: Summary ─────────────────────────────────────────────────────────

function buildSummarySheet(ws: ExcelJS.Worksheet, rows: InventoryRow[], opts: ExportOptions) {
  const now = new Date().toLocaleDateString('en-PH', { dateStyle: 'long' })

  ws.columns = [{ width: 30 }, { width: 14 }, { width: 20 }, { width: 14 }]

  const catMap = new Map<string, { count: number; value: number }>()
  for (const r of rows) {
    const cat = clean(r.category) || 'Uncategorized'
    const val = r.unitCost && r.unitCost !== '—' ? Number(r.unitCost) : 0
    const e = catMap.get(cat) ?? { count: 0, value: 0 }
    catMap.set(cat, { count: e.count + 1, value: e.value + val })
  }

  const totalVal       = rows.reduce((s, r) => s + (r.unitCost && r.unitCost !== '—' ? Number(r.unitCost) : 0), 0)
  const active         = rows.filter(r => r.borrowStatus === 'Active').length
  const overdue        = rows.filter(r => r.borrowStatus === 'Overdue').length
  const returned       = rows.filter(r => r.borrowStatus === 'Returned').length
  const serviceable    = rows.filter(r => r.assetStatus === 'Serviceable').length
  const nonServiceable = rows.filter(r => r.assetStatus === 'Non-Serviceable').length

  const mergeBannerRow = (rowNum: number) => ws.mergeCells(rowNum, 1, rowNum, 4)

  // Title
  const titleRow = ws.addRow(['INVENTORY SUMMARY REPORT', '', '', ''])
  mergeBannerRow(titleRow.number)
  titleRow.height = 28
  const tc = titleRow.getCell(1)
  tc.value = 'INVENTORY SUMMARY REPORT'
  tc.font  = { name: 'Arial', size: 14, bold: true, color: { argb: C.bannerFg } }
  tc.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.bannerBg } }
  tc.alignment = { vertical: 'middle', horizontal: 'center' }

  const metaRow = ws.addRow([`Report Period: ${periodLabel(opts)}  |  Generated: ${now}  |  Filter: ${opts.statusFilter === 'all' ? 'All Assets' : opts.statusFilter}`, '', '', ''])
  mergeBannerRow(metaRow.number)
  metaRow.height = 18
  const mc = metaRow.getCell(1)
  mc.value = metaRow.getCell(1).value
  mc.font  = { name: 'Arial', size: 9, italic: true, color: { argb: 'FFADC8E0' } }
  mc.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.bannerBg } }
  mc.alignment = { vertical: 'middle', horizontal: 'center' }

  ws.addRow([]).height = 8

  const addSection = (title: string) => {
    const row = ws.addRow([title, '', '', ''])
    mergeBannerRow(row.number)
    row.height = 22
    const cell = row.getCell(1)
    cell.value = title
    cell.font  = { name: 'Arial', size: 10, bold: true, color: { argb: C.headerFg } }
    cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.headerBg } }
    cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  }

  const addColHeader = (labels: string[]) => {
    const row = ws.addRow(labels)
    row.height = 18
    row.eachCell({ includeEmpty: true }, (cell, c) => {
      if (c > 4) return
      cell.font  = { name: 'Arial', size: 9, bold: true, color: { argb: C.headerFg } }
      cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.subHeaderBg } }
      cell.alignment = { vertical: 'middle', horizontal: c === 1 ? 'left' : 'center' }
      cell.border = thinBorder()
    })
  }

  const addData = (vals: (string | number)[], alt: boolean) => {
    const row = ws.addRow(vals)
    row.height = 18
    row.eachCell({ includeEmpty: true }, (cell, c) => {
      if (c > 4) return
      cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: alt ? C.altRowBg : C.whiteBg } }
      cell.font  = { name: 'Arial', size: 9 }
      cell.alignment = { vertical: 'middle', horizontal: c === 1 ? 'left' : 'center' }
      cell.border = thinBorder()
      if (c === 3 && typeof cell.value === 'number') {
        cell.numFmt = '₱#,##0.00'
        cell.alignment = { vertical: 'middle', horizontal: 'right' }
      }
    })
  }

  const addTotalRow = (vals: (string | number)[]) => {
    const row = ws.addRow(vals)
    row.height = 20
    row.eachCell({ includeEmpty: true }, (cell, c) => {
      if (c > 4) return
      cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.totalsBg } }
      cell.font   = { name: 'Arial', size: 9, bold: true, color: { argb: C.totalsFg } }
      cell.alignment = { vertical: 'middle', horizontal: c === 1 ? 'left' : 'center' }
      cell.border = mediumBorder()
      if (c === 3 && typeof cell.value === 'number') {
        cell.numFmt = '₱#,##0.00'
        cell.alignment = { vertical: 'middle', horizontal: 'right' }
      }
    })
  }

  // Category breakdown
  addSection('ASSETS BY CATEGORY')
  addColHeader(['Category', 'Count', 'Total Value (₱)', '% of Total'])
  let i = 0
  for (const [cat, { count, value }] of catMap) {
    addData([cat, count, value, totalVal > 0 ? `${((value / totalVal) * 100).toFixed(1)}%` : '0.0%'], i++ % 2 === 1)
  }
  addTotalRow(['TOTAL', rows.length, totalVal, '100.0%'])

  ws.addRow([]).height = 8

  // Asset status
  addSection('ASSET STATUS BREAKDOWN')
  addColHeader(['Status', 'Count', '', ''])
  addData(['Serviceable',     serviceable,    '', ''], false)
  addData(['Non-Serviceable', nonServiceable, '', ''], true)

  ws.addRow([]).height = 8

  // Borrow activity
  addSection('BORROW ACTIVITY')
  addColHeader(['Status', 'Count', '', ''])
  addData(['Active',   active,   '', ''], false)
  addData(['Overdue',  overdue,  '', ''], true)
  addData(['Returned', returned, '', ''], false)
}

// ─── Main export function ─────────────────────────────────────────────────────

export async function exportInventoryXLSX(allRows: InventoryRow[], opts: ExportOptions): Promise<void> {
  const filtered = filterRows(allRows, opts)

  const wb = new ExcelJS.Workbook()
  wb.creator  = 'PSA Inventory System'
  wb.created  = new Date()
  wb.modified = new Date()

  const detailWs = wb.addWorksheet('Inventory Report', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
    properties: { tabColor: { argb: C.headerBg } },
  })
  const summaryWs = wb.addWorksheet('Summary', {
    pageSetup: { paperSize: 9, orientation: 'portrait' },
    properties: { tabColor: { argb: 'FF3A6190' } },
  })

  buildDetailSheet(detailWs, filtered, opts)
  buildSummarySheet(summaryWs, filtered, opts)

  const buffer = await wb.xlsx.writeBuffer()
  const blob   = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = fileName(opts)
  a.click()
  URL.revokeObjectURL(url)
}