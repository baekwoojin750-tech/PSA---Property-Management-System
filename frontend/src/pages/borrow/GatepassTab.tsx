import React, { useRef, useEffect, useState } from "react";
import { getAllAssets } from '../../services/authService'
import type { Asset } from '../assets/assetTypes'
import { defaultEquipmentCategories, transformAsset } from '../assets/assetTypes'
import { SearchableDropdown } from '../assets/assetComponents'

/* ─────────────────────────────────────────────
   Convert public-folder image → base64
───────────────────────────────────────────── */
function useBase64Image(src: string) {
  const [b64, setB64] = useState<string>("");
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext("2d")!.drawImage(img, 0, 0);
      setB64(canvas.toDataURL());
    };
    img.onerror = () => console.warn(`GatePass: could not load ${src}`);
    img.src = src;
  }, [src]);
  return b64;
}

/* ─── Types ─── */
interface GatePassItem {
  description: string;
  equipmentCategory: string;
  propertyNumber: string;
  destination: string;
  periodCovered: string;
}

interface GatePassData {
  date: string;
  recipientName: string;
  origin: string;
  destinationCity: string;
  startDate: string;
  endDate: string;
  purpose: string;
  items: GatePassItem[];
  requestedBy: string;
  requestedByDesignation: string;
  approvedBy: string;
  approvedByDesignation: string;
  guardOnDuty: string;
}

/* ─── Gate Pass Record (for the table) ─── */
interface GatePassRecord {
  id: string;
  recipientName: string;
  origin: string;
  destinationCity: string;
  purpose: string;
  requestedBy: string;
  approvedBy: string;
  date: string;
  items: GatePassItem[];
}

interface GatepassTabProps {
  data?: GatePassData;
  onChange?: (data: GatePassData) => void;
  showRecords?: boolean;
}

const emptyItem: GatePassItem = {
  description: "",
  equipmentCategory: "",
  propertyNumber: "",
  destination: "",
  periodCovered: "",
};

const defaultData: GatePassData = {
  date: "",
  recipientName: "",
  origin: "PSA Davao Del Sur",
  destinationCity: "City of Digos, Davao del Sur",
  startDate: "",
  endDate: "",
  purpose: "E-CRVS",
  items: [{ ...emptyItem }],
  requestedBy: "",
  requestedByDesignation: "",
  approvedBy: "ADELINE G. BATUCAN",
  approvedByDesignation: "Chief Statistical Specialist",
  guardOnDuty: "",
};

