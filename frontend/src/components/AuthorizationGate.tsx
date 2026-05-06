import { useEffect, useRef, useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import { getAuthorizationStatus, requestAuthorization } from '../services/authService'

interface AuthorizationGateProps {
  children: React.ReactNode
  pageName: string
}

export default function AuthorizationGate({ children, pageName }: AuthorizationGateProps) {
  const { token, role } = useAuthStore()
  const [isPageAuthorized, setIsPageAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [remarks, setRemarks] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const checkStatus = async () => {
    if (!token || role === 'super admin') return
    try {
      const data = await getAuthorizationStatus(token, pageName)
      const authorized = data.status === 'authorized'
      if (authorized) {
        // Stop polling
        if (pollRef.current) {
          clearInterval(pollRef.current)
          pollRef.current = null
        }
        // Silent reload so the now-unlocked page loads fresh with all its data
        window.location.reload()
      }
    } catch {
      // silent — keep polling
    }
  }

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }

    if (role === 'super admin') {
      setIsPageAuthorized(true)
      setLoading(false)
      return
    }

    // Initial check
    getAuthorizationStatus(token, pageName)
      .then((data) => {
        const authorized = data.status === 'authorized'
        setIsPageAuthorized(authorized)
        // Only start polling if not yet authorized
        if (!authorized) {
          pollRef.current = setInterval(checkStatus, 5000) // poll every 5 seconds
        }
      })
      .catch(() => setIsPageAuthorized(false))
      .finally(() => setLoading(false))

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [token, role, pageName])

  const handleRequestSubmit = async () => {
    if (!remarks.trim()) return
    setSubmitting(true)
    setSubmitError('')
    try {
      // Uses the existing requestAuthorization(token, page, remarks) from authService
      await requestAuthorization(token!, pageName, remarks.trim())
      setSubmitted(true)
    } catch {
      setSubmitError('Failed to send request. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setRemarks('')
    setSubmitted(false)
    setSubmitError('')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isPageAuthorized) {
    return (
      <>
        {/* ── Access Restricted Screen ── */}
        <div className="flex items-center justify-center min-h-screen bg-slate-950 overflow-hidden">

          {/* Radial glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(59,130,246,0.08) 0%, transparent 70%)',
            }}
          />

          <div className="relative flex flex-col items-center gap-6 px-8 py-10 max-w-sm w-full text-center">

            {/* ── Animated Padlock ── */}
            <div className="relative w-20 h-20">
              <svg
                viewBox="0 0 80 80"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full"
              >
                <path
                  d="M26 34 V26 C26 15.5 54 15.5 54 26 V34"
                  stroke="#3b82f6"
                  strokeWidth="4"
                  strokeLinecap="round"
                  fill="none"
                  style={{
                    transformOrigin: '40px 34px',
                    animation: 'shackle-open 2.4s ease-in-out infinite',
                  }}
                />
                <rect
                  x="16"
                  y="34"
                  width="48"
                  height="34"
                  rx="6"
                  fill="#1e293b"
                  stroke="#3b82f6"
                  strokeWidth="2"
                  style={{ animation: 'body-pulse 2.4s ease-in-out infinite' }}
                />
                <circle cx="40" cy="49" r="5" fill="#3b82f6" opacity="0.9" />
                <rect x="38" y="52" width="4" height="7" rx="2" fill="#3b82f6" opacity="0.9" />
              </svg>

              <style>{`
                @keyframes shackle-open {
                  0%, 60%, 100% { transform: translateY(0px); }
                  20%, 40%      { transform: translateY(-6px); }
                }
                @keyframes body-pulse {
                  0%, 100% { opacity: 1; }
                  30%, 50% { opacity: 0.7; }
                }
              `}</style>
            </div>

            {/* Text */}
            <div className="space-y-1">
              <p className="text-white text-lg font-semibold tracking-tight">
                Access Restricted
              </p>
              <p className="text-slate-400 text-sm leading-relaxed">
                You don't have permission to view{' '}
                <span className="text-slate-300 font-medium">{pageName}</span>.
                <br />
                Request access and a super admin will review it.
              </p>
            </div>

            {/* Request Access Button */}
            <button
              onClick={() => setShowModal(true)}
              className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg
                         bg-blue-600 hover:bg-blue-500 active:bg-blue-700
                         text-white text-sm font-medium
                         transition-colors duration-150 shadow-lg shadow-blue-900/30
                         focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-950"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Request Access
            </button>
          </div>
        </div>

        {/* ── Remarks Modal ── */}
        {showModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(2,6,23,0.75)', backdropFilter: 'blur(4px)' }}
            onClick={(e) => e.target === e.currentTarget && handleCloseModal()}
          >
            <div
              className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700/60
                         shadow-2xl shadow-black/60 p-6 space-y-5"
              style={{ animation: 'modal-in 0.2s ease-out' }}
            >
              <style>{`
                @keyframes modal-in {
                  from { opacity: 0; transform: scale(0.95) translateY(8px); }
                  to   { opacity: 1; transform: scale(1)    translateY(0); }
                }
              `}</style>

              {/* Close */}
              <button
                onClick={handleCloseModal}
                className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {submitted ? (
                /* ── Success ── */
                <div className="flex flex-col items-center gap-4 py-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-green-500/15 flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-semibold">Request Submitted</p>
                    <p className="text-slate-400 text-sm mt-1">
                      Your request for{' '}
                      <span className="text-slate-300 font-medium">{pageName}</span>{' '}
                      has been sent to the super admin for review.
                    </p>
                  </div>
                  <button
                    onClick={handleCloseModal}
                    className="mt-1 px-5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700
                               text-slate-200 text-sm font-medium transition-colors"
                  >
                    Done
                  </button>
                </div>
              ) : (
                /* ── Form ── */
                <>
                  <div>
                    <h2 className="text-white text-base font-semibold">Request Page Access</h2>
                    <p className="text-slate-400 text-sm mt-1">
                      Requesting access to{' '}
                      <span className="text-blue-400 font-medium">{pageName}</span>.
                      Your remarks will be visible to the super admin on the Authorization Management page.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-300 text-sm font-medium" htmlFor="remarks">
                      Remarks <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      id="remarks"
                      rows={4}
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="e.g. I need access to manage inventory records for the Q2 audit…"
                      className="w-full rounded-lg bg-slate-800 border border-slate-700
                                 text-slate-200 placeholder-slate-500 text-sm
                                 px-3.5 py-2.5 resize-none
                                 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                                 transition-shadow"
                    />
                    {submitError && (
                      <p className="text-red-400 text-xs">{submitError}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-1">
                    <button
                      onClick={handleCloseModal}
                      className="px-4 py-2 rounded-lg text-slate-400 hover:text-slate-200
                                 hover:bg-slate-800 text-sm font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleRequestSubmit}
                      disabled={!remarks.trim() || submitting}
                      className="inline-flex items-center gap-2 px-5 py-2 rounded-lg
                                 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed
                                 text-white text-sm font-medium transition-colors
                                 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      {submitting ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Sending…
                        </>
                      ) : (
                        'Submit Request'
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </>
    )
  }

  return <>{children}</>
}