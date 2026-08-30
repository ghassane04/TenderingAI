import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import {
  Plus, Search, RefreshCw, Trash2,
  Filter, FilePlus, ArrowUpDown, ArrowUp, ArrowDown,
  ChevronRight, FolderOpen, Cpu, FileText, Building2,
  Calendar, User, Sparkles, Clock,
} from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { useTenders, useDeleteTender, useProcessTender } from "../../hooks/useTenders"
import { useAuthStore } from "../../store/authStore"
import type { TenderMetadata } from "../../api/tenders"
import StatusBadge from "../../components/ui/StatusBadge"
import ConfirmDialog from "../../components/ui/ConfirmDialog"
import UploadTenderModal from "../../components/tenders/UploadTenderModal"
import CreateManualTenderModal from "../../components/tenders/CreateManualTenderModal"

const STATUS_FILTERS = [
  "Tous",
  "Metadonnées extraites",
  "Extraction des exigences en cours",
  "Extraction des exigences terminée",
  "Erreur",
]

type SortField = "code" | "designation" | "nom_client" | "status_name" | "uploaded_at" | "uploaded_by"
type SortOrder = "asc" | "desc"

export default function TendersListPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const isAdmin = user?.roles?.includes("ROLE_ADMIN")

  const { data, isLoading, refetch, isFetching } = useTenders()
  const { mutate: deleteTender, isPending: deleting } = useDeleteTender()
  const { mutate: processTender } = useProcessTender()

  const [uploadOpen, setUploadOpen] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("Tous")
  
  const [sortField, setSortField] = useState<SortField>("uploaded_at")
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")

  const [confirmDelete, setConfirmDelete] = useState<TenderMetadata | null>(null)
  const [confirmProcess, setConfirmProcess] = useState<TenderMetadata | null>(null)
  const [processingId, setProcessingId] = useState<number | null>(null)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("asc")
    }
  }

  const tenders = useMemo(() => {
    let list = data?.tenders ?? []

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (t) =>
          t.code?.toLowerCase().includes(q) ||
          t.designation?.toLowerCase().includes(q) ||
          t.nom_client?.toLowerCase().includes(q)
      )
    }

    if (statusFilter !== "Tous") {
      list = list.filter((t) => t.status_name === statusFilter)
    }

    return [...list].sort((a, b) => {
      let va = a[sortField] ?? ""
      let vb = b[sortField] ?? ""

      if (typeof va === "string") va = va.toLowerCase()
      if (typeof vb === "string") vb = vb.toLowerCase()

      if (va < vb) return sortOrder === "asc" ? -1 : 1
      if (va > vb) return sortOrder === "asc" ? 1 : -1
      return 0
    })
  }, [data, search, statusFilter, sortField, sortOrder])

  // Statistiques
  const stats = useMemo(() => {
    const list = data?.tenders ?? []
    const total = list.length
    const termine = list.filter(t => t.status_name === "Extraction des exigences terminée").length
    const enCours = list.filter(t => t.status_name === "Extraction des exigences en cours").length
    const erreur = list.filter(t => t.status_name === "Erreur").length
    return { total, termine, enCours, erreur }
  }, [data])

  const handleDelete = () => {
    if (!confirmDelete) return
    deleteTender(confirmDelete.id, { onSuccess: () => setConfirmDelete(null) })
  }

  const handleProcess = () => {
    if (!confirmProcess) return
    setProcessingId(confirmProcess.id)
    processTender(confirmProcess.id, {
      onSettled: () => {
        setProcessingId(null)
        setConfirmProcess(null)
      },
    })
  }

  const formatDate = (d: string | null) => {
    if (!d) return "—"
    try {
      return format(new Date(d), "dd MMM yyyy", { locale: fr })
    } catch {
      return "—"
    }
  }

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown size={12} className="text-slate-300 group-hover:text-slate-500" />
    }
    return sortOrder === "asc" ? (
      <ArrowUp size={12} className="text-sky-600" />
    ) : (
      <ArrowDown size={12} className="text-sky-600" />
    )
  }

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
        {/* En-tête de page */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="page-title">Appels d'offres</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {data?.total ?? 0} consultation(s) enregistrée(s)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="btn-secondary text-xs px-3 py-2 bg-white/60 backdrop-blur-md border border-white/40 shadow-sm hover:bg-white/80"
              title="Actualiser"
            >
              <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
            </button>
            <button
              onClick={() => setManualOpen(true)}
              className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5 bg-white/60 backdrop-blur-md border border-white/40 shadow-sm hover:bg-white/80"
            >
              <FilePlus size={14} />
              Saisie manuelle
            </button>
            <button onClick={() => setUploadOpen(true)} className="btn-primary text-xs shadow-md">
              <Plus size={15} />
              Via document (IA)
            </button>
          </div>
        </div>

        {/* Cartes de statistiques */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard 
            icon={FileText}
            label="Total"
            value={stats.total}
            gradient="from-sky-50 to-blue-50"
            border="border-sky-200"
            iconColor="text-sky-500"
          />
          <StatCard 
            icon={Sparkles}
            label="Terminés"
            value={stats.termine}
            gradient="from-emerald-50 to-teal-50"
            border="border-emerald-200"
            iconColor="text-emerald-500"
          />
          <StatCard 
            icon={Clock}
            label="En cours"
            value={stats.enCours}
            gradient="from-amber-50 to-orange-50"
            border="border-amber-200"
            iconColor="text-amber-500"
          />
          <StatCard 
            icon={Cpu}
            label="Erreur"
            value={stats.erreur}
            gradient="from-rose-50 to-red-50"
            border="border-rose-200"
            iconColor="text-rose-500"
          />
        </div>

        {/* Filtres & Recherche améliorés */}
        <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl p-3 shadow-sm flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par code, désignation, client..."
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
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter size={13} className="text-slate-400 flex-shrink-0" />
            {STATUS_FILTERS.map((s) => {
              const isActive = statusFilter === s
              const label = s === "Tous" ? "Tous" :
                           s === "Metadonnées extraites" ? "Créé" :
                           s === "Extraction des exigences en cours" ? "En cours" :
                           s === "Extraction des exigences terminée" ? "Terminé" : "Erreur"
              const colors = s === "Tous" ? "from-sky-500 to-blue-600" :
                            s === "Metadonnées extraites" ? "from-sky-500 to-blue-600" :
                            s === "Extraction des exigences en cours" ? "from-amber-500 to-orange-600" :
                            s === "Extraction des exigences terminée" ? "from-emerald-500 to-teal-600" :
                            "from-rose-500 to-red-600"
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? `bg-gradient-to-r ${colors} text-white shadow-md`
                      : "bg-white/40 text-slate-600 hover:bg-white/70 border border-white/30"
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Tableau amélioré */}
        <div className="bg-white/70 backdrop-blur-xl border border-white/60 rounded-2xl shadow-xl shadow-slate-200/40 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-slate-400">Chargement des appels d'offres...</p>
              </div>
            </div>
          ) : tenders.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-white/50 backdrop-blur-md border border-white/40 flex items-center justify-center shadow-inner">
                <FolderOpen size={28} className="text-slate-400" />
              </div>
              <p className="text-sm text-slate-600 font-medium">Aucun appel d'offres trouvé</p>
              <p className="text-xs text-slate-400">
                {search || statusFilter !== "Tous"
                  ? "Modifiez vos filtres de recherche"
                  : "Commencez par créer votre premier appel d'offres"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="border-b border-slate-200/50 bg-gradient-to-r from-slate-50/80 to-white/80 backdrop-blur-md text-[11px] font-semibold text-slate-500 uppercase tracking-wider select-none">
                    {[
                      { field: "code", label: "CODE AO" },
                      { field: "designation", label: "DÉSIGNATION" },
                      { field: "nom_client", label: "CLIENT" },
                      { field: "status_name", label: "STATUT" },
                      { field: "uploaded_at", label: "CRÉÉ LE" },
                      { field: "uploaded_by", label: "PAR" },
                      { field: null, label: "ACTIONS" },
                    ].map((col) => (
                      <th
                        key={col.field || "actions"}
                        onClick={() => col.field && handleSort(col.field as SortField)}
                        className={`py-3.5 px-4 ${col.field ? "cursor-pointer hover:bg-white/40 transition-colors group" : "text-right"}`}
                      >
                        <div className={`flex items-center gap-1.5 ${!col.field ? "justify-end" : ""}`}>
                          <span>{col.label}</span>
                          {col.field && renderSortIcon(col.field as SortField)}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/40 text-xs">
                  {tenders.map((tender, index) => {
                    return (
                      <motion.tr
                        key={tender.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(index * 0.02, 0.3) }}
                        onClick={() => navigate(`/tenders/${tender.id}`)}
                        className="hover:bg-white/80 transition-all cursor-pointer group"
                      >
                        {/* Code AO */}
                        <td className="py-3 px-4 align-middle font-mono font-medium text-slate-700 whitespace-nowrap">
                          {tender.code ? (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100/80 backdrop-blur-sm border border-slate-200/50 text-slate-700 group-hover:bg-sky-50 group-hover:text-sky-700 transition-colors">
                              {tender.code}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>

                        {/* Désignation */}
                        <td 
                          className="py-3 px-4 align-middle font-medium text-slate-800 max-w-xs truncate group-hover:text-sky-600 transition-colors"
                          title={tender.designation || `Appel d'offres #${tender.id}`}
                        >
                          <div className="flex items-center gap-2">
                            <FileText size={12} className="text-slate-400 flex-shrink-0" />
                            {tender.designation || `Appel d'offres #${tender.id}`}
                          </div>
                        </td>

                        {/* Client */}
                        <td 
                          className="py-3 px-4 align-middle text-slate-600 max-w-xs truncate"
                          title={tender.nom_client || ""}
                        >
                          {tender.nom_client ? (
                            <div className="flex items-center gap-2">
                              <Building2 size={12} className="text-slate-400 flex-shrink-0" />
                              {tender.nom_client}
                            </div>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>

                        {/* Statut avec badge coloré */}
                        <td className="py-3 px-4 align-middle whitespace-nowrap">
                          {tender.status_name ? (
                            <div className="flex items-center gap-1.5">
                              <StatusBadge status={tender.status_name} />
                            </div>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>

                        {/* Date de création */}
                        <td className="py-3 px-4 align-middle text-slate-500 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={11} className="text-slate-400" />
                            {formatDate(tender.uploaded_at)}
                          </div>
                        </td>

                        {/* Créé par */}
                        <td className="py-3 px-4 align-middle text-slate-500 whitespace-nowrap">
                          {tender.uploaded_by ? (
                            <div className="flex items-center gap-1.5">
                              <User size={11} className="text-slate-400" />
                              {tender.uploaded_by}
                            </div>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 align-middle text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setConfirmProcess(tender)
                              }}
                              disabled={processingId === tender.id}
                              title="Lancer l'extraction IA"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50/80 transition-all disabled:opacity-40"
                            >
                              {processingId === tender.id ? (
                                <RefreshCw size={16} className="animate-spin text-sky-500" />
                              ) : (
                                <Cpu size={16} />
                              )}
                            </button>

                            {isAdmin && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setConfirmDelete(tender)
                                }}
                                title="Supprimer"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50/80 transition-all"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}

                            <ChevronRight
                              size={16}
                              className="text-slate-300 group-hover:text-sky-600 group-hover:translate-x-0.5 transition-all ml-1"
                            />
                          </div>
                        </td>
                      </motion.tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </motion.div>

      <UploadTenderModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
      <CreateManualTenderModal open={manualOpen} onClose={() => setManualOpen(false)} />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Supprimer cet appel d'offres ?"
        description={`Le tender "${confirmDelete?.code || confirmDelete?.designation}" et toutes ses données associées seront définitivement supprimés.`}
        confirmLabel="Supprimer définitivement"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      <ConfirmDialog
        open={!!confirmProcess}
        title="Lancer l'extraction IA ?"
        description={`L'extraction des produits et exigences va démarrer pour "${confirmProcess?.designation}". Cette opération peut prendre quelques minutes.`}
        confirmLabel="Lancer l'extraction"
        onConfirm={handleProcess}
        onCancel={() => setConfirmProcess(null)}
      />
    </>
  )
}

// Composant StatCard
function StatCard({ icon: Icon, label, value, gradient, border, iconColor }: {
  icon: React.ElementType
  label: string
  value: number
  gradient: string
  border: string
  iconColor: string
}) {
  return (
    <div className={`bg-gradient-to-r ${gradient} backdrop-blur-xl border ${border} rounded-2xl px-4 py-3 shadow-sm`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-slate-800">{value}</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-white/60 flex items-center justify-center shadow-sm">
          <Icon size={18} className={iconColor} />
        </div>
      </div>
    </div>
  )
}
