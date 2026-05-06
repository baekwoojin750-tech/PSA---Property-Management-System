import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import supabase from '../../lib/supabase'   // ← shared singleton, no more createClient here
import { useAuthStore } from '../../stores/authStore'
import api from '../../services/api'

export default function AuthCallback() {
  const navigate = useNavigate()
  const { setToken, setRole, setUser, setAuthorizationExpiry } = useAuthStore()
  const [isProcessing, setIsProcessing] = useState(true)

  useEffect(() => {
    let isMounted = true

    const handleCallback = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError || !session?.user) {
          console.error('Session error:', sessionError ?? 'No session found')
          if (isMounted) { setIsProcessing(false); navigate('/login') }
          return
        }

        const userEmail = session.user.email
        const fullName  =
          session.user.user_metadata?.full_name ||
          session.user.user_metadata?.name      ||
          userEmail?.split('@')[0]

        if (!userEmail) {
          if (isMounted) { setIsProcessing(false); navigate('/login') }
          return
        }

        try {
          const response = await api.post('/api/auth/oauth-user', { email: userEmail, full_name: fullName })

          if (isMounted && response.status === 200) {
            const userData = response.data
            setToken(userData.access_token)
            setRole(userData.role)
            setUser({ id: userData.id || 0, email: userData.email, full_name: userData.full_name })
            setAuthorizationExpiry(userData.authorization_expiry ?? null)

            if (userData.role === 'super admin' || userData.role === 'admin') {
              navigate('/dashboard', { replace: true })
            } else if (userData.role === 'user') {
              navigate('/user', { replace: true })
            } else {
              setIsProcessing(false)
              navigate('/login', { replace: true })
            }
          }
        } catch (err) {
          console.error('Backend error:', err)
          if (isMounted) { setIsProcessing(false); navigate('/login', { replace: true }) }
        }
      } catch (err) {
        console.error('Callback error:', err)
        if (isMounted) { setIsProcessing(false); navigate('/login') }
      }
    }

    handleCallback()
    return () => { isMounted = false }
  }, [navigate, setToken, setRole, setUser, setAuthorizationExpiry])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center">
      {isProcessing && (
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-blue-500 border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-slate-300 text-sm">Completing authentication...</p>
        </div>
      )}
    </div>
  )
}