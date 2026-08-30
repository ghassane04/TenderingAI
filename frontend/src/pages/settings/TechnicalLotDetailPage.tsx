import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { useForm } from "react-hook-form"
import {
  Layers, Calendar, Loader2,
  ArrowLeft, Edit2, Trash2, Check, X,
  ClipboardCheck, RefreshCw, Box,
} from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { useUpdateLot, useDeleteLot, useTechnicalLotDetail } from "../../hooks/useTechnicalLots"
import ConfirmDialog from "../../components/ui/ConfirmDialog"

interface FormData {
  name: string
  description: string
}

// Couleurs pour le détail (basé sur l'ID)
const DETAIL_COLORS = [
  { bg: "from-sky-600 to-blue-700", light: "from-sky-50 to-blue-50", border: "border-sky-200", text: "text-sky-600", ring: "ring-sky-200" },
  { bg: "from-emerald-600 to-teal-700", light: "from-emerald-50 to-teal-50", border: "border-emerald-200", text: "text-emerald-600", ring: "ring-emerald-200" },
  { bg: "from-violet-600 to-purple-700", light: "from-violet-50 to-purple-50", border: "border-violet-200", text: "text-violet-600", ring: "ring-violet-200" },
  { bg: "from-amber-600 to-orange-700", light: "from-amber-50 to-orange-50", border: "border-amber-200", text: "text-amber-600", ring: "ring-amber-200" },
  { bg: "from-rose-600 to-red-700", light: "from-rose-50 to-red-50", border: "border-rose-200", text: "text-rose-600", ring: "ring-rose-200" },
  { bg: "from-cyan-600 to-sky-700", light: "from-cyan-50 to-sky-50", border: "border-cyan-200", text: "text-cyan-600", ring: "ring-cyan-200" },
  { bg: "from-indigo-600 to-blue-800", light: "from-indigo-50 to-blue-50", border: "border-indigo-200", text: "text-indigo-600", ring: "ring-indigo-200" },
  { bg: "from-teal-600 to-emerald-700", light: "from-teal-50 to-emerald-50", border: "border-teal-200", text: "text-teal-600", ring: "ring-teal-200" },
  { bg: "from-fuchsia-600 to-pink-700", light: "from-fuchsia-50 to-pink-50", border: "border-fuchsia-200", text: "text-fuchsia-600", ring: "ring-fuchsia-200" },
  { bg: "from-lime-600 to-green-700", light: "from-lime-50 to-green-50", border: "border-lime-200", text: "text-lime-600", ring: "ring-lime-200" },
]

const getColor = (id: number) => {
  return DETAIL_COLORS[id % DETAIL_COLORS.length]
}

