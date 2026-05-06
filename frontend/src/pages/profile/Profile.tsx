import { useState, useRef } from 'react'
import Navbar from '../../components/shared/Navbar'
import { useAuthStore } from '../../stores/authStore'

type ActiveTab = 'activity' | 'requests'
type RequestSubTab = 'borrow' | 'gatepass' | 'returnslip'

// ─── Mock data ────────────────────────────────────────────────────────────────
type ActivityLog = { id: number; action: string; detail: string; timestamp: string; type: 'login' | 'logout' | 'profile' | 'request' }
type BorrowRecord = { id: number; item: string; purpose: string; borrowDate: string; returnDate: string; status: 'Pending' | 'Approved' | 'Returned' | 'Rejected' }
type UploadedForm = { id: number; name: string; uploadedAt: string; url: string }

const mockLogs: ActivityLog[] = [
  { id: 1, action: 'Login',           detail: 'Signed in from Chrome · Windows',     timestamp: '2025-04-28 08:32 AM', type: 'login'   },
  { id: 2, action: 'Edit Profile',    detail: 'Updated department field',              timestamp: '2025-04-27 03:15 PM', type: 'profile' },
  { id: 3, action: 'Change Photo',    detail: 'Profile picture updated',              timestamp: '2025-04-27 03:10 PM', type: 'profile' },
  { id: 4, action: 'Logout',          detail: 'Session ended',                        timestamp: '2025-04-26 05:00 PM', type: 'logout'  },
  { id: 5, action: 'Login',           detail: 'Signed in from Firefox · macOS',       timestamp: '2025-04-26 08:45 AM', type: 'login'   },
  { id: 6, action: 'Submit Request',  detail: 'Borrow request #BR-0012 submitted',    timestamp: '2025-04-25 02:30 PM', type: 'request' },
  { id: 7, action: 'Logout',          detail: 'Session ended',                        timestamp: '2025-04-25 05:00 PM', type: 'logout'  },
]

const mockBorrows: BorrowRecord[] = [
  { id: 1, item: 'Laptop Dell XPS 15',      purpose: 'Field work documentation', borrowDate: '2025-04-20', returnDate: '2025-04-25', status: 'Returned'  },
  { id: 2, item: 'Canon DSLR Camera',       purpose: 'Community survey photos',  borrowDate: '2025-04-22', returnDate: '2025-04-28', status: 'Approved'  },
  { id: 3, item: 'Projector Epson EB-S41',  purpose: 'Regional meeting',         borrowDate: '2025-04-28', returnDate: '2025-04-29', status: 'Pending'   },
  { id: 4, item: 'External Hard Drive 2TB', purpose: 'Data backup',              borrowDate: '2025-04-10', returnDate: '2025-04-12', status: 'Returned'  },
]

