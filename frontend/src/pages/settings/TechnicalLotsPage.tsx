import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { useForm } from "react-hook-form"
import {
  Plus, Layers, Loader2, Check, RefreshCw, Search, ArrowRight,
  Hash, Building2, Wrench, Zap, Monitor, Server,
  Thermometer, Droplets, Shield, Truck, ClipboardCheck,
} from "lucide-react"
import { useTechnicalLotsList, useCreateLot } from "../../hooks/useTechnicalLots"
import Modal from "../../components/ui/Modal"
import EmptyState from "../../components/ui/EmptyState"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

interface FormData {
  name: string
  description: string
}

// Couleurs distinctes pour les lots
const LOT_COLORS = [
  { bg: "from-sky-500 to-blue-600", light: "from-sky-50 to-blue-50", border: "border-sky-200", text: "text-sky-600" },
  { bg: "from-emerald-500 to-teal-600", light: "from-emerald-50 to-teal-50", border: "border-emerald-200", text: "text-emerald-600" },
  { bg: "from-violet-500 to-purple-600", light: "from-violet-50 to-purple-50", border: "border-violet-200", text: "text-violet-600" },
  { bg: "from-amber-500 to-orange-600", light: "from-amber-50 to-orange-50", border: "border-amber-200", text: "text-amber-600" },
  { bg: "from-rose-500 to-red-600", light: "from-rose-50 to-red-50", border: "border-rose-200", text: "text-rose-600" },
  { bg: "from-cyan-500 to-sky-600", light: "from-cyan-50 to-sky-50", border: "border-cyan-200", text: "text-cyan-600" },
  { bg: "from-indigo-500 to-blue-700", light: "from-indigo-50 to-blue-50", border: "border-indigo-200", text: "text-indigo-600" },
  { bg: "from-teal-500 to-emerald-600", light: "from-teal-50 to-emerald-50", border: "border-teal-200", text: "text-teal-600" },
  { bg: "from-fuchsia-500 to-pink-600", light: "from-fuchsia-50 to-pink-50", border: "border-fuchsia-200", text: "text-fuchsia-600" },
  { bg: "from-lime-500 to-green-600", light: "from-lime-50 to-green-50", border: "border-lime-200", text: "text-lime-600" },
]

// Icônes pour chaque lot (basé sur l'ID)
const LOT_ICONS = [
  Monitor, Server, Wrench, Zap, Thermometer, 
  Droplets, Shield, Truck, ClipboardCheck, Building2,
  Layers, Hash,
]

const getLotIcon = (id: number) => {
  const Icon = LOT_ICONS[id % LOT_ICONS.length]
  return Icon
}

const getLotColor = (id: number) => {
  return LOT_COLORS[id % LOT_COLORS.length]
}

