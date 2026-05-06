import { useState, useEffect } from 'react'
import Navbar from '../../components/shared/Navbar'
import { getAllActivityLogs } from '../../services/authService'

type Log = {
  id: number
  user_name: string
  email: string
  action: string
  target: string
  created_at: string
  log_type: 'login' | 'asset' | 'request' | 'user' | 'system'
}

const typeConfig: Record<string, { label: string; color: string; dot: string }> = {
  login:   { label: 'Login',   color: 'bg-blue-400/10 text-blue-400 border-blue-400/20',         dot: 'bg-blue-400'    },
  asset:   { label: 'Asset',   color: 'bg-purple-400/10 text-purple-400 border-purple-400/20',   dot: 'bg-purple-400'  },
  request: { label: 'Request', color: 'bg-amber-400/10 text-amber-400 border-amber-400/20',       dot: 'bg-amber-400'   },
  user:    { label: 'User',    color: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20', dot: 'bg-emerald-400' },
  system:  { label: 'System',  color: 'bg-slate-400/10 text-slate-400 border-slate-400/20',       dot: 'bg-slate-400'   },
}

const ROWS_PER_PAGE = 25

export default function ActivityLogs() {
  const [logs, setLogs]           = useState<Log[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [search, setSearch]       = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [page, setPage]           = useState(1)

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true)
        const data = await getAllActivityLogs()
        setLogs(data)
        setError(null)
      } catch (err: any) {
        console.error('Failed to fetch activity logs:', err)
        setError(err.message || 'Failed to load activity logs')
      } finally {
        setLoading(false)
      }
    }
    fetchLogs()
  }, [])

  // Reset to page 1 whenever search/filter changes
  useEffect(() => { setPage(1) }, [search, typeFilter])

  const filtered = logs.filter((log) => {
    const matchSearch =
      log.user_name.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.target.toLowerCase().includes(search.toLowerCase()) ||
      log.email.toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === 'all' || log.log_type === typeFilter
    return matchSearch && matchType
  })

  const totalPages  = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE))
  const safePage    = Math.min(page, totalPages)
  const paginated   = filtered.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE)

  // Build page number array with ellipsis
  const getPageNumbers = () => {
    const pages: (number | '...')[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (safePage > 3) pages.push('...')
      const start = Math.max(2, safePage - 1)
      const end   = Math.min(totalPages - 1, safePage + 1)
      for (let i = start; i <= end; i++) pages.push(i)
      if (safePage < totalPages - 2) pages.push('...')
      pages.push(totalPages)
    }
    return pages
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080e1a]">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 pt-28 pb-10">
          <div className="text-center text-slate-400">Loading activity logs...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#080e1a]">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 pt-28 pb-10 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Activity Logs</h1>
            <p className="text-slate-400 text-sm mt-0.5">Track all system actions and events across all accounts</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-[#0a1120] border border-[#1a2744] rounded-xl px-4 py-2">
            <span className="text-white font-semibold">{logs.length}</span> total logs
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl p-3">{error}</div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by user, email, action, or target..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#0a1120] border border-[#1a2744] rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-[#0a1120] border border-[#1a2744] rounded-xl px-4 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500 transition cursor-pointer"
          >
            <option value="all"     className="bg-[#0a1120]">All Types</option>
            <option value="login"   className="bg-[#0a1120]">Login</option>
            <option value="asset"   className="bg-[#0a1120]">Asset</option>
            <option value="request" className="bg-[#0a1120]">Request</option>
            <option value="user"    className="bg-[#0a1120]">User</option>
            <option value="system"  className="bg-[#0a1120]">System</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-[#0a1120] border border-[#1a2744] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1a2744]">
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">User</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Target</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a2744]">
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-16 text-slate-600 text-sm">No logs found</td>
                  </tr>
                ) : paginated.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-white text-sm font-medium">{log.user_name}</p>
                      <p className="text-slate-500 text-xs">{log.email}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-300">{log.action}</td>
                    <td className="px-6 py-4 text-xs text-slate-400 font-mono">{log.target}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border inline-flex items-center gap-1.5 w-fit ${typeConfig[log.log_type].color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${typeConfig[log.log_type].dot}`} />
                        {typeConfig[log.log_type].label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400 font-mono">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Pagination footer ── */}
          <div className="px-6 py-4 border-t border-[#1a2744] flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Count */}
            <p className="text-slate-500 text-xs shrink-0">
              Showing{' '}
              <span className="text-white font-medium">
                {filtered.length === 0 ? 0 : (safePage - 1) * ROWS_PER_PAGE + 1}
              </span>
              {' '}–{' '}
              <span className="text-white font-medium">
                {Math.min(safePage * ROWS_PER_PAGE, filtered.length)}
              </span>
              {' '}of{' '}
              <span className="text-white font-medium">{filtered.length}</span> logs
            </p>

            {/* Controls */}
            <div className="flex items-center gap-1">
              {/* Back */}
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#1a2744] text-slate-400 hover:text-white hover:border-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>

              {/* Page numbers */}
              <div className="flex items-center gap-1">
                {getPageNumbers().map((p, i) =>
                  p === '...' ? (
                    <span key={`ellipsis-${i}`} className="px-2 text-slate-600 text-xs select-none">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p as number)}
                      className={`w-8 h-8 rounded-lg text-xs font-medium transition ${
                        safePage === p
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'border border-[#1a2744] text-slate-400 hover:text-white hover:border-blue-500'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
              </div>

              {/* Next */}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#1a2744] text-slate-400 hover:text-white hover:border-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                Next
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}