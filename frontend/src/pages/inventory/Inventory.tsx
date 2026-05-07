import { useState, useEffect, useRef, Fragment } from 'react'
import { statusColor as assetStatusColor, locations, defaultEquipmentCategories } from '../assets/assetTypes'
import type { Asset } from '../assets/assetTypes'
import type { BorrowRecord } from '../borrow/BorrowTab'
import { getAllAssets, getAllBorrowRequests } from '../../services/authService'
import { exportInventoryXLSX } from './exportInventory'

// ─── Merged record for the unified table ─────────────────────────────────────
interface InventoryRow {
  propertyNumber: string
  itemName: string
  category: string
  location: string
  assetTag: string
  serialNumber: string
  unitCost: string
  datePurchased: string
  assetStatus: string          // Serviceable / Non-Serviceable / Borrowed
  borrowStatus?: string        // Active / Returned / Overdue
  borrowerName?: string
  borrowerDesignation?: string
  department?: string
  borrowStart?: string
  borrowEnd?: string
  purpose?: string
  destination?: string
  borrowId?: string
}

// ─── Colour helpers ───────────────────────────────────────────────────────────
const borrowStatusColor: Record<string, string> = {
  Active:   'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  Returned: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  Overdue:  'bg-red-500/10 text-red-400 border border-red-500/20',
}

