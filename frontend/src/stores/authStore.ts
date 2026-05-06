import { create } from 'zustand'


type AuthUser = { id: number; email: string; full_name: string }

interface AuthState {
  token: string | null
  role: string | null
  user: AuthUser | null
  authorizationExpiry: string | null
  setToken: (token: string) => void
  setRole: (role: string) => void
  setUser: (user: AuthUser) => void
  setAuthorizationExpiry: (expiry: string | null) => void
  isAuthorized: () => boolean
  logout: () => void
}

const parseUser = (): AuthUser | null => {
  try {
    const raw = localStorage.getItem('user')
    if (!raw) return null
    const user = JSON.parse(raw) as Partial<AuthUser>
    return {
      id: Number(user.id ?? 0),
      email: user.email ?? '',
      full_name: user.full_name ?? '',
    }
  } catch {
    return null
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem('token'),
  role: localStorage.getItem('role'),
  user: parseUser(),
  authorizationExpiry: localStorage.getItem('authorization_expiry'),

  setToken: (token) => {
    localStorage.setItem('token', token)
    set({ token })
  },
  setRole: (role) => {
    localStorage.setItem('role', role)
    set({ role })
  },
  setUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user))
    set({ user })
  },
  setAuthorizationExpiry: (expiry) => {
    if (expiry) {
      localStorage.setItem('authorization_expiry', expiry)
    } else {
      localStorage.removeItem('authorization_expiry')
    }
    set({ authorizationExpiry: expiry })
  },

  isAuthorized: () => {
    const { role, authorizationExpiry } = get()
    if (role === 'super admin') return true
    if (role !== 'admin') return false
    if (!authorizationExpiry) return false
    return new Date(authorizationExpiry) > new Date()
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('user')
    localStorage.removeItem('authorization_expiry')
    set({ token: null, role: null, user: null, authorizationExpiry: null })
  },
}))