export default function TechnicalLotsPage() {
  const navigate = useNavigate()
  const { data, isLoading, refetch, isFetching } = useTechnicalLotsList()
  const { mutate: create, isPending: creating } = useCreateLot()

  const [search, setSearch] = useState("")
  const [createOpen, setCreateOpen] = useState(false)

  const createForm = useForm<FormData>()

  const filtered = useMemo(() => {
    const list = data?.lots ?? []
    if (!search.trim()) return list
    const q = search.toLowerCase()
    return list.filter(
      (l) => l.name.toLowerCase().includes(q) || l.description?.toLowerCase().includes(q)
    )
  }, [data, search])

  const onCreateSubmit = (d: FormData) => {
    create(
      { name: d.name, description: d.description || undefined },
      { onSuccess: () => { setCreateOpen(false); createForm.reset() } }
    )
  }

  const fmt = (d?: string) =>
    d ? format(new Date(d), "dd MMM yyyy", { locale: fr }) : "—"

  const lots = data?.lots ?? []

  // Statistiques
  const totalLots = lots.length
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
        {/* Top bar avec statistiques */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="page-title">Lots techniques</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {totalLots} lot(s) configuré(s) — utilisés pour classifier les produits et chunks
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => refetch()} disabled={isFetching} className="btn-secondary text-xs px-3 py-2">
              <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
            </button>
            <button onClick={() => setCreateOpen(true)} className="btn-primary text-xs">
              <Plus size={15} /> Nouveau lot
            </button>
          </div>
        </div>


        {/* Info banner amélioré */}
        <div className="bg-gradient-to-r from-sky-50/80 to-indigo-50/80 backdrop-blur-xl border border-sky-100/60 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
          <div className="w-8 h-8 rounded-xl bg-sky-100/60 flex items-center justify-center flex-shrink-0">
            <Layers size={16} className="text-sky-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-sky-700">Classification automatique</p>
            <p className="text-xs text-sky-600/80 leading-relaxed">
              Les lots techniques sont utilisés par l'IA pour classifier automatiquement chaque produit
              extrait des documents d'appel d'offres.
            </p>
          </div>
        </div>

        {/* Search bar améliorée */}
        <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl p-3 shadow-sm">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un lot par nom ou description..."
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
              icon={Layers}
              title="Aucun lot trouvé"
              description="Créez votre premier lot technique pour commencer la classification"
              action={
                <button onClick={() => setCreateOpen(true)} className="btn-primary text-xs">
                  <Plus size={13} /> Créer un lot
                </button>
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map((lot, i) => {
              const colors = getLotColor(lot.id)
              const Icon = getLotIcon(lot.id)
              return (
                <motion.div
                  key={lot.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}
                  onClick={() => navigate(`/settings/lots/${lot.id}`)}
                  className="group bg-white/70 backdrop-blur-xl border border-white/50 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden"
                >
                  {/* Bande colorée en haut */}
                  <div className={`h-1.5 w-full bg-gradient-to-r ${colors.bg}`} />

                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      {/* Logo coloré avec icône */}
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors.bg} flex items-center justify-center flex-shrink-0 shadow-md group-hover:shadow-lg transition-all`}>
                        <Icon size={20} className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-slate-900 group-hover:text-sky-600 transition-colors text-base truncate">
                            {lot.name}
                          </p>
                          <ArrowRight 
                            size={16} 
                            className="text-slate-300 group-hover:text-sky-500 group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1" 
                          />
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-slate-400">
                            Créé le {fmt(lot.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Description avec style amélioré */}
                    {lot.description && (
                      <div className={`mt-3 p-3 rounded-xl bg-gradient-to-r ${colors.light} backdrop-blur-sm border ${colors.border} group-hover:border-sky-200/50 transition-all`}>
                        <div className="flex gap-2 items-start">
                          <ClipboardCheck size={12} className={`${colors.text} mt-0.5 flex-shrink-0`} />
                          <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap line-clamp-3">
                            {lot.description}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Meta */}
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-3 mt-2 border-t border-slate-100/60">
                      {lot.updated_at && lot.updated_at !== lot.created_at && (
                        <span className="flex items-center gap-1">
                          <RefreshCw size={10} className="text-purple-400" />
                          Mis à jour {fmt(lot.updated_at)}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </motion.div>

      {/* Create modal amélioré */}
      <Modal
        open={createOpen}
        onClose={() => { setCreateOpen(false); createForm.reset() }}
        title="Nouveau lot technique"
        subtitle="Sera utilisé par l'IA pour classifier les produits"
      >
        <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-5">
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Layers size={16} className="text-sky-500" />
              Nom du lot
              <span className="text-red-500 text-xs font-normal">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Layers size={16} className="text-sky-400" />
              </div>
              <input
                {...createForm.register("name", { required: true })}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white/90 backdrop-blur-sm border-2 border-sky-200 rounded-xl focus:border-sky-500 focus:ring-2 focus:ring-sky-200 focus:bg-white transition-all outline-none shadow-sm"
                placeholder="ex : Postes Clients & Périphériques"
              />
            </div>
          </div>

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
                {...createForm.register("description")}
                rows={3}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white/90 backdrop-blur-sm border-2 border-emerald-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:bg-white transition-all outline-none resize-none shadow-sm"
                placeholder="Description courte pour guider l'IA dans la classification..."
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Une description précise améliore la classification automatique par l'IA.
            </p>
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
