import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { useForm } from "react-hook-form"
import { 
  ArrowLeft, Edit2, Save, X, Trash2, Tag, Loader2, RefreshCw,
  ClipboardCheck, Hash, AlertCircle, Package, Layers
} from "lucide-react"
import { useTenderProduct, useUpdateRequirement, useDeleteRequirement } from "../../hooks/useProducts"
import ConfirmDialog from "../../components/ui/ConfirmDialog"
import ErrorBoundary from "../../components/ui/ErrorBoundary"

const OPERATEURS = [
  "Egal", "Minimum", "Maximum", "Superieur", "Inferieur",
  "Superieur ou egal", "Inferieur ou egal", "Entre",
  "Compatible", "Supporte", "Contient", "Non specifie",
]

interface ReqForm {
  requirement: string
  operateur: string
  value: string
}

// Couleurs pour les opérateurs
const OPERATOR_COLORS: Record<string, { bg: string; text: string; border: string; light: string }> = {
  "Egal": { bg: "from-blue-50 to-sky-50", text: "text-blue-600", border: "border-blue-200", light: "bg-blue-50" },
  "Minimum": { bg: "from-emerald-50 to-teal-50", text: "text-emerald-600", border: "border-emerald-200", light: "bg-emerald-50" },
  "Maximum": { bg: "from-amber-50 to-orange-50", text: "text-amber-600", border: "border-amber-200", light: "bg-amber-50" },
  "Superieur": { bg: "from-rose-50 to-red-50", text: "text-rose-600", border: "border-rose-200", light: "bg-rose-50" },
  "Inferieur": { bg: "from-violet-50 to-purple-50", text: "text-violet-600", border: "border-violet-200", light: "bg-violet-50" },
  "Superieur ou egal": { bg: "from-indigo-50 to-blue-50", text: "text-indigo-600", border: "border-indigo-200", light: "bg-indigo-50" },
  "Inferieur ou egal": { bg: "from-cyan-50 to-sky-50", text: "text-cyan-600", border: "border-cyan-200", light: "bg-cyan-50" },
  "Entre": { bg: "from-fuchsia-50 to-pink-50", text: "text-fuchsia-600", border: "border-fuchsia-200", light: "bg-fuchsia-50" },
  "Compatible": { bg: "from-teal-50 to-emerald-50", text: "text-teal-600", border: "border-teal-200", light: "bg-teal-50" },
  "Supporte": { bg: "from-lime-50 to-green-50", text: "text-lime-600", border: "border-lime-200", light: "bg-lime-50" },
  "Contient": { bg: "from-amber-50 to-yellow-50", text: "text-amber-600", border: "border-amber-200", light: "bg-amber-50" },
  "Non specifie": { bg: "from-slate-50 to-slate-100", text: "text-slate-500", border: "border-slate-200", light: "bg-slate-50" },
}

// Correction : accepter string | null | undefined
const getOperatorColor = (operator: string | null | undefined) => {
  if (!operator) return OPERATOR_COLORS["Non specifie"]
  return OPERATOR_COLORS[operator] || OPERATOR_COLORS["Non specifie"]
}

