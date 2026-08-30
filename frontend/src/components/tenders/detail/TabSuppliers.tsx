import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { motion } from "framer-motion"
import { 
  Building2, Plus, Trash2, Loader2, Users, Layers, History, Mail
} from "lucide-react"
import { useSuppliersList } from "../../../hooks/useSuppliers"
import { useTechnicalLotsList } from "../../../hooks/useTechnicalLots"
import { useCreateTsl, useDeleteTsl } from "../../../hooks/useTsl"
import type { TslSummary } from "../../../api/tender_supplier_lots"
import ConfirmDialog from "../../ui/ConfirmDialog"
import StatusBadge from "../../ui/StatusBadge"
import LotPicker from "../LotPicker"
import SupplierPicker from "../SupplierPicker"

interface Props {
  supplierLots: TslSummary[]
  tenderId: number
}

// Couleurs pour les lots
const LOT_COLORS = [
  { bg: "from-sky-50 to-blue-50", border: "border-sky-200", text: "text-sky-700", icon: "text-sky-500" },
  { bg: "from-emerald-50 to-teal-50", border: "border-emerald-200", text: "text-emerald-700", icon: "text-emerald-500" },
  { bg: "from-violet-50 to-purple-50", border: "border-violet-200", text: "text-violet-700", icon: "text-violet-500" },
  { bg: "from-amber-50 to-orange-50", border: "border-amber-200", text: "text-amber-700", icon: "text-amber-500" },
  { bg: "from-rose-50 to-red-50", border: "border-rose-200", text: "text-rose-700", icon: "text-rose-500" },
  { bg: "from-cyan-50 to-sky-50", border: "border-cyan-200", text: "text-cyan-700", icon: "text-cyan-500" },
  { bg: "from-indigo-50 to-blue-50", border: "border-indigo-200", text: "text-indigo-700", icon: "text-indigo-500" },
  { bg: "from-teal-50 to-emerald-50", border: "border-teal-200", text: "text-teal-700", icon: "text-teal-500" },
]

const getLotColor = (index: number) => {
  return LOT_COLORS[index % LOT_COLORS.length]
}

