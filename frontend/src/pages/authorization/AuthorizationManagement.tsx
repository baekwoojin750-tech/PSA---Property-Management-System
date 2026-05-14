import { useState, useEffect } from 'react'
import Navbar from '../../components/shared/Navbar'
import { useAuthStore } from '../../stores/authStore'
import {
  getAllAdmins,
  grantAuthorization,
  revokeAuthorization,
  rejectAuthorization,
} from '../../services/authService'

type PendingRequest = {
  request_id: number
  page: string
  remarks: string | null
  created_at: string | null
}

type AdminRecord = {
  id: number
  full_name: string
  email: string
  authorization_expiry: string | null
  auth_status: 'none' | 'pending' | 'authorized' | 'expired'
  pending_requests: PendingRequest[]
}

const DAY_OPTIONS = [1, 2, 3, 4, 5, 6, 7]

const PAGE_COLORS: Record<string, string> = {
  Dashboard: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
  Assets:    'bg-blue-500/10 text-blue-300 border-blue-500/30',
  Inventory: 'bg-teal-500/10 text-teal-300 border-teal-500/30',
}

export default function AuthorizationManagement() {
  const { token, setAuthorizationExpiry } = useAuthStore()
  const [admins, setAdmins] = useState<AdminRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [selectedDays, setSelectedDays] = useState<Record<number, number>>({})
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending')
  const [expandedRemarks, setExpandedRemarks] = useState<number | null>(null)

  const fetchAdmins = async (silent = false) => {
    if (!token) return
    if (!silent) setLoading(true)
    try {
      const data = await getAllAdmins(token)
      setAdmins(data)
      setError('')
    } catch {
      if (!silent) setError('Failed to load admins.')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    fetchAdmins(false)
    const intervalId = window.setInterval(() => fetchAdmins(true), 3000)
    return () => window.clearInterval(intervalId)
  }, [token])

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const handleGrant = async (adminId: number, requestId: number) => {
    const days = selectedDays[requestId] || 1
    setActionLoading(requestId)
    try {
      const result = await grantAuthorization(token!, adminId, days, requestId)

      // FIX: Sync the new expiry into the store so the UI reflects it immediately
      // without requiring the admin to log out and back in
      if (result?.authorization_expiry) {
        setAuthorizationExpiry(result.authorization_expiry)
      }

      showToast(`Access granted for ${days} day${days > 1 ? 's' : ''}`, 'success')
      await fetchAdmins()
    } catch {
      showToast('Failed to grant authorization.', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleRevoke = async (adminId: number) => {
    setActionLoading(adminId)
    try {
      await revokeAuthorization(token!, adminId)
      showToast('Authorization revoked.', 'success')
      await fetchAdmins()
    } catch {
      showToast('Failed to revoke.', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (requestId: number) => {
    setActionLoading(requestId)
    try {
      await rejectAuthorization(token!, requestId)
      showToast('Request rejected.', 'success')
      await fetchAdmins()
    } catch {
      showToast('Failed to reject.', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  // Flatten all admins with pending requests into per-request rows
  const pendingRows = admins.flatMap((admin) =>
    admin.pending_requests.map((req) => ({ admin, req }))
  )

  const getInitials = (name: string) =>
    name ? name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) : 'A'

  const statusBadge = (status: AdminRecord['auth_status'], expiry: string | null) => {
    const base = 'text-xs font-semibold px-2.5 py-1 rounded-full border'
    switch (status) {
      case 'authorized':
        return (
          <div className="flex flex-col gap-0.5">
            <span className={`${base} bg-emerald-500/10 text-emerald-400 border-emerald-500/20`}>Authorized</span>
            {expiry && (
              <span className="text-[10px] text-slate-500">
                Until {new Date(expiry).toLocaleDateString()}
              </span>
            )}
          </div>
        )
      case 'pending':
        return <span className={`${base} bg-yellow-400/10 text-yellow-400 border-yellow-400/30`}>⏳ Pending</span>
      case 'expired':
        return <span className={`${base} bg-red-500/10 text-red-400 border-red-500/20`}>Expired</span>
      default:
        return <span className={`${base} bg-slate-500/10 text-slate-400 border-slate-500/20`}>No Access</span>
    }
  }

  return (
    <div className="app-shell-bg min-h-screen">
      <Navbar />

      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border text-sm font-medium transition-all duration-300 ${
          toast.type === 'success'
            ? 'bg-emerald-950 border-emerald-500/30 text-emerald-300'
            : 'bg-red-950 border-red-500/30 text-red-300'
        }`}>
          {toast.type === 'success'
            ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          }
          {toast.msg}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 pt-28 pb-10 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Authorization Management</h1>
            <p className="text-slate-400 text-sm mt-0.5">Review admin requests for Dashboard, Assets & Inventory</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2">
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
            <span className="text-yellow-400 font-semibold">{pendingRows.length}</span> pending
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(['pending', 'all'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                activeTab === tab
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tab === 'pending'
                ? `Pending Requests (${pendingRows.length})`
                : `All Admins (${admins.length})`}
            </button>
          ))}
        </div>

        {/* Info banner */}
        <div className="flex items-start gap-3 bg-blue-500/5 border border-blue-500/20 rounded-2xl px-5 py-4">
          <svg className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-blue-300 text-xs leading-relaxed">
            Each request is page-specific. Granting access extends the admin's authorization by the selected number of days.
            Read the admin's <strong>remarks</strong> to understand their purpose before approving.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-red-400 text-sm text-center py-10">{error}</div>
        ) : activeTab === 'pending' ? (

          /* ── PENDING TAB: per-request rows ── */
          pendingRows.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              <svg className="w-10 h-10 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              No pending authorization requests
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px]">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Admin</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Requested Page</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Remarks</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Grant Duration</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {pendingRows.map(({ admin, req }) => (
                      <tr key={req.request_id} className="hover:bg-slate-800/50 transition-colors">

                        {/* Admin info */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
                              {getInitials(admin.full_name)}
                            </div>
                            <div>
                              <p className="text-white text-sm font-medium">{admin.full_name}</p>
                              <p className="text-slate-500 text-xs">{admin.email}</p>
                              {req.created_at && (
                                <p className="text-slate-600 text-[10px] mt-0.5">
                                  {new Date(req.created_at).toLocaleString()}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Requested page */}
                        <td className="px-6 py-4">
                          <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${PAGE_COLORS[req.page] || 'bg-slate-500/10 text-slate-300 border-slate-500/30'}`}>
                            {req.page}
                          </span>
                        </td>

                        {/* Remarks */}
                        <td className="px-6 py-4 max-w-[240px]">
                          {req.remarks ? (
                            <div>
                              <p className={`text-slate-300 text-xs leading-relaxed ${expandedRemarks === req.request_id ? '' : 'line-clamp-2'}`}>
                                {req.remarks}
                              </p>
                              {req.remarks.length > 80 && (
                                <button
                                  onClick={() => setExpandedRemarks(expandedRemarks === req.request_id ? null : req.request_id)}
                                  className="text-blue-400 text-[10px] hover:text-blue-300 mt-1 transition-colors"
                                >
                                  {expandedRemarks === req.request_id ? 'Show less' : 'Show more'}
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-600 text-xs italic">No remarks provided</span>
                          )}
                        </td>

                        {/* Day picker */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1 flex-wrap">
                            {DAY_OPTIONS.map((d) => (
                              <button
                                key={d}
                                onClick={() => setSelectedDays((prev) => ({ ...prev, [req.request_id]: d }))}
                                className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all duration-150 ${
                                  (selectedDays[req.request_id] ?? 1) === d
                                    ? 'bg-blue-600 text-white shadow'
                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                                }`}
                              >
                                {d}
                              </button>
                            ))}
                            <span className="text-slate-500 text-xs ml-1">
                              day{(selectedDays[req.request_id] ?? 1) > 1 ? 's' : ''}
                            </span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {actionLoading === req.request_id ? (
                              <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <>
                                <button
                                  onClick={() => handleGrant(admin.id, req.request_id)}
                                  className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 hover:text-emerald-300 border border-emerald-600/30 rounded-lg text-xs font-semibold transition-all duration-200"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleReject(req.request_id)}
                                  className="px-3 py-1.5 bg-slate-700/50 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-600/30 rounded-lg text-xs font-semibold transition-all duration-200"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-3 border-t border-slate-700">
                <p className="text-slate-500 text-xs">Showing {pendingRows.length} pending request{pendingRows.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
          )

        ) : (

          /* ── ALL ADMINS TAB ── */
          admins.length === 0 ? (
            <div className="text-center py-20 text-slate-500">No admins found</div>
          ) : (
            <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px]">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Admin</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Pending Requests</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {admins.map((admin) => (
                      <tr key={admin.id} className="hover:bg-slate-800/50 transition-colors">

                        {/* Admin info */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
                              {getInitials(admin.full_name)}
                            </div>
                            <div>
                              <p className="text-white text-sm font-medium">{admin.full_name}</p>
                              <p className="text-slate-500 text-xs">{admin.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4">
                          {statusBadge(admin.auth_status, admin.authorization_expiry)}
                        </td>

                        {/* Pending requests summary */}
                        <td className="px-6 py-4">
                          {admin.pending_requests.length === 0 ? (
                            <span className="text-slate-600 text-xs">None</span>
                          ) : (
                            <div className="flex flex-col gap-2">
                              {admin.pending_requests.map((req) => (
                                <div key={req.request_id} className="flex flex-col gap-0.5">
                                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border w-fit ${PAGE_COLORS[req.page] || 'bg-slate-500/10 text-slate-300 border-slate-500/30'}`}>
                                    {req.page}
                                  </span>
                                  {req.remarks && (
                                    <p className="text-slate-400 text-[11px] leading-relaxed pl-1 line-clamp-2 max-w-[200px]">
                                      "{req.remarks}"
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4">
                          {actionLoading === admin.id ? (
                            <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                          ) : admin.auth_status === 'authorized' ? (
                            <button
                              onClick={() => handleRevoke(admin.id)}
                              className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 hover:text-red-300 border border-red-600/30 rounded-lg text-xs font-semibold transition-all duration-200"
                            >
                              Revoke
                            </button>
                          ) : (
                            <span className="text-slate-600 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-3 border-t border-slate-700">
                <p className="text-slate-500 text-xs">Showing {admins.length} admin{admins.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  )
}