export default function TechnicalLotDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [editing, setEditing] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const { data: lot, isLoading, error, isFetching, refetch } = useTechnicalLotDetail(Number(id))

  const { mutate: update, isPending: updating } = useUpdateLot()
  const { mutate: remove, isPending: deleting } = useDeleteLot()

  const { register, handleSubmit, reset } = useForm<FormData>()

  const startEdit = () => {
    if (!lot) return
    reset({ name: lot.name, description: lot.description ?? "" })
    setEditing(true)
  }

  const onSubmit = (d: FormData) => {
    if (!lot) return
    update(
      { id: lot.id, data: { name: d.name, description: d.description || undefined } },
      { onSuccess: () => setEditing(false) }
    )
  }

  const fmt = (d?: string) =>
    d ? format(new Date(d), "dd MMMM yyyy 'à' HH:mm", { locale: fr }) : "—"

  const colors = lot ? getColor(lot.id) : DETAIL_COLORS[0]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 size={28} className="animate-spin text-sky-500" />
      </div>
    )
  }

  if (error || !lot) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <p className="text-sm text-red-500">Impossible de charger ce lot technique</p>
        <button onClick={() => navigate("/settings/lots")} className="btn-secondary text-xs">
          <ArrowLeft size={13} /> Retour à la liste
        </button>
      </div>
    )
  }

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/settings/lots")}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-sky-600 transition-colors"
          >
            <ArrowLeft size={13} /> Retour aux lots techniques
          </button>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 rounded-xl bg-white/60 backdrop-blur-md border border-white/40 shadow-sm hover:bg-white/80 transition-all disabled:opacity-50"
            title="Actualiser"
          >
            <RefreshCw size={14} className={isFetching ? "animate-spin text-sky-500" : "text-slate-400"} />
          </button>
        </div>

        <div className="bg-white/70 backdrop-blur-2xl rounded-2xl shadow-xl shadow-slate-300/30 border border-white/60 overflow-hidden">
          {/* Header avec dégradé coloré */}
          <div className={`bg-gradient-to-r ${colors.bg} px-8 py-9 flex items-center justify-between gap-4`}>
            <div className="flex items-center gap-5 min-w-0">
              <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center border-2 border-white/25 flex-shrink-0 shadow-lg">
                <Layers size={28} className="text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-white truncate">{lot.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-white/70">
                    Créé le {fmt(lot.created_at)}
                  </span>
                </div>
              </div>
            </div>
            {!editing && (
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={startEdit}
                  className="w-9 h-9 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors hover:scale-105"
                  title="Modifier"
                >
                  <Edit2 size={15} />
                </button>
                <button
                  onClick={() => setDeleteOpen(true)}
                  className="w-9 h-9 rounded-lg bg-white/15 hover:bg-red-500/70 flex items-center justify-center text-white transition-colors hover:scale-105"
                  title="Supprimer"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            )}
          </div>

          {/* Body */}
          <div className="px-8 py-6">
            {editing ? (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Champ Nom */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Layers size={16} className={colors.text} />
                    Nom du lot
                    <span className="text-red-500 text-xs font-normal">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Layers size={16} className={colors.text} />
                    </div>
                    <input
                      {...register("name", { required: true })}
                      className={`w-full pl-10 pr-4 py-2.5 text-sm bg-white/90 backdrop-blur-sm border-2 ${colors.border} rounded-xl focus:border-sky-500 focus:ring-2 ${colors.ring} focus:bg-white transition-all outline-none shadow-sm`}
                      placeholder="Nom du lot"
                    />
                  </div>
                </div>

                {/* Champ Description */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <ClipboardCheck size={16} className="text-emerald-500" />
                    Description
                    <span className="text-slate-400 text-xs font-normal">(optionnel)</span>
                  </label>
                  <div className="relative">
                    <div className="absolute top-3 left-3 pointer-events-none">
                      <ClipboardCheck size={16} className="text-emerald-400" />
                    </div>
                    <textarea
                      {...register("description")}
                      rows={4}
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-white/90 backdrop-blur-sm border-2 border-emerald-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:bg-white transition-all outline-none resize-none shadow-sm"
                      placeholder="Description du lot pour guider l'IA..."
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Une description précise aide l'IA à classifier correctement les produits.
                  </p>
                </div>

                <div className="flex gap-3 justify-end pt-2 border-t-2 border-slate-100/80">
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100/80 hover:bg-slate-200/80 rounded-xl transition-all flex items-center gap-1.5"
                  >
                    <X size={14} /> Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={updating}
                    className="px-4 py-2 text-xs font-medium text-white bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {updating ? (
                      <><Loader2 size={14} className="animate-spin" /> Enregistrement...</>
                    ) : (
                      <><Check size={14} /> Enregistrer</>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                {/* Description */}
                <div className={`p-4 rounded-xl bg-gradient-to-r ${colors.light} backdrop-blur-sm border ${colors.border}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <ClipboardCheck size={14} className={colors.text} />
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</p>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {lot.description || "Aucune description renseignée."}
                  </p>
                </div>

                {/* Meta grid avec couleurs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r ${colors.light} backdrop-blur-sm border ${colors.border}`}>
                    <Calendar size={18} className={`${colors.text} flex-shrink-0`} />
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Créé le</p>
                      <p className="text-sm font-semibold text-slate-800">{fmt(lot.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-purple-50/80 to-pink-50/80 backdrop-blur-sm border border-purple-100/60">
                    <RefreshCw size={18} className="text-purple-500 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Dernière mise à jour</p>
                      <p className="text-sm font-semibold text-slate-800">{fmt(lot.updated_at)}</p>
                    </div>
                  </div>
                </div>

                {/* Informations supplémentaires */}
                <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-50/80 backdrop-blur-sm border border-slate-200/60">
                  <div className="flex items-center gap-2">
                    <Box size={14} className="text-slate-400" />
                    <span className="text-xs text-slate-500">Utilisé par l'IA pour la classification</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      <ConfirmDialog
        open={deleteOpen}
        title="Supprimer ce lot ?"
        description={`Le lot "${lot.name}" sera supprimé. Les produits associés perdront leur classification.`}
        confirmLabel="Supprimer"
        danger
        loading={deleting}
        onConfirm={() => remove(lot.id, { onSuccess: () => navigate("/settings/lots") })}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  )
}
