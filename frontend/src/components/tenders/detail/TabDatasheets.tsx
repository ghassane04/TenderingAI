import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import {
  FileText, Cpu, Loader2, Inbox,
  Layers, Calendar, ChevronRight,
  CheckCircle2, Clock, AlertCircle, Building2, FolderOpen,
} from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { useExtractDatasheet } from "../../../hooks/useDatasheets"
import type { DatasheetInfo } from "../../../api/datasheets"
import StatusBadge from "../../ui/StatusBadge"

interface Props {
  tenderId: number
  datasheetData?: {
    datasheets: DatasheetInfo[]
    total: number
  }
}

const fmt = (d: string | null) =>
  d ? format(new Date(d), "dd MMM yyyy", { locale: fr }) : "—"

// Couleurs par lot (en-tête coloré)
const LOT_COLORS = [
  "from-sky-500 to-blue-600",
  "from-emerald-500 to-teal-600",
  "from-violet-500 to-purple-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-red-600",
  "from-cyan-500 to-sky-600",
  "from-indigo-500 to-blue-600",
  "from-teal-500 to-emerald-600",
]
const getLotColor = (index: number) => LOT_COLORS[index % LOT_COLORS.length]

function DatasheetRow({ ds, tenderId }: { ds: DatasheetInfo; tenderId: number }) {
  const navigate = useNavigate()
  const { mutate: extract, isPending: extracting, variables: extractingId } = useExtractDatasheet(tenderId)
  const isExtractingThis = extracting && extractingId === ds.id
  const isProcessed = ds.status_id === 3

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md hover:border-sky-200 transition-all overflow-hidden"
    >
      <div className="flex items-center gap-3 px-3.5 py-3">
        <button
          onClick={() => navigate(`/tenders/${tenderId}/datasheets/${ds.id}`)}
          className="flex-1 flex items-center gap-3 text-left group min-w-0"
        >
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
            isProcessed ? "bg-emerald-50 border border-emerald-100" : "bg-slate-50 border border-slate-100"
          }`}>
            <FileText size={15} className={isProcessed ? "text-emerald-500" : "text-slate-400"} />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-sky-600 transition-colors">
              {ds.designation || `Fiche #${ds.id}`}
            </p>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 flex-wrap">
              <StatusBadge status={ds.status} />
              <span className="flex items-center gap-1">
                <Calendar size={10} className="text-slate-400" /> {fmt(ds.uploaded_at)}
              </span>
              {ds.products_count > 0 && (
                <span className="flex items-center gap-1 text-emerald-600">
                  <CheckCircle2 size={10} /> {ds.products_count} produit(s)
                </span>
              )}
            </div>
          </div>
        </button>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); extract(ds.id) }}
            disabled={isExtractingThis}
            title="Lancer l'extraction IA (produits & caractéristiques)"
            className="w-8 h-8 rounded-lg bg-amber-50 hover:bg-amber-100 flex items-center justify-center text-amber-500 hover:text-amber-600 transition-all"
          >
            {isExtractingThis ? <Loader2 size={14} className="animate-spin" /> : <Cpu size={14} />}
          </button>
          <button
            onClick={() => navigate(`/tenders/${tenderId}/datasheets/${ds.id}`)}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-300 hover:text-sky-500 transition-all"
            title="Ouvrir la fiche"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// Agrégation : lot -> fournisseur -> fiches
interface SupplierGroup {
  supplierName: string
  items: DatasheetInfo[]
}
interface LotGroup {
  key: string
  lotName: string
  count: number
  suppliers: SupplierGroup[]
}

function groupByLotAndSupplier(datasheets: DatasheetInfo[]): LotGroup[] {
  const lots = new Map<string, LotGroup>()

  for (const ds of datasheets) {
    const lotKey = ds.technical_lot_id != null ? `lot-${ds.technical_lot_id}` : "sans-lot"
    const lotName = ds.lot_name || "Sans lot"
    if (!lots.has(lotKey)) {
      lots.set(lotKey, { key: lotKey, lotName, count: 0, suppliers: [] })
    }
    const lot = lots.get(lotKey)!
    lot.count++

    const supplierName = ds.supplier_name || "Fournisseur inconnu"
    let supplier = lot.suppliers.find((s) => s.supplierName === supplierName)
    if (!supplier) {
      supplier = { supplierName, items: [] }
      lot.suppliers.push(supplier)
    }
    supplier.items.push(ds)
  }

  return Array.from(lots.values())
}