export default function Profile() {
  const { user, role } = useAuthStore()

  const [activeTab, setActiveTab]         = useState<ActiveTab>('activity')
  const [requestSubTab, setRequestSubTab] = useState<RequestSubTab>('borrow')
  const [isEditing, setIsEditing]         = useState(false)
  const [avatarUrl, setAvatarUrl]         = useState<string | null>(null)
  const fileInputRef                      = useRef<HTMLInputElement>(null)

  // per-slot file inputs
  const borrowRef    = useRef<HTMLInputElement>(null)
  const gatepassRef  = useRef<HTMLInputElement>(null)
  const returnRef    = useRef<HTMLInputElement>(null)

  const [borrowForms,   setBorrowForms]   = useState<UploadedForm[]>([])
  const [gatepassForms, setGatepassForms] = useState<UploadedForm[]>([])
  const [returnForms,   setReturnForms]   = useState<UploadedForm[]>([])

  const [form, setForm] = useState({ fullName: user?.full_name || '', email: user?.email || '', department: '' })
  const [saved, setSaved] = useState({ ...form })

  const roleLabel = role === 'super admin' ? 'Super Admin' : role === 'admin' ? 'Admin' : 'User'
  const roleBadge =
    role === 'super admin' ? 'bg-yellow-400/10 text-yellow-400 border-yellow-400/30'
    : role === 'admin'     ? 'bg-blue-400/10 text-blue-400 border-blue-400/30'
                           : 'bg-slate-400/10 text-slate-400 border-slate-400/30'

  const getInitials = (name: string) =>
    name ? name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) : 'U'

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setAvatarUrl(URL.createObjectURL(file))
  }

  const handleSave   = () => { setSaved({ ...form }); setIsEditing(false) }
  const handleCancel = () => { setForm({ ...saved }); setIsEditing(false) }

  const handleFormUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<UploadedForm[]>>
  ) => {
    const files = Array.from(e.target.files || [])
    const newEntries: UploadedForm[] = files.map((f, i) => ({
      id: Date.now() + i,
      name: f.name,
      uploadedAt: new Date().toLocaleString(),
      url: URL.createObjectURL(f),
    }))
    setter(prev => [...prev, ...newEntries])
    e.target.value = ''
  }

  const inputClass = (editable: boolean) =>
    `text-sm font-medium w-full bg-transparent outline-none transition-all duration-200 ${
      editable
        ? 'text-white border-b border-blue-500 pb-0.5 focus:border-blue-400'
        : 'text-white border-b border-transparent pb-0.5 cursor-default'
    }`

  const logTypeConfig: Record<ActivityLog['type'], { color: string; dot: string; icon: string }> = {
    login:   { color: 'bg-blue-400/10 text-blue-400 border-blue-400/20',     dot: 'bg-blue-400',    icon: '→' },
    logout:  { color: 'bg-slate-400/10 text-slate-400 border-slate-400/20', dot: 'bg-slate-400',   icon: '←' },
    profile: { color: 'bg-purple-400/10 text-purple-400 border-purple-400/20', dot: 'bg-purple-400', icon: '✎' },
    request: { color: 'bg-amber-400/10 text-amber-400 border-amber-400/20',  dot: 'bg-amber-400',  icon: '⬆' },
  }

  const statusConfig: Record<BorrowRecord['status'], string> = {
    Pending:  'bg-amber-400/10 text-amber-400 border-amber-400/20',
    Approved: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
    Returned: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
    Rejected: 'bg-red-400/10 text-red-400 border-red-400/20',
  }

  // ─── Upload + Records section ─────────────────────────────────────────────
  const FormUploadSection = ({
    label, description, inputRef, forms, setter, accept
  }: {
    label: string
    description: string
    inputRef: React.RefObject<HTMLInputElement | null>
    forms: UploadedForm[]
    setter: React.Dispatch<React.SetStateAction<UploadedForm[]>>
    accept?: string
  }) => (
    <div className="bg-[#080e1a] border border-[#1a2744] rounded-xl overflow-hidden">
      {/* Header */}
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Upload
        </button>
        <input ref={inputRef} type="file" accept={accept || '*'} multiple className="hidden"
          onChange={e => handleFormUpload(e, setter)} />
      </div>

      {/* Records table */}
      {forms.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center gap-2 py-8 cursor-pointer group"
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
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1a2744]">
              <th className="text-left px-5 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">File Name</th>
              <th className="text-left px-5 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Uploaded At</th>
              <th className="px-5 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1a2744]">
            {forms.map(f => (
              <tr key={f.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-white text-sm truncate max-w-[200px]">{f.name}</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-slate-400 text-xs font-mono">{f.uploadedAt}</td>
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <a href={f.url} target="_blank" rel="noreferrer"
                      className="text-xs text-blue-400 hover:text-blue-300 transition">View</a>
                    <button onClick={() => setter(prev => prev.filter(x => x.id !== f.id))}
                      className="text-xs text-red-400 hover:text-red-300 transition">Remove</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-[#080e1a]">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 pt-28 pb-10 space-y-4">

        {/* Page title */}
        <div>
          <h1 className="text-2xl font-bold text-white">Profile</h1>
          <p className="text-slate-400 text-sm mt-0.5">View and manage your account information</p>
        </div>

        {/* Main profile card */}
        <div className="bg-[#0a1120] border border-[#1a2744] rounded-2xl overflow-hidden">
          <div className="flex flex-col sm:flex-row">
            {/* Left — Avatar */}
            <div className="flex flex-col items-center justify-center gap-3 px-8 py-8 sm:w-72 border-b sm:border-b-0 sm:border-r border-[#1a2744]">
              <div className="relative">
                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-blue-500 to-blue-800 flex items-center justify-center text-white text-3xl font-bold shadow-lg overflow-hidden">
                  {avatarUrl
                    ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                    : getInitials(saved.fullName || 'User')}
                </div>
                <button onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 hover:bg-blue-500 rounded-full flex items-center justify-center shadow-lg transition-colors border-2 border-[#0a1120]"
                  title="Change photo">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </div>
              <div className="text-center">
                <p className="text-white font-semibold text-lg leading-tight">{saved.fullName || '—'}</p>
                <p className="text-slate-400 text-xs mt-0.5">{saved.email || '—'}</p>
                <span className={`inline-block mt-2 text-xs font-semibold px-3 py-1 rounded-full border ${roleBadge}`}>{roleLabel}</span>
              </div>
            </div>

            {/* Right — Account details */}
            <div className="flex-1 px-6 py-6 space-y-5">
              <div className="flex items-center justify-between">
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest">Account Details</p>
                {isEditing ? (
                  <div className="flex gap-2">
                    <button onClick={handleCancel} className="text-xs px-3 py-1.5 rounded-lg border border-[#1a2744] text-slate-400 hover:text-white transition">Cancel</button>
                    <button onClick={handleSave} className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition">Save Changes</button>
                  </div>
                ) : (
                  <button onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[#1a2744] text-slate-400 hover:text-white hover:border-blue-500 transition">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Edit
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-1">
                  <p className="text-slate-500 text-xs">Full Name</p>
                  <input className={inputClass(isEditing)} value={form.fullName}
                    onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} readOnly={!isEditing} placeholder="—" />
                </div>
                <div className="space-y-1">
                  <p className="text-slate-500 text-xs">Email Address</p>
                  <input className={inputClass(isEditing)} value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))} readOnly={!isEditing} placeholder="—" />
                </div>
                <div className="space-y-1">
                  <p className="text-slate-500 text-xs">Department</p>
                  <input className={inputClass(isEditing)} value={form.department}
                    onChange={e => setForm(f => ({ ...f, department: e.target.value }))} readOnly={!isEditing} placeholder="—" />
                </div>
                <div className="space-y-1">
                  <p className="text-slate-500 text-xs">Role</p>
                  <input className={inputClass(false)} value={roleLabel} readOnly />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Tabs */}
        <div className="flex gap-2">
          {(['activity', 'requests'] as ActiveTab[]).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-xl text-sm font-medium transition-all duration-200 border ${
                activeTab === tab
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                  : 'bg-[#0a1120] text-slate-400 border-[#1a2744] hover:text-white hover:border-slate-600'
              }`}>
              {tab === 'activity' ? 'Activity Logs' : 'Request History'}
            </button>
          ))}
        </div>

        {/* ── Activity Logs Tab ─────────────────────────────────────────────── */}
        {activeTab === 'activity' && (
          <div className="bg-[#0a1120] border border-[#1a2744] rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#1a2744] flex items-center justify-between">
              <p className="text-white font-semibold text-sm">Recent Activity</p>
              <span className="text-xs text-slate-500">{mockLogs.length} events</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1a2744]">
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Detail</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a2744]">
                  {mockLogs.map(log => (
                    <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-3.5">
                        <p className="text-white text-sm font-medium">{log.action}</p>
                      </td>
                      <td className="px-6 py-3.5 text-slate-400 text-sm">{log.detail}</td>
                      <td className="px-6 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${logTypeConfig[log.type].color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${logTypeConfig[log.type].dot}`} />
                          {log.type.charAt(0).toUpperCase() + log.type.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-slate-400 text-xs font-mono">{log.timestamp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Request History Tab ───────────────────────────────────────────── */}
        {activeTab === 'requests' && (
          <div className="space-y-4">

            {/* Sub-tabs */}
            <div className="flex gap-1 bg-[#0a1120] border border-[#1a2744] rounded-2xl p-1.5 w-fit">
              {([
                { key: 'borrow',    label: 'Borrow Request' },
                { key: 'gatepass',  label: 'Gate Pass'      },
                { key: 'returnslip',label: 'Return Slip'    },
              ] as { key: RequestSubTab; label: string }[]).map(st => (
                <button key={st.key} onClick={() => setRequestSubTab(st.key)}
                  className={`px-4 py-2 rounded-xl text-xs font-medium transition-all duration-200 whitespace-nowrap ${
                    requestSubTab === st.key
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-[#0f1a2e]'
                  }`}>
                  {st.label}
                </button>
              ))}
            </div>

            {/* ── Borrow Request sub-tab ── */}
            {requestSubTab === 'borrow' && (
              <div className="space-y-4">
                {/* Records table */}
                <div className="bg-[#0a1120] border border-[#1a2744] rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-[#1a2744] flex items-center justify-between">
                    <p className="text-white font-semibold text-sm">Borrow Records</p>
                    <span className="text-xs text-slate-500">{mockBorrows.length} requests</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[#1a2744]">
                          <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Item</th>
                          <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Purpose</th>
                          <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Borrow Date</th>
                          <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Return Date</th>
                          <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1a2744]">
                        {mockBorrows.map(b => (
                          <tr key={b.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="px-6 py-3.5 text-white text-sm font-medium">{b.item}</td>
                            <td className="px-6 py-3.5 text-slate-400 text-sm">{b.purpose}</td>
                            <td className="px-6 py-3.5 text-slate-400 text-xs font-mono">{b.borrowDate}</td>
                            <td className="px-6 py-3.5 text-slate-400 text-xs font-mono">{b.returnDate}</td>
                            <td className="px-6 py-3.5">
                              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${statusConfig[b.status]}`}>
                                {b.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                {/* Upload */}
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

            {/* ── Gate Pass sub-tab ── */}
            {requestSubTab === 'gatepass' && (
              <div className="space-y-4">
                <div className="bg-[#0a1120] border border-[#1a2744] rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-[#1a2744] flex items-center justify-between">
                    <p className="text-white font-semibold text-sm">Gate Pass Records</p>
                    <span className="text-xs text-slate-500">0 records</span>
                  </div>
                  <div className="py-10 text-center text-slate-600 text-sm">No gate pass records yet.</div>
                </div>
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

            {/* ── Return Slip sub-tab ── */}
            {requestSubTab === 'returnslip' && (
              <div className="space-y-4">
                <div className="bg-[#0a1120] border border-[#1a2744] rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-[#1a2744] flex items-center justify-between">
                    <p className="text-white font-semibold text-sm">Return Slip Records</p>
                    <span className="text-xs text-slate-500">0 records</span>
                  </div>
                  <div className="py-10 text-center text-slate-600 text-sm">No return slip records yet.</div>
                </div>
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
        )}

      </div>
    </div>
  )
}