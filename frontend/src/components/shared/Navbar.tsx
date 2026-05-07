import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'

const navLinks = {
  'super admin': [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Assets', path: '/asset' },
    { label: 'Requests', path: '/request' },
    { label: 'Inventory', path: '/inventory' },
  ],
  admin: [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Assets', path: '/asset' },
    { label: 'Requests', path: '/request' },
    { label: 'Inventory', path: '/inventory' },
  ],
  user: [
    { label: 'Profile', path: '/profile' },
    { label: 'Requests', path: '/request' },
  ],
}

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout, user, role } = useAuthStore()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    setMobileMenuOpen(false)
    setDropdownOpen(false)
  }, [location.pathname])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const getInitials = (name: string) =>
    name ? name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) : 'U'

  const links = navLinks[role as keyof typeof navLinks] ?? navLinks['user']

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center px-3 py-3 sm:px-4 sm:py-4">
      <div className="flex items-center gap-2 sm:gap-6 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl sm:rounded-full px-3 py-2.5 sm:px-6 shadow-xl shadow-black/30 w-full max-w-5xl">

        {/* Logo */}
        <div
          className="flex items-center gap-2 cursor-pointer shrink-0"
          onClick={() => navigate(role === 'user' ? '/request' : '/dashboard')}
        >
          <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow">
            P
          </div>
          <span className="text-white text-sm font-semibold tracking-wide hidden sm:block">
            PSA <span className="text-blue-400">PMS</span>
          </span>
        </div>

        <div className="hidden sm:block w-px h-5 bg-slate-700 shrink-0" />

        {/* Nav Links */}
        <nav className="hidden md:flex items-center justify-center gap-1 flex-1">
          {links.map((link) => {
            const isActive = location.pathname === link.path
            return (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {link.label}
              </button>
            )
          })}
        </nav>

        <button
          onClick={() => setMobileMenuOpen(open => !open)}
          className="md:hidden ml-auto w-9 h-9 rounded-xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 transition"
          aria-label="Open navigation menu"
          aria-expanded={mobileMenuOpen}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {mobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>

        {/* Avatar + Dropdown */}
        <div className="relative shrink-0" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 hover:bg-slate-800 rounded-full px-1.5 sm:px-2 py-1 transition"
          >
            <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {user?.avatar_url
                ? <img src={user.avatar_url} alt="avatar" className="w-full h-full object-cover rounded-full" />
                : getInitials(user?.full_name || 'User')}
            </div>
            <span className="text-slate-300 text-sm hidden md:block max-w-[100px] truncate">
              {user?.full_name || 'Account'}
            </span>
            <svg
              className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-12 w-48 bg-[#080e1a]/95 backdrop-blur-sm border border-[#1a2744] rounded-2xl shadow-2xl shadow-black/40 overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-slate-700">
                <p className="text-white text-sm font-medium truncate">{user?.full_name || 'Account'}</p>
                <p className="text-slate-500 text-xs truncate">{user?.email || ''}</p>
                <p className={`text-[10px] mt-1 font-semibold ${
                  role === 'super admin' ? 'text-yellow-400' : role === 'admin' ? 'text-blue-400' : 'text-slate-400'
                }`}>
                  {role === 'super admin' ? '⭐ Super Admin' : role === 'admin' ? '🔵 Admin' : '👤 User'}
                </p>
              </div>

              <div className="py-1">
                <button
                  onClick={() => { navigate('/profile'); setDropdownOpen(false) }}
                  className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white flex items-center gap-3 transition"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Profile
                </button>

                {/* Super Admin ONLY */}
                {role === 'super admin' && (
                  <>
                    <button
                      onClick={() => { navigate('/users'); setDropdownOpen(false) }}
                      className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white flex items-center gap-3 transition"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      All Users
                    </button>
                    <button
                      onClick={() => { navigate('/authorization'); setDropdownOpen(false) }}
                      className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white flex items-center gap-3 transition"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                      Authorizations
                    </button>
                  </>
                )}
              </div>

              <div className="border-t border-slate-700 py-1">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center gap-3 transition"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="absolute left-3 right-3 top-[68px] md:hidden bg-[#080e1a]/95 backdrop-blur-sm border border-[#1a2744] rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">
          <nav className="p-2 grid gap-1">
            {links.map((link) => {
              const isActive = location.pathname === link.path
              return (
                <button
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {link.label}
                </button>
              )
            })}
          </nav>
        </div>
      )}
    </div>
  )
}
