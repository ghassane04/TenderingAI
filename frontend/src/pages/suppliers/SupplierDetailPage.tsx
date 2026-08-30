import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { useForm } from "react-hook-form"
import {
  Building2, Mail, FileText, Calendar, History,
  Loader2, ArrowLeft, Edit2, Trash2, Check, X, RefreshCw,
} from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { useUpdateSupplier, useDeleteSupplier, useSupplierDetail } from "../../hooks/useSuppliers"
import { useAuthStore } from "../../store/authStore"
import ConfirmDialog from "../../components/ui/ConfirmDialog"
import { CompanyLogo } from "../../components/ui/CompanyLogo"

interface FormData {
  company_name: string
  email: string
  description: string
}

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const isAdmin = user?.roles?.includes("ROLE_ADMIN")
  const isAcheteur = user?.roles?.includes("ROLE_ACHETEUR") || isAdmin

  const [editing, setEditing]           = useState(false)
  const [deleteOpen, setDeleteOpen]     = useState(false)

  const { data: supplier, isLoading, error, isFetching, refetch } = useSupplierDetail(Number(id))

  const { mutate: update, isPending: updating } = useUpdateSupplier()
  const { mutate: remove, isPending: deleting } = useDeleteSupplier()

  const { register, handleSubmit, reset } = useForm<FormData>()

  const startEdit = () => {
    if (!supplier) return
    reset({
      company_name: supplier.company_name,
      email: supplier.email ?? "",
      description: supplier.description ?? "",
    })
    setEditing(true)
  }

  const onSubmit = (d: FormData) => {
    if (!supplier) return
    update({ id: supplier.id, data: d }, { onSuccess: () => setEditing(false) })
  }

  const fmt = (d?: string) =>
    d ? format(new Date(d), "dd MMMM yyyy 'à' HH:mm", { locale: fr }) : "—"

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 size={28} className="animate-spin text-sky-500" />
      </div>
    )
  }

  if (error || !supplier) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <p className="text-sm text-red-500">Impossible de charger ce fournisseur</p>
        <button onClick={() => navigate("/suppliers")} className="btn-secondary text-xs">
          <ArrowLeft size={13} /> Retour à la liste
        </button>
      </div>
    )
  }

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto space-y-4">
        {/* Retour */}
        <div className="flex items-center justify-between">
          <button onClick={() => navigate("/suppliers")} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-sky-600 transition-colors">
            <ArrowLeft size={13} /> Retour aux fournisseurs
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
          {/* Header */}
          <div className="bg-gradient-to-r from-sky-50/80 via-white/40 to-amber-50/50 backdrop-blur-xl px-8 py-9 flex items-center justify-between gap-4 border-b border-white/60">
            <div className="flex items-center gap-5 min-w-0">
              <span className="flex-shrink-0 p-1.5 rounded-2xl bg-white/60 border border-white/80 backdrop-blur-md shadow-sm">
                <CompanyLogo size="lg" />
              </span>
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-slate-800 truncate">{supplier.company_name}</h1>
                <div className="flex items-center gap-1.5 mt-1 text-slate-500 text-sm">
                  <Mail size={13} /> <span className="truncate">{supplier.email || "—"}</span>
                </div>
              </div>
            </div>
            {isAcheteur && !editing && (
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={startEdit}
                  className="w-9 h-9 rounded-lg bg-white/60 hover:bg-white/90 border border-white/70 flex items-center justify-center text-slate-500 hover:text-sky-600 transition-colors"
                  title="Modifier"
                >
                  <Edit2 size={15} />
                </button>
                {isAdmin && (
                  <button
                    onClick={() => setDeleteOpen(true)}
                    className="w-9 h-9 rounded-lg bg-white/60 hover:bg-red-50 border border-white/70 hover:border-red-200 flex items-center justify-center text-slate-500 hover:text-red-500 transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Body */}
          <div className="px-8 py-6">
            {editing ? (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Champ Nom de l'entreprise */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Building2 size={16} className="text-sky-500" />
                    Nom de l'entreprise
                    <span className="text-red-500 text-xs font-normal">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Building2 size={16} className="text-sky-400" />
                    </div>
                    <input
                      {...register("company_name", { required: true })}
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-white/90 backdrop-blur-sm border-2 border-sky-200 rounded-xl focus:border-sky-500 focus:ring-2 focus:ring-sky-200 focus:bg-white transition-all outline-none shadow-sm"
                      placeholder="Nom de l'entreprise"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">Nom officiel de l'entreprise fournisseur</p>
                </div>

                {/* Champ Email */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Mail size={16} className="text-indigo-500" />
                    Email
                    <span className="text-red-500 text-xs font-normal">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail size={16} className="text-indigo-400" />
                    </div>
                    <input
                      {...register("email", { required: true })}
                      type="email"
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-white/90 backdrop-blur-sm border-2 border-indigo-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:bg-white transition-all outline-none shadow-sm"
                      placeholder="email@entreprise.com"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">Email principal de contact du fournisseur</p>
                </div>

                {/* Champ Description */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <FileText size={16} className="text-emerald-500" />
                    Description
                  </label>
                  <div className="relative">
                    <div className="absolute top-3 left-3 pointer-events-none">
                      <FileText size={16} className="text-emerald-400" />
                    </div>
                    <textarea
                      {...register("description")}
                      rows={4}
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-white/90 backdrop-blur-sm border-2 border-emerald-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:bg-white transition-all outline-none resize-none shadow-sm"
                      placeholder="Description de l'entreprise, ses spécialités, certifications..."
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">Informations générales sur l'entreprise et ses activités</p>
                </div>

                {/* Boutons d'action */}
                <div className="flex gap-3 justify-end pt-4 border-t-2 border-slate-100/80">
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
                <div className="p-4 rounded-xl bg-gradient-to-r from-sky-50/50 to-indigo-50/50 backdrop-blur-sm border border-sky-100/60">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText size={14} className="text-emerald-500" />
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</p>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {supplier.description || "Aucune description renseignée."}
                  </p>
                </div>

                {/* Meta grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-amber-50/50 to-orange-50/50 backdrop-blur-sm border border-amber-100/60">
                    <Calendar size={18} className="text-amber-500 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Créé le</p>
                      <p className="text-sm font-semibold text-slate-800">{fmt(supplier.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-purple-50/50 to-pink-50/50 backdrop-blur-sm border border-purple-100/60">
                    <History size={18} className="text-purple-500 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Dernière mise à jour</p>
                      <p className="text-sm font-semibold text-slate-800">{fmt(supplier.updated_at)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      <ConfirmDialog
        open={deleteOpen}
        title="Supprimer ce fournisseur ?"
        description={`"${supplier.company_name}" sera définitivement supprimé. Toutes ses fiches techniques associées le seront également.`}
        confirmLabel="Supprimer"
        danger
        loading={deleting}
        onConfirm={() =>
          remove(supplier.id, { onSuccess: () => navigate("/suppliers") })
        }
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  )
}