// ─── Merge assets + borrow records ───────────────────────────────────────────
function buildInventory(assets: Asset[], borrows: BorrowRecord[]): InventoryRow[] {
  // Index latest borrow record per property number
  const borrowMap = new Map<string, BorrowRecord>()
  for (const b of borrows) {
    const existing = borrowMap.get(b.propertyNumber)
    if (!existing || b.startDate > existing.startDate) borrowMap.set(b.propertyNumber, b)
  }

  // Assets that have a borrow record
  const rows: InventoryRow[] = assets.map(a => {
    const b = borrowMap.get(a.propertyNumber)
    return {
      propertyNumber: a.propertyNumber,
      itemName: a.itemName,
      category: a.equipmentCategory,
      location: a.location,
      assetTag: a.assetTag,
      serialNumber: a.serialNumber,
      unitCost: a.unitCost,
      datePurchased: a.datePurchased,
      assetStatus: a.status,
      borrowStatus: b?.status,
      borrowerName: b?.borrowerName,
      borrowerDesignation: b?.borrowerDesignation,
      department: b?.department,
      borrowStart: b?.startDate,
      borrowEnd: b?.endDate,
      purpose: b?.purpose,
      destination: b?.destination,
      borrowId: b?.id,
    }
  })

  // Borrow records that don't match any registered asset (orphaned)
  for (const b of borrows) {
    if (!assets.find(a => a.propertyNumber === b.propertyNumber)) {
      rows.push({
        propertyNumber: b.propertyNumber,
        itemName: b.itemName,
        category: '—',
        location: b.destination || '—',
        assetTag: '—',
        serialNumber: '—',
        unitCost: '—',
        datePurchased: '—',
        assetStatus: '—',
        borrowStatus: b.status,
        borrowerName: b.borrowerName,
        borrowerDesignation: b.borrowerDesignation,
        department: b.department,
        borrowStart: b.startDate,
        borrowEnd: b.endDate,
        purpose: b.purpose,
        destination: b.destination,
        borrowId: b.id,
      })
    }
  }

  return rows
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color, icon }: {
  label: string; value: number | string; sub?: string
  color: string; icon: React.ReactNode
}) {
  return (
    <div className="bg-[#0d1421] border border-[#1a2744] rounded-2xl p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-white leading-none mb-1">{value}</p>
        <p className="text-xs font-semibold text-slate-400">{label}</p>
        {sub && <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Mini bar chart ───────────────────────────────────────────────────────────
function BarChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="space-y-2">
      {data.map(d => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="text-[10px] text-slate-500 w-32 truncate shrink-0">{d.label}</span>
          <div className="flex-1 bg-[#0a1120] rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${d.color}`}
              style={{ width: `${(d.value / max) * 100}%` }}
            />
          </div>
          <span className="text-[10px] font-semibold text-slate-400 w-5 text-right">{d.value}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Inventory() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [borrows, setBorrows] = useState<BorrowRecord[]>([])
  const [loading, setLoading] = useState(true)
  
  const [activeTab, setActiveTab] = useState<'all' | 'borrowed' | 'overdue' | 'returned'>('all')
  const [search, setSearch] = useState('')
  const [locationFilter, setLocationFilter] = useState('All')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [assetStatusFilter, setAssetStatusFilter] = useState('All')
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const PER_PAGE = 15

  // ── Export CSV state ──
  const [showExportPanel, setShowExportPanel] = useState(false)
  const [exportPeriodType, setExportPeriodType] = useState<'all' | 'monthly' | 'yearly'>('yearly')
  const [exportYear, setExportYear] = useState(new Date().getFullYear())
  const [exportMonth, setExportMonth] = useState(new Date().getMonth() + 1)
  const [exportStatusFilter, setExportStatusFilter] = useState<'all' | 'Serviceable' | 'Non-Serviceable' | 'Active' | 'Overdue' | 'Returned'>('all')
  const [exportDateField, setExportDateField] = useState<'datePurchased' | 'borrowStart'>('datePurchased')
  const [exportPanelPos, setExportPanelPos] = useState({ top: 0, right: 0 })
  const exportBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [assetsData, borrowsData] = await Promise.all([
          getAllAssets(),
          getAllBorrowRequests(),
        ])
        
        // Transform assets
        const transformedAssets: Asset[] = assetsData.map((asset: any) => ({
          id: asset.id.toString(),
          equipmentCategory: asset.equipment_category || '',
          location: asset.location || '',
          assetTag: asset.asset_tag || '',
          unitCost: asset.unit_cost || '',
          datePurchased: asset.date_purchased || '',
          propertyNumber: asset.property_number || '',
          serialNumber: asset.serial_number || '',
          unit: 'Unit',
          itemName: asset.item_name || '',
          itemDescription: '',
          status: asset.status || 'Serviceable',
        }))
        
        // Transform borrows
        const transformedBorrows: BorrowRecord[] = borrowsData.map((record: any) => ({
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
            propertyNumber: record.property_number,
            purpose: record.purpose || '',
            dateTimeBorrowed: record.start_date,
            duration: '',
          }],
        }))
        
        setAssets(transformedAssets)
        setBorrows(transformedBorrows)
      } catch (err) {
        console.error('Failed to fetch inventory data:', err)
        setAssets([])
        setBorrows([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const allRows = buildInventory(assets, borrows)

  // ── Stats ──
  const totalAssets      = assets.length
  const serviceable      = assets.filter(a => a.status === 'Serviceable').length
  const nonServiceable   = assets.filter(a => a.status === 'Non-Serviceable').length
  const borrowed         = borrows.filter(b => b.status === 'Active').length
  const overdue          = borrows.filter(b => b.status === 'Overdue').length
  const returned         = borrows.filter(b => b.status === 'Returned').length
  const totalBorrows     = borrows.length

  // ── Category distribution ──
  const catCounts = defaultEquipmentCategories.map(cat => ({
    label: cat,
    value: assets.filter(a => a.equipmentCategory === cat).length,
    color: 'bg-blue-500',
  })).filter(d => d.value > 0).sort((a, b) => b.value - a.value)

  // ── Location distribution ──
  const locCounts = locations.map(loc => ({
    label: loc,
    value: assets.filter(a => a.location === loc).length,
    color: 'bg-violet-500',
  })).filter(d => d.value > 0).sort((a, b) => b.value - a.value)

  // ── Tab filter ──
  const tabFiltered = allRows.filter(r => {
    if (activeTab === 'borrowed') return r.borrowStatus === 'Active'
    if (activeTab === 'overdue')  return r.borrowStatus === 'Overdue'
    if (activeTab === 'returned') return r.borrowStatus === 'Returned'
    return true
  })

  // ── Search + column filters ──
  const filtered = tabFiltered.filter(r => {
    const matchSearch = [r.propertyNumber, r.itemName, r.serialNumber, r.borrowerName, r.borrowId, r.assetTag]
      .some(v => (v || '').toLowerCase().includes(search.toLowerCase()))
    const matchLoc      = locationFilter === 'All'        || r.location === locationFilter
    const matchCat      = categoryFilter === 'All'        || r.category === categoryFilter
    const matchStatus   = assetStatusFilter === 'All'     || r.assetStatus === assetStatusFilter
    return matchSearch && matchLoc && matchCat && matchStatus
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  useEffect(() => { setPage(1) }, [search, locationFilter, categoryFilter, assetStatusFilter, activeTab])

  // ── Export modal: Escape key + scroll lock ──
  useEffect(() => {
    if (!showExportPanel) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowExportPanel(false) }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [showExportPanel])

  const tabs = [
    { key: 'all',      label: 'All Assets',     count: allRows.length },
    { key: 'borrowed', label: 'Active Borrows',  count: borrowed },
    { key: 'overdue',  label: 'Overdue',         count: overdue },
    { key: 'returned', label: 'Returned',        count: returned },
  ] as const

  // ── Export XLSX logic ──
  const handleExportCSV = async () => {
    await exportInventoryXLSX(allRows, {
      periodType: exportPeriodType,
      year: exportYear,
      month: exportMonth,
      statusFilter: exportStatusFilter,
      dateField: exportDateField,
      organization: 'Philippine Statistics Authority — Property Management Office',
    })
    setShowExportPanel(false)
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 pt-28 pb-10">
        <div className="text-center text-slate-400">Loading inventory data...</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 pt-28 pb-10 space-y-6">

      {/* ── Page Header ── */}
      <div className="pt-2">
        <h1 className="text-2xl font-bold text-white">Inventory</h1>
        <p className="text-slate-400 text-sm mt-0.5">
          Centralized view of all registered assets, borrow activity, and return history
        </p>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          label="Total Assets"
          value={totalAssets}
          sub="registered"
          color="bg-blue-500/15 border border-blue-500/20"
          icon={<svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}
        />
        <StatCard
          label="Serviceable"
          value={serviceable}
          color="bg-emerald-500/15 border border-emerald-500/20"
          icon={<svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          label="Non-Serviceable"
          value={nonServiceable}
          color="bg-red-500/15 border border-red-500/20"
          icon={<svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
        />
        <StatCard
          label="Active Borrows"
          value={borrowed}
          color="bg-amber-500/15 border border-amber-500/20"
          icon={<svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>}
        />
        <StatCard
          label="Overdue"
          value={overdue}
          color="bg-rose-500/15 border border-rose-500/20"
          icon={<svg className="w-5 h-5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          label="Returned"
          value={returned}
          sub={`of ${totalBorrows} requests`}
          color="bg-violet-500/15 border border-violet-500/20"
          icon={<svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>}
        />
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#0d1421] border border-[#1a2744] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-5 h-5 bg-blue-500/20 rounded-md flex items-center justify-center">
              <svg className="w-3 h-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </div>
            <h3 className="text-white font-semibold text-sm">Assets by Category</h3>
          </div>
          <BarChart data={catCounts} />
        </div>
        <div className="bg-[#0d1421] border border-[#1a2744] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-5 h-5 bg-violet-500/20 rounded-md flex items-center justify-center">
              <svg className="w-3 h-3 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
            <h3 className="text-white font-semibold text-sm">Assets by Location</h3>
          </div>
          <BarChart data={locCounts} />
        </div>
      </div>

      {/* ── Borrow Activity Summary ── */}
      <div className="bg-[#0d1421] border border-[#1a2744] rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 bg-amber-500/20 rounded-md flex items-center justify-center">
            <svg className="w-3 h-3 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
          </div>
          <h3 className="text-white font-semibold text-sm">Borrow Activity</h3>
          <span className="text-[10px] bg-slate-800 border border-slate-700 text-slate-400 px-2 py-0.5 rounded-full">{totalBorrows} total</span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Active', count: borrowed, pct: Math.round((borrowed / totalBorrows) * 100) || 0, bar: 'bg-blue-500', text: 'text-blue-400' },
            { label: 'Overdue', count: overdue, pct: Math.round((overdue / totalBorrows) * 100) || 0, bar: 'bg-red-500', text: 'text-red-400' },
            { label: 'Returned', count: returned, pct: Math.round((returned / totalBorrows) * 100) || 0, bar: 'bg-emerald-500', text: 'text-emerald-400' },
          ].map(s => (
            <div key={s.label} className="bg-[#0a1120] border border-[#131f33] rounded-xl p-4">
              <div className="flex items-end justify-between mb-2">
                <span className="text-xs text-slate-500 font-medium">{s.label}</span>
                <span className={`text-xl font-bold ${s.text}`}>{s.count}</span>
              </div>
              <div className="w-full bg-[#0f1623] rounded-full h-1.5 overflow-hidden">
                <div className={`h-full rounded-full ${s.bar}`} style={{ width: `${s.pct}%` }} />
              </div>
              <p className="text-[10px] text-slate-600 mt-1">{s.pct}% of all requests</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Unified Inventory Table ── */}
      <div className="bg-[#0d1421] border border-[#1a2744] rounded-2xl overflow-hidden">

        {/* Table header */}
        <div className="px-6 py-4 border-b border-[#1a2744] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              <h2 className="text-white font-semibold text-sm">Inventory Master List</h2>
              <span className="text-[10px] bg-slate-800 border border-slate-700 text-slate-400 px-2 py-0.5 rounded-full font-semibold">{filtered.length}</span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Search */}
              <div className="relative flex-1 sm:w-64">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search property no., item, borrower..."
                  className="w-full bg-[#0f1623] border border-[#1e2d45] rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              {/* Export Button */}
              <div className="relative">
                <button
                  ref={exportBtnRef}
                  onClick={() => {
                    if (exportBtnRef.current) {
                      const r = exportBtnRef.current.getBoundingClientRect()
                      setExportPanelPos({ top: r.bottom + 8, right: window.innerWidth - r.right })
                    }
                    setShowExportPanel(p => !p)
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition whitespace-nowrap"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export XLSX
                </button>

                {/* Export Modal */}
                {showExportPanel && (
                  <div
                    className="fixed inset-0 z-50 flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}
                    onClick={e => { if (e.target === e.currentTarget) setShowExportPanel(false) }}
                  >
                    <div className="w-full max-w-sm mx-4 bg-[#0d1421] border border-[#1a2744] rounded-2xl shadow-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-white text-sm font-semibold">Export Options</span>
                      <button onClick={() => setShowExportPanel(false)} className="text-slate-600 hover:text-slate-400 transition">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>

                    {/* Period Type */}
                    <div>
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Time Period</p>
                      <div className="flex gap-1">
                        {(['all', 'monthly', 'yearly'] as const).map(t => (
                          <button
                            key={t}
                            onClick={() => setExportPeriodType(t)}
                            className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition capitalize ${
                              exportPeriodType === t
                                ? 'bg-blue-600 text-white'
                                : 'bg-[#0f1623] border border-[#1e2d45] text-slate-500 hover:text-white'
                            }`}
                          >
                            {t === 'all' ? 'All Time' : t.charAt(0).toUpperCase() + t.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Year picker — shown for both monthly and yearly */}
                    {exportPeriodType !== 'all' && (
                      <div>
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Year</p>
                        <select
                          value={exportYear}
                          onChange={e => setExportYear(Number(e.target.value))}
                          className="w-full bg-[#0f1623] border border-[#1e2d45] rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
                        >
                          {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(y => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Month picker — only for monthly */}
                    {exportPeriodType === 'monthly' && (
                      <div>
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Month</p>
                        <select
                          value={exportMonth}
                          onChange={e => setExportMonth(Number(e.target.value))}
                          className="w-full bg-[#0f1623] border border-[#1e2d45] rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
                        >
                          {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
                            <option key={m} value={i + 1}>{m}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Date field to filter on */}
                    {exportPeriodType !== 'all' && (
                      <div>
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Filter By Date</p>
                        <div className="flex gap-1">
                          {([
                            { value: 'datePurchased', label: 'Date Purchased' },
                            { value: 'borrowStart',   label: 'Borrow Start' },
                          ] as const).map(opt => (
                            <button
                              key={opt.value}
                              onClick={() => setExportDateField(opt.value)}
                              className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition ${
                                exportDateField === opt.value
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-[#0f1623] border border-[#1e2d45] text-slate-500 hover:text-white'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Asset / Borrow Status */}
                    <div>
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Asset / Borrow Status</p>
                      <select
                        value={exportStatusFilter}
                        onChange={e => setExportStatusFilter(e.target.value as any)}
                        className="w-full bg-[#0f1623] border border-[#1e2d45] rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        <option value="all">All Assets</option>
                        <option value="Serviceable">Serviceable</option>
                        <option value="Non-Serviceable">Non-Serviceable</option>
                        <option value="Active">Active Borrows</option>
                        <option value="Overdue">Overdue</option>
                        <option value="Returned">Returned</option>
                      </select>
                    </div>

                    {/* Preview count */}
                    <p className="text-[10px] text-slate-600 text-center">
                      {(() => {
                        const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December']
                        const count = allRows.filter(row => {
                          if (exportPeriodType !== 'all') {
                            const rawDate = exportDateField === 'datePurchased' ? row.datePurchased : row.borrowStart
                            if (!rawDate || rawDate === '—') return false
                            const d = new Date(rawDate)
                            if (isNaN(d.getTime())) return false
                            if (exportPeriodType === 'yearly' && d.getFullYear() !== exportYear) return false
                            if (exportPeriodType === 'monthly' && (d.getFullYear() !== exportYear || d.getMonth() + 1 !== exportMonth)) return false
                          }
                          if (exportStatusFilter !== 'all') {
                            const assetStatuses = ['Serviceable', 'Non-Serviceable']
                            if (assetStatuses.includes(exportStatusFilter)) return row.assetStatus === exportStatusFilter
                            return row.borrowStatus === exportStatusFilter
                          }
                          return true
                        }).length
                        return `${count} row${count !== 1 ? 's' : ''} will be exported`
                      })()}
                    </p>

                    <button
                      onClick={handleExportCSV}
                      className="w-full py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center justify-center gap-2"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download XLSX
                    </button>
                  </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tabs + Filters row */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Tabs */}
            <div className="flex gap-1 bg-slate-900/60 rounded-xl p-1 w-fit">
              {tabs.map(t => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeTab === t.key
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-500 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {t.label}
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                    activeTab === t.key ? 'bg-white/20' : 'bg-slate-800 text-slate-500'
                  }`}>{t.count}</span>
                </button>
              ))}
            </div>

            {/* Column filters */}
            <div className="flex gap-2 flex-wrap sm:ml-auto">
              <select
                value={locationFilter}
                onChange={e => setLocationFilter(e.target.value)}
                className="bg-[#0f1623] border border-[#1e2d45] rounded-lg px-2.5 py-1.5 text-xs text-slate-400 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="All">All Locations</option>
                {locations.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="bg-[#0f1623] border border-[#1e2d45] rounded-lg px-2.5 py-1.5 text-xs text-slate-400 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="All">All Categories</option>
                {defaultEquipmentCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select
                value={assetStatusFilter}
                onChange={e => setAssetStatusFilter(e.target.value)}
                className="bg-[#0f1623] border border-[#1e2d45] rounded-lg px-2.5 py-1.5 text-xs text-slate-400 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="All">All Asset Status</option>
                {['Serviceable', 'Non-Serviceable', 'Borrowed'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1a2744]">
                {['', 'Property No.', 'Item Name', 'Category', 'Location', 'Asset Status', 'Borrow Status', 'Borrower', 'Borrow Period', 'Unit Cost'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold text-slate-600 uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-16 text-slate-600 text-sm">
                    No records match the current filters
                  </td>
                </tr>
              ) : paginated.map((row, i) => (
                <Fragment key={row.propertyNumber + i}>
                  <tr
                    onClick={() => setExpandedRow(expandedRow === row.propertyNumber + i ? null : row.propertyNumber + i)}
                    className={`border-b border-[#131f33] transition-colors cursor-pointer
                      ${expandedRow === row.propertyNumber + i ? 'bg-[#0f1a2e]' : i % 2 === 0 ? 'hover:bg-[#0f1a2e]' : 'bg-[#0a1120]/40 hover:bg-[#0f1a2e]'}
                    `}
                  >
                    {/* Expand chevron */}
                    <td className="px-3 py-3 w-8">
                      <svg
                        className={`w-3 h-3 text-slate-600 transition-transform duration-200 ${expandedRow === row.propertyNumber + i ? 'rotate-90' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-blue-400 whitespace-nowrap">{row.propertyNumber}</td>
                    <td className="px-4 py-3 text-xs text-white font-medium whitespace-nowrap">{row.itemName}</td>
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{row.category}</td>
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{row.location}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {row.assetStatus !== '—'
                        ? <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${assetStatusColor[row.assetStatus] || 'text-slate-500'}`}>{row.assetStatus}</span>
                        : <span className="text-slate-600 text-xs">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {row.borrowStatus
                        ? <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${borrowStatusColor[row.borrowStatus] || ''}`}>{row.borrowStatus}</span>
                        : <span className="text-slate-700 text-[10px]">None</span>
                      }
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {row.borrowerName
                        ? (
                          <div>
                            <p className="text-xs text-white font-medium">{row.borrowerName}</p>
                            {row.department && <p className="text-[10px] text-slate-600">{row.department}</p>}
                          </div>
                        )
                        : <span className="text-slate-700 text-[10px]">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {row.borrowStart
                        ? <span className="text-[10px] text-slate-400 font-mono">{row.borrowStart} → {row.borrowEnd}</span>
                        : <span className="text-slate-700 text-[10px]">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-300 whitespace-nowrap">
                      {row.unitCost !== '—' ? `₱${row.unitCost}` : '—'}
                    </td>
                  </tr>

                  {/* Expanded detail row */}
                  {expandedRow === row.propertyNumber + i && (
                    <tr key={`${row.propertyNumber + i}-detail`} className="bg-[#091018] border-b border-[#131f33]">
                      <td colSpan={10} className="px-6 py-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-3 text-xs">
                          <div>
                            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-0.5">Serial Number</p>
                            <p className="text-slate-300 font-mono">{row.serialNumber || '—'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-0.5">Asset Tag</p>
                            <p className="text-slate-300">{row.assetTag || '—'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-0.5">Date Purchased</p>
                            <p className="text-slate-300">{row.datePurchased || '—'}</p>
                          </div>
                          {row.borrowId && (
                            <>
                              <div>
                                <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-0.5">Borrow Request ID</p>
                                <p className="text-blue-400 font-mono">{row.borrowId}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-0.5">Borrower Designation</p>
                                <p className="text-slate-300">{row.borrowerDesignation || '—'}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-0.5">Destination</p>
                                <p className="text-slate-300">{row.destination || '—'}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-0.5">Purpose</p>
                                <p className="text-slate-300">{row.purpose || '—'}</p>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
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
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[#1e2d45] text-slate-400 hover:bg-[#1a2744] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Back
            </button>
            <span className="text-slate-500 text-xs px-1">Page {page} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[#1e2d45] text-slate-400 hover:bg-[#1a2744] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition flex items-center gap-1.5"
            >
              Next
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
      </div>

    </div>
  )
}