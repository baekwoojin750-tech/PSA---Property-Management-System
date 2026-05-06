// ─── Asset Types & Constants ───────────────────────────────────────────

export type Asset = {
  id: string
  equipmentCategory: string
  location: string
  assetTag: string
  unitCost: string
  datePurchased: string
  propertyNumber: string
  serialNumber: string
  unit: string
  itemName: string
  itemDescription: string
  status: string
  custodian: string
}

export type ScanRecord = {
  id: string
  propertyNumber: string
  itemName: string
  location: string
  status: string
  scannedAt: string
}

// ─── Dropdown Data ────────────────────────────────────────────────────────
export const defaultAccountCodes = [
  'BUI','SEW','ACP','COM','CPU','DAC','DOS','DOC','DOR','DCC','DVR','ENC','EXU','HAD','FOT','FIA','FSC','HMC','HSM','HUB','LAP','LLB','MID','MON','MUE','NAD','NAS','PAB','PCK','POB','PRI','RAM','REK','ROU','SAB','SCA','SER','SEB','SLB','SRA','SSD','SMA','SAN','STC','SWI','SIT','TAL','UPS','VCB','VPN','WIE','WAP','WIB','WLC','ADM','AIR','MOD','PAC','PAS','COP','PRO','TYP','BED','BLI','BOS','CAB','SHA','CMA','COU','CUB','DIV','DOO','LOC','MAB','DRA','PAR','RAC','SAS','SOF','SOB','STO','TAB','WOR','BAB','BBS','DUB','FAB','KEB','MST','SBI','TAT','THR','TRB','CEP','FAM','RHH','TEP','VIC','WIP','TEB','VEH','MOC','AIC','APU','AIP','ALD','AMP','AUP','ASC','BST','BAS','BEL','BEV','BCM','BIM','BIO','BLE','BUC','CAP','CAM','LEN','CAN','CAS','CVC','CAC','CAD','CCT','CHG','COF','COL','CPM','CON','CPR','COS','COB','CRJ','SYM','DCA','DSP','DIR','DIS','DRO','DUP','DUM','ELB','ELD','FAN','ESP','EML','FSS','FPO','FLI','FLJ','FLP','FO','FUM','GEN','GIS','GLB','DRI','HDR','HEP','HUM','JAC','KES','LAD','LAM','LMP','LAT','LAS','LEL','LEW','LIF','LUS','MAS','MDL','MSW','MAT','MEP','MIC','MIS','MSY','MIO','MIX','MCO','SOS','MOS','MUT','DRU','NVR','NUM','OVT','PAL','POD','POP','PDU','PRT','PRW','PRS','PUB','PUC','QUM','QTD','REF','RFI','RIC','ROC','SDL','SIG','SPE','STA','STD','SBO','STW','STB','STL','TEV','TEN','THS','TID','TOT','TOO','TPC','TRA','TRI','TRO','TVC','TVS','UVL','VAC','VAU','VOR','WDE','WAM','WAD','WPU','WAT','WEC','WSC','WHB','AMB','BGM','BPA','DEC','HOB','HUO','NEB','OXI','OXT','REG','SPM','STS','STR','THM','WHC'
]
export const defaultEquipmentCategories = [
  'BUI','SEW','ACP','COM','CPU','DAC','DOS','DOC','DOR','DCC','DVR','ENC','EXU','HAD','FOT','FIA','FSC','HMC','HSM','HUB','LAP','LLB','MID','MON','MUE','NAD','NAS','PAB','PCK','POB','PRI','RAM','REK','ROU','SAB','SCA','SER','SEB','SLB','SRA','SSD','SMA','SAN','STC','SWI','SIT','TAL','UPS','VCB','VPN','WIE','WAP','WIB','WLC','ADM','AIR','MOD','PAC','PAS','COP','PRO','TYP','BED','BLI','BOS','CAB','SHA','CMA','COU','CUB','DIV','DOO','LOC','MAB','DRA','PAR','RAC','SAS','SOF','SOB','STO','TAB','WOR','BAB','BBS','DUB','FAB','KEB','MST','SBI','TAT','THR','TRB','CEP','FAM','RHH','TEP','VIC','WIP','TEB','VEH','MOC','AIC','APU','AIP','ALD','AMP','AUP','ASC','BST','BAS','BEL','BEV','BCM','BIM','BIO','BLE','BUC','CAP','CAM','LEN','CAN','CAS','CVC','CAC','CAD','CCT','CHG','COF','COL','CPM','CON','CPR','COS','COB','CRJ','SYM','DCA','DSP','DIR','DIS','DRO','DUP','DUM','ELB','ELD','FAN','ESP','EML','FSS','FPO','FLI','FLJ','FLP','FO','FUM','GEN','GIS','GLB','DRI','HDR','HEP','HUM','JAC','KES','LAD','LAM','LMP','LAT','LAS','LEL','LEW','LIF','LUS','MAS','MDL','MSW','MAT','MEP','MIC','MIS','MSY','MIO','MIX','MCO','SOS','MOS','MUT','DRU','NVR','NUM','OVT','PAL','POD','POP','PDU','PRT','PRW','PRS','PUB','PUC','QUM','QTD','REF','RFI','RIC','ROC','SDL','SIG','SPE','STA','STD','SBO','STW','STB','STL','TEV','TEN','THS','TID','TOT','TOO','TPC','TRA','TRI','TRO','TVC','TVS','UVL','VAC','VAU','VOR','WDE','WAM','WAD','WPU','WAT','WEC','WSC','WHB','AMB','BGM','BPA','DEC','HOB','HUO','NEB','OXI','OXT','REG','SPM','STS','STR','THM','WHC'
]
export const locations = ['SOC', 'CRASS', 'OCSS', 'NATIONAL ID', 'CRS OUTLET', 'SATELLITE OFFICE']
export const units = ['Unit', 'Set', 'Piece', 'Lot', 'Box', 'Pair']
export const statuses = ['Serviceable', 'Non-Serviceable', 'Borrowed']

export const statusColor: Record<string, string> = {
  Serviceable: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  'Non-Serviceable': 'bg-red-500/10 text-red-400 border border-red-500/20',
  Borrowed: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
}

// ─── Asset transformer helper (shared across components) ──────────────────────
export function transformAsset(asset: any): Asset {
  return {
    id: asset.id.toString(),
    equipmentCategory: asset.equipment_category || '',
    location: asset.location || '',
    assetTag: asset.asset_tag || '',
    unitCost: asset.unit_cost || '',
    datePurchased: asset.date_purchased ? asset.date_purchased.toString().slice(0, 10) : '',
    propertyNumber: asset.property_number || '',
    serialNumber: asset.serial_number || '',
    unit: asset.unit || 'Unit',
    itemName: asset.item_name || '',
    itemDescription: asset.item_description || '',
    status: asset.status || 'Serviceable',
    custodian: asset.custodian || '',
  }
}