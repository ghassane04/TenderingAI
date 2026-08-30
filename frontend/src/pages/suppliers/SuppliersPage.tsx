import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { useForm } from "react-hook-form"
import {
  Plus, Search, Building2, Mail, Loader2,
  RefreshCw, Check, FileText, ArrowRight,
  Calendar,
} from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { useSuppliersList, useCreateSupplier } from "../../hooks/useSuppliers"
import { useAuthStore } from "../../store/authStore"
import Modal from "../../components/ui/Modal"
import EmptyState from "../../components/ui/EmptyState"
import { CompanyLogo } from "../../components/ui/CompanyLogo"

interface FormData {
  company_name: string
  email: string
  description: string
}

export default function SuppliersPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const isAdmin = user?.roles?.includes("ROLE_ADMIN")
  const isAcheteur = user?.roles?.includes("ROLE_ACHETEUR") || isAdmin

  const { data, isLoading, refetch, isFetching } = useSuppliersList()
  const { mutate: create, isPending: creating } = useCreateSupplier()

  const [search, setSearch] = useState("")
  const [createOpen, setCreateOpen] = useState(false)

  const createForm = useForm<FormData>()

  const filtered = useMemo(() => {
    const list = data?.suppliers ?? []
    if (!search.trim()) return list
    const q = search.toLowerCase()
    return list.filter(
      (s) =>
        s.company_name.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q)
    )
  }, [data, search])

  const onCreateSubmit = (d: FormData) => {
    create(d, { onSuccess: () => { setCreateOpen(false); createForm.reset() } })
  }

  const fmt = (d?: string) =>
    d ? format(new Date(d), "dd MMM yyyy", { locale: fr }) : "—"

  // Statistiques
  const totalSuppliers = data?.suppliers?.length || 0
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
        {/* Top bar avec statistiques */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="page-title">Fournisseurs</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {totalSuppliers} fournisseur(s) enregistré(s)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => refetch()} disabled={isFetching} className="btn-secondary text-xs px-3 py-2">
              <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
            </button>
            {isAcheteur && (
              <button onClick={() => setCreateOpen(true)} className="btn-primary text-xs">
                <Plus size={15} /> Nouveau fournisseur
              </button>
            )}
          </div>
        </div>

        {/* Search bar améliorée */}
        <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl p-3 shadow-sm">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom, email ou description..."
              className="w-full pl-8 pr-4 py-2.5 text-sm bg-white/80 backdrop-blur-sm border-2 border-slate-200/60 rounded-xl focus:border-sky-400 focus:ring-2 focus:ring-sky-200 focus:bg-white transition-all outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <span className="text-xs font-medium">✕</span>
              </button>
            )}
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-sky-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl shadow-sm">
            <EmptyState
              icon={Building2}
              title="Aucun fournisseur trouvé"
              description={search ? "Modifiez votre recherche" : "Commencez par ajouter un fournisseur"}
              action={
                isAcheteur && !search ? (
                  <button onClick={() => setCreateOpen(true)} className="btn-primary text-xs">
                    <Plus size={13} /> Ajouter
                  </button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map((supplier, i) => (
              <motion.div
                key={supplier.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                onClick={() => navigate(`/suppliers/${supplier.id}`)}
                className="group bg-white/70 backdrop-blur-xl border border-white/50 rounded-2xl shadow-sm hover:shadow-lg hover:border-sky-200 hover:bg-white/90 transition-all duration-300 cursor-pointer overflow-hidden"
              >
                {/* En-tête coloré avec dégradé selon l'ID */}
                <div className={`h-1.5 w-full bg-gradient-to-r ${
                  supplier.id % 5 === 0 ? 'from-sky-400 to-blue-500' :
                  supplier.id % 5 === 1 ? 'from-emerald-400 to-teal-500' :
                  supplier.id % 5 === 2 ? 'from-amber-400 to-orange-500' :
                  supplier.id % 5 === 3 ? 'from-purple-400 to-pink-500' :
                  'from-rose-400 to-red-500'
                }`} />

                <div className="p-5">
                  {/* Header */}
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 p-2 rounded-xl bg-white/60 border border-white/70 backdrop-blur-md shadow-sm group-hover:border-sky-200 group-hover:shadow-md transition-all">
                      <CompanyLogo size="sm" variant="minimal" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-slate-900 group-hover:text-sky-600 transition-colors truncate text-base">
                          {supplier.company_name}
                        </p>
                        <ArrowRight 
                          size={16} 
                          className="text-slate-300 group-hover:text-sky-500 group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1" 
                        />
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Mail size={12} className="text-slate-400 flex-shrink-0" />
                        <p className="text-xs text-slate-500 truncate">
                          {supplier.email || "—"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Description complète avec style amélioré */}
                  {supplier.description && (
                    <div className="mt-3 p-3 rounded-xl bg-gradient-to-r from-slate-50/80 to-white/80 backdrop-blur-sm border border-slate-200/50 group-hover:border-sky-200/50 transition-all">
                      <div className="flex gap-2 items-start">
                        <FileText size={12} className="text-slate-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap line-clamp-3">
                          {supplier.description}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Meta avec icônes et couleurs */}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-3 mt-2 border-t border-slate-100/60">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Calendar size={11} className="text-amber-400" />
                        {fmt(supplier.created_at)}
                      </span>
                      {supplier.updated_at && supplier.updated_at !== supplier.created_at && (
                        <span className="flex items-center gap-1">
                          <RefreshCw size={10} className="text-purple-400" />
                          {fmt(supplier.updated_at)}
                        </span>
                      )}
                    </div>
                    {supplier.email && (
                      <span className="flex items-center gap-1 text-emerald-500 font-medium">
                        <Check size={10} />
                        Email validé
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Create Modal amélioré */}
      <Modal
        open={createOpen}
        onClose={() => { setCreateOpen(false); createForm.reset() }}
        title="Nouveau fournisseur"
        subtitle="Les informations seront utilisées pour l'envoi des emails"
      >
        <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-5">
          {/* Champ Nom */}
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
                {...createForm.register("company_name", { required: true })}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white/90 backdrop-blur-sm border-2 border-sky-200 rounded-xl focus:border-sky-500 focus:ring-2 focus:ring-sky-200 focus:bg-white transition-all outline-none shadow-sm"
                placeholder="Nom de l'entreprise"
              />
            </div>
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
                {...createForm.register("email", { required: true })}
                type="email"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white/90 backdrop-blur-sm border-2 border-indigo-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:bg-white transition-all outline-none shadow-sm"
                placeholder="contact@entreprise.ma"
              />
            </div>
          </div>

          {/* Champ Description */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <FileText size={16} className="text-emerald-500" />
              Description
              <span className="text-slate-400 text-xs font-normal">(optionnel)</span>
            </label>
            <div className="relative">
              <div className="absolute top-3 left-3 pointer-events-none">
                <FileText size={16} className="text-emerald-400" />
              </div>
              <textarea
                {...createForm.register("description")}
                rows={3}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white/90 backdrop-blur-sm border-2 border-emerald-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:bg-white transition-all outline-none resize-none shadow-sm"
                placeholder="Spécialités, certifications, domaines d'activité..."
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2 border-t-2 border-slate-100/80">
            <button
              type="button"
              onClick={() => { setCreateOpen(false); createForm.reset() }}
              className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100/80 hover:bg-slate-200/80 rounded-xl transition-all flex items-center gap-1.5"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 text-xs font-medium text-white bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {creating ? (
                <><Loader2 size={14} className="animate-spin" /> Création...</>
              ) : (
                <><Check size={14} /> Créer</>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
