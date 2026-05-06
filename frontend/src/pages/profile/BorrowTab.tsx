// src/pages/profile/BorrowTab.tsx

type BorrowRecord = {
  id: number
  item: string
  purpose: string
  borrowDate: string
  returnDate: string
  status: 'Pending' | 'Approved' | 'Returned' | 'Rejected'
}

const mockBorrows: BorrowRecord[] = [
  { id: 1, item: 'Laptop Dell XPS 15',      purpose: 'Field work documentation', borrowDate: '2025-04-20', returnDate: '2025-04-25', status: 'Returned'  },
  { id: 2, item: 'Canon DSLR Camera',       purpose: 'Community survey photos',  borrowDate: '2025-04-22', returnDate: '2025-04-28', status: 'Approved'  },
  { id: 3, item: 'Projector Epson EB-S41',  purpose: 'Regional meeting',         borrowDate: '2025-04-28', returnDate: '2025-04-29', status: 'Pending'   },
  { id: 4, item: 'External Hard Drive 2TB', purpose: 'Data backup',              borrowDate: '2025-04-10', returnDate: '2025-04-12', status: 'Returned'  },
]

const statusConfig: Record<BorrowRecord['status'], string> = {
  Pending:  'bg-amber-400/10 text-amber-400 border-amber-400/20',
  Approved: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
  Returned: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
  Rejected: 'bg-red-400/10 text-red-400 border-red-400/20',
}

export default function BorrowTab() {
  return (
    <div className="bg-[#0a1120] border border-[#1a2744] rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-[#1a2744] flex items-center justify-between">
        <p className="text-white font-semibold text-sm">Borrow Records</p>
        <span className="text-xs text-slate-500">{mockBorrows.length} requests</span>
      </div>

      {mockBorrows.length === 0 ? (
        <div className="py-10 text-center text-slate-600 text-sm">No borrow records yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1a2744]">
                {['Item', 'Purpose', 'Borrow Date', 'Return Date', 'Status'].map(h => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
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
      )}
    </div>
  )
}