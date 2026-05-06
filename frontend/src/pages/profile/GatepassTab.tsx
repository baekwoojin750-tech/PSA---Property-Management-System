// src/pages/profile/GatepassTab.tsx

type GatepassRecord = {
  id: number
  destination: string
  purpose: string
  departureDate: string
  returnDate: string
  status: 'Pending' | 'Approved' | 'Rejected'
}

const mockGatepasses: GatepassRecord[] = [
  // Replace with real data / API call as needed
]

const statusConfig: Record<GatepassRecord['status'], string> = {
  Pending:  'bg-amber-400/10 text-amber-400 border-amber-400/20',
  Approved: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
  Rejected: 'bg-red-400/10 text-red-400 border-red-400/20',
}

export default function GatepassTab() {
  return (
    <div className="bg-[#0a1120] border border-[#1a2744] rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-[#1a2744] flex items-center justify-between">
        <p className="text-white font-semibold text-sm">Gate Pass Records</p>
        <span className="text-xs text-slate-500">{mockGatepasses.length} records</span>
      </div>

      {mockGatepasses.length === 0 ? (
        <div className="py-10 text-center text-slate-600 text-sm">No gate pass records yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1a2744]">
                {['Destination', 'Purpose', 'Departure', 'Return', 'Status'].map(h => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a2744]">
              {mockGatepasses.map(g => (
                <tr key={g.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-3.5 text-white text-sm font-medium">{g.destination}</td>
                  <td className="px-6 py-3.5 text-slate-400 text-sm">{g.purpose}</td>
                  <td className="px-6 py-3.5 text-slate-400 text-xs font-mono">{g.departureDate}</td>
                  <td className="px-6 py-3.5 text-slate-400 text-xs font-mono">{g.returnDate}</td>
                  <td className="px-6 py-3.5">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${statusConfig[g.status]}`}>
                      {g.status}
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