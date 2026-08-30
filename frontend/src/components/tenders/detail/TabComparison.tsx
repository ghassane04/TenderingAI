import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { motion } from "framer-motion"
import {
  Layers, Trophy, BarChart3, AlertCircle, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, ExternalLink, Building2,
} from "lucide-react"
import { useTenderLotRankings } from "../../../hooks/useCompare"
import type { SupplierLotAggregateResult } from "../../../api/compare"

interface Props { tenderId: number }

const LOT_COLORS = [
  { header: "from-sky-500 to-blue-600",     soft: "from-sky-50 to-blue-50",     text: "text-sky-600" },
  { header: "from-emerald-500 to-teal-600", soft: "from-emerald-50 to-teal-50", text: "text-emerald-600" },
  { header: "from-violet-500 to-purple-600",soft: "from-violet-50 to-purple-50",text: "text-violet-600" },
  { header: "from-amber-500 to-orange-600", soft: "from-amber-50 to-orange-50", text: "text-amber-600" },
  { header: "from-rose-500 to-red-600",     soft: "from-rose-50 to-red-50",     text: "text-rose-600" },
]
const getLotColor = (i: number) => LOT_COLORS[i % LOT_COLORS.length]

function rateColor(v: number) {
  if (v >= 80) return "text-emerald-700 bg-emerald-50 border-emerald-200"
  if (v >= 50) return "text-amber-700 bg-amber-50 border-amber-200"
  return "text-rose-700 bg-rose-50 border-rose-200"
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const v = Math.min(100, Math.max(0, value))
  const bar = v >= 80 ? "bg-emerald-500" : v >= 50 ? "bg-amber-500" : "bg-rose-500"
  return (
    <div className="w-28 hidden md:block">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-medium text-slate-400">{label}</span>
        <span className="text-[10px] font-bold text-slate-600">{v.toFixed(2)}%</span>
      </div>
      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div className={`h-full ${bar} rounded-full transition-all duration-500`} style={{ width: `${v}%` }} />
      </div>
    </div>
  )
}

function SupplierRow({
  supplier, rank,
}: { supplier: SupplierLotAggregateResult; rank: number }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { id: tenderIdParam } = useParams<{ id: string }>()

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-all overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50/80 transition-colors text-left">
        {/* Rang */}
        {rank === 1 ? (
          <span className="w-8 h-8 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
            <Trophy size={14} />
          </span>
        ) : (
          <span className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center flex-shrink-0">
            {rank}
          </span>
        )}

        {/* Fournisseur */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{supplier.supplier_name}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {supplier.nb_tender_products_addressed}/{supplier.nb_tender_products} produits couverts
          </p>
        </div>

        {/* Barres de score */}
        <ScoreBar label="Conf." value={supplier.score_global} />

        {/* Badges compacts (mobile) */}
        <div className="flex md:hidden items-center gap-1.5 flex-shrink-0">
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${rateColor(supplier.score_global)}`}>
            {supplier.score_global.toFixed(2)}%
          </span>
        </div>

        {open ? <ChevronUp size={16} className="text-slate-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />}
      </button>

      {open && (
        <div className="border-t border-slate-100 divide-y divide-slate-50 bg-slate-50/30">
          {supplier.products.map((p) => (
            <div key={p.tender_product_id} className="flex items-center gap-3 px-4 py-2.5">
              {p.addressed ? (
                <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
              ) : (
                <XCircle size={14} className="text-rose-400 flex-shrink-0" />
              )}
              <span className="flex-1 text-xs text-slate-600 truncate">{p.tender_product_designation}</span>
              {p.addressed ? (
                <>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${rateColor(p.score)}`}>
                    {p.score.toFixed(2)}% conf.
                  </span>
                  <button
                    onClick={() =>
                      navigate(`/tenders/${tenderIdParam}/datasheets/${p.datasheet_id}/products/${p.supplier_product_id}`)
                    }
                    className="text-[11px] text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1 flex-shrink-0"
                  >
                    Voir détail <ExternalLink size={10} />
                  </button>
                </>
              ) : (
                <span className="text-[10px] text-rose-400 italic flex-shrink-0">Non couvert</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function TabComparison({ tenderId }: Props) {
  const { data, isLoading, isError } = useTenderLotRankings(tenderId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Chargement du classement...</p>
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl p-12 text-center max-w-4xl mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-rose-50/80 border border-rose-200 flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={28} className="text-rose-500" />
        </div>
        <p className="text-sm font-medium text-slate-600">Classement indisponible</p>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl p-12 text-center max-w-4xl mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-slate-50/80 border border-slate-200 flex items-center justify-center mx-auto mb-4">
          <BarChart3 size={28} className="text-slate-300" />
        </div>
        <p className="text-sm font-medium text-slate-600">Aucun lot à comparer</p>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* En-tête */}
      <div className="bg-white/70 backdrop-blur-2xl rounded-2xl shadow-xl shadow-slate-300/30 border border-white/60 px-6 py-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 flex items-center justify-center flex-shrink-0">
          <BarChart3 size={16} className="text-violet-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-slate-800">Classement des fournisseurs</h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Comparaison par lot des taux de conformité, du meilleur au moins bon
          </p>
        </div>
        <span className="text-[10px] font-medium text-violet-600 bg-violet-50 border border-violet-200 px-2.5 py-1 rounded-full flex items-center gap-1 flex-shrink-0">
          <Layers size={11} /> {data.length} lot(s)
        </span>
      </div>

      {/* Un bloc par lot */}
      {data.map((lot, i) => {
        const colors = getLotColor(i)
        return (
          <div key={lot.lot_id} className="bg-white/70 backdrop-blur-2xl rounded-2xl shadow-xl shadow-slate-300/30 border border-white/60 overflow-hidden">
            <div className={`bg-gradient-to-r ${colors.header} px-6 py-3.5 flex items-center justify-between gap-3`}>
              <div className="flex items-center gap-2">
                <Layers size={15} className="text-white" />
                <h3 className="text-sm font-semibold text-white truncate">{lot.lot_name}</h3>
              </div>
              <span className="text-[10px] font-medium text-white/90 bg-white/20 px-2 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0">
                <Building2 size={10} /> {lot.suppliers.length} fournisseur(s)
              </span>
            </div>

            <div className="p-4 space-y-2">
              {lot.suppliers.length === 0 ? (
                <p className="text-xs text-slate-400 px-2 py-4 text-center">Aucun fournisseur assigné à ce lot.</p>
              ) : (
                lot.suppliers.map((s, idx) => (
                  <SupplierRow key={s.supplier_id} supplier={s} rank={idx + 1} />
                ))
              )}
            </div>
          </div>
        )
      })}
    </motion.div>
  )
}
