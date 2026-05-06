import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { logoutUserWithActivity } from '../../services/authService'
import BorrowTab from '../borrow/BorrowTab'
import GatePassTab from '../borrow/GatepassTab'
import ReturnSlipTab from '../borrow/ReturnSlipTab'

// ─── Types ────────────────────────────────────────────────────────────────────
type ActivePage   = 'profile' | 'activity' | 'borrow' | 'gatepass' | 'return'
type LogType      = 'login' | 'logout' | 'profile' | 'request'

type ActivityLog  = { id: number; action: string; detail: string; timestamp: string; type: LogType }
type UploadedForm = { id: number; name: string; uploadedAt: string; url: string; size: string }

// ─── Mock data (extend logs to 32 to test pagination) ────────────────────────
const mockLogs: ActivityLog[] = [
  { id:  1, action: 'Login',           detail: 'Signed in from Chrome · Windows',       timestamp: '2025-04-28 08:32 AM', type: 'login'   },
  { id:  2, action: 'Edit Profile',    detail: 'Updated department field',               timestamp: '2025-04-27 03:15 PM', type: 'profile' },
  { id:  3, action: 'Change Photo',    detail: 'Profile picture updated',                timestamp: '2025-04-27 03:10 PM', type: 'profile' },
  { id:  4, action: 'Logout',          detail: 'Session ended',                          timestamp: '2025-04-26 05:00 PM', type: 'logout'  },
  { id:  5, action: 'Login',           detail: 'Signed in from Firefox · macOS',         timestamp: '2025-04-26 08:45 AM', type: 'login'   },
  { id:  6, action: 'Submit Request',  detail: 'Borrow request #BR-0012 submitted',      timestamp: '2025-04-25 02:30 PM', type: 'request' },
  { id:  7, action: 'Logout',          detail: 'Session ended',                          timestamp: '2025-04-25 05:10 PM', type: 'logout'  },
  { id:  8, action: 'Login',           detail: 'Signed in from Safari · iOS',            timestamp: '2025-04-24 09:00 AM', type: 'login'   },
  { id:  9, action: 'Submit Request',  detail: 'Gate pass #GP-0008 submitted',           timestamp: '2025-04-24 11:20 AM', type: 'request' },
  { id: 10, action: 'Edit Profile',    detail: 'Updated email address',                  timestamp: '2025-04-24 02:00 PM', type: 'profile' },
  { id: 11, action: 'Logout',          detail: 'Session ended',                          timestamp: '2025-04-24 06:00 PM', type: 'logout'  },
  { id: 12, action: 'Login',           detail: 'Signed in from Chrome · Linux',          timestamp: '2025-04-23 07:55 AM', type: 'login'   },
  { id: 13, action: 'Submit Request',  detail: 'Return slip #RS-0003 submitted',         timestamp: '2025-04-23 10:15 AM', type: 'request' },
  { id: 14, action: 'Edit Profile',    detail: 'Updated full name',                      timestamp: '2025-04-22 04:30 PM', type: 'profile' },
  { id: 15, action: 'Login',           detail: 'Signed in from Edge · Windows',          timestamp: '2025-04-21 08:10 AM', type: 'login'   },
  { id: 16, action: 'Logout',          detail: 'Session ended',                          timestamp: '2025-04-21 05:30 PM', type: 'logout'  },
  { id: 17, action: 'Submit Request',  detail: 'Borrow request #BR-0015 submitted',      timestamp: '2025-04-20 01:45 PM', type: 'request' },
  { id: 18, action: 'Login',           detail: 'Signed in from Chrome · Android',        timestamp: '2025-04-19 09:30 AM', type: 'login'   },
  { id: 19, action: 'Edit Profile',    detail: 'Updated department field',               timestamp: '2025-04-19 11:00 AM', type: 'profile' },
  { id: 20, action: 'Logout',          detail: 'Session ended',                          timestamp: '2025-04-19 06:00 PM', type: 'logout'  },
  { id: 21, action: 'Login',           detail: 'Signed in from Firefox · Windows',       timestamp: '2025-04-18 08:05 AM', type: 'login'   },
  { id: 22, action: 'Submit Request',  detail: 'Gate pass #GP-0010 submitted',           timestamp: '2025-04-18 10:50 AM', type: 'request' },
  { id: 23, action: 'Logout',          detail: 'Session ended',                          timestamp: '2025-04-18 05:00 PM', type: 'logout'  },
  { id: 24, action: 'Login',           detail: 'Signed in from Chrome · Windows',        timestamp: '2025-04-17 07:58 AM', type: 'login'   },
  { id: 25, action: 'Edit Profile',    detail: 'Updated profile picture',                timestamp: '2025-04-17 09:20 AM', type: 'profile' },
  { id: 26, action: 'Submit Request',  detail: 'Return slip #RS-0005 submitted',         timestamp: '2025-04-17 03:00 PM', type: 'request' },
  { id: 27, action: 'Logout',          detail: 'Session ended',                          timestamp: '2025-04-17 06:15 PM', type: 'logout'  },
  { id: 28, action: 'Login',           detail: 'Signed in from Safari · macOS',          timestamp: '2025-04-16 08:40 AM', type: 'login'   },
  { id: 29, action: 'Submit Request',  detail: 'Borrow request #BR-0020 submitted',      timestamp: '2025-04-16 02:10 PM', type: 'request' },
  { id: 30, action: 'Edit Profile',    detail: 'Changed notification preferences',       timestamp: '2025-04-16 04:00 PM', type: 'profile' },
  { id: 31, action: 'Logout',          detail: 'Session ended',                          timestamp: '2025-04-16 05:45 PM', type: 'logout'  },
  { id: 32, action: 'Login',           detail: 'Signed in from Chrome · Windows',        timestamp: '2025-04-15 09:00 AM', type: 'login'   },
]

