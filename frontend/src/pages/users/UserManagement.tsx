import { useState, useEffect, useRef } from 'react'
import Navbar from '../../components/shared/Navbar'
import { useAuthStore } from '../../stores/authStore'
import { getAllUsers } from '../../services/authService'

// ─── Types ────────────────────────────────────────────────────────────────────
type Role = 'super admin' | 'admin' | 'user'

type User = {
  id: number
  full_name: string
  email: string
  role: Role
  is_active: boolean
  created_at: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const roleBadge: Record<string, string> = {
  'super admin': 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/30',
  admin:         'bg-blue-400/10 text-blue-400 border border-blue-400/30',
  user:          'bg-slate-400/10 text-slate-400 border border-slate-400/30',
}

const roleLabel: Record<string, string> = {
  'super admin': 'Super Admin',
  admin:         'Admin',
  user:          'User',
}

const getInitials = (name: string) =>
  name ? name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) : 'U'

// ─── Permission Rule ──────────────────────────────────────────────────────────
// Super admin → kebab on admin cards + user cards (not on super admin)
// Admin       → kebab on user cards ONLY
// User        → no kebab anywhere
function canShowKebab(viewerRole: Role, targetRole: Role): boolean {
  if (targetRole === 'super admin') return false
  if (viewerRole === 'super admin') return targetRole === 'admin' || targetRole === 'user'
  if (viewerRole === 'admin')       return targetRole === 'user'
  return false
}

// ─── Kebab Menu ───────────────────────────────────────────────────────────────
function KebabMenu({
  user,
  onToggleStatus,
  onEdit,
}: {
  user: User
  onToggleStatus: (id: number) => void
  onEdit: (user: User) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div ref={ref} className="absolute top-2 right-2 z-10">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o) }}
        className="w-7 h-7 flex items-center justify-center rounded-md text-slate-500 hover:text-slate-300 hover:bg-white/10 transition-all duration-150"
        aria-label="Options"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <circle cx="10" cy="4"  r="1.5" />
          <circle cx="10" cy="10" r="1.5" />
          <circle cx="10" cy="16" r="1.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-8 right-0 w-40 bg-[#0f1c35] border border-[#1a2744] rounded-xl shadow-2xl shadow-black/50 overflow-hidden py-1 z-50">
          {/* Toggle active / disable */}
          {user.is_active ? (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleStatus(user.id); setOpen(false) }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors duration-150"
            >
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              Disable User
            </button>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleStatus(user.id); setOpen(false) }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-emerald-400 hover:bg-emerald-500/10 transition-colors duration-150"
            >
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Activate User
            </button>
          )}

          <div className="h-px bg-[#1a2744] mx-2 my-1" />

          {/* Edit */}
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(user); setOpen(false) }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:bg-white/[0.06] transition-colors duration-150"
          >
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit User
          </button>
        </div>
      )}
    </div>
  )
}

// ─── User Card ────────────────────────────────────────────────────────────────
function UserCard({
  u,
  viewerRole,
  onToggleStatus,
  onEdit,
}: {
  u: User
  viewerRole: Role
  onToggleStatus: (id: number) => void
  onEdit: (user: User) => void
}) {
  const showMenu = canShowKebab(viewerRole, u.role)

  return (
    <div className="relative bg-white/[0.04] backdrop-blur-md border border-white/10 rounded-2xl p-5 flex flex-col items-center gap-3 hover:bg-white/[0.07] hover:border-white/20 transition-all duration-200 shadow-xl shadow-black/20 group">
      {/* Kebab menu */}
      {showMenu && (
        <KebabMenu user={u} onToggleStatus={onToggleStatus} onEdit={onEdit} />
      )}

      {/* Avatar */}
      <div className="relative">
        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-800 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-lg">
          {getInitials(u.full_name)}
        </div>
        <span
          className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#080e1a] ${
            u.is_active ? 'bg-emerald-400' : 'bg-slate-600'
          }`}
        />
      </div>

      {/* Info */}
      <div className="text-center space-y-1 w-full">
        <p className="text-white text-sm font-semibold truncate">{u.full_name}</p>
        <p className="text-slate-500 text-xs truncate">{u.email}</p>
      </div>

      {/* Badge */}
      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${roleBadge[u.role]}`}>
        {roleLabel[u.role]}
      </span>

      {/* Joined */}
      <p className="text-slate-600 text-xs">
        Joined {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
      </p>
    </div>
  )
}

