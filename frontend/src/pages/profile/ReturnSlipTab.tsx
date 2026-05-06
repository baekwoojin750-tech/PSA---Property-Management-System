// src/pages/profile/ReturnSlipTab.tsx

type ReturnRecord = {
  id: number
  item: string
  borrowDate: string
  returnedDate: string
  condition: 'Good' | 'Damaged' | 'Lost'
  status: 'Pending' | 'Confirmed'
}

const mockReturns: ReturnRecord[] = [
  // Replace with real data / API call as needed
]

const conditionConfig: Record<ReturnRecord['condition'], string> = {
  Good:    'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
  Damaged: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
  Lost:    'bg-red-400/10 text-red-400 border-red-400/20',
}

const statusConfig: Record<ReturnRecord['status'], string> = {
  Pending:   'bg-amber-400/10 text-amber-400 border-amber-400/20',
  Confirmed: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
}

export default function ReturnSlipTab() {
  return (
    <div className="bg-[#0a1120] border border-[#1a2744] rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-[#1a2744] flex items-center justify-between">
        <p className="text-white font-semibold text-sm">Return Slip Records</p>
        <span className="text-xs text-slate-500">{mockReturns.length} records</span>
      </div>

      {mockReturns.length === 0 ? (
        <div className="py-10 text-center text-slate-600 text-sm">No return slip records yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1a2744]">
                {['Item', 'Borrow Date', 'Returned', 'Condition', 'Status'].map(h => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a2744]">
              {mockReturns.map(r => (
                <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-3.5 text-white text-sm font-medium">{r.item}</td>
                  <td className="px-6 py-3.5 text-slate-400 text-xs font-mono">{r.borrowDate}</td>
                  <td className="px-6 py-3.5 text-slate-400 text-xs font-mono">{r.returnedDate}</td>
                  <td className="px-6 py-3.5">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${conditionConfig[r.condition]}`}>
                      {r.condition}
                    </span>
                  </td>
                  <td className="px-6 py-3.5">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${statusConfig[r.status]}`}>
                      {r.status}
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