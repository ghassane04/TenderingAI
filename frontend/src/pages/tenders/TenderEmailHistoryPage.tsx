import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { 
  ArrowLeft, Send, Inbox, Trash2, AlertCircle,
  Mail, User, Building2, Layers
} from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { useTslDetail } from "../../hooks/useTsl"
import { useEmailHistory, useDeleteEmailLog } from "../../hooks/useEmails"
import type { TslEmailLogEntry } from "../../api/emails"
import ConfirmDialog from "../../components/ui/ConfirmDialog"

const fmt = (d: string | null) =>
  d ? format(new Date(d), "dd MMM yyyy à HH:mm", { locale: fr }) : "—"

// Couleurs pour les directions
const DIRECTION_COLORS = {
  outbound: {
    bg: "from-sky-50 to-blue-50",
    border: "border-sky-200",
    icon: "text-sky-500",
    bgIcon: "bg-sky-100/60",
    label: "Envoyé",
    labelColor: "text-sky-600"
  },
  inbound: {
    bg: "from-emerald-50 to-teal-50",
    border: "border-emerald-200",
    icon: "text-emerald-500",
    bgIcon: "bg-emerald-100/60",
    label: "Reçu",
    labelColor: "text-emerald-600"
  }
}

export default function TenderEmailHistoryPage() {
  const { id: tenderId, tslId } = useParams<{ id: string; tslId: string }>()
  const navigate = useNavigate()
  const tid = Number(tenderId)
  const tsid = Number(tslId)

  const { data: tsl, isLoading: loadingTsl } = useTslDetail(tsid)
  const { data: logs, isLoading: loadingLogs } = useEmailHistory(tsid)
  const { mutate: deleteLog, isPending: deleting } = useDeleteEmailLog(tsid)

  const [confirmDelete, setConfirmDelete] = useState<TslEmailLogEntry | null>(null)

  if (loadingTsl || loadingLogs) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-sky-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Chargement de l'historique...</p>
        </div>
      </div>
    )
  }

  if (!tsl) {
    return (
      <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl p-12 text-center max-w-2xl mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-rose-50/80 border border-rose-200 flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={28} className="text-rose-500" />
        </div>
        <p className="text-sm font-medium text-slate-600">Association introuvable</p>
        <p className="text-xs text-slate-400 mt-1">Cette association n'existe pas ou a été supprimée</p>
        <button onClick={() => navigate(`/tenders/${tid}`)} className="btn-secondary text-xs mt-4">
          <ArrowLeft size={13} /> Retour au tender
        </button>
      </div>
    )
  }

  const totalLogs = logs?.length || 0
  const outboundCount = logs?.filter(l => l.direction === "outbound").length || 0
  const inboundCount = logs?.filter(l => l.direction === "inbound").length || 0

  // Envoyés d'abord, puis reçus — chaque groupe trié par date (croissant)
  const ts = (d: string | null | undefined) => {
    if (!d) return 0
    const date = new Date(typeof d === "string" ? d.replace(" ", "T") : d)
    return Number.isNaN(date.getTime()) ? 0 : date.getTime()
  }
  const sortedLogs = [...(logs ?? [])].sort((a, b) => {
    const aOut = a.direction === "outbound"
    const bOut = b.direction === "outbound"
    if (aOut !== bOut) return aOut ? -1 : 1
    return ts(aOut ? a.sent_at : a.received_at) - ts(bOut ? b.sent_at : b.received_at)
  })

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* Header avec retour */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          onClick={() => navigate(`/tenders/${tid}`)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-sky-600 transition-colors"
        >
          <ArrowLeft size={14} /> Retour à l'appel d'offres
        </button>
      </div>

      {/* Carte d'information du fournisseur */}
      <div className="bg-white/70 backdrop-blur-2xl rounded-2xl shadow-xl shadow-slate-300/30 border border-white/60 overflow-hidden">
        <div className="bg-gradient-to-r from-sky-50 to-blue-50 px-6 py-5 border-b border-sky-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/60 flex items-center justify-center border border-sky-200 flex-shrink-0">
              <Building2 size={22} className="text-sky-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-lg font-bold text-slate-800 truncate">
                  {tsl.supplier_name}
                </h1>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Mail size={11} className="text-slate-400" />
                  {tsl.supplier_email || "Aucun email"}
                </span>
                <span className="w-px h-3 bg-slate-200" />
                <span className="flex items-center gap-1">
                  <Layers size={11} className="text-slate-400" />
                  {tsl.lot_name}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Mini stats */}
        <div className="px-6 py-3 flex items-center gap-4 border-b border-slate-100/60 bg-slate-50/30">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Mail size={12} className="text-slate-400" />
            <span>{totalLogs} échange(s)</span>
          </div>
          <div className="w-px h-4 bg-slate-200" />
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Send size={11} className="text-sky-400" />
            <span>{outboundCount} envoyé(s)</span>
          </div>
          <div className="w-px h-4 bg-slate-200" />
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Inbox size={11} className="text-emerald-400" />
            <span>{inboundCount} reçu(s)</span>
          </div>
        </div>
      </div>

      {/* Liste des logs */}
      {!logs || logs.length === 0 ? (
        <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-50/80 border border-slate-200 flex items-center justify-center mx-auto mb-4">
            <Mail size={28} className="text-slate-300" />
          </div>
          <p className="text-sm font-medium text-slate-600">Aucun échange enregistré</p>
          <p className="text-xs text-slate-400 mt-1">Les emails envoyés et reçus apparaîtront ici</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedLogs.map((log, index) => {
            const direction = log.direction === "outbound" ? "outbound" : "inbound"
            const colors = DIRECTION_COLORS[direction]
            const Icon = direction === "outbound" ? Send : Inbox
            
            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.05, 0.3) }}
                className={`bg-white/70 backdrop-blur-xl border ${colors.border} rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all`}
              >
                {/* Bande colorée en haut */}
                <div className={`h-1 w-full bg-gradient-to-r ${colors.bg}`} />

                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {/* Icône direction */}
                      <div className={`w-9 h-9 rounded-xl ${colors.bgIcon} flex items-center justify-center flex-shrink-0`}>
                        <Icon size={16} className={colors.icon} />
                      </div>
                      
                      <div className="min-w-0 flex-1">
                        {/* En-tête du log */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`text-xs font-semibold uppercase tracking-wide ${colors.labelColor}`}>
                            {colors.label}
                          </p>
                          <span className="text-[10px] text-slate-400">
                            {fmt(direction === "outbound" ? log.sent_at : log.received_at)}
                          </span>
                        </div>

                        {/* Sujet */}
                        {log.subject && (
                          <p className="text-sm font-semibold text-slate-800 mt-1.5">
                            {log.subject}
                          </p>
                        )}

                        {/* Adresses */}
                        <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                          <User size={10} />
                          {direction === "outbound"
                            ? `À : ${log.to_address || "—"}`
                            : `De : ${log.from_address || "—"}`}
                        </p>

                        {/* Corps du message */}
                        {(direction === "outbound" ? log.body_envoi : log.body_recu) && (
                          <div className="mt-3 bg-slate-50/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200/60">
                            <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                              {direction === "outbound" ? log.body_envoi : log.body_recu}
                            </p>
                          </div>
                        )}

                        {/* Erreur */}
                        {log.error_message && (
                          <div className="mt-3 flex items-start gap-2 p-3 rounded-xl bg-rose-50/80 border border-rose-200">
                            <AlertCircle size={14} className="text-rose-500 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-rose-600 leading-relaxed">
                              {log.error_message}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bouton supprimer */}
                    <button
                      onClick={() => setConfirmDelete(log)}
                      className="w-8 h-8 rounded-xl hover:bg-rose-50 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors flex-shrink-0"
                      title="Supprimer cette entrée"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title="Supprimer cette entrée d'historique ?"
        description="Cette entrée de correspondance sera définitivement supprimée. Les fichiers déjà téléchargés (le cas échéant) ne sont pas affectés."
        confirmLabel="Supprimer"
        danger
        loading={deleting}
        onConfirm={() => deleteLog(confirmDelete!.id, { onSuccess: () => setConfirmDelete(null) })}
        onCancel={() => setConfirmDelete(null)}
      />
    </motion.div>
  )
}