// ─── Collapsible Group ────────────────────────────────────────────────────────
function RoleGroup({
  title,
  users,
  viewerRole,
  onToggleStatus,
  onEdit,
  defaultOpen = true,
}: {
  title: string
  users: User[]
  viewerRole: Role
  onToggleStatus: (id: number) => void
  onEdit: (user: User) => void
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div>
      {/* Section divider + toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 group mb-4"
      >
        <div className="flex-1 h-px bg-[#1a2744]" />
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0a1120] border border-[#1a2744] hover:border-blue-500/50 transition">
          <span className="text-slate-300 text-xs font-semibold uppercase tracking-widest">{title}</span>
          <span className="text-slate-500 text-xs">({users.length})</span>
          <svg
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        <div className="flex-1 h-px bg-[#1a2744]" />
      </button>

      {/* Cards grid */}
      {open && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          {users.length === 0 ? (
            <p className="col-span-full text-center text-slate-600 text-sm py-6">
              No {title.toLowerCase()} accounts.
            </p>
          ) : (
            users.map(u => (
              <UserCard
                key={u.id}
                u={u}
                viewerRole={viewerRole}
                onToggleStatus={onToggleStatus}
                onEdit={onEdit}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function UserManagement() {
  const [users, setUsers]           = useState<User[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [search, setSearch]         = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [editTarget, setEditTarget] = useState<User | null>(null)

  // ── Get the current logged-in user's role from your auth store/context ──
  // Replace this with however you access the current user, e.g.:
  // const { user: currentUser } = useAuthStore()
  // const viewerRole: Role = currentUser?.role ?? 'user'
  const { role } = useAuthStore()
  const viewerRole: Role = (role as Role) ?? 'user'

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true)
        const data = await getAllUsers()
        setUsers(data)
        setError(null)
      } catch (err: any) {
        console.error('Failed to fetch users:', err)
        setError(err.message || 'Failed to load users')
      } finally {
        setLoading(false)
      }
    }
    fetchUsers()
  }, [])

  // ── Toggle active / disable ───────────────────────────────────────────────
  const handleToggleStatus = async (id: number) => {
    try {
      // TODO: call your API, e.g. await toggleUserStatus(id)
      setUsers(prev =>
        prev.map(u => u.id === id ? { ...u, is_active: !u.is_active } : u)
      )
    } catch (err: any) {
      console.error('Failed to toggle user status:', err)
    }
  }

  // ── Edit user ─────────────────────────────────────────────────────────────
  const handleEdit = (user: User) => {
    setEditTarget(user)
    // TODO: open your edit modal here, e.g. setEditModalOpen(true)
    console.log('Edit user:', user)
  }

  const filtered = users.filter((u) => {
    const matchSearch =
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === 'all' || u.role === roleFilter
    return matchSearch && matchRole
  })

  const superAdmins  = filtered.filter(u => u.role === 'super admin')
  const admins       = filtered.filter(u => u.role === 'admin')
  const regularUsers = filtered.filter(u => u.role === 'user')

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

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">User Management</h1>
            <p className="text-slate-400 text-sm mt-0.5">Manage all PSA system accounts</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-[#0a1120] border border-[#1a2744] rounded-xl px-4 py-2">
            <span className="text-white font-semibold">{users.length}</span> total users
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl p-3">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#0a1120] border border-[#1a2744] rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-[#0a1120] border border-[#1a2744] rounded-xl px-4 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500 transition cursor-pointer"
          >
            <option value="all"         className="bg-[#0a1120]">All Roles</option>
            <option value="super admin" className="bg-[#0a1120]">Super Admin</option>
            <option value="admin"       className="bg-[#0a1120]">Admin</option>
            <option value="user"        className="bg-[#0a1120]">User</option>
          </select>
        </div>

        {/* ── Super Admin group — centered single card (no kebab ever) ── */}
        {(roleFilter === 'all' || roleFilter === 'super admin') && (
          <div>
            <div className="w-full flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-[#1a2744]" />
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0a1120] border border-[#1a2744]">
                <span className="text-yellow-400 text-xs font-semibold uppercase tracking-widest">Super Admin</span>
                <span className="text-slate-500 text-xs">({superAdmins.length})</span>
              </div>
              <div className="flex-1 h-px bg-[#1a2744]" />
            </div>
            <div className="flex justify-center mb-8">
              {superAdmins.length === 0 ? (
                <p className="text-slate-600 text-sm py-4">No super admin accounts.</p>
              ) : (
                <div className="w-48">
                  <UserCard
                    u={superAdmins[0]}
                    viewerRole={viewerRole}
                    onToggleStatus={handleToggleStatus}
                    onEdit={handleEdit}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Admin group — collapsible ── */}
        {(roleFilter === 'all' || roleFilter === 'admin') && (
          <RoleGroup
            title="Admin"
            users={admins}
            viewerRole={viewerRole}
            onToggleStatus={handleToggleStatus}
            onEdit={handleEdit}
            defaultOpen={true}
          />
        )}

        {/* ── Users group — collapsible ── */}
        {(roleFilter === 'all' || roleFilter === 'user') && (
          <RoleGroup
            title="Users"
            users={regularUsers}
            viewerRole={viewerRole}
            onToggleStatus={handleToggleStatus}
            onEdit={handleEdit}
            defaultOpen={true}
          />
        )}

        <p className="text-slate-600 text-xs text-right">
          Showing {filtered.length} of {users.length} users
        </p>

      </div>
    </div>
  )
}