const logTypeConfig: Record<LogType, { color: string; dot: string; label: string }> = {
  login:   { color: 'bg-blue-400/10 text-blue-400 border-blue-400/20',       dot: 'bg-blue-400',   label: 'Login'   },
  logout:  { color: 'bg-slate-400/10 text-slate-400 border-slate-400/20',    dot: 'bg-slate-400',  label: 'Logout'  },
  profile: { color: 'bg-purple-400/10 text-purple-400 border-purple-400/20', dot: 'bg-purple-400', label: 'Profile' },
  request: { color: 'bg-amber-400/10 text-amber-400 border-amber-400/20',    dot: 'bg-amber-400',  label: 'Request' },
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const ProfileIcon  = ({ active }: { active: boolean }) => (
  <svg className={`w-5 h-5 shrink-0 transition-colors ${active ? 'text-blue-400' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
  </svg>
)
const ActivityIcon = ({ active }: { active: boolean }) => (
  <svg className={`w-5 h-5 shrink-0 transition-colors ${active ? 'text-blue-400' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
  </svg>
)
const BorrowIcon   = ({ active }: { active: boolean }) => (
  <svg className={`w-5 h-5 shrink-0 transition-colors ${active ? 'text-blue-400' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007Z" />
  </svg>
)
const GatepassIcon = ({ active }: { active: boolean }) => (
  <svg className={`w-5 h-5 shrink-0 transition-colors ${active ? 'text-blue-400' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 0 0-2 2v3a2 2 0 1 1 0 4v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3a2 2 0 1 1 0-4V7a2 2 0 0 0-2-2H5Z" />
  </svg>
)
const ReturnIcon   = ({ active }: { active: boolean }) => (
  <svg className={`w-5 h-5 shrink-0 transition-colors ${active ? 'text-blue-400' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 0 1 8 8v2M3 10l6 6m-6-6 6-6" />
  </svg>
)
const LogoutIcon   = () => (
  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H15" />
  </svg>
)
const MenuOpenIcon  = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
  </svg>
)
const MenuCloseIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
  </svg>
)
const DotsIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <circle cx="5"  cy="12" r="1.5" />
    <circle cx="12" cy="12" r="1.5" />
    <circle cx="19" cy="12" r="1.5" />
  </svg>
)
const ChevronLeft  = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
  </svg>
)
const ChevronRight = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
  </svg>
)

// ─── Pagination component ─────────────────────────────────────────────────────
function Pagination({ page, total, perPage, onChange }: { page: number; total: number; perPage: number; onChange: (p: number) => void }) {
  const totalPages = Math.ceil(total / perPage)
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-[#1a2744]">
      <span className="text-xs text-slate-500">
        Showing {Math.min((page - 1) * perPage + 1, total)}–{Math.min(page * perPage, total)} of {total}
      </span>
      <div className="flex items-center gap-1">
        <button
          disabled={page === 1}
          onClick={() => onChange(page - 1)}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2744] disabled:opacity-30 disabled:cursor-not-allowed transition"
        >
          <ChevronLeft />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-medium transition ${
              p === page ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-[#1a2744]'
            }`}
          >
            {p}
          </button>
        ))}
        <button
          disabled={page === totalPages}
          onClick={() => onChange(page + 1)}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2744] disabled:opacity-30 disabled:cursor-not-allowed transition"
        >
          <ChevronRight />
        </button>
      </div>
    </div>
  )
}

