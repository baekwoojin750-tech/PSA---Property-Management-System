import { useState, useEffect, useRef } from 'react'
import type { Asset } from './assetTypes'
import { statusColor, transformAsset } from './assetTypes'
import { PSAPropertyTag } from './assetComponents'
import { getAllAssets } from '../../services/authService'

export function AssetTagGenerator() {
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [search, setSearch] = useState('')
  const [, setOpen] = useState(false)
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const dropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        setLoading(true)
        const data = await getAllAssets()
        setAssets(data.map((a: any) => transformAsset(a)))
      } catch (err) {
        console.error('Failed to fetch assets:', err)
        setAssets([])
      } finally {
        setLoading(false)
      }
    }
    fetchAssets()
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = assets.filter(a =>
    a.itemName.toLowerCase().includes(search.toLowerCase()) ||
    a.propertyNumber.toLowerCase().includes(search.toLowerCase()) ||
    a.serialNumber.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">

      {/* ── Left: Unit Selector ── */}
      <div className="lg:col-span-2 bg-[#0d1421] border border-[#1a2744] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1a2744]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-yellow-400/15 border border-yellow-400/30 rounded-lg flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">Select Unit</h3>
              <p className="text-slate-600 text-xs">Choose an asset to generate its tag</p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {/* Search box */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, property no..."
              className="w-full bg-[#0f1623] border border-[#1e2d45] rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-yellow-500/50 transition"
            />
          </div>

          {/* Asset list */}
          <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-1">
            {loading ? (
              <div className="flex items-center justify-center py-12 gap-2">
                <div className="w-4 h-4 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
                <p className="text-slate-600 text-xs">Loading assets...</p>
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-slate-600 text-sm text-center py-8">No assets found</p>
            ) : filtered.map(asset => (
              <button
                key={asset.id}
                onClick={() => setSelectedAsset(asset)}
                className={`w-full text-left px-3.5 py-3 rounded-xl border transition-all ${
                  selectedAsset?.id === asset.id
                    ? 'bg-yellow-400/10 border-yellow-400/40 ring-1 ring-yellow-400/30'
                    : 'bg-[#0a1120] border-[#131f33] hover:bg-[#0f1a2e] hover:border-[#1a2744]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {selectedAsset?.id === asset.id && (
                        <svg className="w-3 h-3 text-yellow-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                      <p className={`text-xs font-semibold truncate ${selectedAsset?.id === asset.id ? 'text-yellow-300' : 'text-white'}`}>
                        {asset.itemName}
                      </p>
                    </div>
                    <p className="text-[10px] text-slate-500 truncate">{asset.itemDescription}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] font-mono text-blue-400">{asset.propertyNumber}</p>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${statusColor[asset.status] || ''}`}>
                      {asset.status}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-[9px] text-slate-600 font-mono">{asset.serialNumber}</span>
                  <span className="text-[9px] text-slate-600">•</span>
                  <span className="text-[9px] text-slate-600">{asset.location}</span>
                  <span className="text-[9px] text-slate-600">•</span>
                  <span className="text-[9px] text-slate-600">{asset.equipmentCategory}</span>
                </div>
              </button>
            ))}
          </div>

          {selectedAsset && (
            <button
              onClick={() => setSelectedAsset(null)}
              className="w-full text-center text-xs text-slate-600 hover:text-red-400 transition py-1"
            >
              Clear selection
            </button>
          )}
        </div>
      </div>

      {/* ── Right: Tag Preview ── */}
      <div className="lg:col-span-3 bg-[#0d1421] border border-[#1a2744] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1a2744] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-yellow-400/15 border border-yellow-400/30 rounded-lg flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">Tag Preview</h3>
              <p className="text-slate-600 text-xs">
                {selectedAsset ? `Showing tag for ${selectedAsset.propertyNumber}` : 'Select a unit on the left to preview its tag'}
              </p>
            </div>
          </div>
          {selectedAsset && (
            <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold ${statusColor[selectedAsset.status] || ''}`}>
              {selectedAsset.status}
            </span>
          )}
        </div>

        <div className="p-6">
          {!selectedAsset ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              {/* Placeholder tag outline */}
              <div className="border-[2.5px] border-dashed border-slate-700 rounded-sm px-8 py-5 opacity-40"
                style={{ background: 'rgba(255,230,0,0.04)', minWidth: 320 }}>
                <div className="text-center text-xs font-black text-slate-600 border-b border-slate-700 pb-1 mb-2 tracking-wide">PSA PROPERTY</div>
                <div className="flex gap-3">
                  <div className="flex-1 space-y-2">
                    {['ARTICLE', 'PROP No.', 'SERIAL No.', 'OFFICE', 'CUSTODIAN', 'COST', 'DATE'].map(l => (
                      <div key={l} className="flex items-center gap-1">
                        <span className="text-[6px] font-black text-slate-700 w-14">{l}</span>
                        <div className="flex-1 border-b border-slate-800 h-3" />
                      </div>
                    ))}
                  </div>
                  <div className="w-16 h-16 border border-slate-700 flex items-center justify-center">
                    <svg className="w-6 h-6 text-slate-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                  </div>
                </div>
                <div className="text-center text-[6px] font-black text-slate-700 border-t border-slate-800 mt-1.5 pt-1">(DO NOT DETACH OR MUTILATE)</div>
              </div>
              <p className="text-slate-600 text-sm">← Select a unit from the list to generate its PSA property tag</p>
            </div>
          ) : (
            <PSAPropertyTag asset={selectedAsset} />
          )}
        </div>
      </div>

    </div>
  )
}
