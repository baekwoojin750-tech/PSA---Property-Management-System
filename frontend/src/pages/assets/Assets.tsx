import { useState } from 'react'
import { AssetRegistration } from './AssetRegistration'
import { AssetScanner } from './AssetScanner'
import { AssetTagGenerator } from './AssetTagGenerator'

// ─── Main Assets Page ─────────────────────────────────────────────────────────
const tabs = [
  { key: 'registration', label: 'Assets Registration' },
  { key: 'scanner', label: 'Assets Scanner' },
  { key: 'generator', label: 'Asset Tag Generator' },
]

export default function Assets() {
  const [activeTab, setActiveTab] = useState('registration')

  return (
    <div className="max-w-7xl mx-auto px-4 pt-28 pb-10 space-y-6">

      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-white">Assets</h1>
        <p className="text-slate-400 text-sm mt-0.5">Manage and track PSA property assets</p>
      </div>

      {/* Tabs — scrollable on mobile so all tabs are always reachable */}
      <div className="overflow-x-auto -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
        <div className="flex gap-1 bg-slate-900 border border-slate-700 rounded-2xl p-1.5 w-fit min-w-full sm:min-w-0">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 sm:flex-none px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'registration' && <AssetRegistration />}
      {activeTab === 'scanner' && <AssetScanner />}
      {activeTab === 'generator' && <AssetTagGenerator />}

    </div>
  )
}