// ─── 3-dot dropdown for file rows ─────────────────────────────────────────────
function FileRowMenu({ file, onRemove }: { file: UploadedForm; onRemove: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleDownload = () => {
    const a = document.createElement('a')
    a.href = file.url
    a.download = file.name
    a.click()
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2744] transition"
      >
        <DotsIcon />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-50 w-36 bg-[#0f1a2e] border border-[#1a2744] rounded-xl shadow-xl overflow-hidden">
          <a
            href={file.url}
            target="_blank"
            rel="noreferrer"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-slate-300 hover:text-white hover:bg-[#1a2744] transition"
          >
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
            View
          </a>
          <button
            onClick={handleDownload}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-slate-300 hover:text-white hover:bg-[#1a2744] transition"
          >
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Download
          </button>
          <div className="h-px bg-[#1a2744]" />
          <button
            onClick={() => { onRemove(); setOpen(false) }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/5 transition"
          >
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
            Remove
          </button>
        </div>
      )}
    </div>
  )
}

// ─── FormUploadSection ────────────────────────────────────────────────────────
const UPLOAD_PER_PAGE = 20

function FormUploadSection({
  label, description, inputRef, forms, setter, accept,
}: {
  label: string
  description: string
  inputRef: React.RefObject<HTMLInputElement | null>
  forms: UploadedForm[]
  setter: React.Dispatch<React.SetStateAction<UploadedForm[]>>
  accept?: string
}) {
  const [search, setSearch]   = useState('')
  const [page, setPage]       = useState(1)
  const [dupWarning, setDupWarning] = useState<string | null>(null)

  const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const duplicates: string[] = []
    const newEntries: UploadedForm[] = []

    files.forEach((f, i) => {
      const alreadyExists = forms.some(existing => existing.name === f.name)
      if (alreadyExists) {
        duplicates.push(f.name)
      } else {
        const sizeKb = f.size / 1024
        const sizeStr = sizeKb >= 1024
          ? `${(sizeKb / 1024).toFixed(1)} MB`
          : `${sizeKb.toFixed(0)} KB`
        newEntries.push({
          id: Date.now() + i,
          name: f.name,
          uploadedAt: new Date().toLocaleString(),
          url: URL.createObjectURL(f),
          size: sizeStr,
        })
      }
    })

    if (duplicates.length > 0) {
      setDupWarning(`Already uploaded: ${duplicates.join(', ')}`)
      setTimeout(() => setDupWarning(null), 4000)
    }
    if (newEntries.length > 0) setter(prev => [...prev, ...newEntries])
    e.target.value = ''
  }, [forms, setter])

  const filtered = forms.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase())
  )
  const paginated  = filtered.slice((page - 1) * UPLOAD_PER_PAGE, page * UPLOAD_PER_PAGE)

  // Reset to page 1 on search change
  const handleSearch = (v: string) => { setSearch(v); setPage(1) }

  return (
    <div className="bg-[#080e1a] border border-[#1a2744] rounded-xl overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#1a2744]">
        <div>
          <p className="text-white text-sm font-semibold">{label}</p>
          <p className="text-slate-500 text-xs mt-0.5">{description}</p>
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1m-4-8-4-4m0 0L8 8m4-4v12" />
          </svg>
          Upload
        </button>
        <input ref={inputRef} type="file" accept={accept || '*'} multiple className="hidden" onChange={handleUpload} />
      </div>

      {/* Duplicate warning */}
      {dupWarning && (
        <div className="mx-5 mt-3 px-4 py-2.5 bg-amber-500/10 border border-amber-500/25 rounded-lg flex items-start gap-2">
          <svg className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <p className="text-amber-400 text-xs">{dupWarning}</p>
        </div>
      )}

      {forms.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center gap-2 py-10 cursor-pointer group"
          onClick={() => inputRef.current?.click()}
        >
          <div className="w-10 h-10 rounded-full border border-dashed border-[#1a2744] group-hover:border-blue-500 flex items-center justify-center transition">
            <svg className="w-4 h-4 text-slate-600 group-hover:text-blue-400 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <p className="text-slate-600 text-xs">Click to upload {label.toLowerCase()}</p>
        </div>
      ) : (
        <>
          {/* Filter bar */}
          <div className="px-5 py-2.5 border-b border-[#1a2744] flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                type="text"
                placeholder="Filter by file name…"
                value={search}
                onChange={e => handleSearch(e.target.value)}
                className="w-full bg-[#0f1a2e] border border-[#1a2744] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-600 outline-none focus:border-blue-500 transition"
              />
            </div>
            <span className="text-xs text-slate-500 shrink-0">{filtered.length} file{filtered.length !== 1 ? 's' : ''}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1a2744]">
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">File Name</th>
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Size</th>
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Uploaded At</th>
                  <th className="px-5 py-2.5 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a2744]">
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-slate-600 text-xs">No files match your filter.</td>
                  </tr>
                ) : paginated.map(f => (
                  <tr key={f.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2Z" />
                        </svg>
                        <span className="text-white text-sm truncate max-w-[220px]">{f.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-400 text-xs font-mono">{f.size}</td>
                    <td className="px-5 py-3 text-slate-400 text-xs font-mono">{f.uploadedAt}</td>
                    <td className="px-5 py-3 text-right">
                      <FileRowMenu
                        file={f}
                        onRemove={() => setter(prev => prev.filter(x => x.id !== f.id))}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination page={page} total={filtered.length} perPage={UPLOAD_PER_PAGE} onChange={setPage} />
        </>
      )}
    </div>
  )
}