export default function TabDatasheets({ tenderId, datasheetData }: Props) {
  const datasheets = datasheetData?.datasheets ?? []
  const total = datasheetData?.total ?? 0

  const stats = {
    total,
    traitees: datasheets.filter((d) => d.status_id === 3).length,
    enCours: datasheets.filter((d) => d.status_id === 2).length,
    enErreur: datasheets.filter((d) => d.status_id === 4).length,
  }

  const lotGroups = groupByLotAndSupplier(datasheets)

  if (!datasheets.length) {
    return (
      <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl p-12 text-center max-w-4xl mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-slate-50/80 border border-slate-200 flex items-center justify-center mx-auto mb-4">
          <FolderOpen size={28} className="text-slate-300" />
        </div>
        <p className="text-sm font-medium text-slate-600">Aucune fiche technique reçue</p>
        <p className="text-xs text-slate-400 mt-1">
          Les fiches arrivent automatiquement par email après l'envoi des consultations
        </p>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* Header avec statistiques */}
      <div className="bg-white/70 backdrop-blur-2xl rounded-2xl shadow-xl shadow-slate-300/30 border border-white/60 overflow-hidden">
        <div className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 flex items-center justify-center">
              <FileText size={16} className="text-teal-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Fiches techniques reçues</p>
              <p className="text-xs text-slate-400">{total} fiche(s) — regroupées par lot et fournisseur</p>
            </div>
          </div>

          {/* Mini stats */}
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100/60 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Inbox size={12} className="text-slate-400" />
              <span>{stats.total} reçue(s)</span>
            </div>
            <div className="w-px h-4 bg-slate-200" />
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <CheckCircle2 size={11} className="text-emerald-500" />
              <span>{stats.traitees} traitée(s)</span>
            </div>
            <div className="w-px h-4 bg-slate-200" />
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Clock size={11} className="text-amber-500" />
              <span>{stats.enCours} en cours</span>
            </div>
            <div className="w-px h-4 bg-slate-200" />
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <AlertCircle size={11} className="text-rose-500" />
              <span>{stats.enErreur} erreur(s)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Fiches regroupées par lot → fournisseur */}
      {lotGroups.map((lot, i) => (
        <div key={lot.key} className="bg-white/70 backdrop-blur-2xl rounded-2xl shadow-xl shadow-slate-300/30 border border-white/60 overflow-hidden">
          {/* En-tête du lot */}
          <div className={`bg-gradient-to-r ${getLotColor(i)} px-6 py-3.5 flex items-center justify-between gap-3`}>
            <div className="flex items-center gap-2 min-w-0">
              <Layers size={15} className="text-white flex-shrink-0" />
              <h3 className="text-sm font-semibold text-white truncate">{lot.lotName}</h3>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-[10px] font-medium text-white/90 bg-white/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Building2 size={10} /> {lot.suppliers.length} fournisseur(s)
              </span>
              <span className="text-[10px] font-medium text-white/90 bg-white/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                <FileText size={10} /> {lot.count} fiche(s)
              </span>
            </div>
          </div>

          {/* Fournisseurs du lot */}
          <div className="p-4 space-y-4">
            {lot.suppliers.map((supplier) => (
              <div key={supplier.supplierName} className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Building2 size={12} className="text-slate-500" />
                  </div>
                  <span className="text-xs font-semibold text-slate-700 truncate">{supplier.supplierName}</span>
                  <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                    {supplier.items.length}
                  </span>
                </div>
                <div className="space-y-2 pl-1">
                  {supplier.items.map((ds) => (
                    <DatasheetRow key={ds.id} ds={ds} tenderId={tenderId} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </motion.div>
  )
}
