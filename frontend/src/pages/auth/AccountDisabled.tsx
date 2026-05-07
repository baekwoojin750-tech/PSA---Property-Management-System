import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { requestReactivation } from '../../services/authService'

export default function AccountDisabled() {
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const email = useMemo(() => {
    const stateEmail = (location.state as { email?: string } | null)?.email
    const queryEmail = new URLSearchParams(location.search).get('email')
    return stateEmail || queryEmail || ''
  }, [location.search, location.state])

  const handleRequestReactivation = async () => {
    if (!email.endsWith('@psa.gov.ph')) {
      setError('Return to sign in and enter your PSA email before requesting reactivation.')
      return
    }

    setLoading(true)
    setError('')
    setMessage('')
    try {
      const data = await requestReactivation(email)
      setMessage(data.message || 'Reactivation request submitted. Please allow up to 3 business days for review.')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to request reactivation.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#080e1a] flex items-center justify-center px-4">
      <div className="w-full max-w-lg bg-[#0a1120] border border-[#1a2744] rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">
        <div className="px-7 py-6 border-b border-[#1a2744]">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008v.008H12v-.008ZM10.29 3.86 1.82 18a2.25 2.25 0 0 0 1.93 3.375h16.5A2.25 2.25 0 0 0 22.18 18L13.71 3.86a2.25 2.25 0 0 0-3.42 0Z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Account Disabled</h1>
          <p className="text-slate-400 text-sm mt-2 leading-6">
            Your account has been disabled. Please request reactivation of your account or proceed to the Super Admin&apos;s Desk for assistance.
          </p>
        </div>

        <div className="px-7 py-6 space-y-4">
          <div className="bg-amber-400/10 border border-amber-400/20 rounded-xl px-4 py-3">
            <p className="text-amber-300 text-sm font-semibold">Processing time</p>
            <p className="text-amber-100/80 text-xs mt-1 leading-5">
              Reactivation may take up to 3 business days after the Super Admin reviews your request.
            </p>
          </div>

          {email && (
            <div className="bg-[#080e1a] border border-[#1a2744] rounded-xl px-4 py-3">
              <p className="text-slate-500 text-xs uppercase tracking-wider">Account email</p>
              <p className="text-white text-sm mt-1 break-all">{email}</p>
            </div>
          )}

          {message && <div className="text-sm text-emerald-300 bg-emerald-400/10 border border-emerald-400/20 rounded-xl px-4 py-3">{message}</div>}
          {error && <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</div>}

          <button
            onClick={handleRequestReactivation}
            disabled={loading || !email}
            className="w-full px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition"
          >
            {loading ? 'Sending request...' : 'Request Reactivation'}
          </button>

          <button
            onClick={() => navigate('/login', { replace: true })}
            className="w-full px-4 py-3 rounded-xl border border-[#1a2744] text-slate-300 hover:text-white hover:border-blue-500 text-sm font-semibold transition"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    </div>
  )
}
