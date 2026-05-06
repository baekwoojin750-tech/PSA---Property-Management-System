import { useState, useEffect, useRef } from 'react'
import { getAllAssets, getAllBorrowRequests } from '../../services/authService'

const icons = {
  building: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 21h18M3 10h18M3 7l9-4 9 4M4 10h1v11H4zm15 0h1v11h-1zM9 10h1v4H9zm5 0h1v4h-1zM9 18h6" />
    </svg>
  ),
  search: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
}

const LOCATIONS = ['SOC', 'CRASS', 'OCSS', 'NATIONAL ID', 'CSR OUTLET', 'SATELLITE OFFICE']

export default function Dashboard() {
  const [assets, setAssets] = useState<any[]>([])
  const [borrows, setBorrows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [officeFilter, setOfficeFilter] = useState('All Office')
  const [categoryFilter, setCategoryFilter] = useState('All Category')
  const [statusFilter, setStatusFilter] = useState('All Status')

  const leftColRef = useRef<HTMLDivElement>(null)
  const statCardsRef = useRef<HTMLDivElement>(null)
  const [tableHeight, setTableHeight] = useState<number | null>(null)

  useEffect(() => {
    const measure = () => {
      if (leftColRef.current && statCardsRef.current) {
        const leftH = leftColRef.current.offsetHeight
        const statH = statCardsRef.current.offsetHeight
        const gap = 16 // gap-4 = 1rem = 16px
        setTableHeight(leftH - statH - gap)
      }
    }
    // measure after paint so DOM is fully laid out
    const raf = requestAnimationFrame(measure)
    window.addEventListener('resize', measure)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', measure)
    }
  }, [assets])

  useEffect(() => {
    const fetchData = async (showLoading = true) => {
      try {
        if (showLoading) setLoading(true)
        const [assetsData, borrowsData] = await Promise.all([
          getAllAssets(),
          getAllBorrowRequests(),
        ])
        setAssets(assetsData)
        setBorrows(borrowsData)
        setError(null)
      } catch (err: any) {
        console.error('Failed to fetch data:', err)
        setError(err.message || 'Failed to load dashboard data')
      } finally {
        if (showLoading) setLoading(false)
      }
    }
    fetchData(true)
    // Auto-refresh every 30 seconds to keep status up to date
    const interval = setInterval(() => fetchData(false), 30000)
    return () => clearInterval(interval)
  }, [])

  const totalAssets = assets.length
  const serviceableAssets = assets.filter(a => a.status === 'Serviceable').length
  const borrowedAssets = assets.filter(a => a.status === 'Borrowed').length
  const nonServiceableAssets = assets.filter(a => a.status === 'Non-Serviceable').length
  const overdueCount = borrows.filter(b => b.status === 'Overdue').length

  const statCards = [
    { label: 'TOTAL ASSETS', value: totalAssets.toLocaleString(), subtitle: 'All registered units', valueColor: 'text-blue-400' },
    { label: 'SERVICEABLE', value: serviceableAssets.toLocaleString(), subtitle: 'Available for use', valueColor: 'text-emerald-400' },
    { label: 'BORROWED', value: borrowedAssets.toLocaleString(), subtitle: `${overdueCount} overdue`, valueColor: 'text-amber-400' },
    { label: 'NON-SERVICEABLE', value: nonServiceableAssets.toLocaleString(), subtitle: 'Awaiting repair/disposal', valueColor: 'text-red-400' },
  ]

  const officeCards = LOCATIONS.map(location => {
    const loc = assets.filter(a => a.location === location)
    const total = loc.length
    const serviceable = loc.filter(a => a.status === 'Serviceable').length
    const borrowed = loc.filter(a => a.status === 'Borrowed').length
    return { label: location, total, serviceable, borrowed }
  })

  const offices = ['All Office', ...LOCATIONS]
  const categories = ['All Category', ...new Set(assets.map(a => a.equipment_category))]
  const statuses = ['All Status', 'Serviceable', 'Non-Serviceable', 'Borrowed']

  const statusBadge: Record<string, string> = {
    Serviceable: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    'Non-Serviceable': 'bg-red-500/10 text-red-400 border border-red-500/20',
    Borrowed: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  }

  const filtered = assets.filter((a) => {
    const matchSearch =
      a.item_name.toLowerCase().includes(search.toLowerCase()) ||
      a.property_number.toLowerCase().includes(search.toLowerCase())
    const matchOffice = officeFilter === 'All Office' || a.location === officeFilter
    const matchCategory = categoryFilter === 'All Category' || a.equipment_category === categoryFilter
    const matchStatus = statusFilter === 'All Status' || a.status === statusFilter
    return matchSearch && matchOffice && matchCategory && matchStatus
  })

  if (loading) {
    return (
      <div className="w-full px-6 py-10 text-center text-slate-400 text-sm">
        Loading dashboard...
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full px-6 py-10 text-center text-red-400 text-sm">
        Error: {error}
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 pt-28 pb-10 flex flex-col gap-6">

      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-0.5">PSA Property Management Overview</p>
      </div>

      {/* Main Layout */}
      <div className="flex flex-col xl:flex-row gap-6">

        {/* LEFT — Office Cards */}
        <div className="w-full xl:w-64 xl:shrink-0">
          {/* Mobile/Tablet: horizontal scroll */}
          <div className="flex xl:hidden gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory">
            {officeCards.map((office) => (
              <div
                key={office.label}
                className="bg-slate-900 border border-slate-700 rounded-2xl px-5 py-4 hover:border-slate-500 transition-all shrink-0 w-48 snap-start"
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-blue-400 shrink-0">
                    {icons.building}
                  </div>
                  <span className="text-white font-semibold text-sm truncate">{office.label}</span>
                </div>
                <p className="text-slate-500 text-xs mb-3">{office.total} total assets</p>
                <div className="space-y-2">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-500 text-xs">Serviceable</span>
                      <span className="text-emerald-400 text-xs font-medium">{office.serviceable}</span>
                    </div>
                    <div className="bg-slate-800 rounded-full h-1.5">
                      <div
                        className="bg-emerald-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${office.total ? Math.floor((office.serviceable / office.total) * 100) : 0}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-500 text-xs">Borrowed</span>
                      <span className="text-amber-400 text-xs font-medium">{office.borrowed}</span>
                    </div>
                    <div className="bg-slate-800 rounded-full h-1.5">
                      <div
                        className="bg-amber-400 h-1.5 rounded-full transition-all"
                        style={{ width: `${office.total ? Math.floor((office.borrowed / office.total) * 100) : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* xl+: vertical stack */}
          <div ref={leftColRef} className="hidden xl:flex flex-col gap-3">
            {officeCards.map((office) => (
              <div
                key={office.label}
                className="bg-slate-900 border border-slate-700 rounded-2xl px-5 py-4 hover:border-slate-500 transition-all group"
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-blue-400 shrink-0">
                    {icons.building}
                  </div>
                  <span className="text-white font-semibold text-sm truncate">{office.label}</span>
                </div>
                <p className="text-slate-500 text-xs mb-3">{office.total} total assets</p>
                <div className="space-y-2">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-500 text-xs">Serviceable</span>
                      <span className="text-emerald-400 text-xs font-medium">{office.serviceable}</span>
                    </div>
                    <div className="bg-slate-800 rounded-full h-1.5">
                      <div
                        className="bg-emerald-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${office.total ? Math.floor((office.serviceable / office.total) * 100) : 0}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-500 text-xs">Borrowed</span>
                      <span className="text-amber-400 text-xs font-medium">{office.borrowed}</span>
                    </div>
                    <div className="bg-slate-800 rounded-full h-1.5">
                      <div
                        className="bg-amber-400 h-1.5 rounded-full transition-all"
                        style={{ width: `${office.total ? Math.floor((office.borrowed / office.total) * 100) : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — Stat cards + Table */}
        <div className="flex-1 flex flex-col gap-4 min-w-0 w-full">

          {/* 2×2 Stat Cards — stack to 1 col on mobile, 2 on sm+ */}
          <div ref={statCardsRef} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {statCards.map((card) => (
              <div
                key={card.label}
                className="bg-slate-900 border border-slate-700 rounded-2xl p-5"
              >
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
                  {card.label}
                </p>
                <p className={`text-5xl font-bold ${card.valueColor} mb-1`}>
                  {card.value}
                </p>
                <p className="text-slate-500 text-xs">{card.subtitle}</p>
              </div>
            ))}
          </div>

          {/* Full-width Asset Table — height matches left column */}
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden flex flex-col"
            style={tableHeight ? { height: `${tableHeight}px` } : {}}
          >

            {/* Filters */}
            <div className="p-4 border-b border-slate-700">
              <h2 className="text-white font-semibold text-sm mb-3">Asset Inventory</h2>
              <div className="flex flex-col gap-2">
                {/* Search always full width */}
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {icons.search}
                  </span>
                  <input
                    type="text"
                    placeholder="Search asset or property number..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
                {/* Dropdowns: wrap on mobile, row on sm+ */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <select value={officeFilter} onChange={(e) => setOfficeFilter(e.target.value)}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer">
                    {offices.map(o => <option key={o} value={o} className="bg-slate-900">{o}</option>)}
                  </select>
                  <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer">
                    {categories.map(c => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
                  </select>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer">
                    {statuses.map(s => <option key={s} value={s} className="bg-slate-900">{s}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto flex-1">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-slate-700">
                    {['Property Number', 'Name', 'Location', 'Category', 'Serial', 'Status'].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-slate-500 text-sm">
                        No assets found matching your filters
                      </td>
                    </tr>
                  ) : filtered.map((asset) => (
                    <tr key={asset.id} className="hover:bg-slate-800 transition-colors">
                      <td className="px-5 py-3.5 text-sm font-mono text-blue-400">{asset.property_number}</td>
                      <td className="px-5 py-3.5 text-sm text-white">{asset.item_name}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-300">{asset.location}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-300">{asset.equipment_category}</td>
                      <td className="px-5 py-3.5 text-xs font-mono text-slate-400">{asset.serial_number || '—'}</td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusBadge[asset.status] ?? 'bg-slate-700 text-slate-300'}`}>
                          {asset.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1">
              <p className="text-slate-500 text-xs">Showing {filtered.length} of {assets.length} assets</p>
              <p className="text-slate-500 text-xs">PSA Property Management System</p>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}