import { useParams, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { 
  ArrowLeft, Trash2, Loader2, RefreshCw,
  FileText, User, Calendar, Clock, File, HardDrive,
  Sparkles, AlertCircle, Layers, Eye
} from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { useDocumentDetail, useDeleteDocument, useViewDocument} from "../../hooks/useDocuments"
import { useReprocessDocument } from "../../hooks/useDocuments"
import ConfirmDialog from "../../components/ui/ConfirmDialog"
import StatusBadge from "../../components/ui/StatusBadge"
import { useState } from "react"
import { useAuthStore } from "../../store/authStore"

export default function TenderDocumentDetails() {
  const { user } = useAuthStore()
  const isAdmin = user?.roles?.includes("ROLE_ADMIN")
  const { id, documentId } = useParams<{ id: string; documentId: string }>()
  const navigate = useNavigate()
  const docId = Number(documentId)
  const { data: doc, isLoading, isError, isFetching, refetch } = useDocumentDetail(docId)
  const { mutate: deleteDoc, isPending: isDeleting } = useDeleteDocument()
  const { mutate: reprocessDoc, isPending: isReprocessing } = useReprocessDocument()

  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const { mutate: viewDoc, isPending: isOpeningView } = useViewDocument()

  const fmt = (d: string | null | undefined) => {
    if (!d) return "—"
    const date = new Date(typeof d === "string" ? d.replace(" ", "T") : d)
    return Number.isNaN(date.getTime()) ? "—" : format(date, "dd MMM yyyy à HH:mm", { locale: fr })
  }

  const getStatusColor = (status: string | undefined) => {
    if (!status) return "from-sky-500 to-blue-600"
    if (status === "Traité" || status === "Terminé") return "from-emerald-500 to-teal-600"
    if (status === "En cours") return "from-amber-500 to-orange-600"
    if (status === "Erreur") return "from-rose-500 to-red-600"
    return "from-sky-500 to-blue-600"
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-sky-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Chargement du document...</p>
        </div>
      </div>
    )
  }

  if (isError || !doc) {
    return (
      <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl p-12 text-center max-w-4xl mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-rose-50/80 border border-rose-200 flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={28} className="text-rose-500" />
        </div>
        <p className="text-sm font-medium text-slate-600">Document introuvable</p>
        <p className="text-xs text-slate-400 mt-1">Ce document n'existe pas ou a été supprimé</p>
      </div>
    )
  }

  const progress = doc.count_chunks && doc.count_chunks > 0 
    ? Math.round((doc.nb_chunks_done || 0) / doc.count_chunks * 100) 
    : 0
  const statusColors = getStatusColor(doc.statut_name)

  const handleDelete = () => {
    deleteDoc(doc.id, {
      onSuccess: () => navigate(`/tenders/${id}`),
    })
  }

  const handleReprocess = () => {
    reprocessDoc(docId)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* Header avec retour */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button 
          onClick={() => navigate(`/tenders/${id}`)} 
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-sky-600 transition-colors"
        >
          <ArrowLeft size={14} /> Retour au tender
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
          <button
            onClick={() => viewDoc({ documentId: doc.id, filename: doc.designation || `document-${doc.id}` })}
            disabled={isOpeningView}
            className="px-3 py-2 text-xs font-medium text-slate-600 bg-white/60 hover:bg-white/90 rounded-xl border border-white/40 shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {isOpeningView ? <Loader2 size={13} className="animate-spin" /> : <Eye size={13} />}
            Voir le document
          </button>
          <button
            onClick={handleReprocess}
            disabled={isReprocessing}
            className="px-3 py-2 text-xs font-medium text-sky-600 bg-sky-50/80 hover:bg-sky-100/80 rounded-xl border border-sky-200/60 transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <Sparkles size={13} className={isReprocessing ? "animate-spin" : ""} />
            {isReprocessing ? "Extraction..." : "Relancer l'extraction"}
          </button>
          {isAdmin && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="p-2 rounded-xl bg-rose-50/80 hover:bg-rose-100/80 border border-rose-200/60 transition-all text-rose-500 hover:text-rose-600"
              title="Supprimer"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Carte principale */}
      <div className="bg-white/70 backdrop-blur-2xl rounded-2xl shadow-xl shadow-slate-300/30 border border-white/60 overflow-hidden">
        {/* En-tête avec dégradé */}
        <div className={`bg-gradient-to-r ${statusColors} px-6 py-5`}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center border border-white/20 flex-shrink-0">
              <FileText size={22} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-white truncate">{doc.designation}</h1>
              <div className="flex items-center gap-3 mt-1 text-white/80 text-xs">
                <span className="flex items-center gap-1">
                  <File size={11} /> {doc.filetype || "—"}
                </span>
                <span className="w-px h-3 bg-white/20" />
                <span className="flex items-center gap-1">
                  <HardDrive size={11} /> {doc.file_size || "—"}
                </span>
              </div>
            </div>
            <StatusBadge status={doc.statut_name} />
          </div>
        </div>

        {/* Corps */}
        <div className="p-6 space-y-5">
          {/* Progression */}
          <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/60">
            <div className="flex items-center justify-between text-xs text-slate-600 font-medium mb-2">
              <span className="flex items-center gap-2">
                <Layers size={13} className="text-slate-400" />
                Avancement du traitement des chunks
              </span>
              <span>{doc.nb_chunks_done || 0} / {doc.count_chunks || 0} ({progress}%)</span>
            </div>
            <div className="h-2.5 bg-slate-200/80 rounded-full overflow-hidden">
              <div 
                className={`h-full bg-gradient-to-r ${statusColors} transition-all duration-500 rounded-full`} 
                style={{ width: `${progress}%` }} 
              />
            </div>
          </div>

          {/* Informations en grille */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <InfoCard 
              icon={File} 
              label="Type de fichier" 
              value={doc.filetype || "—"} 
              color="from-sky-50 to-blue-50"
              border="border-sky-200"
              iconColor="text-sky-500"
            />
            <InfoCard 
              icon={HardDrive} 
              label="Taille" 
              value={doc.file_size || "—"} 
              color="from-emerald-50 to-teal-50"
              border="border-emerald-200"
              iconColor="text-emerald-500"
            />
            <InfoCard 
              icon={User} 
              label="Créé par" 
              value={doc.uploaded_by || "—"} 
              color="from-indigo-50 to-purple-50"
              border="border-indigo-200"
              iconColor="text-indigo-500"
            />
            <InfoCard 
              icon={Calendar} 
              label="Statut" 
              value={<StatusBadge status={doc.statut_name} />} 
              color="from-amber-50 to-orange-50"
              border="border-amber-200"
              iconColor="text-amber-500"
            />
          </div>

          {/* Timestamps */}
          <div className="border-t border-slate-100/60 pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Clock size={12} className="text-slate-400" />
              Téléversé le : {fmt(doc.uploaded_at)}
            </span>
            {doc.updated_at && doc.updated_at !== doc.uploaded_at && (
              <span className="flex items-center gap-1.5">
                <RefreshCw size={11} className="text-slate-400" />
                Dernière modification : {fmt(doc.updated_at)}
              </span>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteModal}
        title="Supprimer ce document ?"
        description={`Le document "${doc.designation}" sera définitivement supprimé. Cette action supprimera également tous les chunks, produits et exigences associés.`}
        danger
        loading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    </motion.div>
  )
}

// Composant InfoCard
function InfoCard({ icon: Icon, label, value, color, border, iconColor }: {
  icon: React.ElementType
  label: string
  value: React.ReactNode
  color: string
  border: string
  iconColor: string
}) {
  return (
    <div className={`flex items-start gap-2.5 p-3 rounded-xl bg-gradient-to-r ${color} backdrop-blur-sm border ${border}`}>
      <div className="w-7 h-7 rounded-lg bg-white/60 flex items-center justify-center flex-shrink-0">
        <Icon size={13} className={iconColor} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
        <div className="text-sm font-semibold text-slate-700 mt-0.5 truncate">
          {typeof value === "string" ? value : value}
        </div>
      </div>
    </div>
  )
}
