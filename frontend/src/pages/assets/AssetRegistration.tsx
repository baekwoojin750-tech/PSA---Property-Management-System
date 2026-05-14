import { useState, useEffect, useRef } from 'react'
import type { Asset } from './assetTypes'
import { defaultEquipmentCategories, locations, units, statuses, statusColor, transformAsset } from './assetTypes'
import { SearchableDropdown, QRCodeImage } from './assetComponents'
import { getAllAssets, createAsset, updateAsset, deleteAsset } from '../../services/authService'
import { useDialog } from '../../components/ui/GlobalDialog'

const emptyForm = {
  equipmentCategory: '', location: '', assetTag: '',
  unitCost: '', datePurchased: '', propertyNumber: '', serialNumber: '',
  unit: '', itemName: '', itemDescription: '', status: '', custodian: ''
}

export function AssetRegistration() {
  const dialog = useDialog()
  const [form, setForm] = useState(emptyForm)
  const [qrValue, setQrValue] = useState('')
  const [assets, setAssets] = useState<Asset[]>([])
  const [equipmentCategories] = useState<string[]>(defaultEquipmentCategories)
  const [search, setSearch] = useState('')
  const [locationFilter, setLocationFilter] = useState('All')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [page, setPage] = useState(1)
  const [editingPropertyNumber, setEditingPropertyNumber] = useState<string | null>(null)
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null)
  const PER_PAGE = 20
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const data = await getAllAssets()
        const transformedAssets: Asset[] = data.map((asset: any) => transformAsset(asset))
        setAssets(transformedAssets)
      } catch (err) {
        console.error('Failed to fetch assets:', err)
        setAssets([])
      } finally {
      }
    }

    fetchAssets()
  }, [])

  const formatPropertyNumber = (value: string) => {
    const digits = value.replace(/\D/g, '')
    const group1 = digits.slice(0, 4)
    const group2 = digits.slice(4, 6)
    const group3 = digits.slice(6, 9)
    const group4 = digits.slice(9)
    let formatted = group1
    if (group2) formatted += `-${group2}`
    if (group3) formatted += `-${group3}`
    if (group4) formatted += `-${group4}`
    return formatted
  }

  const isPropertyNumberValid = (value: string) => /^\d{4}-\d{2}-\d{3}-\d+$/.test(value)

  const setField = (key: string, value: string) => {
    const nextValue = key === 'propertyNumber' ? formatPropertyNumber(value) : value
    setForm(f => ({ ...f, [key]: nextValue }))
    if (key === 'propertyNumber') {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => setQrValue(nextValue), 600)
    }
  }

  useEffect(() => {
    if (!activeMenuId) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuId(null)
        setMenuPos(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [activeMenuId])

  const clearForm = () => {
    setForm(emptyForm)
    setQrValue('')
    setEditingPropertyNumber(null)
    setActiveMenuId(null)
    setMenuPos(null)
  }

  const handleEditAsset = (asset: Asset) => {
    setForm({
      equipmentCategory: asset.equipmentCategory,
      location: asset.location,
      assetTag: asset.assetTag,
      unitCost: asset.unitCost,
      datePurchased: asset.datePurchased,
      propertyNumber: asset.propertyNumber,
      serialNumber: asset.serialNumber,
      unit: asset.unit,
      itemName: asset.itemName,
      itemDescription: asset.itemDescription,
      status: asset.status || 'Serviceable',
      custodian: asset.custodian || '',
    })
    setQrValue(asset.propertyNumber)
    setEditingPropertyNumber(asset.propertyNumber)
    setActiveMenuId(null)
  }

  const handleDeleteAsset = async (propertyNumber: string) => {
    const confirmed = await dialog.confirm({
      title: 'Delete Asset',
      message: 'Delete this asset? This action cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'danger',
    })
    if (!confirmed) return
    try {
      await deleteAsset(propertyNumber)
      setAssets(prev => prev.filter(asset => asset.propertyNumber !== propertyNumber))
      if (editingPropertyNumber === propertyNumber) clearForm()
      await dialog.alert({
        title: 'Asset Deleted',
        message: 'Asset deleted successfully.',
        variant: 'success',
      })
    } catch (err) {
      console.error('Failed to delete asset:', err)
      await dialog.alert({
        title: 'Delete Failed',
        message: 'Failed to delete asset.',
        variant: 'danger',
      })
    }
  }

  const handleSubmit = async () => {
    if (!form.propertyNumber) {
      await dialog.alert({
        title: 'Property Number Required',
        message: 'Property Number is required to generate the QR code and save the asset.',
        variant: 'warning',
      })
      return
    }
    if (!isPropertyNumberValid(form.propertyNumber)) {
      await dialog.alert({
        title: 'Invalid Property Number',
        message: 'Property Number must use the format 0000-00-000-000000 with the last group able to contain one or more digits.',
        variant: 'warning',
      })
      return
    }

    const payload = {
      equipment_category: form.equipmentCategory,
      location: form.location,
      asset_tag: form.assetTag,
      unit_cost: form.unitCost,
      date_purchased: form.datePurchased || null,
      property_number: form.propertyNumber,
      serial_number: form.serialNumber,
      serial_code: form.propertyNumber,
      unit: form.unit,
      item_name: form.itemName,
      item_description: form.itemDescription,
      status: form.status || 'Serviceable',
      custodian: form.custodian,
    }

    try {
      if (editingPropertyNumber) {
        const updated = await updateAsset(editingPropertyNumber, payload)
        const transformed = transformAsset(updated)
        setAssets(prev => prev.map(asset => asset.propertyNumber === editingPropertyNumber ? transformed : asset))
        await dialog.alert({
          title: 'Asset Updated',
          message: 'Asset updated successfully.',
          variant: 'success',
        })
      } else {
        const created = await createAsset(payload)
        const transformed = transformAsset(created)
        setAssets(prev => [transformed, ...prev])
        await dialog.alert({
          title: 'Asset Created',
          message: 'Asset created successfully.',
          variant: 'success',
        })
      }
      setQrValue(form.propertyNumber)
      clearForm()
    } catch (err) {
      console.error('Failed to save asset:', err)
      await dialog.alert({
        title: 'Save Failed',
        message: 'Failed to save asset.',
        variant: 'danger',
      })
    } finally {
    }
  }

  const filtered = assets.filter(a => {
    const matchSearch = [a.itemName, a.propertyNumber, a.serialNumber, a.assetTag]
      .some(v => v.toLowerCase().includes(search.toLowerCase()))
    const matchLocation = locationFilter === 'All' || a.location === locationFilter
    const matchCategory = categoryFilter === 'All' || a.equipmentCategory === categoryFilter
    const matchStatus = statusFilter === 'All' || a.status === statusFilter
    return matchSearch && matchLocation && matchCategory && matchStatus
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  useEffect(() => { setPage(1) }, [search, locationFilter, categoryFilter, statusFilter])

  const inputClass = "w-full bg-[#0f1623] border border-[#1e2d45] rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition"
  const labelClass = "block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1"

  return (
    <div className="space-y-5">

      {/* ── Add New Asset Form ── */}
      <div className="bg-[#0d1421] border border-[#1a2744] rounded-2xl overflow-hidden">
        {/* Form header */}
        <div className="flex items-center gap-2 px-6 py-4 border-b border-[#1a2744]">
          <span className="w-5 h-5 rounded flex items-center justify-center text-blue-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </span>
          <h2 className="text-white font-semibold text-sm">Add New Asset</h2>
        </div>

        <div className="p-6 space-y-4">
          {/* Row 1: Primary asset details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className={labelClass}>Equipment Category</label>
              <SearchableDropdown options={equipmentCategories} value={form.equipmentCategory} onChange={v => setField('equipmentCategory', v)} placeholder="Select" />
            </div>
            <div>
              <label className={labelClass}>Location</label>
              <SearchableDropdown options={locations} value={form.location} onChange={v => setField('location', v)} placeholder="Select" />
            </div>
            <div>
              <label className={labelClass}>Asset Tag</label>
              <input type="text" value={form.assetTag} onChange={e => setField('assetTag', e.target.value)} className={inputClass} placeholder="e.g. PSA-2024-001" />
            </div>
            <div>
              <label className={labelClass}>Unit Cost</label>
              <input type="number" value={form.unitCost} onChange={e => setField('unitCost', e.target.value)} className={inputClass} placeholder="0.00" />
            </div>
          </div>

          {/* Row 2: Purchase and identification */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className={labelClass}>Date Purchased</label>
              <input type="date" value={form.datePurchased} onChange={e => setField('datePurchased', e.target.value)} className={`${inputClass} [color-scheme:dark]`} />
            </div>
            <div>
              <label className={labelClass}>Property Number <span className="text-blue-400 normal-case tracking-normal">· QR</span></label>
              <input
                type="text"
                inputMode="numeric"
                value={form.propertyNumber}
                onChange={e => setField('propertyNumber', e.target.value)}
                className={inputClass}
                placeholder="e.g. 1234-56-789-012345"
                pattern="\d{4}-\d{2}-\d{3}-\d+"
              />
            </div>
            <div>
              <label className={labelClass}>Serial Number</label>
              <input type="text" value={form.serialNumber} onChange={e => setField('serialNumber', e.target.value)} className={inputClass} placeholder="e.g. SN-ABC123" />
            </div>
            <div>
              <label className={labelClass}>Unit</label>
              <SearchableDropdown options={units} value={form.unit} onChange={v => setField('unit', v)} placeholder="Select" />
            </div>
          </div>

          {/* Row 3: Item details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className={labelClass}>Item Name</label>
              <input type="text" value={form.itemName} onChange={e => setField('itemName', e.target.value)} className={inputClass} placeholder="e.g. Dell Laptop" />
            </div>
            <div className="lg:col-span-3">
              <label className={labelClass}>Item Description</label>
              <input type="text" value={form.itemDescription} onChange={e => setField('itemDescription', e.target.value)} className={inputClass} placeholder="Brief description of the item" />
            </div>
          </div>

          {/* Row 4: Status & Custodian */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className={labelClass}>Status</label>
              <SearchableDropdown options={statuses} value={form.status} onChange={v => setField('status', v)} placeholder="Select" />
            </div>
            <div>
              <label className={labelClass}>Custodian</label>
              <input type="text" value={form.custodian} onChange={e => setField('custodian', e.target.value)} className={inputClass} placeholder="e.g. Juan Dela Cruz" />
            </div>
            <div className="lg:col-span-2" />
          </div>

          {/* QR section + Actions */}
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 pt-2 border-t border-[#1a2744] mt-2">
            {/* QR Preview block */}
            <div className="flex-1 bg-[#0a1020] border border-[#1a2744] rounded-xl p-4">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Unit QR Code</p>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center justify-center w-20 h-20 bg-[#0f1623] border border-[#1e2d45] rounded-xl shrink-0 overflow-hidden">
                  {qrValue ? (
                    <QRCodeImage value={qrValue} size={80} />
                  ) : (
                    <svg className="w-7 h-7 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-medium text-slate-300">
                    {qrValue ? 'QR Code Generated' : 'No QR Code Yet'}
                  </p>
                  <p className="text-[11px] text-slate-500 leading-relaxed max-w-xs">
                    {qrValue
                      ? <>The QR code above is generated from the <span className="text-blue-400 font-medium">Property Number</span> field. Scan it to quickly identify this asset.</>
                      : <>Enter a <span className="text-blue-400 font-medium">Property Number</span> to automatically generate a scannable QR code for this asset.</>
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex w-full flex-col sm:w-auto sm:flex-row gap-2 shrink-0">
              <button
                type="button"
                onClick={clearForm}
                className="w-full sm:w-auto px-4 py-2.5 rounded-lg text-sm font-medium text-slate-400 border border-[#1e2d45] hover:bg-[#1a2744] hover:text-white transition"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="w-full sm:w-auto justify-center px-5 py-2.5 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white transition shadow-lg shadow-blue-900/40 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {editingPropertyNumber ? 'Save Changes' : 'Add Asset'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Registered Assets Table ── */}
      <div className="bg-[#0d1421] border border-[#1a2744] rounded-2xl overflow-hidden">
        {/* Filters */}
        <div className="px-6 py-4 border-b border-[#1a2744]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <h2 className="text-white font-semibold text-sm">Registered Assets</h2>
            <span className="text-xs text-slate-500">{filtered.length} asset{filtered.length !== 1 ? 's' : ''} found</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Search by name, property no., serial no..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-[#0f1623] border border-[#1e2d45] rounded-lg pl-8 pr-4 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition"
              />
            </div>
            <select value={locationFilter} onChange={e => setLocationFilter(e.target.value)}
              className="w-full sm:w-auto bg-[#0f1623] border border-[#1e2d45] rounded-lg px-3 py-2 text-xs text-slate-400 focus:outline-none focus:border-blue-500 cursor-pointer">
              <option value="All" className="bg-slate-900">All Locations</option>
              {locations.map(l => <option key={l} value={l} className="bg-slate-900">{l}</option>)}
            </select>
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
              className="w-full sm:w-auto bg-[#0f1623] border border-[#1e2d45] rounded-lg px-3 py-2 text-xs text-slate-400 focus:outline-none focus:border-blue-500 cursor-pointer">
              <option value="All" className="bg-slate-900">All Categories</option>
              {equipmentCategories.map(c => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto bg-[#0f1623] border border-[#1e2d45] rounded-lg px-3 py-2 text-xs text-slate-400 focus:outline-none focus:border-blue-500 cursor-pointer">
              <option value="All" className="bg-slate-900">All Status</option>
              {statuses.map(s => <option key={s} value={s} className="bg-slate-900">{s}</option>)}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead>
              <tr className="border-b border-[#1a2744]">
                {['Property No.', 'Item Name', 'Category', 'Location', 'Asset Tag', 'Serial No.', 'Unit Cost', 'Date Purchased', 'Status', 'Custodian', 'Action'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold text-slate-600 uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-14 text-slate-600 text-sm">No assets found</td>
                </tr>
              ) : paginated.map((asset, i) => (
                <tr key={asset.id} className={`border-b border-[#131f33] hover:bg-[#0f1a2e] transition-colors ${i % 2 === 0 ? '' : 'bg-[#0a1120]/40'}`}>
                  <td className="px-4 py-3 text-xs font-mono text-blue-400 whitespace-nowrap">{asset.propertyNumber}</td>
                  <td className="px-4 py-3 text-xs text-white font-medium whitespace-nowrap">{asset.itemName}</td>
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{asset.equipmentCategory}</td>
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{asset.location}</td>
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{asset.assetTag}</td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-400 whitespace-nowrap">{asset.serialNumber}</td>
                  <td className="px-4 py-3 text-xs text-slate-300 whitespace-nowrap">₱{asset.unitCost}</td>
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{asset.datePurchased}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${statusColor[asset.status] || ''}`}>
                      {asset.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{asset.custodian || '—'}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={(e) => {
                        const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
                        if (activeMenuId === asset.id) {
                          setActiveMenuId(null)
                          setMenuPos(null)
                        } else {
                          setActiveMenuId(asset.id)
                          setMenuPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right })
                        }
                      }}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#1e2d45] bg-[#0f1623] text-slate-400 hover:text-white hover:border-blue-500 transition"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm0 5.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm0 5.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-5 py-3 border-t border-[#1a2744] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-slate-600 text-xs">
            {filtered.length === 0 ? '0' : `${(page - 1) * PER_PAGE + 1}–${Math.min(page * PER_PAGE, filtered.length)}`} of {filtered.length}
          </p>
          <div className="flex w-full sm:w-auto items-center justify-between sm:justify-start gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[#1e2d45] text-slate-400 hover:bg-[#1a2744] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Back
            </button>
            <span className="text-slate-500 text-xs px-1">Page {page} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[#1e2d45] text-slate-400 hover:bg-[#1a2744] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition flex items-center gap-1.5"
            >
              Next
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── Action Dropdown Portal (fixed position, never clipped) ── */}
      {activeMenuId && menuPos && (
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: menuPos.top, right: menuPos.right }}
          className="w-36 rounded-xl border border-[#1a2744] bg-[#0b1320] shadow-2xl z-[9999]"
        >
          {paginated.filter(a => a.id === activeMenuId).map(asset => (
            <div key={asset.id}>
              <button
                type="button"
                onClick={() => handleEditAsset(asset)}
                className="w-full text-left px-4 py-3 text-sm text-slate-200 hover:bg-slate-800 transition rounded-t-xl"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleDeleteAsset(asset.propertyNumber)}
                className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-slate-800 transition rounded-b-xl"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
