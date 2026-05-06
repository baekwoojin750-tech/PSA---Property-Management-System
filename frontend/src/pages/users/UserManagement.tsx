import { useEffect, useRef, useState } from 'react'

import Navbar from '../../components/shared/Navbar'
import { createAdminAccount, getAllUsers, toggleUserStatus } from '../../services/authService'

type Role = 'super admin' | 'admin' | 'user'

type User = {
  id: number
  full_name: string
  email: string
  role: Role
  is_active: boolean
  reactivation_requested: boolean
  created_at: string
}

const roleBadge: Record<Role, string> = {
  'super admin': 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/30',
  admin: 'bg-blue-400/10 text-blue-400 border border-blue-400/30',
  user: 'bg-slate-400/10 text-slate-400 border border-slate-400/30',
}

const roleLabel: Record<Role, string> = {
  'super admin': 'Super Admin',
  admin: 'Admin',
  user: 'User',
}

const getInitials = (name: string) =>
  name ? name.split(' ').map((part) => part[0]).join('').toUpperCase().slice(0, 2) : 'U'

function KebabMenu({
  user,
  onToggleStatus,
}: {
  user: User
  onToggleStatus: (user: User) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div ref={ref} className="absolute top-2 right-2 z-10">
      <button
        onClick={(event) => {
          event.stopPropagation()
          setOpen((value) => !value)
        }}
        className="w-7 h-7 flex items-center justify-center rounded-md text-slate-500 hover:text-slate-300 hover:bg-white/10 transition-all duration-150"
        aria-label="Options"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <circle cx="10" cy="4" r="1.5" />
          <circle cx="10" cy="10" r="1.5" />
          <circle cx="10" cy="16" r="1.5" />
        </svg>
      </button>

      {open ? (
        <div className="absolute top-8 right-0 w-48 bg-[#0f1c35] border border-[#1a2744] rounded-xl shadow-2xl shadow-black/50 overflow-hidden py-1 z-50">
          <button
            onClick={(event) => {
              event.stopPropagation()
              onToggleStatus(user)
              setOpen(false)
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors duration-150 ${
              user.is_active
                ? 'text-red-400 hover:bg-red-500/10'
                : 'text-emerald-400 hover:bg-emerald-500/10'
            }`}
          >
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {user.is_active ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              )}
            </svg>
            {user.is_active ? 'Disable Account' : 'Enable Account'}
          </button>
        </div>
      ) : null}
    </div>
  )
}

function UserCard({
  user,
  onToggleStatus,
}: {
  user: User
  onToggleStatus?: (user: User) => void
}) {
  return (
    <div className="relative bg-white/[0.04] backdrop-blur-md border border-white/10 rounded-2xl p-5 flex flex-col items-center gap-3 hover:bg-white/[0.07] hover:border-white/20 transition-all duration-200 shadow-xl shadow-black/20">
      {onToggleStatus ? <KebabMenu user={user} onToggleStatus={onToggleStatus} /> : null}

      <div className="relative">
        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-800 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-lg">
          {getInitials(user.full_name)}
        </div>
        <span
          className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#080e1a] ${
            user.is_active ? 'bg-emerald-400' : 'bg-red-500'
          }`}
        />
      </div>

      <div className="text-center space-y-1 w-full">
        <p className="text-white text-sm font-semibold truncate">{user.full_name}</p>
        <p className="text-slate-500 text-xs truncate">{user.email}</p>
      </div>

      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${roleBadge[user.role]}`}>
        {roleLabel[user.role]}
      </span>

      <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${
        user.is_active
          ? 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/20'
          : 'bg-red-400/10 text-red-300 border border-red-400/20'
      }`}>
        {user.is_active ? 'Active' : 'Suspended'}
      </span>

      {user.reactivation_requested ? (
        <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20">
          Reactivation Requested
        </span>
      ) : null}

      <p className="text-slate-600 text-xs">
        Joined {new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
      </p>
    </div>
  )
}

function RoleSection({
  title,
  users,
  onToggleStatus,
}: {
  title: string
  users: User[]
  onToggleStatus?: (user: User) => void
}) {
  return (
    <div>
      <div className="w-full flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-[#1a2744]" />
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0a1120] border border-[#1a2744]">
          <span className="text-slate-300 text-xs font-semibold uppercase tracking-widest">{title}</span>
          <span className="text-slate-500 text-xs">({users.length})</span>
        </div>
        <div className="flex-1 h-px bg-[#1a2744]" />
      </div>

      <div className={`grid gap-4 mb-8 ${title === 'Super Admin' ? 'grid-cols-1 place-items-center' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'}`}>
        {users.length === 0 ? (
          <p className="col-span-full text-center text-slate-600 text-sm py-6">No {title.toLowerCase()} accounts.</p>
        ) : (
          users.map((user) => (
            <div key={user.id} className={title === 'Super Admin' ? 'w-48' : ''}>
              <UserCard user={user} onToggleStatus={onToggleStatus} />
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | Role>('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createEmail, setCreateEmail] = useState('')
  const [createPassword, setCreatePassword] = useState('')
  const [createConfirmPassword, setCreateConfirmPassword] = useState('')
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState('')

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const data = await getAllUsers()
      setUsers(data)
      setError(null)
    } catch (err: any) {
      console.error('Failed to fetch users:', err)
      setError(err?.response?.data?.detail || err.message || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const resetCreateForm = () => {
    setCreateName('')
    setCreateEmail('')
    setCreatePassword('')
    setCreateConfirmPassword('')
    setCreateError('')
  }

  const handleCreateAdmin = async () => {
    if (!createName.trim() || !createEmail.trim() || !createPassword) {
      setCreateError('Complete all fields first.')
      return
    }
    if (!createEmail.endsWith('@psa.gov.ph')) {
      setCreateError('Only @psa.gov.ph email addresses are allowed.')
      return
    }
    if (createPassword !== createConfirmPassword) {
      setCreateError('Passwords do not match.')
      return
    }
    if (createPassword.length < 6) {
      setCreateError('Password must be at least 6 characters.')
      return
    }

    try {
      setCreateLoading(true)
      setCreateError('')
      const created = await createAdminAccount(createEmail.trim(), createName.trim(), createPassword)
      setUsers((prev) => [created, ...prev])
      setCreateOpen(false)
      resetCreateForm()
    } catch (err: any) {
      setCreateError(err?.response?.data?.detail || 'Failed to create admin account')
    } finally {
      setCreateLoading(false)
    }
  }

  const handleToggleStatus = async (user: User) => {
    try {
      const updated = await toggleUserStatus(user.id, !user.is_active)
      setUsers((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to update account status')
    }
  }

  const filtered = users.filter((user) => {
    const matchSearch =
      user.full_name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === 'all' || user.role === roleFilter
    return matchSearch && matchRole
  })

  const superAdmins = filtered.filter((user) => user.role === 'super admin')
  const admins = filtered.filter((user) => user.role === 'admin')
  const regularUsers = filtered.filter((user) => user.role === 'user')
  const pendingReactivations = users.filter((user) => !user.is_active && user.reactivation_requested).length

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080e1a]">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 pt-28 pb-10">
          <div className="text-center text-slate-400">Loading users...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#080e1a]">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 pt-28 pb-10 space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">User Management</h1>
            <p className="text-slate-400 text-sm mt-0.5">Super admin creates admin accounts here. The registration form stays for regular users only.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-400 bg-[#0a1120] border border-[#1a2744] rounded-xl px-4 py-2">
              <span className="text-white font-semibold">{users.length}</span> total users
            </div>
            <div className="flex items-center gap-2 text-xs text-amber-300 bg-amber-400/10 border border-amber-400/20 rounded-xl px-4 py-2">
              <span className="font-semibold">{pendingReactivations}</span> reactivation requests
            </div>
            <button
              onClick={() => {
                resetCreateForm()
                setCreateOpen(true)
              }}
              className="rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 text-sm font-medium text-white transition"
            >
              Create Admin Account
            </button>
          </div>
        </div>

        {error ? (
          <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-sm rounded-xl p-3">
            {error}
          </div>
        ) : null}

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full bg-[#0a1120] border border-[#1a2744] rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value as 'all' | Role)}
            className="bg-[#0a1120] border border-[#1a2744] rounded-xl px-4 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500 transition cursor-pointer"
          >
            <option value="all" className="bg-[#0a1120]">All Roles</option>
            <option value="super admin" className="bg-[#0a1120]">Super Admin</option>
            <option value="admin" className="bg-[#0a1120]">Admin</option>
            <option value="user" className="bg-[#0a1120]">User</option>
          </select>
        </div>

        {roleFilter === 'all' || roleFilter === 'super admin' ? (
          <RoleSection title="Super Admin" users={superAdmins} />
        ) : null}
        {roleFilter === 'all' || roleFilter === 'admin' ? (
          <RoleSection title="Admin" users={admins} onToggleStatus={handleToggleStatus} />
        ) : null}
        {roleFilter === 'all' || roleFilter === 'user' ? (
          <RoleSection title="Users" users={regularUsers} onToggleStatus={handleToggleStatus} />
        ) : null}

        <p className="text-slate-600 text-xs text-right">Showing {filtered.length} of {users.length} users</p>
      </div>

      {createOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(2,6,23,0.75)', backdropFilter: 'blur(4px)' }}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setCreateOpen(false)
            }
          }}
        >
          <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700/60 shadow-2xl shadow-black/60 p-6 space-y-5">
            <button
              onClick={() => setCreateOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div>
              <h2 className="text-white text-base font-semibold">Create Admin Account</h2>
              <p className="text-slate-400 text-sm mt-1">Accounts created here are automatically assigned the `admin` role. Regular users should continue registering from the public registration form.</p>
            </div>

            {createError ? (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {createError}
              </div>
            ) : null}

            <div className="space-y-3">
              <input
                value={createName}
                onChange={(event) => setCreateName(event.target.value)}
                placeholder="Full name"
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                value={createEmail}
                onChange={(event) => setCreateEmail(event.target.value)}
                placeholder="admin@psa.gov.ph"
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="password"
                value={createPassword}
                onChange={(event) => setCreatePassword(event.target.value)}
                placeholder="Password"
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="password"
                value={createConfirmPassword}
                onChange={(event) => setCreateConfirmPassword(event.target.value)}
                placeholder="Confirm password"
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setCreateOpen(false)}
                className="px-4 py-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAdmin}
                disabled={createLoading}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
              >
                {createLoading ? 'Creating...' : 'Create Admin'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