const GatepassTab: React.FC<GatepassTabProps> = ({ data, onChange, showRecords = true }) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState<GatePassData>(data ?? defaultData);

  // Gate pass records table state
  const [gatePassRecords, setGatePassRecords] = useState<GatePassRecord[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [assetList, setAssetList] = useState<Asset[]>([]);
  const [equipmentCategories, setEquipmentCategories] = useState<string[]>(defaultEquipmentCategories);
  const PER_PAGE = 10;

  const psaLogo    = useBase64Image("/headerImage1.jpg");
  const bagongLogo = useBase64Image("/headerImage2.png");
  const isoFooter  = useBase64Image("/iso.png");

  useEffect(() => {
    const loadAssets = async () => {
      try {
        const assets = await getAllAssets()
        setAssetList(assets.map(transformAsset))
      } catch (error) {
        console.error('GatePass: failed to load assets', error)
      }
    }
    loadAssets()
  }, [])

  const handlePrint = () => {
    if (!printRef.current) return;
    if (!psaLogo || !bagongLogo || !isoFooter) {
      // Images still loading — retry after a short delay
      setTimeout(() => handlePrint(), 400)
      return
    }
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;

    // Dimensions
    const HEADER_H = 34   // mm — PSA logo header band
    const FOOTER_H = 18   // mm — ISO footer band
    const SIDE_MM  = 25.4 // mm — 2.54 cm / 1 inch

    const psaSrc    = psaLogo    || ''
    const bagongSrc = bagongLogo || ''
    const isoSrc    = isoFooter  || ''

    const psaImg = psaSrc
      ? `<img src="${psaSrc}" style="width:64px;height:64px;object-fit:contain;display:block;" />`
      : `<div style="width:64px;height:64px;"></div>`

    const bagongImg = bagongSrc
      ? `<img src="${bagongSrc}" style="width:64px;height:64px;object-fit:contain;display:block;" />`
      : `<div style="width:64px;height:64px;"></div>`

    const isoImg = isoSrc
      ? `<img src="${isoSrc}" style="width:100%;max-height:40px;object-fit:contain;object-position:left;" />`
      : `<div style="font-size:8px;color:#888;">3rd Floor JM Agro Building, Gov. Sales St., Davao City, Philippines 8000</div>`

    const bodyContent = printRef.current.innerHTML

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Gate Pass</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    /*
     * @page margins carve out bands at top/bottom for the fixed header/footer.
     * Left/right match 2.54 cm so content never touches the paper edge.
     */
    @page {
      size: 210mm 297mm portrait;
      margin-top:    ${HEADER_H + 6}mm;
      margin-bottom: ${FOOTER_H + 6}mm;
      margin-left:   ${SIDE_MM}mm;
      margin-right:  ${SIDE_MM}mm;
    }

    html, body {
      font-family: Arial, sans-serif;
      font-size: 11px;
      color: #000;
      background: #fff;
    }

    /*
     * HEADER — position:fixed makes it repeat on every printed page.
     * Negative left/right extend past the @page side margins so the
     * header spans the full paper width; padding re-aligns content.
     */
    #ph {
      position: fixed;
      top: -${HEADER_H + 6}mm;
      left:  -${SIDE_MM}mm;
      right: -${SIDE_MM}mm;
      height: ${HEADER_H}mm;
      padding: 3mm ${SIDE_MM}mm 2mm ${SIDE_MM}mm;
      background: #fff;
      display: grid;
      grid-template-columns: 70px 1fr 70px;
      align-items: center;
      border-bottom: 1.5px solid #bbb;
    }
    #ph .hc { text-align: center; line-height: 1.35; }
    #ph .hs { font-size: 7px; text-transform: uppercase; letter-spacing: 0.16em; color: #555; }
    #ph .ht { font-size: 14px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; color: #000; }
    #ph .hr { display: flex; justify-content: flex-end; }

    /* FOOTER — same pattern */
    #pf {
      position: fixed;
      bottom: -${FOOTER_H + 6}mm;
      left:  -${SIDE_MM}mm;
      right: -${SIDE_MM}mm;
      height: ${FOOTER_H}mm;
      padding: 2mm ${SIDE_MM}mm;
      background: #fff;
      display: flex;
      align-items: center;
      border-top: 1.5px solid #bbb;
    }

    /* Table styles */
    thead { display: table-header-group; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #000; padding: 5px 7px; vertical-align: middle; }
    th { font-size: 11px; font-weight: bold; text-align: center; line-height: 1.2; background: #fff; }

    input, textarea {
      border: none;
      border-bottom: 1px solid #000;
      background: transparent;
      font-family: Arial, sans-serif;
      font-size: 11px;
      outline: none;
    }

    .no-break { page-break-inside: avoid; break-inside: avoid; }

    @media print {
      html, body { height: auto !important; overflow: visible !important; }
    }
  </style>
</head>
<body>

  <!-- Fixed header — appears on every page -->
  <div id="ph">
    <div>${psaImg}</div>
    <div class="hc">
      <div class="hs">Republic of the Philippines</div>
      <div class="ht">Philippine Statistics Authority</div>
      <div class="hs">Davao del Sur Provincial Statistical Office</div>
    </div>
    <div class="hr">${bagongImg}</div>
  </div>

  <!-- Fixed footer — appears on every page -->
  <div id="pf">${isoImg}</div>

  <!-- Page content — flows naturally within @page margins -->
  ${bodyContent}

</body>
</html>`

    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()

    // Wait for all images (base64 logos) to finish loading before printing
    printWindow.onload = () => {
      const imgs = Array.from(printWindow.document.images)
      if (imgs.length === 0) {
        printWindow.focus()
        printWindow.print()
        printWindow.onafterprint = () => printWindow.close()
        return
      }
      let loaded = 0
      const tryPrint = () => {
        loaded++
        if (loaded >= imgs.length) {
          printWindow.focus()
          printWindow.print()
          printWindow.onafterprint = () => printWindow.close()
        }
      }
      imgs.forEach(img => {
        if (img.complete) { tryPrint() }
        else { img.onload = tryPrint; img.onerror = tryPrint }
      })
    }
  };

  const handleSubmit = () => {
    const newRecord: GatePassRecord = {
      id: `GP-${Date.now()}`,
      recipientName: form.recipientName,
      origin: form.origin,
      destinationCity: form.destinationCity,
      purpose: form.purpose,
      requestedBy: form.requestedBy,
      approvedBy: form.approvedBy,
      date: form.date,
      items: form.items,
    };
    setGatePassRecords(prev => [newRecord, ...prev]);
    setForm(defaultData);
  };

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

  /* ── field updaters ── */
  const set = (key: keyof GatePassData, value: string) => {
    const updated = { ...form, [key]: value };
    if (key === 'destinationCity') {
      updated.items = updated.items.map(item => ({
        ...item,
        destination: item.destination || value,
      }))
    }
    // Auto-recalculate periodCovered on all items when dates change
    if (key === 'startDate' || key === 'endDate') {
      const start = key === 'startDate' ? value : form.startDate
      const end   = key === 'endDate'   ? value : form.endDate
      const period = getPeriodCovered(start, end)
      updated.items = updated.items.map(item => ({ ...item, periodCovered: period }))
    }
    setForm(updated);
    onChange?.(updated);
  };

  const getPeriodCovered = (start = form.startDate, end = form.endDate) => {
    if (!start && !end) return ''
    const fmt = (d: string) => {
      if (!d) return ''
      const [y, m, day] = d.split('-')
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
      return `${months[parseInt(m,10)-1]} ${parseInt(day,10)}, ${y}`
    }
    if (start && end && start !== end) return `${fmt(start)} – ${fmt(end)}`
    if (start) return fmt(start)
    return fmt(end)
  }

  const setItem = (idx: number, key: keyof GatePassItem, value: string) => {
    const nextValue = key === 'propertyNumber' ? formatPropertyNumber(value) : value
    const items = form.items.map((it, i) => {
      if (i !== idx) return it
      let nextItem = { ...it, [key]: nextValue }
      if (key === 'propertyNumber') {
        // Try exact match first, then prefix match for partial typing
        const matched = assetList.find(a => a.propertyNumber === nextValue)
          ?? assetList.find(a => a.propertyNumber.startsWith(nextValue) && nextValue.length >= 7)
        if (matched) {
          nextItem = {
            ...nextItem,
            equipmentCategory: matched.equipmentCategory || nextItem.equipmentCategory || '',
            description: matched.itemName || nextItem.description,
          }
        }
      }
      return nextItem
    })
    const updated = { ...form, items };
    setForm(updated);
    onChange?.(updated);
  };

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { ...emptyItem, destination: f.destinationCity, periodCovered: getPeriodCovered(f.startDate, f.endDate) }] }));
  const removeItem = (idx: number) => {
    if (form.items.length === 1) return;
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  };

  const inputStyle: React.CSSProperties = {
    border: "none",
    borderBottom: "1px solid #000",
    outline: "none",
    background: "transparent",
    fontSize: "11px",
    fontFamily: "Arial, sans-serif",
    padding: "0 2px",
    width: "100%",
    fontWeight: "bold",
  };

  const requestedByDisplay = [form.requestedBy, form.requestedByDesignation].filter(Boolean).join(" / ");

  const InlineField = ({
    value,
    onChange: onCh,
    width = "120px",
    bold = true,
    underline = true,
    placeholder = "",
  }: {
    value: string;
    onChange: (v: string) => void;
    width?: string;
    bold?: boolean;
    underline?: boolean;
    placeholder?: string;
  }) => (
    <input
      value={value}
      placeholder={placeholder}
      onChange={e => onCh(e.target.value)}
      style={{
        border: "none",
        borderBottom: underline ? "1px solid #000" : "none",
        outline: "none",
        background: "transparent",
        fontSize: "11px",
        fontFamily: "Arial, sans-serif",
        padding: "0 2px",
        width,
        fontWeight: bold ? "bold" : "normal",
        display: "inline-block",
        verticalAlign: "bottom",
        textDecoration: bold && value ? "underline" : "none",
      }}
    />
  );

  const logoPlaceholder = (label: string) => (
    <div style={{
      width: 68, height: 68,
      border: "1px dashed #bbb",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: "8px", color: "#aaa", textAlign: "center",
    }}>{label}</div>
  );

  const inputClass = "w-full bg-[#0f1623] border border-[#1e2d45] rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition";
  const labelClass = "block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1";

  const isFormValid = !!(
    form.date &&
    form.recipientName &&
    form.origin &&
    form.destinationCity &&
    form.startDate &&
    form.purpose &&
    form.requestedBy &&
    form.approvedBy &&
    form.guardOnDuty &&
    form.items.every(it => it.description && it.propertyNumber)
  );

  // Table filtering
  const filtered = gatePassRecords.filter(r =>
    [r.recipientName, r.purpose, r.requestedBy, r.approvedBy, r.destinationCity]
      .some(v => v.toLowerCase().includes(search.toLowerCase()))
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  useEffect(() => { setPage(1); }, [search]);

  return (
    <div className="space-y-5">

      {/* ══ Gate Pass Form ══ */}
      <div className="bg-[#0d1421] border border-[#1a2744] rounded-2xl overflow-hidden">

        <div className="flex items-center px-6 py-4 border-b border-[#1a2744]">
          <svg className="w-4 h-4 text-blue-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
          </svg>
          <h2 className="text-white font-semibold text-sm">New Gate Pass</h2>
        </div>

        <div className="p-6 space-y-4">

          {/* Row 1: Date + Borrower */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Date</label>
              <input type="date" value={form.date} onChange={e => set("date", e.target.value)} className={`${inputClass} [color-scheme:dark]`} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Borrower (Name of Personnel Who Borrowed)</label>
              <input type="text" value={form.recipientName} onChange={e => set("recipientName", e.target.value)} placeholder="Full name of personnel" className={inputClass} />
            </div>
          </div>

          {/* Row 2: From (Current Location) / To (Destination) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>From (Current Location)</label>
              <input type="text" value={form.origin} onChange={e => set("origin", e.target.value)} placeholder="PSA Davao Del Sur" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>To (Destination)</label>
              <input type="text" value={form.destinationCity} onChange={e => set("destinationCity", e.target.value)} placeholder="City of Digos, Davao del Sur" className={inputClass} />
            </div>
          </div>

          {/* Row 3: From (Start Date) / To (End Date) / Purpose */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>From (Start Date)</label>
              <input type="date" value={form.startDate} onChange={e => set("startDate", e.target.value)} className={`${inputClass} [color-scheme:dark]`} />
            </div>
            <div>
              <label className={labelClass}>To (End Date)</label>
              <input type="date" value={form.endDate} onChange={e => set("endDate", e.target.value)} className={`${inputClass} [color-scheme:dark]`} />
            </div>
            <div>
              <label className={labelClass}>Purpose / Compliance</label>
              <input type="text" value={form.purpose} onChange={e => set("purpose", e.target.value)} placeholder="E-CRVS" className={inputClass} />
            </div>
          </div>

          {/* Row 4: Requested By / Designation / Approved By (auto) / Approved By Designation (auto) / Guard */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className={labelClass}>Requested By</label>
              <input type="text" value={form.requestedBy} onChange={e => set("requestedBy", e.target.value)} placeholder="Name" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Requested By (Designation)</label>
              <input type="text" value={form.requestedByDesignation} onChange={e => set("requestedByDesignation", e.target.value)} placeholder="Designation" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Approved By <span className="normal-case text-blue-400/60">(auto-filled)</span></label>
              <input type="text" value={form.approvedBy} onChange={e => set("approvedBy", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Approved By (Designation) <span className="normal-case text-blue-400/60">(auto)</span></label>
              <input type="text" value={form.approvedByDesignation} onChange={e => set("approvedByDesignation", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Guard on Duty</label>
              <input type="text" value={form.guardOnDuty} onChange={e => set("guardOnDuty", e.target.value)} placeholder="Guard on Duty" className={inputClass} />
            </div>
          </div>

          {/* Items section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className={labelClass}>Items to Gate Pass ({form.items.length})</label>
              <button type="button" onClick={addItem} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600/10 border border-blue-500/20 text-blue-400 hover:bg-blue-600/20 transition">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Add Item
              </button>
            </div>
            <div className={`space-y-3 ${form.items.length > 5 ? 'max-h-[520px] overflow-y-auto pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-700' : ''}`}>
              {form.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-1 sm:grid-cols-6 gap-3 bg-[#0a1120] border border-[#1a2744] rounded-xl p-3 relative">
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Description (auto-filled / editable)</label>
                    <input type="text" placeholder="Property/equipment description" value={item.description} onChange={e => setItem(idx, "description", e.target.value)} className={inputClass} />
                  </div>
                  <div className="sm:col-span-2 grid grid-cols-1 gap-2">
                    <div>
                      <label className={labelClass}>Equipment Category (auto-filled)</label>
                      <SearchableDropdown
                        options={equipmentCategories}
                        value={item.equipmentCategory}
                        onChange={value => setItem(idx, "equipmentCategory", value)}
                        placeholder="Select category"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Property No.</label>
                      <input type="text" placeholder="0000-00-000-000000" value={item.propertyNumber} onChange={e => setItem(idx, "propertyNumber", e.target.value)} className={inputClass} />
                    </div>
                  </div>
                  <div className="sm:col-span-1">
                    <label className={labelClass}>Destination</label>
                    <input type="text" placeholder="Destination" value={item.destination} onChange={e => setItem(idx, "destination", e.target.value)} className={inputClass} />
                  </div>
                  <div className="sm:col-span-1">
                    <label className={labelClass}>Period Covered (auto-calc)</label>
                    <input type="text" placeholder="Auto from dates" value={item.periodCovered} onChange={e => setItem(idx, "periodCovered", e.target.value)} className={inputClass} />
                  </div>
                  {form.items.length > 1 && (
                    <button type="button" onClick={() => removeItem(idx)} className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded text-red-400 hover:bg-red-500/10 transition">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[#1a2744]">
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button type="button" onClick={() => setForm(defaultData)} className="w-full sm:w-auto px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-[#1a2744] border border-transparent hover:border-[#243357] transition">
                Clear Form
              </button>
              <button type="button" onClick={handlePrint} disabled={!isFormValid} className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition">
                Print Gate Pass
              </button>
            </div>
            <button type="button" onClick={handleSubmit} disabled={!isFormValid} className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Submit Gate Pass
            </button>
          </div>

        </div>
      </div>

      {/* ══ Hidden printable area ══ */}
      <div style={{ position: 'absolute', left: -9999, top: -9999, width: 0, height: 0, overflow: 'hidden' }}>
        <div ref={printRef}>
          <div style={{ fontFamily: "Arial, sans-serif", fontSize: "11px", backgroundColor: "#fff", color: "#000", boxSizing: "border-box" }}>

            {/* GATE PASS label */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
              <div style={{ border: "2px solid #000", padding: "6px 20px", fontWeight: 900, fontSize: "14px", letterSpacing: "2px" }}>GATE PASS</div>
            </div>

            {/* Date */}
            <div style={{ marginBottom: "14px", display: "flex", alignItems: "flex-end", gap: "4px" }}>
              <span>Date:</span>
              <input value={form.date} onChange={e => set("date", e.target.value)} type="date" style={{ ...inputStyle, width: "160px" }} />
            </div>

            <div style={{ marginBottom: "14px", fontWeight: "bold" }}>TO THE GUARD ON DUTY:</div>

            <div style={{ marginBottom: "18px", lineHeight: "2.2", fontSize: "11px" }}>
              <span>Please allow </span>
              <InlineField value={form.recipientName} placeholder="NAME OF PERSONNEL WHO BORROWED" onChange={v => set("recipientName", v)} width="220px" />
              <span>/ to bring out property/equipment listed below from</span>
              <br />
              <InlineField value={form.origin} placeholder="PSA Davao Del Sur" onChange={v => set("origin", v)} width="170px" />
              <span> to </span>
              <InlineField value={form.destinationCity} placeholder="City of Digos, Davao del Sur" onChange={v => set("destinationCity", v)} width="210px" />
              <span> from</span>
              <br />
              <InlineField value={form.startDate} placeholder="Start date" onChange={v => set("startDate", v)} width="140px" />
              <span> to </span>
              <InlineField value={form.endDate} placeholder="End date" onChange={v => set("endDate", v)} width="140px" />
              <span> for the purpose/compliance of</span>
              <br />
              <input value={form.purpose} placeholder="E-CRVS" onChange={e => set("purpose", e.target.value)} style={{ ...inputStyle, width: "180px", fontWeight: "bold", textDecoration: "underline", borderBottom: "none" }} />
            </div>

            {/* Items Table */}
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "28px" }}>
              <thead>
                <tr>
                  <th style={{ border: "1px solid #000", padding: "6px 8px", textAlign: "center", fontWeight: "bold", fontSize: "11px", width: "38%" }}>Description of<br />Property/Equipment</th>
                  <th style={{ border: "1px solid #000", padding: "6px 8px", textAlign: "center", fontWeight: "bold", fontSize: "11px", width: "22%" }}>Property Number</th>
                  <th style={{ border: "1px solid #000", padding: "6px 8px", textAlign: "center", fontWeight: "bold", fontSize: "11px", width: "22%" }}>Destination</th>
                  <th style={{ border: "1px solid #000", padding: "6px 8px", textAlign: "center", fontWeight: "bold", fontSize: "11px", width: "18%" }}>Period<br />Covered</th>
                </tr>
              </thead>
              <tbody>
                {form.items.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ border: "1px solid #000", padding: "4px 6px", verticalAlign: "top", minHeight: "36px" }}>
                      <textarea value={item.description} onChange={e => setItem(idx, "description", e.target.value)} rows={2} style={{ ...inputStyle, borderBottom: "none", resize: "vertical", width: "100%" }} />
                    </td>
                    <td style={{ border: "1px solid #000", padding: "4px 6px", verticalAlign: "top" }}>
                      <textarea value={item.propertyNumber} onChange={e => setItem(idx, "propertyNumber", e.target.value)} rows={2} style={{ ...inputStyle, borderBottom: "none", resize: "vertical", width: "100%", textAlign: "center" }} />
                    </td>
                    <td style={{ border: "1px solid #000", padding: "4px 6px", verticalAlign: "top" }}>
                      <textarea value={item.destination} onChange={e => setItem(idx, "destination", e.target.value)} rows={2} style={{ ...inputStyle, borderBottom: "none", resize: "vertical", width: "100%", textAlign: "center" }} />
                    </td>
                    <td style={{ border: "1px solid #000", padding: "4px 6px", verticalAlign: "top" }}>
                      <input value={item.periodCovered} onChange={e => setItem(idx, "periodCovered", e.target.value)} style={{ ...inputStyle, borderBottom: "none", width: "100%", textAlign: "center" }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Signatures */}
            <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", marginBottom: "6px" }}>
              <span style={{ fontWeight: "bold", whiteSpace: "nowrap" }}>Requested by:</span>
              <div style={{ flex: 1, maxWidth: "260px" }}>
                <input value={requestedByDisplay} readOnly style={{ ...inputStyle, textAlign: "center", cursor: "text" }} />
              </div>
            </div>
            <div style={{ marginBottom: "20px", marginLeft: "110px", maxWidth: "260px", textAlign: "center" }}>
              <span style={{ fontSize: "10px" }}>(Name and Designation)</span>
            </div>

            <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", marginBottom: "6px" }}>
              <span style={{ fontWeight: "bold", whiteSpace: "nowrap" }}>Approved by:</span>
              <div style={{ flex: 1, maxWidth: "260px" }}>
                <input value={form.approvedBy} onChange={e => set("approvedBy", e.target.value)} style={{ ...inputStyle, textAlign: "center", textDecoration: "underline" }} />
              </div>
            </div>
            <div style={{ marginBottom: "24px", marginLeft: "110px", maxWidth: "260px", textAlign: "center" }}>
              <span style={{ fontSize: "10px" }}>{form.approvedByDesignation || 'Supervisor/Division Chief/RD/PSO'}</span>
            </div>

            <div style={{ marginBottom: "4px", marginLeft: "40px", maxWidth: "220px" }}>
              <input value={form.guardOnDuty} onChange={e => set("guardOnDuty", e.target.value)} style={{ ...inputStyle, textAlign: "center" }} />
            </div>
            <div style={{ marginBottom: "32px", marginLeft: "40px", maxWidth: "220px", textAlign: "center" }}>
              <span style={{ fontSize: "10px" }}>(Guard on Duty)</span>
            </div>

          </div>
        </div>
      </div>

      {showRecords && (
        <div className="bg-[#0d1421] border border-[#1a2744] rounded-2xl overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-[#1a2744]">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
            <h2 className="text-white font-semibold text-sm">Gate Pass Records</h2>
            <span className="text-[10px] bg-slate-800 border border-slate-700 text-slate-400 px-2 py-0.5 rounded-full font-semibold">{filtered.length}</span>
          </div>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search gate passes..."
              className="bg-[#0f1623] border border-[#1e2d45] rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition w-52"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1a2744]">
                {['Gate Pass ID', 'Personnel', 'Origin', 'Destination', 'Purpose', 'Requested By', 'Approved By', 'Date'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold text-slate-600 uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-14">
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-8 h-8 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                      </svg>
                      <p className="text-slate-600 text-sm">No gate pass records yet</p>
                      <p className="text-slate-700 text-xs">Submitted gate passes will appear here</p>
                    </div>
                  </td>
                </tr>
              ) : paginated.map((record, i) => (
                <tr key={record.id} className={`border-b border-[#131f33] hover:bg-[#0f1a2e] transition-colors ${i % 2 === 0 ? '' : 'bg-[#0a1120]/40'}`}>
                  <td className="px-4 py-3 text-xs font-mono text-blue-400 whitespace-nowrap">{record.id}</td>
                  <td className="px-4 py-3 text-xs text-white font-medium whitespace-nowrap">{record.recipientName}</td>
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{record.origin}</td>
                  <td className="px-4 py-3 text-xs text-slate-300 whitespace-nowrap">{record.destinationCity}</td>
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{record.purpose}</td>
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{record.requestedBy}</td>
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{record.approvedBy || '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{record.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-5 py-3 border-t border-[#1a2744] flex items-center justify-between">
          <p className="text-slate-600 text-xs">
            {filtered.length === 0 ? '0' : `${(page - 1) * PER_PAGE + 1}–${Math.min(page * PER_PAGE, filtered.length)}`} of {filtered.length} records
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[#1e2d45] text-slate-400 hover:bg-[#1a2744] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Back
            </button>
            <span className="text-slate-500 text-xs px-1">Page {page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[#1e2d45] text-slate-400 hover:bg-[#1a2744] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition flex items-center gap-1.5">
              Next
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
      </div>
      )}

    </div>
  );
};

export default GatepassTab;