export default function TabSuppliers({ supplierLots, tenderId }: Props) {
  const navigate = useNavigate()
  const { id: tenderIdParam } = useParams<{ id: string }>()
  const { data: suppliersData } = useSuppliersList()
  const { data: lotsData } = useTechnicalLotsList()
  const { mutate: createTsl, isPending: creating } = useCreateTsl(tenderId)
  const { mutate: deleteTsl, isPending: deleting } = useDeleteTsl(tenderId)

  const [selectedSupplier, setSelectedSupplier] = useState("")
  const [selectedLot, setSelectedLot] = useState("")
  const [confirmDelete, setConfirmDelete] = useState<TslSummary | null>(null)

  const handleAssign = () => {
    if (!selectedSupplier || !selectedLot) return
    createTsl(
      { supplierId: Number(selectedSupplier), lotId: Number(selectedLot) },
      { onSuccess: () => { setSelectedSupplier(""); setSelectedLot("") } }
    )
  }

  const lotDescription = (lotId: number | null) =>
    lotsData?.lots.find((l) => l.id === lotId)?.description

  const bySupplier = Array.from(
    new Map(supplierLots.map((s) => [s.supplier_id ?? s.supplier_name, s])).values()
  ).map((first) => ({
    ...first,
    lots: supplierLots.filter((sl) => (sl.supplier_id ?? sl.supplier_name) === (first.supplier_id ?? first.supplier_name)),
  }))

  const totalSuppliers = bySupplier.length
  const totalAssignments = supplierLots.length

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
        {/* Header avec statistiques */}
        <div className="bg-white/70 backdrop-blur-2xl rounded-2xl shadow-xl shadow-slate-300/30 border border-white/60 overflow-hidden">
          <div className="px-6 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-r from-cyan-50 to-sky-50 border border-cyan-200 flex items-center justify-center">
                  <Users size={16} className="text-cyan-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Fournisseurs assignés</p>
                  <p className="text-xs text-slate-400">
                    {totalSuppliers} fournisseur(s) · {totalAssignments} assignation(s)
                  </p>
                </div>
              </div>
            </div>

            {/* Mini stats */}
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100/60">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Building2 size={12} className="text-slate-400" />
                <span>{totalSuppliers} fournisseur(s)</span>
              </div>
              <div className="w-px h-4 bg-slate-200" />
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Layers size={12} className="text-slate-400" />
                <span>{totalAssignments} assignation(s)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Formulaire d'assignation - restructuré en colonne sur mobile */}
        <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-r from-sky-500 to-indigo-500 flex items-center justify-center">
              <Plus size={13} className="text-white" />
            </div>
            Assigner un fournisseur à un lot
          </h3>
          
          {/* Structure en colonne pour éviter les problèmes de largeur */}
          <div className="space-y-3">
            <SupplierPicker
              suppliers={suppliersData?.suppliers ?? []}
              value={selectedSupplier}
              onChange={setSelectedSupplier}
            />
            <LotPicker
              lots={lotsData?.lots ?? []}
              value={selectedLot}
              onChange={setSelectedLot}
              placeholder="— Sélectionner un lot —"
            />
            <button
              onClick={handleAssign}
              disabled={!selectedSupplier || !selectedLot || creating}
              className="w-full sm:w-auto px-4 py-2.5 text-xs font-medium text-white bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Assigner
            </button>
          </div>
        </div>

        {/* Liste des fournisseurs */}
        {bySupplier.length === 0 ? (
          <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-50/80 border border-slate-200 flex items-center justify-center mx-auto mb-4">
              <Building2 size={28} className="text-slate-300" />
            </div>
            <p className="text-sm font-medium text-slate-600">Aucun fournisseur assigné</p>
            <p className="text-xs text-slate-400 mt-1">Assignez un fournisseur à un lot pour commencer</p>
          </div>
        ) : (
          <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-3 border-b border-white/60 bg-white/40 backdrop-blur-sm flex items-center gap-2">
              <Users size={14} className="text-cyan-500" />
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Fournisseurs assignés ({bySupplier.length})
              </p>
            </div>

            <div className="divide-y divide-white/60">
              {bySupplier.map((supplier) => (
                <div key={supplier.supplier_id ?? supplier.supplier_name} className="p-5">
                  {/* En-tête fournisseur */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-cyan-50 to-sky-50 border border-cyan-200 flex items-center justify-center flex-shrink-0">
                      <Building2 size={17} className="text-cyan-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800">{supplier.supplier_name}</p>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <Mail size={10} /> {supplier.supplier_email || "Aucun email renseigné"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-medium text-cyan-600 bg-cyan-100/60 px-2 py-0.5 rounded-full">
                        {supplier.lots.length} lot{supplier.lots.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Lots assignés */}
                  <div className="space-y-2 ml-13">
                    {supplier.lots.map((sl, lotIndex) => {
                      const colors = getLotColor(lotIndex)
                      return (
                        <div
                          key={sl.tsl_id}
                          className={`flex items-start justify-between gap-3 p-3 bg-gradient-to-r ${colors.bg} backdrop-blur-sm rounded-xl border ${colors.border}`}
                        >
                          <div className="flex items-start gap-2.5 min-w-0 flex-1">
                            <div className={`w-7 h-7 rounded-lg bg-white/60 flex items-center justify-center flex-shrink-0`}>
                              <Layers size={13} className={colors.icon} />
                            </div>
                            <div className="min-w-0">
                              <p className={`text-sm font-medium ${colors.text}`}>{sl.lot_name}</p>
                              {lotDescription(sl.technical_lot_id) && (
                                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed line-clamp-2">
                                  {lotDescription(sl.technical_lot_id)}
                                </p>
                              )}
                              <div className="flex items-center gap-3 mt-1.5">
                                <StatusBadge status={sl.status_name} />
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => navigate(`/tenders/${tenderIdParam}/emails/${sl.tsl_id}`)}
                              className="w-7 h-7 rounded-lg hover:bg-white/60 flex items-center justify-center text-slate-400 hover:text-sky-600 transition-colors"
                              title="Historique des emails"
                            >
                              <History size={13} />
                            </button>
                            <button
                              onClick={() => setConfirmDelete(sl)}
                              className="w-7 h-7 rounded-lg hover:bg-red-50/80 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors"
                              title="Retirer l'assignation"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Retirer cette assignation ?"
        description={`${confirmDelete?.supplier_name} sera retiré du lot "${confirmDelete?.lot_name}". L'historique des emails et les réponses déjà reçues sont conservés.`}
        confirmLabel="Retirer"
        danger
        loading={deleting}
        onConfirm={() => deleteTsl(confirmDelete!.tsl_id, { onSuccess: () => setConfirmDelete(null) })}
        onCancel={() => setConfirmDelete(null)}
      />
    </>
  )
}