// ─── Activity Logs section ────────────────────────────────────────────────────
const LOG_PER_PAGE = 30
const LOG_TYPES: { value: LogType | 'all'; label: string }[] = [
  { value: 'all',     label: 'All Types' },
  { value: 'login',   label: 'Login'     },
  { value: 'logout',  label: 'Logout'    },
  { value: 'profile', label: 'Profile'   },
  { value: 'request', label: 'Request'   },
]

function ActivityLogsSection() {
  const [typeFilter, setTypeFilter] = useState<LogType | 'all'>('all')
  const [search, setSearch]         = useState('')
  const [page, setPage]             = useState(1)

  const filtered = mockLogs.filter(log => {
    const matchType   = typeFilter === 'all' || log.type === typeFilter
    const matchSearch = log.action.toLowerCase().includes(search.toLowerCase()) ||
                        log.detail.toLowerCase().includes(search.toLowerCase())
    return matchType && matchSearch
  })

  const paginated = filtered.slice((page - 1) * LOG_PER_PAGE, page * LOG_PER_PAGE)

  const handleTypeFilter = (v: LogType | 'all') => { setTypeFilter(v); setPage(1) }
  const handleSearch     = (v: string)           => { setSearch(v);     setPage(1) }

  return (
    <div className="bg-[#0a1120] border border-[#1a2744] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#1a2744] flex items-center justify-between">
        <p className="text-white font-semibold text-sm">Recent Activity</p>
        <span className="text-xs text-slate-500">{filtered.length} event{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 border-b border-[#1a2744] flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            placeholder="Search action or detail…"
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="w-full bg-[#0f1a2e] border border-[#1a2744] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-600 outline-none focus:border-blue-500 transition"
          />
        </div>

        {/* Type filter pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {LOG_TYPES.map(lt => (
            <button
              key={lt.value}
              onClick={() => handleTypeFilter(lt.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition border ${
                typeFilter === lt.value
                  ? lt.value === 'all'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : `${logTypeConfig[lt.value as LogType].color} border-current`
                  : 'text-slate-500 border-[#1a2744] hover:text-white hover:border-slate-500'
              }`}
            >
              {lt.value !== 'all' && typeFilter === lt.value && (
                <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${logTypeConfig[lt.value as LogType].dot}`} />
              )}
              {lt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1a2744]">
              {['Action', 'Detail', 'Type', 'Timestamp'].map(h => (
                <th key={h} className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1a2744]">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-slate-600 text-sm">No activity matches your filters.</td>
              </tr>
            ) : paginated.map(log => (
              <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-6 py-3.5 text-white text-sm font-medium">{log.action}</td>
                <td className="px-6 py-3.5 text-slate-400 text-sm">{log.detail}</td>
                <td className="px-6 py-3.5">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${logTypeConfig[log.type].color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${logTypeConfig[log.type].dot}`} />
                    {logTypeConfig[log.type].label}
                  </span>
                </td>
                <td className="px-6 py-3.5 text-slate-400 text-xs font-mono">{log.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} total={filtered.length} perPage={LOG_PER_PAGE} onChange={setPage} />
    </div>
  )
}

// ─── Sidebar nav items ────────────────────────────────────────────────────────
const NAV_ITEMS: { page: ActivePage; label: string; icon: (active: boolean) => React.ReactNode }[] = [
  { page: 'profile',  label: 'My Profile',    icon: a => <ProfileIcon  active={a} /> },
  { page: 'activity', label: 'Activity Logs', icon: a => <ActivityIcon active={a} /> },
  { page: 'borrow',   label: 'Borrow Request',icon: a => <BorrowIcon   active={a} /> },
  { page: 'gatepass', label: 'Gate Pass',     icon: a => <GatepassIcon active={a} /> },
  { page: 'return',   label: 'Return Slip',   icon: a => <ReturnIcon   active={a} /> },
]

// ─── Main Component ───────────────────────────────────────────────────────────
export default function UserLayout() {
  const navigate = useNavigate()
  const { user, logout, role } = useAuthStore()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activePage, setActivePage]   = useState<ActivePage>('profile')

  const [isEditing, setIsEditing] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const fileInputRef              = useRef<HTMLInputElement>(null)
  const [form, setForm]           = useState({ fullName: user?.full_name || '', email: user?.email || '', department: '' })
  const [saved, setSaved]         = useState({ ...form })

  const borrowRef   = useRef<HTMLInputElement>(null)
  const gatepassRef = useRef<HTMLInputElement>(null)
  const returnRef   = useRef<HTMLInputElement>(null)
  const [borrowForms,   setBorrowForms]   = useState<UploadedForm[]>([])
  const [gatepassForms, setGatepassForms] = useState<UploadedForm[]>([])
  const [returnForms,   setReturnForms]   = useState<UploadedForm[]>([])

  const getInitials = (name: string) =>
    name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U'

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setAvatarUrl(URL.createObjectURL(file))
  }
  const handleSave   = () => { setSaved({ ...form }); setIsEditing(false) }
  const handleCancel = () => { setForm({ ...saved }); setIsEditing(false) }


  const inputClass = (editable: boolean) =>
    `text-sm font-medium w-full bg-transparent outline-none transition-all duration-200 ${
      editable
        ? 'text-white border-b border-blue-500 pb-0.5 focus:border-blue-400'
        : 'text-white border-b border-transparent pb-0.5 cursor-default'
    }`

  const pageTitles: Record<ActivePage, { title: string; subtitle: string }> = {
    profile:  { title: 'My Profile',     subtitle: 'View and manage your account information'         },
    activity: { title: 'Activity Logs',  subtitle: 'Your recent account activity and session history' },
    borrow:   { title: 'Borrow Request', subtitle: 'Submit and track equipment borrow requests'       },
    gatepass: { title: 'Gate Pass',      subtitle: 'Generate and manage gate pass slips'              },
    return:   { title: 'Return Slip',    subtitle: 'Process and record equipment returns'             },
  }

  return (
    <div className="min-h-screen bg-[#080e1a] flex">

      {/* ── Vertical Sidebar ─────────────────────────────────────────────────── */}
      <aside className={`
        fixed top-0 left-0 h-full z-40 flex flex-col
        bg-[#080e1a] border-r border-[#1a2744]
        transition-all duration-300 ease-in-out
        ${sidebarOpen ? 'w-56' : 'w-[60px]'}
      `}>
        {/* Toggle */}
        <div className={`flex items-center h-14 border-b border-[#1a2744] px-3 ${sidebarOpen ? 'justify-between' : 'justify-center'}`}>
          {sidebarOpen && (
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center shrink-0">
                <span className="text-white text-[10px] font-bold">P</span>
              </div>
              <span className="text-white font-bold text-sm tracking-wide whitespace-nowrap">
                PSA <span className="text-blue-400">PMS</span>
              </span>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2744] transition shrink-0"
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? <MenuCloseIcon /> : <MenuOpenIcon />}
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 space-y-1 px-2">
          {NAV_ITEMS.map(({ page, label, icon }) => {
            const isActive = activePage === page
            return (
              <button
                key={page}
                onClick={() => setActivePage(page)}
                title={!sidebarOpen ? label : undefined}
                className={`
                  w-full flex items-center gap-3 rounded-xl transition-all duration-200
                  ${sidebarOpen ? 'px-3 py-2.5' : 'px-0 py-2.5 justify-center'}
                  ${isActive
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-600/25'
                    : 'text-slate-500 hover:text-white hover:bg-[#0f1a2e] border border-transparent'}
                `}
              >
                {icon(isActive)}
                {sidebarOpen && <span className="text-sm font-medium whitespace-nowrap">{label}</span>}
              </button>
            )
          })}
        </nav>

        {/* Bottom */}
        <div className="border-t border-[#1a2744] py-3 px-2 space-y-1">
          <button
            onClick={async () => {
              if (user?.id && user?.email && user?.full_name && role) {
                await logoutUserWithActivity(user.id, user.email, user.full_name, role)
              }
              logout()
              navigate('/login')
            }}
            title={!sidebarOpen ? 'Sign Out' : undefined}
            className={`w-full flex items-center gap-3 rounded-xl py-2.5 transition-all duration-200 text-slate-500 hover:text-red-400 hover:bg-red-500/5 border border-transparent hover:border-red-500/15 ${sidebarOpen ? 'px-3' : 'px-0 justify-center'}`}
          >
            <LogoutIcon />
            {sidebarOpen && <span className="text-sm font-medium whitespace-nowrap">Sign Out</span>}
          </button>
          <div className={`flex items-center gap-3 px-2 py-2 rounded-xl ${sidebarOpen ? '' : 'justify-center'}`} title={!sidebarOpen ? (saved.fullName || 'User') : undefined}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-800 flex items-center justify-center text-white text-xs font-bold shadow shrink-0 overflow-hidden">
              {avatarUrl
                ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover rounded-full" />
                : getInitials(saved.fullName || 'User')}
            </div>
            {sidebarOpen && (
              <div className="overflow-hidden">
                <p className="text-white text-xs font-semibold truncate leading-tight">{saved.fullName || '—'}</p>
                <p className="text-slate-500 text-[10px] truncate">{saved.email || '—'}</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <main className={`flex-1 min-h-screen transition-all duration-300 ease-in-out ${sidebarOpen ? 'ml-56' : 'ml-[60px]'}`}>
        <div className="max-w-5xl mx-auto px-6 pt-10 pb-10 space-y-6">

          <div>
            <h1 className="text-2xl font-bold text-white">{pageTitles[activePage].title}</h1>
            <p className="text-slate-400 text-sm mt-0.5">{pageTitles[activePage].subtitle}</p>
          </div>

          {/* ── PROFILE PAGE ── */}
          {activePage === 'profile' && (
            <div className="space-y-4">
              <div className="bg-[#0a1120] border border-[#1a2744] rounded-2xl overflow-hidden">
                <div className="flex flex-col sm:flex-row">
                  <div className="flex flex-col items-center justify-center gap-3 px-8 py-8 sm:w-64 border-b sm:border-b-0 sm:border-r border-[#1a2744]">
                    <div className="relative">
                      <div className="w-28 h-28 rounded-full bg-gradient-to-br from-blue-500 to-blue-800 flex items-center justify-center text-white text-3xl font-bold shadow-lg overflow-hidden">
                        {avatarUrl
                          ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                          : getInitials(saved.fullName || 'User')}
                      </div>
                      <button onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 hover:bg-blue-500 rounded-full flex items-center justify-center shadow-lg transition-colors border-2 border-[#0a1120]">
                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                    </div>
                    <div className="text-center">
                      <p className="text-white font-semibold text-lg leading-tight">{saved.fullName || '—'}</p>
                      <p className="text-slate-400 text-xs mt-0.5">{saved.email || '—'}</p>
                      <span className="inline-block mt-2 text-xs font-semibold px-3 py-1 rounded-full border bg-slate-400/10 text-slate-400 border-slate-400/30">User</span>
                    </div>
                  </div>
                  <div className="flex-1 px-6 py-6 space-y-5">
                    <div className="flex items-center justify-between">
                      <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest">Account Details</p>
                      {isEditing ? (
                        <div className="flex gap-2">
                          <button onClick={handleCancel} className="text-xs px-3 py-1.5 rounded-lg border border-[#1a2744] text-slate-400 hover:text-white transition">Cancel</button>
                          <button onClick={handleSave}   className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition">Save Changes</button>
                        </div>
                      ) : (
                        <button onClick={() => setIsEditing(true)}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[#1a2744] text-slate-400 hover:text-white hover:border-blue-500 transition">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 1 1 3.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                          Edit
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                      {[
                        { label: 'Full Name',     key: 'fullName',   editable: true  },
                        { label: 'Email Address', key: 'email',      editable: true  },
                        { label: 'Department',    key: 'department', editable: true  },
                        { label: 'Role',          key: 'role',       editable: false },
                      ].map(field => (
                        <div key={field.key} className="space-y-1">
                          <p className="text-slate-500 text-xs">{field.label}</p>
                          <input
                            className={inputClass(isEditing && field.editable)}
                            value={field.key === 'role' ? 'User' : form[field.key as keyof typeof form]}
                            onChange={e => field.editable && setForm(f => ({ ...f, [field.key]: e.target.value }))}
                            readOnly={!isEditing || !field.editable}
                            placeholder="—"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick nav cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {([
                  { page: 'activity' as ActivePage, label: 'Activity Logs',  sub: 'View your recent account activity', icon: <ActivityIcon active={false} /> },
                  { page: 'borrow'   as ActivePage, label: 'Borrow Request', sub: 'Submit and track borrow requests',  icon: <BorrowIcon   active={false} /> },
                  { page: 'gatepass' as ActivePage, label: 'Gate Pass',      sub: 'Generate gate pass slips',          icon: <GatepassIcon active={false} /> },
                  { page: 'return'   as ActivePage, label: 'Return Slip',    sub: 'Process equipment returns',         icon: <ReturnIcon   active={false} /> },
                ]).map(card => (
                  <button key={card.page} onClick={() => setActivePage(card.page)}
                    className="flex items-center gap-4 bg-[#0a1120] hover:bg-[#0f1a2e] border border-[#1a2744] hover:border-blue-600/30 rounded-2xl px-5 py-4 text-left transition-all duration-200 group">
                    <div className="w-9 h-9 rounded-xl bg-[#0f1a2e] group-hover:bg-blue-600/10 border border-[#1a2744] group-hover:border-blue-600/20 flex items-center justify-center transition-all">
                      {card.icon}
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm font-semibold">{card.label}</p>
                      <p className="text-slate-500 text-xs mt-0.5">{card.sub}</p>
                    </div>
                    <ChevronRight />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── ACTIVITY LOGS PAGE ── */}
          {activePage === 'activity' && <ActivityLogsSection />}

          {/* ── BORROW REQUEST PAGE ── */}
          {activePage === 'borrow' && (
            <div className="space-y-6">
              <BorrowTab />
              <FormUploadSection
                label="Borrow Slip Upload"
                description="Upload your signed borrow request forms (PDF, image)"
                inputRef={borrowRef}
                forms={borrowForms}
                setter={setBorrowForms}
                accept=".pdf,image/*"
              />
            </div>
          )}

          {/* ── GATE PASS PAGE ── */}
          {activePage === 'gatepass' && (
            <div className="space-y-6">
              <GatePassTab />
              <FormUploadSection
                label="Gate Pass Upload"
                description="Upload your approved gate pass documents (PDF, image)"
                inputRef={gatepassRef}
                forms={gatepassForms}
                setter={setGatepassForms}
                accept=".pdf,image/*"
              />
            </div>
          )}

          {/* ── RETURN SLIP PAGE ── */}
          {activePage === 'return' && (
            <div className="space-y-6">
              <ReturnSlipTab />
              <FormUploadSection
                label="Return Slip Upload"
                description="Upload your signed return slip documents (PDF, image)"
                inputRef={returnRef}
                forms={returnForms}
                setter={setReturnForms}
                accept=".pdf,image/*"
              />
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