export default function TenderRequirementDetailPage() {
  const { id: tenderId, productId, requirementId } = useParams<{
    id: string; productId: string; requirementId: string
  }>()
  const navigate = useNavigate()

  const tid = Number(tenderId)
  const pid = Number(productId)
  const rid = Number(requirementId)

  const { data: products, isLoading, isFetching, refetch } = useTenderProduct(tid)
  const product = products?.find((p) => p.id === pid)
  const requirement = product?.requirements.find((r) => r.id === rid)

  const { mutate: updateReq, isPending: updating } = useUpdateRequirement(pid)
  const { mutate: deleteReq, isPending: deleting } = useDeleteRequirement(pid)

  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const form = useForm<ReqForm>()

  const startEdit = () => {
    if (!requirement) return
    form.reset({
      requirement: requirement.requirement,
      operateur: requirement.operateur ?? "Non specifie",
      value: requirement.value ?? "",
    })
    setEditing(true)
  }

  const onSave = (d: ReqForm) => {
    if (!requirement) return
    updateReq(
      { id: requirement.id, data: { requirement: d.requirement, operateur: d.operateur, value: d.value || null } },
      { onSuccess: () => setEditing(false) }
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-sky-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Chargement de l'exigence...</p>
        </div>
      </div>
    )
  }

  if (!product || !requirement) {
    return (
      <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl p-12 text-center max-w-2xl mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-rose-50/80 border border-rose-200 flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={28} className="text-rose-500" />
        </div>
        <p className="text-sm font-medium text-slate-600">Exigence introuvable</p>
        <p className="text-xs text-slate-400 mt-1">Cette exigence n'existe pas ou a été supprimée</p>
        <button onClick={() => navigate(`/tenders/${tid}/products/${pid}`)} className="btn-secondary text-xs mt-4">
          <ArrowLeft size={13} /> Retour au produit
        </button>
      </div>
    )
  }

  // Correction : passage de requirement.operateur (qui peut être null)
  const operatorColors = getOperatorColor(requirement.operateur)

  return (
    <ErrorBoundary>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
        {/* Header avec retour */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <button
            onClick={() => navigate(`/tenders/${tid}/products/${pid}`)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-sky-600 transition-colors"
          >
            <ArrowLeft size={14} /> Retour à « {product.designation} »
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="p-2 rounded-xl bg-white/60 backdrop-blur-md border border-white/40 shadow-sm hover:bg-white/80 transition-all disabled:opacity-50"
              title="Actualiser"
            >
              <RefreshCw size={14} className={isFetching ? "animate-spin text-sky-500" : "text-slate-400"} />
            </button>
          </div>
        </div>

        {/* Carte principale */}
        <div className="bg-white/70 backdrop-blur-2xl rounded-2xl shadow-xl shadow-slate-300/30 border border-white/60 overflow-hidden">
          {/* En-tête avec dégradé */}
          <div className={`bg-gradient-to-r ${operatorColors.bg} px-6 py-5 border-b ${operatorColors.border}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 min-w-0">
                <div className={`w-12 h-12 rounded-xl bg-white/60 flex items-center justify-center flex-shrink-0 border ${operatorColors.border}`}>
                  <ClipboardCheck size={22} className={operatorColors.text} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-lg font-bold text-slate-800 truncate">
                      {requirement.requirement}
                    </h1>
                  </div>
                </div>
              </div>

              {!editing ? (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={startEdit}
                    className="p-2 rounded-xl bg-white/60 hover:bg-white/90 border border-white/60 transition-all text-slate-500 hover:text-sky-600"
                    title="Modifier"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="p-2 rounded-xl bg-white/60 hover:bg-rose-50 border border-white/60 hover:border-rose-200 transition-all text-slate-500 hover:text-rose-500"
                    title="Supprimer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setEditing(false)}
                    className="p-2 rounded-xl bg-white/60 hover:bg-slate-50 border border-white/60 transition-all text-slate-500 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                  <button
                    onClick={form.handleSubmit(onSave)}
                    disabled={updating}
                    className="p-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 text-white transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                  >
                    {updating ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Corps */}
          <div className="p-6 space-y-5">
            {/* Vue lecture */}
            {!editing ? (
              <div className="space-y-4">
                {/* Exigence */}
                <div className={`flex items-start gap-3.5 p-3.5 bg-gradient-to-r ${operatorColors.bg} backdrop-blur-sm rounded-xl border ${operatorColors.border}`}>
                  <div className={`w-8 h-8 rounded-lg bg-white/60 flex items-center justify-center flex-shrink-0`}>
                    <ClipboardCheck size={15} className={operatorColors.text} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Exigence</p>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5 leading-relaxed">{requirement.requirement}</p>
                  </div>
                </div>

                {/* Opérateur et Valeur */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className={`flex items-start gap-3.5 p-3.5 bg-gradient-to-r ${operatorColors.bg} backdrop-blur-sm rounded-xl border ${operatorColors.border}`}>
                    <div className={`w-8 h-8 rounded-lg bg-white/60 flex items-center justify-center flex-shrink-0`}>
                      <Tag size={15} className={operatorColors.text} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Opérateur</p>
                      <span className={`inline-block mt-0.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold ${operatorColors.light} ${operatorColors.text} border ${operatorColors.border}`}>
                        {requirement.operateur || "Non spécifié"}
                      </span>
                    </div>
                  </div>

                  <div className={`flex items-start gap-3.5 p-3.5 bg-gradient-to-r ${operatorColors.bg} backdrop-blur-sm rounded-xl border ${operatorColors.border}`}>
                    <div className={`w-8 h-8 rounded-lg bg-white/60 flex items-center justify-center flex-shrink-0`}>
                      <Hash size={15} className={operatorColors.text} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Valeur</p>
                      <p className="text-sm font-mono font-semibold text-slate-800 mt-0.5">
                        {requirement.value || <span className="text-slate-400">—</span>}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Informations produit */}
                <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-50/80 backdrop-blur-sm border border-slate-200/60">
                  <div className="flex items-center gap-2">
                    <Package size={14} className="text-slate-400" />
                    <span className="text-xs text-slate-500">Produit:</span>
                    <span className="text-xs font-medium text-slate-700 truncate max-w-[150px]">{product.designation}</span>
                  </div>
                  <div className="w-px h-6 bg-slate-200" />
                  <div className="flex items-center gap-2">
                    <Layers size={14} className="text-slate-400" />
                    <span className="text-xs text-slate-500">Lot:</span>
                    <span className="text-xs font-medium text-slate-700">{product.technical_lot_name || "Non classifié"}</span>
                  </div>
                </div>
              </div>
            ) : (
              /* Vue édition */
              <form className="space-y-5">
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <ClipboardCheck size={16} className="text-emerald-500" />
                    Exigence
                    <span className="text-red-500 text-xs font-normal">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute top-3 left-3 pointer-events-none">
                      <ClipboardCheck size={16} className="text-emerald-400" />
                    </div>
                    <textarea 
                      {...form.register("requirement", { required: true })} 
                      rows={3} 
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-white/90 backdrop-blur-sm border-2 border-emerald-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:bg-white transition-all outline-none resize-none shadow-sm" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <Tag size={16} className="text-amber-500" />
                      Opérateur
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Tag size={16} className="text-amber-400" />
                      </div>
                      <select 
                        {...form.register("operateur")} 
                        className="w-full pl-10 pr-4 py-2.5 text-sm bg-white/90 backdrop-blur-sm border-2 border-amber-200 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 focus:bg-white transition-all outline-none shadow-sm"
                      >
                        {OPERATEURS.map((op) => <option key={op} value={op}>{op}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <Hash size={16} className="text-indigo-500" />
                      Valeur
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Hash size={16} className="text-indigo-400" />
                      </div>
                      <input 
                        {...form.register("value")} 
                        className="w-full pl-10 pr-4 py-2.5 text-sm bg-white/90 backdrop-blur-sm border-2 border-indigo-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:bg-white transition-all outline-none shadow-sm" 
                        placeholder="ex: 10 kW" 
                      />
                    </div>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </motion.div>

      <ConfirmDialog
        open={confirmDelete}
        title="Supprimer cette exigence ?"
        description={`"${requirement.requirement}" sera supprimée définitivement du produit "${product.designation}".`}
        confirmLabel="Supprimer"
        danger
        loading={deleting}
        onConfirm={() => deleteReq(requirement.id, { onSuccess: () => navigate(`/tenders/${tid}/products/${pid}`) })}
        onCancel={() => setConfirmDelete(false)}
      />
    </ErrorBoundary>
  )
}